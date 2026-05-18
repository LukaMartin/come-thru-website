alter table public.ticketing_orders
  add column if not exists ticket_email_status text not null default 'pending'
    check (ticket_email_status in ('pending', 'sent', 'failed', 'skipped')),
  add column if not exists ticket_email_sent_at timestamptz,
  add column if not exists ticket_email_failed_at timestamptz,
  add column if not exists ticket_email_error text;

create table if not exists public.ticketing_ticket_email_secrets (
  ticket_id uuid primary key references public.ticketing_tickets(id) on delete cascade,
  order_id uuid not null references public.ticketing_orders(id) on delete cascade,
  ticket_secret text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticketing_ticket_email_secrets_order_id_idx
  on public.ticketing_ticket_email_secrets(order_id);

alter table public.ticketing_ticket_email_secrets enable row level security;

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
  jsonb,
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
  p_order_items jsonb,
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
  existing_order_item_count integer;
  existing_ticket_count integer;
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

  if locked_order.status <> 'pending' then
    raise exception 'Order cannot be fulfilled from status %', locked_order.status;
  end if;

  select coalesce(sum(quantity), 0)::integer
  into requested_ticket_total
  from jsonb_to_recordset(p_order_items) as item(
    ticket_type_id uuid,
    quantity integer,
    unit_amount_cents integer
  );

  select count(*)::integer
  into requested_ticket_count
  from jsonb_array_elements(p_tickets);

  if requested_ticket_total <= 0 then
    raise exception 'Checkout session has no ticket quantities';
  end if;

  if requested_ticket_count <> requested_ticket_total then
    raise exception 'Ticket payload count does not match order item quantities';
  end if;

  for requested_item in
    select
      item.ticket_type_id,
      sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_order_items) as item(
      ticket_type_id uuid,
      quantity integer,
      unit_amount_cents integer
    )
    group by item.ticket_type_id
    order by item.ticket_type_id
  loop
    if requested_item.quantity <= 0 then
      raise exception 'Ticket quantity must be greater than zero';
    end if;

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

    if existing_ticket_count + requested_item.quantity > ticket_type_capacity then
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
        currency = coalesce(p_currency, locked_order.currency)
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

  perform 1
  from public.ticketing_order_items
  where ticketing_order_items.order_id = locked_order.id
  for update;

  select count(*)::integer
  into existing_order_item_count
  from public.ticketing_order_items
  where ticketing_order_items.order_id = locked_order.id;

  if existing_order_item_count = 0 then
    insert into public.ticketing_order_items (
      order_id,
      ticket_type_id,
      quantity,
      unit_amount_cents
    )
    select
      locked_order.id,
      item.ticket_type_id,
      item.quantity,
      item.unit_amount_cents
    from jsonb_to_recordset(p_order_items) as item(
      ticket_type_id uuid,
      quantity integer,
      unit_amount_cents integer
    );
  end if;

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
    currency = coalesce(p_currency, locked_order.currency)
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

create or replace function public.ticketing_mark_ticket_email_delivery(
  p_order_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role access required'
      using errcode = '42501';
  end if;

  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Invalid ticket email status %', p_status;
  end if;

  update public.ticketing_orders
  set
    ticket_email_status = p_status,
    ticket_email_sent_at = case
      when p_status = 'sent' then now()
      else ticket_email_sent_at
    end,
    ticket_email_failed_at = case
      when p_status = 'failed' then now()
      else ticket_email_failed_at
    end,
    ticket_email_error = case
      when p_status = 'failed' then left(p_error, 1000)
      else null
    end
  where id = p_order_id;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if p_status in ('sent', 'skipped') then
    delete from public.ticketing_ticket_email_secrets
    where ticketing_ticket_email_secrets.order_id = p_order_id;
  end if;
end;
$$;

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
  jsonb,
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
  jsonb,
  jsonb
) to service_role;

revoke execute on function public.ticketing_mark_ticket_email_delivery(
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.ticketing_mark_ticket_email_delivery(
  uuid,
  text,
  text
) to service_role;
