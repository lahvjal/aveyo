-- Migration: Create custom_kpis table for dynamic KPI formulas
-- Run this in Supabase SQL Editor

create table if not exists custom_kpis (
  id uuid default gen_random_uuid() primary key,
  kpi_id text unique not null,
  name text not null,
  description text,
  format text not null check (format in ('number', 'currency', 'percentage', 'days')),
  formula_type text not null check (formula_type in ('sql', 'expression')),
  formula text not null,
  field_mappings jsonb default '{}'::jsonb,
  available_periods text[] not null default array['current_week', 'previous_week', 'mtd', 'ytd']::text[],
  section_id text not null,
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add RLS policies
alter table custom_kpis enable row level security;

-- Public can read active KPIs (needed for dashboard)
create policy "Public can read active KPIs"
  on custom_kpis for select
  using (is_active = true);

-- Authenticated users can manage KPIs
create policy "Authenticated can insert KPIs"
  on custom_kpis for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated can update KPIs"
  on custom_kpis for update
  using (auth.role() = 'authenticated');

create policy "Authenticated can delete KPIs"
  on custom_kpis for delete
  using (auth.role() = 'authenticated');

-- Create index for performance
create index if not exists custom_kpis_kpi_id_idx on custom_kpis(kpi_id);
create index if not exists custom_kpis_section_id_idx on custom_kpis(section_id);
create index if not exists custom_kpis_is_active_idx on custom_kpis(is_active);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_custom_kpis_updated_at
  before update on custom_kpis
  for each row
  execute function update_updated_at_column();
