create extension if not exists pgcrypto;

create table public.ticketing_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  venue text not null,
  venue_address text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  hero_image_url text,
  is_current boolean not null default false,
  is_free boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table public.ticketing_ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ticketing_events(id) on delete cascade,
  name text not null,
  description text,
  stripe_price_id text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'aud',
  capacity integer not null check (capacity >= 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ticketing_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ticketing_events(id) on delete restrict,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  buyer_email text,
  buyer_name text,
  order_reference text not null unique,
  amount_total_cents integer not null default 0,
  currency text not null default 'aud',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.ticketing_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticketing_orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticketing_ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.ticketing_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticketing_orders(id) on delete restrict,
  ticket_type_id uuid not null references public.ticketing_ticket_types(id) on delete restrict,
  event_id uuid not null references public.ticketing_events(id) on delete restrict,
  ticket_number text not null,
  ticket_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  secret_hash text not null,
  attendee_email text,
  attendee_name text,
  status text not null default 'valid' check (status in ('valid', 'redeemed', 'refunded', 'cancelled')),
  redeemed_at timestamptz,
  redeemed_by text,
  created_at timestamptz not null default now()
);

create table public.ticketing_checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.ticketing_tickets(id) on delete set null,
  event_id uuid references public.ticketing_events(id) on delete set null,
  result text not null,
  scanned_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ticketing_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create index ticketing_ticket_types_event_id_idx on public.ticketing_ticket_types(event_id);
create unique index ticketing_events_one_current_idx
  on public.ticketing_events(is_current)
  where is_current = true;
create index ticketing_orders_event_id_idx on public.ticketing_orders(event_id);
create index ticketing_order_items_order_id_idx on public.ticketing_order_items(order_id);
create index ticketing_tickets_event_id_idx on public.ticketing_tickets(event_id);
create index ticketing_tickets_ticket_type_id_idx on public.ticketing_tickets(ticket_type_id);
create index ticketing_tickets_status_idx on public.ticketing_tickets(status);
create index ticketing_checkins_event_id_idx on public.ticketing_checkins(event_id);

alter table public.ticketing_events enable row level security;
alter table public.ticketing_ticket_types enable row level security;
alter table public.ticketing_orders enable row level security;
alter table public.ticketing_order_items enable row level security;
alter table public.ticketing_tickets enable row level security;
alter table public.ticketing_checkins enable row level security;
alter table public.ticketing_webhook_events enable row level security;

create policy "Published events are publicly readable"
  on public.ticketing_events for select
  using (status = 'published');

create policy "Active ticket types are publicly readable"
  on public.ticketing_ticket_types for select
  using (
    active = true
    and exists (
      select 1
      from public.ticketing_events
      where ticketing_events.id = ticketing_ticket_types.event_id
        and ticketing_events.status = 'published'
    )
  );

create or replace function public.ticketing_redeem_ticket(
  p_ticket_code text,
  p_secret_hash text,
  p_event_id uuid default null,
  p_scanned_by text default null
)
returns table (
  result text,
  ticket_id uuid,
  event_id uuid,
  ticket_type_id uuid,
  attendee_email text,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  redeemed_ticket public.ticketing_tickets%rowtype;
  existing_ticket public.ticketing_tickets%rowtype;
begin
  update public.ticketing_tickets
  set
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_by = p_scanned_by
  where ticketing_tickets.ticket_code = p_ticket_code
    and ticketing_tickets.secret_hash = p_secret_hash
    and ticketing_tickets.status = 'valid'
    and (p_event_id is null or ticketing_tickets.event_id = p_event_id)
  returning * into redeemed_ticket;

  if found then
    insert into public.ticketing_checkins (ticket_id, event_id, result, scanned_by)
    values (redeemed_ticket.id, redeemed_ticket.event_id, 'valid', p_scanned_by);

    result := 'valid';
    ticket_id := redeemed_ticket.id;
    event_id := redeemed_ticket.event_id;
    ticket_type_id := redeemed_ticket.ticket_type_id;
    attendee_email := redeemed_ticket.attendee_email;
    redeemed_at := redeemed_ticket.redeemed_at;
    return next;
    return;
  end if;

  select *
  into existing_ticket
  from public.ticketing_tickets
  where ticketing_tickets.ticket_code = p_ticket_code
    and ticketing_tickets.secret_hash = p_secret_hash;

  if not found then
    insert into public.ticketing_checkins (result, scanned_by, metadata)
    values ('invalid', p_scanned_by, jsonb_build_object('ticket_code', p_ticket_code));

    result := 'invalid';
    return next;
    return;
  end if;

  if p_event_id is not null and existing_ticket.event_id <> p_event_id then
    insert into public.ticketing_checkins (ticket_id, event_id, result, scanned_by)
    values (existing_ticket.id, existing_ticket.event_id, 'wrong_event', p_scanned_by);

    result := 'wrong_event';
  elsif existing_ticket.status = 'redeemed' then
    insert into public.ticketing_checkins (ticket_id, event_id, result, scanned_by)
    values (existing_ticket.id, existing_ticket.event_id, 'already_redeemed', p_scanned_by);

    result := 'already_redeemed';
  else
    insert into public.ticketing_checkins (ticket_id, event_id, result, scanned_by)
    values (existing_ticket.id, existing_ticket.event_id, existing_ticket.status, p_scanned_by);

    result := existing_ticket.status;
  end if;

  ticket_id := existing_ticket.id;
  event_id := existing_ticket.event_id;
  ticket_type_id := existing_ticket.ticket_type_id;
  attendee_email := existing_ticket.attendee_email;
  redeemed_at := existing_ticket.redeemed_at;
  return next;
end;
$$;

revoke execute on function public.ticketing_redeem_ticket(text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.ticketing_redeem_ticket(text, text, uuid, text)
  to service_role;

revoke execute on function public.ticketing_redeem_ticket_by_id(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.ticketing_redeem_ticket_by_id(uuid, uuid, text)
  to service_role;