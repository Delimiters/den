-- Voice sessions: tracks who is currently in which voice channel
-- Run in Supabase SQL Editor

create table if not exists public.voice_sessions (
  user_id   uuid primary key references public.users(id)    on delete cascade,
  channel_id uuid not null   references public.channels(id) on delete cascade,
  guild_id   uuid not null   references public.guilds(id)   on delete cascade,
  joined_at  timestamptz not null default now()
);

create index if not exists voice_sessions_channel on public.voice_sessions (channel_id);
create index if not exists voice_sessions_guild   on public.voice_sessions (guild_id);

alter table public.voice_sessions enable row level security;

create policy "Guild members can view voice sessions"
  on public.voice_sessions for select to authenticated
  using (guild_id in (select public.get_my_guild_ids()));

create policy "Users can upsert their own voice session"
  on public.voice_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own voice session"
  on public.voice_sessions for update to authenticated
  using (user_id = auth.uid());

create policy "Users can delete their own voice session"
  on public.voice_sessions for delete to authenticated
  using (user_id = auth.uid());

-- Enable realtime so sidebar participant lists update instantly
alter publication supabase_realtime add table public.voice_sessions;
