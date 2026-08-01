-- supabase/migrations/0014_remove_auth_dashboard_access.sql

-- The staff dashboard no longer requires login, so dispenses can no longer
-- rely on an authenticated staff_id being present.
alter table public.dispenses alter column staff_id drop not null;

-- Allow the anon role (used by the now-login-free staff dashboard) to create
-- dispenses and dispense items, mirroring the anon write access already
-- granted to hospitals/medicines/patients in earlier migrations (0004, 0007).
create policy "anon can create dispenses" on public.dispenses
  for insert to anon with check (true);
grant insert on public.dispenses to anon;

create policy "anon can create dispense items" on public.dispense_items
  for insert to anon with check (true);
grant insert on public.dispense_items to anon;

-- Allow the dashboard to edit patient details without login.
create policy "anon can update patients" on public.patients
  for update to anon using (true) with check (true);
grant update on public.patients to anon;

-- Medicine pricing, editable from the catalog page.
alter table public.medicines add column if not exists price numeric(10,2);
