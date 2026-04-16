-- Replace single static invite_code per guild with a proper guild_invites table
-- Supports expiry, max uses, and multiple active invites per guild
-- Run in Supabase SQL Editor

-- Create guild_invites table
create table public.guild_invites (
  id uuid default gen_random_uuid() primary key,
  guild_id uuid references public.guilds(id) on delete cascade not null,
  code text unique not null default substring(encode(gen_random_bytes(6), 'hex') from 1 for 8),
  created_by uuid references public.users(id) not null,
  expires_at timestamptz,   -- null = never expires
  max_uses integer,         -- null = unlimited
  uses integer not null default 0,
  created_at timestamptz default now() not null
);

create index guild_invites_guild_id on public.guild_invites (guild_id);
create index guild_invites_code on public.guild_invites (code);

-- RLS
alter table public.guild_invites enable row level security;

create policy "Guild members can view their guild's invites"
  on public.guild_invites for select to authenticated
  using (guild_id in (select public.get_my_guild_ids()));

create policy "Guild members can create invites"
  on public.guild_invites for insert to authenticated
  with check (
    created_by = auth.uid() and
    guild_id in (select public.get_my_guild_ids())
  );

create policy "Invite creator can delete their invite"
  on public.guild_invites for delete to authenticated
  using (created_by = auth.uid());

-- Migrate existing invite codes from guilds table into guild_invites
-- (creates one never-expiring invite per guild for existing guilds)
insert into public.guild_invites (guild_id, code, created_by)
select g.id, g.invite_code, g.owner_id
from public.guilds g
where g.invite_code is not null
on conflict (code) do nothing;

-- Replace join_guild_by_invite to use guild_invites table
create or replace function public.join_guild_by_invite(invite text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_guild_id uuid;
  v_invite_id uuid;
  v_max_uses integer;
  v_uses integer;
  v_expires_at timestamptz;
begin
  select id, guild_id, max_uses, uses, expires_at
  into v_invite_id, v_guild_id, v_max_uses, v_uses, v_expires_at
  from public.guild_invites
  where code = invite;

  if v_guild_id is null then
    raise exception 'Invalid invite code';
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    raise exception 'Invite link has expired';
  end if;

  if v_max_uses is not null and v_uses >= v_max_uses then
    raise exception 'Invite link has reached its maximum uses';
  end if;

  insert into public.guild_members (guild_id, user_id)
  values (v_guild_id, auth.uid())
  on conflict (guild_id, user_id) do nothing;

  -- Increment use count
  update public.guild_invites set uses = uses + 1 where id = v_invite_id;

  return v_guild_id;
end;
$$;
