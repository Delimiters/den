-- DM message attachments (mirrors the guild attachments table)
create table if not exists public.dm_attachments (
  id           uuid primary key default gen_random_uuid(),
  dm_message_id uuid not null references public.dm_messages(id) on delete cascade,
  file_url     text not null,
  file_name    text not null,
  file_size    bigint not null,
  content_type text not null default 'application/octet-stream',
  created_at   timestamptz not null default now()
);

alter table public.dm_attachments enable row level security;

-- DM participants can see attachments in their conversations
create policy "dm participants can view attachments"
  on public.dm_attachments for select
  using (
    exists (
      select 1 from public.dm_messages dm
      join public.dm_participants dp on dp.dm_channel_id = dm.dm_channel_id
      where dm.id = dm_attachments.dm_message_id
        and dp.user_id = auth.uid()
    )
  );

-- Authenticated users can insert attachments for their own messages
create policy "users can insert own dm attachments"
  on public.dm_attachments for insert
  with check (
    exists (
      select 1 from public.dm_messages dm
      where dm.id = dm_attachments.dm_message_id
        and dm.author_id = auth.uid()
    )
  );
