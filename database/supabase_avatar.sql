-- 1. Add avatar_url to user_profiles if it doesn't exist
alter table public.user_profiles 
add column if not exists avatar_url text;

-- 2. Create the storage bucket for avatars
-- Note: This usually requires the storage schema to be active.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Set up Row Level Security (RLS) for the storage bucket

-- Allow public access to view avatars
create policy "Avatar images are publicly accessible."
on storage.objects for select
using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
-- We organize files as avatars/{user_id}/{filename} or just avatars/{user_id}
create policy "Users can upload their own avatar."
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.uid() = owner );

-- Allow users to update their own avatar
create policy "Users can update their own avatar."
on storage.objects for update
using ( bucket_id = 'avatars' and auth.uid() = owner );

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar."
on storage.objects for delete
using ( bucket_id = 'avatars' and auth.uid() = owner );
