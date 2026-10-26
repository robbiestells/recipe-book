-- Mise en Place: photo storage for recipes.
-- Run once in your Supabase project: SQL Editor -> New query -> paste -> Run. Safe to run again.
--
-- Photos live in a public "recipe-images" bucket so they load quickly anywhere, under a folder
-- named after each person's user id with hard-to-guess file names. Only the owner can add,
-- replace or delete files in their own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Recipe images: read own"   on storage.objects;
drop policy if exists "Recipe images: upload own" on storage.objects;
drop policy if exists "Recipe images: update own" on storage.objects;
drop policy if exists "Recipe images: delete own" on storage.objects;

create policy "Recipe images: read own" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Recipe images: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Recipe images: update own" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Recipe images: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = auth.uid()::text);
