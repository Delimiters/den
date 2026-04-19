-- Pinned messages per channel
-- Stores which messages are pinned; ordered by pin time

create table if not exists public.pinned_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references public.users(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  unique (channel_id, message_id)
);

create index if not exists pinned_messages_channel_id on public.pinned_messages (channel_id);

alter table public.pinned_messages enable row level security;

-- Guild members can view pins in their guild's channels
create policy "Members can view pins"
  on public.pinned_messages for select to authenticated
  using (
    exists (
      select 1 from public.channels c
      where c.id = pinned_messages.channel_id
      and c.guild_id in (select public.get_my_guild_ids())
    )
  );

-- Members can pin messages (further permission checks handled in app)
create policy "Members can pin messages"
  on public.pinned_messages for insert to authenticated
  with check (
    pinned_by = auth.uid()
    and exists (
      select 1 from public.channels c
      where c.id = pinned_messages.channel_id
      and c.guild_id in (select public.get_my_guild_ids())
    )
  );

-- Members can unpin (delete)
create policy "Members can unpin messages"
  on public.pinned_messages for delete to authenticated
  using (
    exists (
      select 1 from public.channels c
      where c.id = pinned_messages.channel_id
      and c.guild_id in (select public.get_my_guild_ids())
    )
  );
