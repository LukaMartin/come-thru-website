create table public.lineup_artists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ticketing_events(id) on delete cascade,
  slot integer not null check (slot between 0 and 5),
  name text not null,
  soundcloud_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, slot)
);

create or replace function public.set_lineup_artists_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lineup_artists_updated_at
before update on public.lineup_artists
for each row
execute function public.set_lineup_artists_updated_at();

insert into public.lineup_artists (event_id, slot, name, soundcloud_url)
select event_id, slot, name, soundcloud_url
from (
  values
    (0, 'Come Thru', 'https://on.soundcloud.com/SPwPfXPEVyZyq3zWuC'),
    (1, 'ROOF', null),
    (2, 'Penny', 'https://on.soundcloud.com/RlRbhj1YFU3Yeq7KYH'),
    (3, 'Garydose', null),
    (4, 'Westconnex', null),
    (5, 'Luka Brasi', 'https://on.soundcloud.com/honV7FH0u4JclC5W2S')
) as seed(slot, name, soundcloud_url)
cross join lateral (
  select id as event_id
  from public.ticketing_events
  where is_current = true
  order by created_at desc
  limit 1
) current_event
on conflict (event_id, slot) do nothing;

alter table public.lineup_artists enable row level security;

create policy "Lineup artists are publicly readable"
  on public.lineup_artists for select
  using (true);

create policy "Admins can manage lineup artists"
  on public.lineup_artists for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());
