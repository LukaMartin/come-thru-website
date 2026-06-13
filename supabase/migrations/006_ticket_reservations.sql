alter table public.ticketing_orders
  add column if not exists reserved_until timestamptz,
  add column if not exists reservation_released_at timestamptz;

create index if not exists ticketing_orders_active_reservation_idx
  on public.ticketing_orders(status, reserved_until)
  where status = 'pending' and reserved_until is not null;

create index if not exists ticketing_order_items_ticket_type_id_idx
  on public.ticketing_order_items(ticket_type_id);

drop function if exists public.ticketing_create_checkout_reservation(
  uuid,
  text,
  jsonb,
  integer
);

create or replace function public.ticketing_create_checkout_reservation(
  p_event_id uuid,
  p_order_reference text,
  p_items jsonb,
  p_reservation_minutes integer default 10
)
returns table (
  order_id uuid,
  order_reference text,
  amount_total_cents integer,
  currency text,
  reserved_until timestamptz,
  line_items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_event public.ticketing_events%rowtype;
  new_order public.ticketing_orders%rowtype;
  reservation_expires_at timestamptz;
  normalized_items jsonb;
  requested_item record;
  sold_count integer;
  reserved_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role access required'
      using errcode = '42501';
  end if;

  if p_reservation_minutes is null or p_reservation_minutes <= 0 then
    raise exception 'Reservation minutes must be greater than zero';
  end if;

  select *
  into locked_event
  from public.ticketing_events
  where id = p_event_id
    and status = 'published'
  for update;

  if not found then
    raise exception 'Event is not available';
  end if;

  with raw_items as (
    select
      (item.value ->> 'ticket_type_id')::uuid as ticket_type_id,
      (item.value ->> 'quantity')::integer as quantity,
      item.value ->> 'stripe_price_id' as stripe_price_id,
      (item.value ->> 'unit_amount_cents')::integer as unit_amount_cents,
      lower(item.value ->> 'currency') as currency
    from jsonb_array_elements(p_items) as item(value)
  ),
  grouped_items as (
    select
      raw_items.ticket_type_id,
      sum(raw_items.quantity)::integer as quantity,
      max(raw_items.stripe_price_id) as stripe_price_id,
      max(raw_items.unit_amount_cents) as unit_amount_cents,
      max(raw_items.currency) as currency,
      count(distinct raw_items.stripe_price_id) as stripe_price_count,
      count(distinct raw_items.unit_amount_cents) as unit_amount_count,
      count(distinct raw_items.currency) as currency_count
    from raw_items
    group by raw_items.ticket_type_id
  ),
  validated_items as (
    select
      grouped_items.ticket_type_id,
      grouped_items.quantity,
      grouped_items.stripe_price_id,
      grouped_items.unit_amount_cents,
      grouped_items.currency,
      ticket_type.capacity,
      ticket_type.name
    from grouped_items
    join public.ticketing_ticket_types ticket_type
      on ticket_type.id = grouped_items.ticket_type_id
    where ticket_type.event_id = p_event_id
      and ticket_type.active = true
      and grouped_items.quantity > 0
      and grouped_items.unit_amount_cents >= 0
      and grouped_items.stripe_price_id = ticket_type.stripe_price_id
      and (ticket_type.sales_start_at is null or now() >= ticket_type.sales_start_at)
      and (ticket_type.sales_end_at is null or now() <= ticket_type.sales_end_at)
      and grouped_items.stripe_price_count = 1
      and grouped_items.unit_amount_count = 1
      and grouped_items.currency_count = 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ticket_type_id', validated_items.ticket_type_id,
        'quantity', validated_items.quantity,
        'stripe_price_id', validated_items.stripe_price_id,
        'unit_amount_cents', validated_items.unit_amount_cents,
        'currency', validated_items.currency,
        'name', validated_items.name
      )
      order by validated_items.ticket_type_id
    ),
    '[]'::jsonb
  )
  into normalized_items
  from validated_items;

  if jsonb_array_length(normalized_items) = 0
    or jsonb_array_length(normalized_items) <> jsonb_array_length(p_items)
  then
    raise exception 'One or more tickets are unavailable';
  end if;

  if (
    select count(distinct item.currency)
    from jsonb_to_recordset(normalized_items) as item(currency text)
  ) <> 1 then
    raise exception 'All selected tickets must use the same currency';
  end if;

  for requested_item in
    select
      item.ticket_type_id,
      item.quantity,
      ticket_type.capacity,
      ticket_type.name
    from jsonb_to_recordset(normalized_items) as item(
      ticket_type_id uuid,
      quantity integer
    )
    join public.ticketing_ticket_types ticket_type
      on ticket_type.id = item.ticket_type_id
    order by item.ticket_type_id
  loop
    perform 1
    from public.ticketing_ticket_types
    where id = requested_item.ticket_type_id
    for update;

    select count(*)::integer
    into sold_count
    from public.ticketing_tickets
    where ticketing_tickets.ticket_type_id = requested_item.ticket_type_id
      and ticketing_tickets.status in ('valid', 'redeemed');

    select coalesce(sum(order_item.quantity), 0)::integer
    into reserved_count
    from public.ticketing_order_items order_item
    join public.ticketing_orders reservation_order
      on reservation_order.id = order_item.order_id
    where order_item.ticket_type_id = requested_item.ticket_type_id
      and reservation_order.status = 'pending'
      and reservation_order.reserved_until > now();

    if sold_count + reserved_count + requested_item.quantity > requested_item.capacity then
      raise exception '% does not have enough tickets left', requested_item.name;
    end if;
  end loop;

  reservation_expires_at := now() + make_interval(mins => p_reservation_minutes);

  insert into public.ticketing_orders (
    event_id,
    amount_total_cents,
    currency,
    order_reference,
    reserved_until
  )
  select
    p_event_id,
    sum(item.quantity * item.unit_amount_cents)::integer,
    max(item.currency),
    p_order_reference,
    reservation_expires_at
  from jsonb_to_recordset(normalized_items) as item(
    quantity integer,
    unit_amount_cents integer,
    currency text
  )
  returning * into new_order;

  insert into public.ticketing_order_items (
    order_id,
    ticket_type_id,
    quantity,
    unit_amount_cents
  )
  select
    new_order.id,
    item.ticket_type_id,
    item.quantity,
    item.unit_amount_cents
  from jsonb_to_recordset(normalized_items) as item(
    ticket_type_id uuid,
    quantity integer,
    unit_amount_cents integer
  );

  return query
  select
    new_order.id,
    new_order.order_reference,
    new_order.amount_total_cents,
    new_order.currency,
    new_order.reserved_until,
    normalized_items;
end;
$$;

drop function if exists public.ticketing_cancel_checkout_reservation(
  uuid,
  text,
  text
);

create or replace function public.ticketing_cancel_checkout_reservation(
  p_order_id uuid default null,
  p_stripe_checkout_session_id text default null,
  p_reason text default 'cancelled'
)
returns table (
  order_id uuid,
  stripe_checkout_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cancelled_order public.ticketing_orders%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role access required'
      using errcode = '42501';
  end if;

  update public.ticketing_orders as order_to_cancel
  set
    status = case
      when p_reason = 'failed' then 'failed'
      else 'cancelled'
    end,
    reservation_released_at = coalesce(reservation_released_at, now())
  where order_to_cancel.status = 'pending'
    and (
      (
        p_order_id is not null
        and p_stripe_checkout_session_id is not null
        and order_to_cancel.id = p_order_id
        and order_to_cancel.stripe_checkout_session_id = p_stripe_checkout_session_id
      )
      or (
        p_order_id is not null
        and p_stripe_checkout_session_id is null
        and order_to_cancel.id = p_order_id
      )
      or (
        p_order_id is null
        and p_stripe_checkout_session_id is not null
        and order_to_cancel.stripe_checkout_session_id = p_stripe_checkout_session_id
      )
    )
  returning order_to_cancel.* into cancelled_order;

  if not found then
    return;
  end if;

  return query
  select cancelled_order.id, cancelled_order.stripe_checkout_session_id;
end;
$$;

drop function if exists public.ticketing_cancel_expired_reservations(
  timestamptz,
  integer
);

create or replace function public.ticketing_cancel_expired_reservations(
  p_now timestamptz default now(),
  p_limit integer default 100
)
returns table (
  order_id uuid,
  stripe_checkout_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role access required'
      using errcode = '42501';
  end if;

  return query
  with expired_orders as (
    select id
    from public.ticketing_orders
    where status = 'pending'
      and reserved_until is not null
      and reserved_until <= p_now
    order by reserved_until
    limit p_limit
    for update skip locked
  )
  update public.ticketing_orders
  set
    status = 'cancelled',
    reservation_released_at = coalesce(reservation_released_at, now())
  from expired_orders
  where ticketing_orders.id = expired_orders.id
  returning ticketing_orders.id, ticketing_orders.stripe_checkout_session_id;
end;
$$;

drop function if exists public.ticketing_fulfill_checkout_session(
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  jsonb
);

create or replace function public.ticketing_fulfill_checkout_session(
  p_webhook_event_id text,
  p_webhook_event_type text,
  p_order_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_payment_status text,
  p_amount_total_cents integer,
  p_currency text,
  p_buyer_email text,
  p_buyer_name text,
  p_tickets jsonb
)
returns table (
  processed boolean,
  duplicate boolean,
  capacity_exceeded boolean,
  failure_reason text,
  order_id uuid,
  event_id uuid,
  event_name text,
  venue text,
  venue_address text,
  starts_at timestamptz,
  ends_at timestamptz,
  order_reference text,
  order_total_cents integer,
  order_currency text,
  ticket_email_status text,
  tickets jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_webhook_id text;
  locked_order public.ticketing_orders%rowtype;
  locked_event public.ticketing_events%rowtype;
  requested_item record;
  existing_ticket_count integer;
  existing_reservation_count integer;
  requested_ticket_count integer;
  requested_ticket_total integer;
  ticket_type_capacity integer;
  created_tickets jsonb := '[]'::jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role access required'
      using errcode = '42501';
  end if;

  insert into public.ticketing_webhook_events (id, type)
  values (p_webhook_event_id, p_webhook_event_type)
  on conflict (id) do nothing
  returning id into claimed_webhook_id;

  if claimed_webhook_id is null then
    select *
    into locked_order
    from public.ticketing_orders
    where id = p_order_id
    for update;

    if not found then
      return query
      select
        false,
        true,
        false,
        null::text,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        null::timestamptz,
        null::timestamptz,
        null::text,
        null::integer,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    if locked_order.stripe_checkout_session_id <> p_stripe_checkout_session_id then
      raise exception 'Stripe session does not match the order';
    end if;

    select *
    into locked_event
    from public.ticketing_events
    where id = locked_order.event_id;

    return query
    select
      false,
      true,
      false,
      null::text,
      locked_order.id,
      locked_event.id,
      locked_event.name,
      locked_event.venue,
      locked_event.venue_address,
      locked_event.starts_at,
      locked_event.ends_at,
      locked_order.order_reference,
      locked_order.amount_total_cents,
      locked_order.currency,
      locked_order.ticket_email_status,
      case
        when locked_order.status = 'paid'
          and locked_order.ticket_email_status not in ('sent', 'skipped')
        then coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', ticket.id,
                'ticket_type_id', ticket.ticket_type_id,
                'ticket_code', ticket.ticket_code,
                'ticket_number', ticket.ticket_number,
                'ticket_secret', secret.ticket_secret
              )
              order by ticket.created_at, ticket.id
            )
            from public.ticketing_tickets ticket
            join public.ticketing_ticket_email_secrets secret
              on secret.ticket_id = ticket.id
            where ticket.order_id = locked_order.id
          ),
          '[]'::jsonb
        )
        else '[]'::jsonb
      end;
    return;
  end if;

  select *
  into locked_order
  from public.ticketing_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  select *
  into locked_event
  from public.ticketing_events
  where id = locked_order.event_id;

  if not found then
    raise exception 'Event % not found', locked_order.event_id;
  end if;

  if locked_order.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    raise exception 'Stripe session does not match the order';
  end if;

  if p_payment_status <> 'paid' then
    raise exception 'Stripe session is not paid';
  end if;

  if p_amount_total_cents is not null
    and p_amount_total_cents <> locked_order.amount_total_cents
  then
    raise exception 'Stripe session amount does not match the order';
  end if;

  if p_currency is not null
    and lower(p_currency) <> lower(locked_order.currency)
  then
    raise exception 'Stripe session currency does not match the order';
  end if;

  if locked_order.status = 'paid' then
    return query
    select
      false,
      true,
      false,
      null::text,
      locked_order.id,
      locked_event.id,
      locked_event.name,
      locked_event.venue,
      locked_event.venue_address,
      locked_event.starts_at,
      locked_event.ends_at,
      locked_order.order_reference,
      locked_order.amount_total_cents,
      locked_order.currency,
      locked_order.ticket_email_status,
      case
        when locked_order.status = 'paid'
          and locked_order.ticket_email_status not in ('sent', 'skipped')
        then coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', ticket.id,
                'ticket_type_id', ticket.ticket_type_id,
                'ticket_code', ticket.ticket_code,
                'ticket_number', ticket.ticket_number,
                'ticket_secret', secret.ticket_secret
              )
              order by ticket.created_at, ticket.id
            )
            from public.ticketing_tickets ticket
            join public.ticketing_ticket_email_secrets secret
              on secret.ticket_id = ticket.id
            where ticket.order_id = locked_order.id
          ),
          '[]'::jsonb
        )
        else '[]'::jsonb
      end;
    return;
  end if;

  if locked_order.status in ('cancelled', 'failed') then
    return query
    select
      false,
      false,
      false,
      'reservation_expired'::text,
      locked_order.id,
      locked_event.id,
      locked_event.name,
      locked_event.venue,
      locked_event.venue_address,
      locked_event.starts_at,
      locked_event.ends_at,
      locked_order.order_reference,
      locked_order.amount_total_cents,
      locked_order.currency,
      locked_order.ticket_email_status,
      '[]'::jsonb;
    return;
  end if;

  if locked_order.status <> 'pending' then
    raise exception 'Order cannot be fulfilled from status %', locked_order.status;
  end if;

  if locked_order.reserved_until is not null and locked_order.reserved_until <= now() then
    update public.ticketing_orders
    set
      status = 'failed',
      buyer_email = p_buyer_email,
      buyer_name = p_buyer_name,
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      reservation_released_at = coalesce(reservation_released_at, now())
    where id = locked_order.id
    returning * into locked_order;

    return query
    select
      false,
      false,
      false,
      'reservation_expired'::text,
      locked_order.id,
      locked_event.id,
      locked_event.name,
      locked_event.venue,
      locked_event.venue_address,
      locked_event.starts_at,
      locked_event.ends_at,
      locked_order.order_reference,
      locked_order.amount_total_cents,
      locked_order.currency,
      locked_order.ticket_email_status,
      '[]'::jsonb;
    return;
  end if;

  perform 1
  from public.ticketing_order_items
  where ticketing_order_items.order_id = locked_order.id
  for update;

  select coalesce(sum(quantity), 0)::integer
  into requested_ticket_total
  from public.ticketing_order_items
  where order_id = locked_order.id;

  select count(*)::integer
  into requested_ticket_count
  from jsonb_array_elements(p_tickets);

  if requested_ticket_total <= 0 then
    raise exception 'Checkout reservation has no ticket quantities';
  end if;

  if requested_ticket_count <> requested_ticket_total then
    raise exception 'Ticket payload count does not match reserved quantities';
  end if;

  for requested_item in
    select
      order_item.ticket_type_id,
      sum(order_item.quantity)::integer as quantity
    from public.ticketing_order_items order_item
    where order_item.order_id = locked_order.id
    group by order_item.ticket_type_id
    order by order_item.ticket_type_id
  loop
    select capacity
    into ticket_type_capacity
    from public.ticketing_ticket_types
    where ticketing_ticket_types.id = requested_item.ticket_type_id
      and ticketing_ticket_types.event_id = locked_order.event_id
    for update;

    if not found then
      raise exception 'Ticket type % does not belong to order event',
        requested_item.ticket_type_id;
    end if;

    select count(*)::integer
    into requested_ticket_count
    from jsonb_to_recordset(p_tickets) as ticket(
      ticket_type_id uuid,
      ticket_code text,
      ticket_number text,
      secret_hash text
    )
    where ticket.ticket_type_id = requested_item.ticket_type_id;

    if requested_ticket_count <> requested_item.quantity then
      raise exception 'Ticket payload count does not match quantity for ticket type %',
        requested_item.ticket_type_id;
    end if;

    select count(*)::integer
    into existing_ticket_count
    from public.ticketing_tickets
    where ticketing_tickets.ticket_type_id = requested_item.ticket_type_id
      and ticketing_tickets.status in ('valid', 'redeemed');

    select coalesce(sum(other_item.quantity), 0)::integer
    into existing_reservation_count
    from public.ticketing_order_items other_item
    join public.ticketing_orders other_order
      on other_order.id = other_item.order_id
    where other_item.ticket_type_id = requested_item.ticket_type_id
      and other_order.id <> locked_order.id
      and other_order.status = 'pending'
      and other_order.reserved_until > now();

    if existing_ticket_count + existing_reservation_count + requested_item.quantity > ticket_type_capacity then
      update public.ticketing_orders
      set
        status = 'failed',
        buyer_email = p_buyer_email,
        buyer_name = p_buyer_name,
        stripe_payment_intent_id = p_stripe_payment_intent_id,
        amount_total_cents = coalesce(
          p_amount_total_cents,
          locked_order.amount_total_cents
        ),
        currency = coalesce(p_currency, locked_order.currency),
        reservation_released_at = coalesce(reservation_released_at, now())
      where id = locked_order.id
      returning * into locked_order;

      return query
      select
        false,
        false,
        true,
        'capacity_exceeded'::text,
        locked_order.id,
        locked_event.id,
        locked_event.name,
        locked_event.venue,
        locked_event.venue_address,
        locked_event.starts_at,
        locked_event.ends_at,
        locked_order.order_reference,
        locked_order.amount_total_cents,
        locked_order.currency,
        locked_order.ticket_email_status,
        '[]'::jsonb;
      return;
    end if;
  end loop;

  with input_tickets as (
    select
      ticket.ordinality,
      (ticket.value ->> 'ticket_type_id')::uuid as ticket_type_id,
      ticket.value ->> 'ticket_code' as ticket_code,
      ticket.value ->> 'ticket_number' as ticket_number,
      ticket.value ->> 'ticket_secret' as ticket_secret,
      ticket.value ->> 'secret_hash' as secret_hash
    from jsonb_array_elements(p_tickets) with ordinality as ticket(value, ordinality)
  ),
  inserted_tickets as (
    insert into public.ticketing_tickets (
      order_id,
      ticket_type_id,
      event_id,
      ticket_code,
      ticket_number,
      secret_hash,
      attendee_email,
      attendee_name
    )
    select
      locked_order.id,
      input_tickets.ticket_type_id,
      locked_order.event_id,
      input_tickets.ticket_code,
      input_tickets.ticket_number,
      input_tickets.secret_hash,
      p_buyer_email,
      p_buyer_name
    from input_tickets
    returning
      id,
      ticket_type_id,
      ticket_code,
      ticket_number
  ),
  inserted_secrets as (
    insert into public.ticketing_ticket_email_secrets (
      ticket_id,
      order_id,
      ticket_secret
    )
    select
      inserted_tickets.id,
      locked_order.id,
      input_tickets.ticket_secret
    from inserted_tickets
    join input_tickets using (ticket_code)
    returning
      ticket_id,
      ticket_secret
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', inserted_tickets.id,
        'ticket_type_id', inserted_tickets.ticket_type_id,
        'ticket_code', inserted_tickets.ticket_code,
        'ticket_number', inserted_tickets.ticket_number,
        'ticket_secret', inserted_secrets.ticket_secret
      )
      order by input_tickets.ordinality
    ),
    '[]'::jsonb
  )
  into created_tickets
  from inserted_tickets
  join inserted_secrets
    on inserted_secrets.ticket_id = inserted_tickets.id
  join input_tickets using (ticket_code);

  update public.ticketing_orders
  set
    status = 'paid',
    buyer_email = p_buyer_email,
    buyer_name = p_buyer_name,
    stripe_checkout_session_id = p_stripe_checkout_session_id,
    stripe_payment_intent_id = p_stripe_payment_intent_id,
    amount_total_cents = coalesce(
      p_amount_total_cents,
      locked_order.amount_total_cents
    ),
    currency = coalesce(p_currency, locked_order.currency),
    reservation_released_at = coalesce(reservation_released_at, now())
  where id = locked_order.id
  returning * into locked_order;

  return query
  select
    true,
    false,
    false,
    null::text,
    locked_order.id,
    locked_event.id,
    locked_event.name,
    locked_event.venue,
    locked_event.venue_address,
    locked_event.starts_at,
    locked_event.ends_at,
    locked_order.order_reference,
    locked_order.amount_total_cents,
    locked_order.currency,
    locked_order.ticket_email_status,
    created_tickets;
end;
$$;

revoke execute on function public.ticketing_create_checkout_reservation(
  uuid,
  text,
  jsonb,
  integer
) from public, anon, authenticated;

grant execute on function public.ticketing_create_checkout_reservation(
  uuid,
  text,
  jsonb,
  integer
) to service_role;

revoke execute on function public.ticketing_cancel_checkout_reservation(
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.ticketing_cancel_checkout_reservation(
  uuid,
  text,
  text
) to service_role;

revoke execute on function public.ticketing_cancel_expired_reservations(
  timestamptz,
  integer
) from public, anon, authenticated;

grant execute on function public.ticketing_cancel_expired_reservations(
  timestamptz,
  integer
) to service_role;

revoke execute on function public.ticketing_fulfill_checkout_session(
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.ticketing_fulfill_checkout_session(
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) to service_role;
