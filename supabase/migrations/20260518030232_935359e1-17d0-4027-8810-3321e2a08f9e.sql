
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Chat images are publicly readable"
on storage.objects for select
using (bucket_id = 'chat-images');

create policy "Users upload chat images to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users update own chat images"
on storage.objects for update to authenticated
using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own chat images"
on storage.objects for delete to authenticated
using (bucket_id = 'chat-images' and auth.uid()::text = (storage.foldername(name))[1]);
