# No-auth staff dashboard — design

## Context

The app currently gates every staff page behind Supabase email/password auth
(`utils/AuthContext.js`, `pages/login.js`) and shows a splash video on every
load (`components/ui/SplashScreen.js`). Staff identity (`staffProfile`) drives
`hospital_id`/`staff_id` on writes to `dispenses` and `patient_reports`.

The user wants the app to open straight into a working dashboard — no splash,
no login — and to be usable as an actual admin tool for hospitals, patients,
and medicine catalog/pricing, not just the single "find a patient" flow it has
today.

Separately, a prior "tablet app" effort (migrations `0004`–`0009`) already
opened most tables (`patients`, `medicines`, `hospitals`, `patient_reports`,
`dose_logs`, `push_tokens`) to the `anon` role for read/write. Removing staff
login is a continuation of that direction, not a new risk category — the main
gaps are `dispenses`/`dispense_items` writes, which are still
`authenticated`-only, and `dispenses.staff_id` being `NOT NULL`.

## Decisions (confirmed with user)

- **Hospital identity without login**: a persistent hospital picker (stored in
  `localStorage`), not a fixed hospital, not a staff-name dropdown. Staff
  attribution (`staff_id`) is dropped — new dispenses simply have `staff_id =
  null`.
- **Pricing**: a single `price numeric(10,2)` column on `medicines`. No
  cost-price/stock/inventory tracking.
- **Scope for this pass**: Dashboard/overview, Patients management, Medicines
  & prices, Hospitals management. Dispense and report-attach flows are kept as
  they are, just repointed at the hospital picker instead of staff auth.

## Schema changes (one migration)

`supabase/migrations/0014_remove_auth_dashboard_access.sql`:

- `alter table public.dispenses alter column staff_id drop not null;`
- Grant `insert` on `dispenses` and `dispense_items` to `anon`, with matching
  permissive RLS insert policies (mirrors the existing pattern used for
  `hospitals`/`medicines` in migration `0007`).
- Grant `update` on `patients` to `anon` with a matching RLS policy (covers
  future patient-detail edits; low risk since `select`/`insert` are already
  anon).
- `alter table public.medicines add column if not exists price
  numeric(10,2);`

Use the `supabase` skill when writing/applying this migration.

## Application changes

### Removed
- `pages/login.js`
- `utils/AuthContext.js`
- `components/ui/SplashScreen.js`, `public/splashscreen.mp4`
- The `AuthProvider` wrap, splash-state, and redirect-to-`/login` logic in
  `pages/_app.js`.

### Added
- `utils/HospitalContext.js` — loads hospitals (`lib/hospitals.js`), reads/
  writes the selected hospital id to `localStorage`, exposes
  `{ hospitals, currentHospital, setCurrentHospitalId, loading }` via
  `useHospital()`. Defaults to the first hospital (by name) when nothing is
  stored yet.
- `lib/hospitals.js` — `listHospitals`, `createHospital`, `updateHospital`
  (thin Supabase wrappers, following the existing style in `lib/patients.js`).
- `lib/patients.js` — add `listPatients({ query, limit })` for the patients
  browse list (`ilike` over name/mobile, similar to `searchMedicines`).
- `lib/medicines.js` — add `updateMedicine(id, { name, price, category })` (or
  extend the existing update helper) so price is editable after creation.
- `pages/patients/index.js` — the search/register widget currently on
  `pages/index.js`, plus a list of patients below it (via `listPatients`).
- `pages/hospitals/index.js` — list of hospitals with inline add/edit form
  (name, code, address, phone).

### Changed
- `pages/index.js` — becomes the dashboard: stat cards (patient count,
  medicine count, hospital count, dispense count) and quick links to
  Patients/Medicines/Hospitals. The mobile-search widget moves to
  `pages/patients/index.js`.
- `pages/catalog.js` — add a price `Input` to the "add medicine" form; each
  medicine card gets an inline-editable price field that saves on blur via
  `updateMedicine`.
- `components/ui/TopNav.js` — becomes a real nav bar with links (Dashboard,
  Patients, Medicines, Hospitals) and the hospital picker (`useHospital`)
  where the staff name/logout button used to be.
- `pages/dispense/new.js`, `pages/reports/new.js` — replace `useAuth()` /
  `staffProfile` with `useHospital()`; `hospitalId` comes from the picker,
  `staffId` is passed as `null`.
- `pages/_app.js` — wrap the tree in `HospitalProvider` instead of
  `AuthProvider`; drop the splash render.

## Error handling

No new error paths beyond what already exists (`try/catch` + `setError`
around each Supabase call, following the current convention in every page).
If `localStorage` has no hospital yet and the hospitals list is still loading,
dispense/report actions that need `currentHospital` should just wait for
`loading` to resolve, same as existing "Loading patient…" guards.

## Testing

- Update `lib/__tests__/dispenses.test.js`: `staffId` is no longer required —
  cover the `staffId: null` case instead of `'s1'`.
- Run `npm test` and `npm run lint`.
- Manual pass in the browser (dev server): dashboard loads directly (no
  splash/login) → hospital picker works and persists across reload → Patients
  page search/register/list → dispense flow still saves (with null staff_id)
  → Medicines page add/edit price → Hospitals page add/edit.

## Out of scope (not building now)

- Inventory/stock tracking, cost price.
- Re-adding any form of staff-level identity or permissions.
- Editing the patient detail page itself beyond what already exists.
