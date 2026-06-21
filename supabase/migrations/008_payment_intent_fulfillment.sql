create or replace function public.ticketing_fulfill_payment_intent(
  p_webhook_event_id text,
  p_webhook_event_type text,
  p_order_id uuid,
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
  ticket_colours text,
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
        null::text,
        '[]'::jsonb;
      return;
    end if;

    if locked_order.stripe_payment_intent_id <> p_stripe_payment_intent_id then
      raise exception 'Stripe payment intent does not match the order';
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
      locked_event.ticket_colours,
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
                'encrypted_ticket_secret', jsonb_build_object(
                  'version', secret.ticket_secret_version,
                  'algorithm', secret.ticket_secret_algorithm,
                  'iv', secret.ticket_secret_iv,
                  'ciphertext', secret.ticket_secret_ciphertext,
                  'authTag', secret.ticket_secret_auth_tag
                )
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

  if locked_order.stripe_payment_intent_id <> p_stripe_payment_intent_id then
    raise exception 'Stripe payment intent does not match the order';
  end if;

  if p_payment_status <> 'succeeded' then
    raise exception 'Stripe payment intent is not succeeded';
  end if;

  if p_amount_total_cents is not null
    and p_amount_total_cents <> locked_order.amount_total_cents
  then
    raise exception 'Stripe payment amount does not match the order';
  end if;

  if p_currency is not null
    and lower(p_currency) <> lower(locked_order.currency)
  then
    raise exception 'Stripe payment currency does not match the order';
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
      locked_event.ticket_colours,
      case
        when locked_order.ticket_email_status not in ('sent', 'skipped')
        then coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', ticket.id,
                'ticket_type_id', ticket.ticket_type_id,
                'ticket_code', ticket.ticket_code,
                'ticket_number', ticket.ticket_number,
                'encrypted_ticket_secret', jsonb_build_object(
                  'version', secret.ticket_secret_version,
                  'algorithm', secret.ticket_secret_algorithm,
                  'iv', secret.ticket_secret_iv,
                  'ciphertext', secret.ticket_secret_ciphertext,
                  'authTag', secret.ticket_secret_auth_tag
                )
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
      locked_event.ticket_colours,
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
      locked_event.ticket_colours,
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
  where ticketing_order_items.order_id = locked_order.id;

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
        locked_event.ticket_colours,
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
      (ticket.value #>> '{encrypted_ticket_secret,version}')::smallint as ticket_secret_version,
      ticket.value #>> '{encrypted_ticket_secret,algorithm}' as ticket_secret_algorithm,
      ticket.value #>> '{encrypted_ticket_secret,iv}' as ticket_secret_iv,
      ticket.value #>> '{encrypted_ticket_secret,ciphertext}' as ticket_secret_ciphertext,
      ticket.value #>> '{encrypted_ticket_secret,authTag}' as ticket_secret_auth_tag,
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
      ticket_secret_version,
      ticket_secret_algorithm,
      ticket_secret_iv,
      ticket_secret_ciphertext,
      ticket_secret_auth_tag
    )
    select
      inserted_tickets.id,
      locked_order.id,
      input_tickets.ticket_secret_version,
      input_tickets.ticket_secret_algorithm,
      input_tickets.ticket_secret_iv,
      input_tickets.ticket_secret_ciphertext,
      input_tickets.ticket_secret_auth_tag
    from inserted_tickets
    join input_tickets using (ticket_code)
    returning
      ticket_id,
      ticket_secret_version,
      ticket_secret_algorithm,
      ticket_secret_iv,
      ticket_secret_ciphertext,
      ticket_secret_auth_tag
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', inserted_tickets.id,
        'ticket_type_id', inserted_tickets.ticket_type_id,
        'ticket_code', inserted_tickets.ticket_code,
        'ticket_number', inserted_tickets.ticket_number,
        'encrypted_ticket_secret', jsonb_build_object(
          'version', inserted_secrets.ticket_secret_version,
          'algorithm', inserted_secrets.ticket_secret_algorithm,
          'iv', inserted_secrets.ticket_secret_iv,
          'ciphertext', inserted_secrets.ticket_secret_ciphertext,
          'authTag', inserted_secrets.ticket_secret_auth_tag
        )
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
    locked_event.ticket_colours,
    created_tickets;
end;
$$;

revoke execute on function public.ticketing_fulfill_payment_intent(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.ticketing_fulfill_payment_intent(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) to service_role;
