-- ============================================================
-- Den — Initial Schema
-- Run this in the Supabase SQL Editor for your project
-- ============================================================

-- Users (profile data, synced from auth.users via trigger)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  status text not null default 'offline' check (status in ('online', 'idle', 'dnd', 'offline')),
  created_at timestamptz default now() not null
);

-- Guilds (servers)
create table public.guilds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  icon_url text,
  owner_id uuid references public.users(id) not null,
  invite_code text unique default substring(encode(gen_random_bytes(6), 'hex') from 1 for 8) not null,
  created_at timestamptz default now() not null
);

-- Channels
create table public.channels (
  id uuid default gen_random_uuid() primary key,
  guild_id uuid references public.guilds(id) on delete cascade not null,
  name text not null,
  type text not null default 'text' check (type in ('text', 'voice', 'category')),
  position integer not null default 0,
  parent_id uuid references public.channels(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade not null,
  author_id uuid references public.users(id) not null,
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz default now() not null,
  edited_at timestamptz,
  deleted_at timestamptz
);

-- Guild members
create table public.guild_members (
  guild_id uuid references public.guilds(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now() not null,
  nickname text,
  primary key (guild_id, user_id)
);

-- User presence
create table public.user_presence (
  user_id uuid references public.users(id) on delete cascade primary key,
  status text not null default 'offline' check (status in ('online', 'idle', 'dnd', 'offline')),
  last_seen timestamptz default now() not null
);

-- Message reactions
create table public.message_reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  emoji text not null,
  primary key (message_id, user_id, emoji)
);

-- ============================================================
-- Indexes
-- ============================================================

create index messages_channel_id_created_at on public.messages (channel_id, created_at desc);
create index guild_members_user_id on public.guild_members (user_id);
create index channels_guild_id_position on public.channels (guild_id, position);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users enable row level security;
alter table public.guilds enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.guild_members enable row level security;
alter table public.user_presence enable row level security;
alter table public.message_reactions enable row level security;

-- Users
create policy "Authenticated users can view all users"
  on public.users for select to authenticated using (true);
create policy "Users can insert their own record"
  on public.users for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own record"
  on public.users for update to authenticated using (auth.uid() = id);

-- Guilds: visible to members only
create policy "Guild members can view their guilds"
  on public.guilds for select to authenticated
  using (exists (
    select 1 from public.guild_members
    where guild_id = guilds.id and user_id = auth.uid()
  ));
create policy "Authenticated users can create guilds"
  on public.guilds for insert to authenticated
  with check (owner_id = auth.uid());

-- Guild members
create policy "Members can view their guild's member list"
  on public.guild_members for select to authenticated
  using (exists (
    select 1 from public.guild_members my_mem
    where my_mem.guild_id = guild_members.guild_id and my_mem.user_id = auth.uid()
  ));
create policy "Users can join guilds"
  on public.guild_members for insert to authenticated
  with check (user_id = auth.uid());

-- Channels: visible to guild members
create policy "Guild members can view channels"
  on public.channels for select to authenticated
  using (exists (
    select 1 from public.guild_members
    where guild_id = channels.guild_id and user_id = auth.uid()
  ));
create policy "Guild members can create channels"
  on public.channels for insert to authenticated
  with check (exists (
    select 1 from public.guild_members
    where guild_id = channels.guild_id and user_id = auth.uid()
  ));

-- Messages
create policy "Guild members can view channel messages"
  on public.messages for select to authenticated
  using (
    deleted_at is null and
    exists (
      select 1 from public.guild_members gm
      join public.channels c on c.guild_id = gm.guild_id
      where c.id = messages.channel_id and gm.user_id = auth.uid()
    )
  );
create policy "Guild members can send messages"
  on public.messages for insert to authenticated
  with check (
    author_id = auth.uid() and
    exists (
      select 1 from public.guild_members gm
      join public.channels c on c.guild_id = gm.guild_id
      where c.id = messages.channel_id and gm.user_id = auth.uid()
    )
  );
create policy "Authors can edit their own messages"
  on public.messages for update to authenticated
  using (author_id = auth.uid());

-- User presence
create policy "Authenticated users can view presence"
  on public.user_presence for select to authenticated using (true);
create policy "Users manage their own presence"
  on public.user_presence for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Triggers
-- ============================================================

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-add owner as member + create default channel when guild is created
create or replace function public.handle_new_guild()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.guild_members (guild_id, user_id)
  values (new.id, new.owner_id);

  insert into public.channels (guild_id, name, type, position)
  values (new.id, 'general', 'text', 0);

  return new;
end;
$$;

create trigger on_guild_created
  after insert on public.guilds
  for each row execute procedure public.handle_new_guild();

-- ============================================================
-- Functions
-- ============================================================

-- Join a guild via invite code (returns the guild_id)
create or replace function public.join_guild_by_invite(invite text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_guild_id uuid;
begin
  select id into v_guild_id from public.guilds where invite_code = invite;
  if v_guild_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.guild_members (guild_id, user_id)
  values (v_guild_id, auth.uid())
  on conflict (guild_id, user_id) do nothing;

  return v_guild_id;
end;
$$;

-- ============================================================
-- Enable Realtime
-- ============================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.user_presence;
alter publication supabase_realtime add table public.guild_members;
