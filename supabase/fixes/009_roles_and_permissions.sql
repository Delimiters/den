-- Roles and permissions system
-- Run in Supabase SQL Editor

-- Permission bitfield constants (documented here for reference):
--   SEND_MESSAGES    = 1
--   READ_MESSAGES    = 2
--   MANAGE_CHANNELS  = 4
--   MANAGE_GUILD     = 8
--   KICK_MEMBERS     = 16
--   BAN_MEMBERS      = 32
--   MANAGE_MESSAGES  = 64  (edit/delete others' messages)
--   MANAGE_ROLES     = 128
--   ADMINISTRATOR    = 256 (bypasses all checks)

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  name text not null,
  color text not null default '#99aab5',
  permissions_bitfield integer not null default 3, -- SEND_MESSAGES | READ_MESSAGES
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists roles_guild_id on public.roles (guild_id);

create table if not exists public.member_roles (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (guild_id, user_id, role_id)
);

create index if not exists member_roles_user on public.member_roles (guild_id, user_id);

-- has_permission must be created BEFORE the RLS policies that reference it
create or replace function public.has_permission(
  p_user_id uuid,
  p_guild_id uuid,
  p_permission integer
)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_is_owner boolean;
  v_combined integer := 0;
begin
  -- Guild owner always has all permissions
  select (owner_id = p_user_id) into v_is_owner
  from public.guilds where id = p_guild_id;

  if v_is_owner then return true; end if;

  -- Sum permission bitfields from all roles assigned to user
  select coalesce(bit_or(r.permissions_bitfield), 0)
  into v_combined
  from public.member_roles mr
  join public.roles r on r.id = mr.role_id
  where mr.guild_id = p_guild_id and mr.user_id = p_user_id;

  -- ADMINISTRATOR (256) bypasses all permission checks
  if (v_combined & 256) <> 0 then return true; end if;

  return (v_combined & p_permission) <> 0;
end;
$$;

-- RLS
alter table public.roles enable row level security;
alter table public.member_roles enable row level security;

create policy "Guild members can view roles"
  on public.roles for select to authenticated
  using (guild_id in (select public.get_my_guild_ids()));

create policy "Members with MANAGE_ROLES can insert roles"
  on public.roles for insert to authenticated
  with check (public.has_permission(auth.uid(), guild_id, 128));

create policy "Members with MANAGE_ROLES can update roles"
  on public.roles for update to authenticated
  using (public.has_permission(auth.uid(), guild_id, 128));

create policy "Members with MANAGE_ROLES can delete roles"
  on public.roles for delete to authenticated
  using (public.has_permission(auth.uid(), guild_id, 128));

create policy "Guild members can view member_roles"
  on public.member_roles for select to authenticated
  using (guild_id in (select public.get_my_guild_ids()));

create policy "Members with MANAGE_ROLES can assign roles"
  on public.member_roles for insert to authenticated
  with check (public.has_permission(auth.uid(), guild_id, 128));

create policy "Members with MANAGE_ROLES can remove roles"
  on public.member_roles for delete to authenticated
  using (public.has_permission(auth.uid(), guild_id, 128));

-- Create a default @everyone role for all existing guilds
insert into public.roles (guild_id, name, color, permissions_bitfield, position)
select id, '@everyone', '#99aab5', 3, 0
from public.guilds
on conflict do nothing;

-- Trigger: auto-create @everyone role when a guild is created
create or replace function public.on_guild_created_roles()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.roles (guild_id, name, color, permissions_bitfield, position)
  values (new.id, '@everyone', '#99aab5', 3, 0);
  return new;
end;
$$;

create trigger on_guild_created_roles
  after insert on public.guilds
  for each row execute function public.on_guild_created_roles();
