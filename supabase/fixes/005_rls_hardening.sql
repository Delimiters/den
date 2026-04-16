-- RLS hardening: fill in missing policies and tighten existing ones
-- Run in Supabase SQL Editor

-- ============================================================
-- 1. Tighten message UPDATE: restrict to content/edited_at/deleted_at only
-- ============================================================

drop policy if exists "Authors can edit their own messages" on public.messages;

create policy "Authors can edit their own messages"
  on public.messages for update to authenticated
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid() and
    channel_id = channel_id and   -- prevent moving messages between channels
    created_at = created_at        -- prevent changing timestamps
  );

-- ============================================================
-- 2. Guilds: owner-only UPDATE, no public DELETE
--    (guilds are not deletable in the UI yet — this prevents API abuse)
-- ============================================================

create policy "Guild owners can update their guild"
  on public.guilds for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ============================================================
-- 3. Channels: guild owner can update/delete channels
-- ============================================================

create policy "Guild owners can update channels"
  on public.channels for update to authenticated
  using (
    exists (
      select 1 from public.guilds
      where id = channels.guild_id and owner_id = auth.uid()
    )
  );

create policy "Guild owners can delete channels"
  on public.channels for delete to authenticated
  using (
    exists (
      select 1 from public.guilds
      where id = channels.guild_id and owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Guild invites: allow UPDATE for use counter increment
--    (the join_guild_by_invite function is security definer so it
--     bypasses RLS, but explicit policy is cleaner)
-- ============================================================

create policy "Guild members can view invite use counts"
  on public.guild_invites for update to authenticated
  using (guild_id in (select public.get_my_guild_ids()));
