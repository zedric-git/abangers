-- BoardingHub — Migration 0004: Create listing-photos bucket and add photo columns to listings (S1-08.1)

-- 1. Add photo columns to public.listings
alter table public.listings
  add column if not exists images text[] default '{}',
  add column if not exists cover_image text;

-- 2. Create storage bucket for listing photos if it does not exist
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do update set public = true;

-- 3. RLS Policies for listing-photos bucket in storage.objects
create policy "Listing photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "Authenticated landlords can upload listing photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'listing-photos');

create policy "Authenticated landlords can update listing photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'listing-photos')
  with check (bucket_id = 'listing-photos');

create policy "Authenticated landlords can delete listing photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'listing-photos');
