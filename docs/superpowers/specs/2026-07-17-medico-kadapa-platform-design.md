# Medico Kadapa — Platform Design

Date: 2026-07-17
Status: Approved for implementation planning

## 1. Product summary

Medico Kadapa is a two-sided medicine-adherence platform for the Kadapa market, free at launch:

- **Pharmacy/hospital web app** (`medisin_app`, Next.js) — staff look up a patient by mobile number, dispense medicines with dosage timing, and can attach OP reports/scans. Replaces writing dosage instructions on the back of a paper strip.
- **Patient mobile app** (`medisin_app_mobile`, Expo/React Native) — patients see their dashboard of medicines to take (with the actual tablet photo, not just a name), get push reminders, and can browse their full medicine + report history across every hospital they've visited.

Both share one Supabase backend (Postgres + Auth + Storage + scheduled functions).

## 2. Build phases

1. **Phase 1 (this planning cycle): Backend + Pharmacy web app.** Stand up the Supabase schema/auth/storage, finish the dispensing flow in `medisin_app`, get staff able to register patients, dispense medicines against a pre-seeded photo catalog, and attach reports.
2. **Phase 2 (next planning cycle): Patient mobile app.** Build `medisin_app_mobile` out from its current default-template state against the real backend from Phase 1: passwordless login, dashboard with push reminders, Patient Records tab.

This doc covers the full data model and architecture (shared by both phases) plus the screen-level design for each phase. The implementation plan that follows this spec covers **Phase 1 only**; Phase 2 gets its own plan once Phase 1 ships.

## 3. Roles & auth

- **Superadmin** (the founding team) — provisions hospital accounts. No dedicated UI in v1; done by inserting a row directly via the Supabase dashboard, since there are only a handful of pilot hospitals. Revisit if the hospital count grows past a few.
- **Hospital staff** — one flat role, no staff/admin split. Logs into the web app with Supabase Auth (email + password) created by the superadmin. Every staff account is scoped to exactly one hospital via `staff_profiles.hospital_id`, but **patient records themselves are not siloed per hospital** — any staff at any hospital can look up any patient by mobile and see their full history. This is deliberate: the value of the product is a portable medical record that follows the patient across hospitals, not a per-shop ledger. Each dispense still records which hospital/staff created it for provenance.
- **Patient** — passwordless. The app asks for a mobile number only; if no patient row exists with that mobile, one is created on the spot. The same mobile number is the join key whether the patient's identity originates from the app (self "login") or from a hospital dispensing to them for the first time.

**Known trade-off:** because there's no OTP or password on the patient side, anyone who knows a patient's mobile number can open the app and see that patient's medicine and report history. This was chosen deliberately to keep the trial free (real SMS OTP has a per-message cost) and frictionless. Acceptable for a pilot in a trusted rollout; before wider public launch, add either a 4-digit PIN (no cost) or real OTP (small per-SMS cost) as a fast-follow.

## 4. Data model (Supabase Postgres)

```
hospitals
  id uuid pk
  name text
  address text
  phone text
  created_at timestamptz

staff_profiles                 -- 1:1 with a Supabase auth.users row
  id uuid pk references auth.users
  hospital_id uuid references hospitals
  full_name text
  created_at timestamptz

patients
  id uuid pk
  mobile text unique not null
  name text
  age int
  gender text
  created_at timestamptz

medicines                      -- master catalog, shared across all hospitals, pre-seeded with photos
  id uuid pk
  name text not null
  image_url text
  category text
  created_at timestamptz

dispenses                      -- one dispensing event ("this visit, these medicines")
  id uuid pk
  patient_id uuid references patients
  hospital_id uuid references hospitals
  staff_id uuid references staff_profiles
  notes text
  created_at timestamptz

dispense_items                 -- one medicine within a dispense, with its own schedule
  id uuid pk
  dispense_id uuid references dispenses
  medicine_id uuid references medicines
  timing text[]                -- subset of {morning, afternoon, night}
  food_instruction text        -- 'before_food' | 'after_food'
  quantity text                -- e.g. "1 tablet"
  duration_days int
  created_at timestamptz

patient_reports                -- OP reports / scans, from either side
  id uuid pk
  patient_id uuid references patients
  hospital_id uuid references hospitals nullable
  uploaded_by text             -- 'patient' | 'hospital'
  uploaded_by_staff_id uuid references staff_profiles nullable
  label text
  file_url text
  file_type text                -- 'image' | 'pdf'
  created_at timestamptz

push_tokens
  id uuid pk
  patient_id uuid references patients
  expo_push_token text unique
  device_info text
  created_at timestamptz

dose_logs                      -- "mark as taken", Phase 2 but modeled now
  id uuid pk
  dispense_item_id uuid references dispense_items
  patient_id uuid references patients
  slot text                    -- 'morning' | 'afternoon' | 'night'
  dose_date date                -- calendar date this log covers (prevents duplicate marks/day)
  taken_at timestamptz
```

Storage buckets: `medicine-images` (public read — needed so the app can render photos directly), `patient-reports` (private, served via signed URLs — these are sensitive documents).

## 5. Notifications

Two triggers, both via Expo's push service (free):

1. **Instant, on dispense.** A Supabase database webhook on `dispense_items` insert calls an Edge Function that looks up the patient's push token(s) and sends "New medicine added: <name> (+N more)" with the first medicine's photo.
2. **Scheduled dose reminders.** A scheduled Edge Function (pg_cron) runs at three fixed times a day (~8am / 2pm / 9pm IST, matching the morning/afternoon/night slots staff choose at dispense time). For each slot, it finds active `dispense_items` (within `duration_days` of their dispense date) whose `timing` includes that slot, excludes ones already in `dose_logs` for today, and sends one push per patient with the medicine photo, name, and quantity.

## 6. Phase 1 — Pharmacy/hospital web app (`medisin_app`)

Builds on the existing prototype pages rather than starting over; `login.js`, `patient.js`, `dashboard.js` already sketch this flow but run against `utils/mockDb.js` (in-memory, resets on restart) — these get rewired to real Supabase queries, and `utils/supabaseClient.js`'s placeholder credentials get replaced with a real project's.

Screens:
1. **Login** — staff email + password (Supabase Auth), replacing the current hardcoded-OTP demo.
2. **Home** — patient search by mobile number; recent dispense activity.
3. **Patient profile** — name/age/gender (editable), history of past dispenses and reports, buttons for "Dispense Medicine" and "Attach Report". Not-found mobile numbers offer a quick "register new patient" (name + mobile).
4. **Dispense medicine** — search/select medicines from the pre-seeded catalog (photo shown inline), per medicine: timing (multi-select), before/after food, quantity, duration in days. Multiple medicines per submission. Submitting writes `dispenses` + `dispense_items` and fires the instant push.
5. **Attach report** — upload a photo/PDF with a label, saved against the patient.
6. **Catalog** — a separate, low-traffic screen to search the medicine catalog or add a medicine (name + photo) if it's genuinely missing. Not part of the daily dispensing flow, since the catalog is expected to already be seeded.

The existing `pages/bill/*.js` prototype (a "bill" concept with a buggy medicine-resolution join) gets superseded by the dispense flow above rather than fixed in place — the bill/receipt concept doesn't map cleanly to the confirmed design and isn't part of it.

## 7. Phase 2 — Patient mobile app (`medisin_app_mobile`) — for reference, planned separately

- **Login** — mobile number only.
- **Home** — today's medicines grouped by Morning/Afternoon/Night, each with photo, quantity, before/after-food note, and a "mark as taken" tap.
- **Patient Records** — Medicine history (auto-built timeline from dispenses) and Reports/Scans (hospital-attached and patient's own uploads together, patient can add their own).
- **Profile** — name/mobile, logout.
- Bottom tab nav: Home / Patient Records / Profile.

## 8. Hosting

- `medisin_app` → Vercel (free tier), as already implied by the existing README.
- `medisin_app_mobile` → EAS Build (free tier) for installable binaries; Expo Go for day-to-day dev.
- Backend → one Supabase project (free tier: 500MB DB, 1GB storage, 2GB bandwidth/month — enough for a pilot; free projects pause after a week of inactivity, which just means the first request after a pause is slow to wake it).

## 9. Explicitly out of scope for now

- Doctor-facing portal or prescription authoring.
- Billing/payments/inventory management for pharmacies.
- Telugu (or any) localization — worth prioritizing early as a fast-follow given the Kadapa audience, but not in this build.
- Real OTP/PIN security for patient login (see trade-off in §3).
- Actually submitting to the Play Store / App Store — requires the user's own developer accounts (Google Play $25 one-time, Apple $99/year) and identity verification, which only they can complete. This build will be store-submission-ready (EAS config, icons, privacy policy stub) but the submission itself is a manual step on their end.

## 10. Risks / open trade-offs

- **Patient impersonation via mobile number** (§3) — accepted for pilot, flagged for upgrade later.
- **Cross-hospital visibility** of patient records is intentional, not a bug — but means hospitals are implicitly trusting each other with shared patient data. Worth confirming this is acceptable once real hospital partners are onboarded.
- **Supabase free-tier limits** will need a paid plan (~$25/mo) once usage grows past the pilot.
- Push notifications require a physical device / EAS build to fully verify — iOS simulators can't receive real push.
