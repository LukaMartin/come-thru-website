create sequence public.support_thread_reference_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  reference_number bigint not null unique default nextval('public.support_thread_reference_seq'::regclass),
  customer_email text not null,
  customer_name text,
  subject text not null,
  status text not null default 'new' check (
    status in (
      'new',
      'needs_reply',
      'resolved'
    )
  ),
  source text not null default 'contact_form' check (
    source = 'contact_form'
  ),
  last_message_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound', 'note')),
  author_email text,
  author_name text,
  subject text,
  body_text text not null,
  body_html text,
  provider text,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index support_threads_status_idx
  on public.support_threads(status);

create index support_threads_last_message_at_idx
  on public.support_threads(last_message_at desc);

create index support_threads_customer_email_idx
  on public.support_threads(lower(customer_email));

create index support_threads_reference_number_idx
  on public.support_threads(reference_number);

create index support_messages_thread_id_created_at_idx
  on public.support_messages(thread_id, created_at);

create unique index support_messages_provider_message_id_idx
  on public.support_messages(provider, provider_message_id)
  where provider is not null
    and provider_message_id is not null;

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy "Admins can manage support threads"
  on public.support_threads for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());

create policy "Admins can manage support messages"
  on public.support_messages for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());
