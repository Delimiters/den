-- Create DM tables + RLS + functions (run this instead of 006 if dm_channels doesn't exist)
-- Run in Supabase SQL Editor

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.dm_channels (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null
);

create table if not exists public.dm_participants (
  dm_channel_id uuid references public.dm_channels(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  primary key (dm_channel_id, user_id)
);

create table if not exists public.dm_messages (
  id uuid default gen_random_uuid() primary key,
  dm_channel_id uuid references public.dm_channels(id) on delete cascade not null,
  author_id uuid references public.users(id) not null,
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz default now() not null,
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists dm_messages_channel_created on public.dm_messages (dm_channel_id, created_at desc);

-- ============================================================
-- RLS
-- ============================================================

alter table public.dm_channels enable row level security;
alter table public.dm_participants enable row level security;
alter table public.dm_messages enable row level security;

create or replace function public.get_my_dm_channel_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select dm_channel_id from public.dm_participants where user_id = auth.uid()
$$;

create policy "Participants can view their DM channels"
  on public.dm_channels for select to authenticated
  using (id in (select public.get_my_dm_channel_ids()));

create policy "Participants can view DM members"
  on public.dm_participants for select to authenticated
  using (dm_channel_id in (select public.get_my_dm_channel_ids()));

create policy "System can insert DM participants"
  on public.dm_participants for insert to authenticated
  with check (true);

create policy "Participants can view DM messages"
  on public.dm_messages for select to authenticated
  using (
    deleted_at is null and
    dm_channel_id in (select public.get_my_dm_channel_ids())
  );

create policy "Participants can send DM messages"
  on public.dm_messages for insert to authenticated
  with check (
    author_id = auth.uid() and
    dm_channel_id in (select public.get_my_dm_channel_ids())
  );

create policy "Authors can edit their DM messages"
  on public.dm_messages for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid() and
    dm_channel_id = dm_channel_id and
    created_at = created_at
  );

-- ============================================================
-- get_or_create_dm function
-- ============================================================

create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_channel_id uuid;
begin
  select p1.dm_channel_id into v_channel_id
  from public.dm_participants p1
  join public.dm_participants p2
    on p1.dm_channel_id = p2.dm_channel_id
  where p1.user_id = auth.uid()
    and p2.user_id = other_user_id
  limit 1;

  if v_channel_id is not null then
    return v_channel_id;
  end if;

  insert into public.dm_channels default values returning id into v_channel_id;

  insert into public.dm_participants (dm_channel_id, user_id)
  values (v_channel_id, auth.uid()), (v_channel_id, other_user_id);

  return v_channel_id;
end;
$$;

-- ============================================================
-- Enable Realtime
-- ============================================================

alter publication supabase_realtime add table public.dm_messages;
