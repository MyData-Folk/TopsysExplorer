-- Table de configuration utilisateur (une ligne par utilisateur)
create table public.user_config (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.user_config enable row level security;

create policy "owner select"
  on public.user_config for select
  using (auth.uid() = owner_id);

create policy "owner insert"
  on public.user_config for insert
  with check (auth.uid() = owner_id);

create policy "owner update"
  on public.user_config for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner delete"
  on public.user_config for delete
  using (auth.uid() = owner_id);

-- Accès API REST
grant select, insert, update, delete
  on public.user_config
  to authenticated;

-- Trigger updated_at
create or replace function public.update_user_config_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_config_updated_at
  before update on public.user_config
  for each row execute function public.update_user_config_timestamp();
