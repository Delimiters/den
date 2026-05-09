-- Friendships table
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references users(id) on delete cascade not null,
  addressee_id uuid references users(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'blocked')) not null default 'pending',
  created_at timestamptz default now() not null,
  constraint friendships_unique_pair unique (requester_id, addressee_id),
  constraint friendships_no_self_request check (requester_id != addressee_id)
);

alter table friendships enable row level security;

create policy "users can view their friendships" on friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users can send friend requests" on friendships
  for insert with check (requester_id = auth.uid());

create policy "addressee can update friendship status" on friendships
  for update using (addressee_id = auth.uid());

create policy "either party can remove friendship" on friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Enable realtime
alter table friendships replica identity full;
