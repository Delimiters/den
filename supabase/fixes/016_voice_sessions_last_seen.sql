-- Add last_seen to voice_sessions for stale-session detection.
-- Sessions that stop sending heartbeats (app crash/kill) will be ignored
-- by the sidebar after 2 minutes. The app also clears its own stale row
-- on startup, so reopening after a force-quit clears it immediately.
--
-- Run in Supabase SQL Editor.

alter table public.voice_sessions
  add column if not exists last_seen timestamptz not null default now();
