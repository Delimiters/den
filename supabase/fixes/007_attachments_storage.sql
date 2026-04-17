-- Attachments storage bucket + RLS for attachments table
-- Run in Supabase SQL Editor

-- Storage bucket for message attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "Attachments are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "Authenticated users can upload attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');

create policy "Users can delete their own attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- RLS for attachments table
alter table public.attachments enable row level security;

create policy "Guild members can view attachments"
  on public.attachments for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = attachments.message_id
      and c.guild_id in (select public.get_my_guild_ids())
    )
  );

create policy "Authors can insert attachments"
  on public.attachments for insert to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = attachments.message_id
      and m.author_id = auth.uid()
    )
  );
