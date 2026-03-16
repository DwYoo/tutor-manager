-- Create teacher_todos table for personal todo management
create table if not exists teacher_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  category text not null default '기타' check (category in ('수업준비', '행정', '학부모연락', '기타')),
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table teacher_todos enable row level security;

-- Users can only access their own todos
create policy "teacher_todos_own" on teacher_todos
  for all using (auth.uid() = user_id);

-- Index for fast per-user queries
create index if not exists teacher_todos_user_id_idx on teacher_todos(user_id, sort_order);

-- Auto-update updated_at
create or replace function update_teacher_todos_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teacher_todos_updated_at
  before update on teacher_todos
  for each row execute function update_teacher_todos_updated_at();
