-- Private storage for company logos shown on invoices.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Files live at logos/<user id>/<file>, and each user can only touch their own folder.
-- PNG and JPG only: those are the image types the PDF generator can embed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "Users read their own logos" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update their own logos" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own logos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
