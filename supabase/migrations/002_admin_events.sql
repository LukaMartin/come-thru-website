create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.ticketing_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and auth.jwt() ->> 'aal' = 'aal2'
  );
$$;

revoke execute on function public.ticketing_is_admin()
  from public, anon;
grant execute on function public.ticketing_is_admin()
  to authenticated, service_role;

create policy "Admins can read admin users"
  on public.admin_users for select
  to authenticated
  using (public.ticketing_is_admin());

create policy "Admins can manage events"
  on public.ticketing_events for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());

create policy "Admins can manage ticket types"
  on public.ticketing_ticket_types for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());

create policy "Admins can read orders"
  on public.ticketing_orders for select
  to authenticated
  using (public.ticketing_is_admin());

create policy "Admins can read order items"
  on public.ticketing_order_items for select
  to authenticated
  using (public.ticketing_is_admin());

create policy "Admins can read tickets"
  on public.ticketing_tickets for select
  to authenticated
  using (public.ticketing_is_admin());

create policy "Admins can read checkins"
  on public.ticketing_checkins for select
  to authenticated
  using (public.ticketing_is_admin());

create policy "Admins can read webhook events"
  on public.ticketing_webhook_events for select
  to authenticated
  using (public.ticketing_is_admin());

create or replace function public.ticketing_publish_current_event(
  p_event_id uuid,
  p_archive_previous boolean default false
)
returns public.ticketing_events
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted_event public.ticketing_events%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and not public.ticketing_is_admin()
  then
    raise exception 'Admin access required'
      using errcode = '42501';
  end if;

  update public.ticketing_events
  set
    is_current = false,
    status = case
      when p_archive_previous then 'archived'
      else status
    end
  where is_current = true
    and id <> p_event_id;

  update public.ticketing_events
  set
    is_current = true,
    status = 'published'
  where id = p_event_id
  returning * into promoted_event;

  if not found then
    raise exception 'Event % not found', p_event_id;
  end if;

  return promoted_event;
end;
$$;

revoke execute on function public.ticketing_publish_current_event(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.ticketing_publish_current_event(uuid, boolean)
  to authenticated, service_role;

revoke execute on function public.ticketing_redeem_ticket(text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.ticketing_redeem_ticket(text, text, uuid, text)
  to service_role;
