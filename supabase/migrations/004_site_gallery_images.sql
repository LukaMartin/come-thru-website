create table public.site_gallery_images (
  id uuid primary key default gen_random_uuid(),
  slot integer not null unique check (slot between 1 and 4),
  image_url text not null,
  alt text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_site_gallery_images_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger site_gallery_images_updated_at
before update on public.site_gallery_images
for each row
execute function public.set_site_gallery_images_updated_at();

alter table public.site_gallery_images enable row level security;

create policy "Active gallery images are publicly readable"
  on public.site_gallery_images for select
  using (is_active = true);

create policy "Admins can manage gallery images"
  on public.site_gallery_images for all
  to authenticated
  using (public.ticketing_is_admin())
  with check (public.ticketing_is_admin());