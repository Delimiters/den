-- Allow Supabase Realtime to filter DELETE events on voice_sessions by guild_id.
-- Without FULL replica identity, deleted row values aren't available to the
-- Realtime engine, so guild_id filters silently drop all DELETE events.
alter table public.voice_sessions replica identity full;
