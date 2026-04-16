-- RLS policies for message_reactions
-- Run in Supabase SQL Editor

create policy "Guild members can view reactions"
  on public.message_reactions for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
      and c.guild_id in (select public.get_my_guild_ids())
    )
  );

create policy "Users can add their own reactions"
  on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can remove their own reactions"
  on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());
