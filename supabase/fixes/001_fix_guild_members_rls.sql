drop policy "Members can view their guild's member list" on public.guild_members;

create or replace function public.get_my_guild_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select guild_id from public.guild_members where user_id = auth.uid()
$$;

create policy "Members can view guild memberships"
  on public.guild_members for select to authenticated
  using (guild_id in (select public.get_my_guild_ids()));
