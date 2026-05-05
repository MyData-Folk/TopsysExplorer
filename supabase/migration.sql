-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Table principale
create table public.user_reports (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  filename           text not null,
  period_str         text not null default '',
  establishment_name text not null default '',
  upload_date        timestamptz not null default now(),
  is_public          boolean not null default false, -- réservé pour partage public futur (aucune politique RLS active pour l'instant)
  data               jsonb not null
);

-- Index pour listage rapide par propriétaire
create index on public.user_reports (owner_id, upload_date desc);

-- RLS
alter table public.user_reports enable row level security;

-- Propriétaire : lecture
create policy "owner select"
  on public.user_reports for select
  using (auth.uid() = owner_id);

-- Propriétaire : insertion
create policy "owner insert"
  on public.user_reports for insert
  with check (auth.uid() = owner_id);

-- Propriétaire : suppression
create policy "owner delete"
  on public.user_reports for delete
  using (auth.uid() = owner_id);

-- Accès API REST pour les utilisateurs connectés
grant select, insert, delete
  on public.user_reports
  to authenticated;
