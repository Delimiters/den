-- Message reply threading
-- Adds reply_to_id to messages and dm_messages so messages can quote-reply another

alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

alter table public.dm_messages
  add column if not exists reply_to_id uuid references public.dm_messages(id) on delete set null;

create index if not exists messages_reply_to_id on public.messages (reply_to_id);
create index if not exists dm_messages_reply_to_id on public.dm_messages (reply_to_id);
