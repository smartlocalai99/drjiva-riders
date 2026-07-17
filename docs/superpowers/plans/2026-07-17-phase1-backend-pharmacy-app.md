# Medico Kadapa Phase 1 — Backend + Pharmacy App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the real Supabase backend and turn the `medisin_app` prototype into a working staff-facing dispensing tool: search a patient by mobile, dispense medicines against a photo catalog with dosage timing, attach OP reports/scans, and manage the medicine catalog.

**Architecture:** Next.js Pages Router (plain JS) talking directly to Supabase from the browser via `@supabase/supabase-js`, using Supabase Auth (email+password) for staff sessions and Postgres RLS scoped to the `authenticated` role for all data access. No custom backend server — Supabase is the entire backend.

**Tech Stack:** Next.js 16 (Pages Router), React 19, Tailwind CSS v4, `@supabase/supabase-js`, Jest (data-layer unit tests only).

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-07-17-medico-kadapa-platform-design.md`. Every table name, column name, and screen in this plan matches that spec exactly.
- Plain JavaScript only — this project has no `tsconfig.json`, only `jsconfig.json`. Do not introduce `.ts`/`.tsx` files.
- No Supabase CLI or MCP connection is available in this environment. All schema/storage SQL is written to versioned `.sql` files in `supabase/migrations/`, but **applied manually** by pasting into the Supabase Dashboard SQL Editor for project `jlvjnnltynebenflkcua`. Each schema task's verification step uses a `curl` against the REST API (already confirmed working — see Task 3) rather than the CLI.
- Recent Supabase platform change (2026-04-28): new tables in `public` are **not** auto-exposed to the Data API. Every table that the app queries directly must get an explicit `GRANT ... TO authenticated` alongside its RLS policies — this is not optional boilerplate, omitting it means the app gets "table not found" errors even though the table exists.
- RLS model: per spec §3, patient records are intentionally **not** siloed per hospital — any authenticated staff member can read/write any patient, dispense, or report. Policies use `USING (true)` for this reason; this is a deliberate choice, not an oversight, and each such policy has a SQL comment saying so.
- Patient-facing auth, push notifications, and the mobile app are **Phase 2** and explicitly out of scope here. The `push_tokens` and `dose_logs` tables are created now (RLS enabled, zero policies — fully locked down) purely so Phase 2 doesn't need a new migration for them.
- Testing approach: the data-access layer (`lib/*.js`) gets real Jest unit tests with a mocked Supabase client, because that's where the riskiest logic lives (multi-step inserts, null-coalescing, error propagation). Page-level UI is verified manually via the dev server with exact click-through steps, because this Pages-Router-plus-live-Supabase stack makes component-level testing mostly mock-scaffolding with low bug-catching value at pilot stage — this is a deliberate scope call, not a skipped step.
- Design tokens (colors, fonts, spacing) are fixed by this plan (Task 1) — don't invent new colors ad hoc in later tasks; reuse the tokens.
- Commit after every task using the repo's existing plain style (see `git log`), scoped to just the files that task touched.

---

### Task 1: Fix the Tailwind v4 design system

The prototype references `bg-primary`, `text-primary`, and a `.glass` class that were never actually wired into Tailwind v4 (colors live in a stale v3-style `tailwind.config.js` that v4 doesn't auto-load without an explicit `@config` directive, and `.glass` was never defined anywhere as CSS). This task replaces it with a real, intentional design system: a navy/white "paper slip" clinical look with a marigold accent, Fraunces for display headings, and IBM Plex Sans/Mono for UI and data. This must land first — every later screen depends on these tokens existing.

**Files:**
- Delete: `tailwind.config.js` (nothing else references it — confirmed via `grep -rn "tailwind.config" .`)
- Modify: `styles/globals.css`
- Modify: `pages/_app.js` (adds font loading)

**Interfaces:**
- Produces: Tailwind utility classes consumable by every component/page in later tasks: `bg-paper`, `bg-surface`, `bg-ink`, `text-ink`, `text-muted`, `border-line`, `bg-primary`, `bg-primary-hover`, `text-primary`, `text-primary-hover`, `bg-danger`, `text-danger`, `border-danger`, `bg-success`, `text-success`, `rounded-card`, `rounded-control`, `font-display`, `font-sans`, `font-mono`, plus the CSS class `.card-shadow` and the raw CSS custom properties `--color-morning`, `--color-afternoon`, `--color-night` (consumed directly via inline `style` in the `DosageTimingPicker` component, Task 2).

- [ ] **Step 1: Delete the stale Tailwind config**

```bash
rm /Users/vardhanreddy/Desktop/medislash/medisin_app/tailwind.config.js
```

- [ ] **Step 2: Rewrite `styles/globals.css` with the real token system**

```css
@import "tailwindcss";

@theme {
  --color-ink: #1c2333;
  --color-paper: #fbfaf7;
  --color-surface: #ffffff;
  --color-line: #e7e0d3;
  --color-muted: #6b6355;
  --color-primary: #e08a2c;
  --color-primary-hover: #c06f1c;
  --color-morning: #f4c773;
  --color-afternoon: #e08a2c;
  --color-night: #2f6f63;
  --color-success: #3e8e5a;
  --color-danger: #b3492b;

  --font-display: var(--font-fraunces), serif;
  --font-sans: var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;

  --radius-card: 10px;
  --radius-control: 8px;
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

.card-shadow {
  box-shadow: 0 1px 2px rgba(27, 36, 48, 0.06);
}
```

- [ ] **Step 3: Load the three fonts in `pages/_app.js` and remove the old localStorage-based route guard (replaced properly in Task 7, but the import of `AuthContext` stays for now)**

```js
// pages/_app.js
import '../styles/globals.css';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { AuthProvider } from '../utils/AuthContext';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600'] });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex-sans', weight: ['400', '500', '600'] });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] });

function MyApp({ Component, pageProps }) {
  return (
    <div className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </div>
  );
}

export default MyApp;
```

- [ ] **Step 4: Verify the tokens actually compile into real CSS**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npm run dev &
sleep 3
curl -s http://localhost:3000/_next/static/css/*.css 2>/dev/null | grep -o "#e08a2c" | head -1
kill %1
```

Expected: prints `#e08a2c` (confirms the `--color-primary` token compiled into the stylesheet). If nothing prints, re-check Step 2's `@theme` block syntax before continuing — every later screen's styling depends on this.

- [ ] **Step 5: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add styles/globals.css pages/_app.js
git rm tailwind.config.js
git commit -m "Replace broken v3-style design tokens with real Tailwind v4 theme"
```

---

### Task 2: Shared UI primitives

Six components used by every screen in this plan: `Button`, `Card`, `Input`, `SegmentedControl` (for before/after-food), `DosageTimingPicker` (the morning/afternoon/night sun-arc selector — this app's one signature visual element, since it directly encodes the real dosage-timing data staff enter dozens of times a day), and `TopNav`.

**Files:**
- Create: `components/ui/Button.js`
- Create: `components/ui/Card.js`
- Create: `components/ui/Input.js`
- Create: `components/ui/SegmentedControl.js`
- Create: `components/ui/DosageTimingPicker.js`
- Create: `components/ui/TopNav.js`

**Interfaces:**
- Consumes: Tailwind tokens from Task 1; `useAuth()` from `utils/AuthContext` (Task 7 — `TopNav` only, written now but not exercised until Task 7 lands).
- Produces:
  - `<Button variant="primary"|"secondary"|"danger" href?: string ...props>` — renders a `<button>` normally, or a styled `next/link` when `href` is given (avoids nesting a `<button>` inside an `<a>`).
  - `<Card className?: string>`
  - `<Input mono?: boolean ...props>`
  - `<SegmentedControl options: {value, label}[] value: string onChange: (value: string) => void>`
  - `<DosageTimingPicker value: string[] onChange?: (value: string[]) => void readOnly?: boolean>` — `value` is a subset of `['morning','afternoon','night']`.
  - `<TopNav>`

- [ ] **Step 1: Create `components/ui/Button.js`**

```jsx
// components/ui/Button.js
import Link from 'next/link';

const BASE =
  'inline-flex items-center justify-center rounded-control px-4 py-2 font-sans font-medium text-sm transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-line hover:bg-paper',
  danger: 'bg-surface text-danger border border-danger hover:bg-danger/5',
};

export default function Button({ variant = 'primary', href, className = '', children, ...props }) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `components/ui/Card.js`**

```jsx
// components/ui/Card.js
export default function Card({ className = '', children }) {
  return <div className={`bg-surface border border-line rounded-card p-5 card-shadow ${className}`}>{children}</div>;
}
```

- [ ] **Step 3: Create `components/ui/Input.js`**

```jsx
// components/ui/Input.js
export default function Input({ mono = false, className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-control border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink focus:border-ink ${
        mono ? 'font-mono' : 'font-sans'
      } ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Create `components/ui/SegmentedControl.js`**

```jsx
// components/ui/SegmentedControl.js
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-control border border-line bg-surface p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
            value === opt.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `components/ui/DosageTimingPicker.js`**

```jsx
// components/ui/DosageTimingPicker.js
const SLOTS = [
  { key: 'morning', label: 'Morning', color: 'var(--color-morning)', offset: 'translate-y-2' },
  { key: 'afternoon', label: 'Afternoon', color: 'var(--color-afternoon)', offset: '-translate-y-1' },
  { key: 'night', label: 'Night', color: 'var(--color-night)', offset: 'translate-y-2' },
];

function SlotIcon({ slotKey, active }) {
  if (slotKey === 'night') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path
          d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="12" r="5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="1.5" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22.5" />
        <line x1="1.5" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22.5" y2="12" />
        <line x1="4.2" y1="4.2" x2="6" y2="6" />
        <line x1="18" y1="18" x2="19.8" y2="19.8" />
        <line x1="4.2" y1="19.8" x2="6" y2="18" />
        <line x1="18" y1="6" x2="19.8" y2="4.2" />
      </g>
    </svg>
  );
}

export default function DosageTimingPicker({ value = [], onChange, readOnly = false }) {
  const toggle = (key) => {
    if (readOnly || !onChange) return;
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  };

  const Tag = readOnly ? 'div' : 'button';

  return (
    <div className="flex items-end justify-center gap-6 py-2">
      {SLOTS.map((slot) => {
        const active = value.includes(slot.key);
        return (
          <Tag
            key={slot.key}
            type={readOnly ? undefined : 'button'}
            onClick={readOnly ? undefined : () => toggle(slot.key)}
            className={`flex flex-col items-center gap-1.5 ${slot.offset} ${readOnly ? '' : 'cursor-pointer'}`}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors duration-150"
              style={{
                borderColor: slot.color,
                backgroundColor: active ? slot.color : 'transparent',
                color: active ? '#fff' : slot.color,
              }}
            >
              <SlotIcon slotKey={slot.key} active={active} />
            </span>
            <span className={`text-xs font-medium ${active ? 'text-ink' : 'text-muted'}`}>{slot.label}</span>
          </Tag>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create `components/ui/TopNav.js`**

```jsx
// components/ui/TopNav.js
import { useAuth } from '../../utils/AuthContext';

export default function TopNav() {
  const { staffProfile, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-ink px-4 sm:px-6">
      <span className="font-display text-lg font-semibold text-paper">Medico Kadapa</span>
      <div className="flex items-center gap-3 text-sm text-paper/80">
        {staffProfile && (
          <span>
            {staffProfile.full_name} · {staffProfile.hospitals?.name}
          </span>
        )}
        <button
          onClick={logout}
          className="rounded-control border border-paper/30 px-3 py-1 text-paper hover:bg-paper/10"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
```

These components have no standalone verification step here by design — they're pure presentational pieces with nothing to render until a real page imports them. Task 8's manual click-through is where this set actually gets exercised and verified.

- [ ] **Step 7: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add components/ui/
git commit -m "Add shared UI primitives: Button, Card, Input, SegmentedControl, DosageTimingPicker, TopNav"
```

---

### Task 3: Database schema migration

Creates all 9 tables from spec §4, with RLS enabled and explicit Data-API grants (required since 2026-04-28 — see Global Constraints).

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: Postgres tables `hospitals`, `staff_profiles`, `patients`, `medicines`, `dispenses`, `dispense_items`, `patient_reports`, `push_tokens`, `dose_logs` — exact column names as used throughout `lib/*.js` in Task 6.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/0001_init_schema.sql
create extension if not exists pgcrypto;

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  mobile text not null unique,
  name text,
  age int,
  gender text check (gender in ('male', 'female', 'other')),
  created_at timestamptz not null default now()
);

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  category text,
  created_at timestamptz not null default now()
);
create unique index medicines_name_lower_idx on public.medicines (lower(name));

create table public.dispenses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  hospital_id uuid not null references public.hospitals(id),
  staff_id uuid not null references public.staff_profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create index dispenses_patient_id_idx on public.dispenses (patient_id);

create table public.dispense_items (
  id uuid primary key default gen_random_uuid(),
  dispense_id uuid not null references public.dispenses(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id),
  timing text[] not null,
  food_instruction text not null check (food_instruction in ('before_food', 'after_food')),
  quantity text not null,
  duration_days int not null check (duration_days > 0),
  created_at timestamptz not null default now(),
  constraint dispense_items_timing_valid check (
    timing <@ array['morning', 'afternoon', 'night']::text[] and array_length(timing, 1) > 0
  )
);
create index dispense_items_dispense_id_idx on public.dispense_items (dispense_id);

-- file_url semantics differ by uploaded_by: for hospital uploads this is a storage
-- object path in the private 'patient-reports' bucket (resolved to a signed URL on
-- read); Phase 2 patient self-uploads will follow the same convention.
create table public.patient_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  hospital_id uuid references public.hospitals(id),
  uploaded_by text not null check (uploaded_by in ('patient', 'hospital')),
  uploaded_by_staff_id uuid references public.staff_profiles(id),
  label text,
  file_url text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  created_at timestamptz not null default now()
);
create index patient_reports_patient_id_idx on public.patient_reports (patient_id);

-- Phase 2 tables (patient mobile app). Created now for forward compatibility.
-- RLS enabled, zero policies: fully locked down until Phase 2 defines patient-side access.
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  expo_push_token text not null unique,
  device_info text,
  created_at timestamptz not null default now()
);

create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  dispense_item_id uuid not null references public.dispense_items(id),
  patient_id uuid not null references public.patients(id),
  slot text not null check (slot in ('morning', 'afternoon', 'night')),
  dose_date date not null,
  taken_at timestamptz not null default now(),
  unique (dispense_item_id, dose_date, slot)
);

-- Row Level Security
alter table public.hospitals enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.medicines enable row level security;
alter table public.dispenses enable row level security;
alter table public.dispense_items enable row level security;
alter table public.patient_reports enable row level security;
alter table public.push_tokens enable row level security;
alter table public.dose_logs enable row level security;

-- Per spec §3: patient records are intentionally shared across all hospitals, not
-- siloed per staff account. These "USING (true)" policies are a deliberate design
-- choice, not an oversight — see spec §10 for the accepted trade-off.
create policy "staff can read hospitals" on public.hospitals
  for select to authenticated using (true);

create policy "staff can read staff profiles" on public.staff_profiles
  for select to authenticated using (true);

create policy "staff can read patients" on public.patients
  for select to authenticated using (true);
create policy "staff can create patients" on public.patients
  for insert to authenticated with check (true);
create policy "staff can update patients" on public.patients
  for update to authenticated using (true) with check (true);

create policy "staff can read medicines" on public.medicines
  for select to authenticated using (true);
create policy "staff can create medicines" on public.medicines
  for insert to authenticated with check (true);
create policy "staff can update medicines" on public.medicines
  for update to authenticated using (true) with check (true);

create policy "staff can read dispenses" on public.dispenses
  for select to authenticated using (true);
create policy "staff can create dispenses" on public.dispenses
  for insert to authenticated with check (true);

create policy "staff can read dispense items" on public.dispense_items
  for select to authenticated using (true);
create policy "staff can create dispense items" on public.dispense_items
  for insert to authenticated with check (true);

create policy "staff can read patient reports" on public.patient_reports
  for select to authenticated using (true);
create policy "staff can create patient reports" on public.patient_reports
  for insert to authenticated with check (true);

-- Data API exposure (required since the 2026-04-28 platform change — RLS alone is
-- not enough, tables need an explicit grant to be reachable via the REST API).
grant select on public.hospitals to authenticated;
grant select on public.staff_profiles to authenticated;
grant select, insert, update on public.patients to authenticated;
grant select, insert, update on public.medicines to authenticated;
grant select, insert on public.dispenses to authenticated;
grant select, insert on public.dispense_items to authenticated;
grant select, insert on public.patient_reports to authenticated;
```

- [ ] **Step 2: Apply it manually**

Open the Supabase Dashboard for project `jlvjnnltynebenflkcua` → SQL Editor → paste the full contents of `supabase/migrations/0001_init_schema.sql` → Run.

- [ ] **Step 3: Verify the tables are live and reachable via the Data API**

```bash
curl -s "https://jlvjnnltynebenflkcua.supabase.co/rest/v1/patients?select=*" \
  -H "apikey: sb_publishable_LXzMM6HjPlwUmbMQfqyYXw_QthfwjsU" \
  -H "Authorization: Bearer sb_publishable_LXzMM6HjPlwUmbMQfqyYXw_QthfwjsU"
```

Expected: `[]` if there was previously a `PGRST205` "table not found" error (as confirmed during initial setup), an empty array now means the table exists — but since the request is unauthenticated (no real staff session), and `authenticated`-only policies are in place, actually expect a `401`/empty result denied by RLS, not a schema error. Either an empty `[]` (if publishable key resolves to `anon` and grants happen to allow it) or an RLS-denial response confirms the schema applied — a `PGRST205` "Could not find the table" response means the migration did not apply and Step 2 must be redone.

- [ ] **Step 4: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add supabase/migrations/0001_init_schema.sql
git commit -m "Add Phase 1 database schema migration"
```

---

### Task 4: Storage buckets migration

Creates the two Storage buckets from spec §4/§9: `medicine-images` (public) and `patient-reports` (private).

**Files:**
- Create: `supabase/migrations/0002_storage_buckets.sql`

**Interfaces:**
- Produces: Storage buckets `medicine-images`, `patient-reports`, consumed by `lib/medicines.js` and `lib/reports.js` in Task 6.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/0002_storage_buckets.sql
insert into storage.buckets (id, name, public) values
  ('medicine-images', 'medicine-images', true),
  ('patient-reports', 'patient-reports', false);

-- medicine-images: public read (Phase 2 patient app renders these without auth),
-- staff can upload and replace (upsert needs insert + select + update together).
create policy "medicine images public read" on storage.objects
  for select to public using (bucket_id = 'medicine-images');
create policy "medicine images staff upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'medicine-images');
create policy "medicine images staff replace" on storage.objects
  for update to authenticated using (bucket_id = 'medicine-images') with check (bucket_id = 'medicine-images');

-- patient-reports: private, staff-only for now (append-only, no replace needed).
create policy "patient reports staff read" on storage.objects
  for select to authenticated using (bucket_id = 'patient-reports');
create policy "patient reports staff upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'patient-reports');
```

- [ ] **Step 2: Apply it manually**

Supabase Dashboard → SQL Editor → paste `supabase/migrations/0002_storage_buckets.sql` → Run.

- [ ] **Step 3: Verify the buckets exist**

Supabase Dashboard → Storage → confirm both `medicine-images` and `patient-reports` are listed, with `medicine-images` marked Public.

- [ ] **Step 4: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add supabase/migrations/0002_storage_buckets.sql
git commit -m "Add storage buckets for medicine images and patient reports"
```

---

### Task 5: Seed the pilot hospital, first staff account, and sample medicines

Without this, there is no way to log in or dispense anything — the dispense/catalog screens have nothing to search against.

**Files:** None (Dashboard + SQL Editor actions only, documented here for repeatability).

**Interfaces:**
- Produces: one row each in `hospitals` and `staff_profiles`, five rows in `medicines`, one working Supabase Auth login.

- [ ] **Step 1: Create the first staff login**

Supabase Dashboard → Authentication → Users → Add user. Use a real email you control and a password. Copy the generated user UUID (shown in the users list after creation).

- [ ] **Step 2: Seed the hospital and link the staff profile**

Run in SQL Editor, replacing `<AUTH_USER_UUID>`:

```sql
insert into public.hospitals (name, address, phone)
values ('Kadapa General Pharmacy', 'Kadapa, Andhra Pradesh', '0000000000')
returning id;
```

Copy the returned `id`, then:

```sql
insert into public.staff_profiles (id, hospital_id, full_name)
values ('<AUTH_USER_UUID>', '<HOSPITAL_ID_FROM_ABOVE>', 'Pilot Staff');
```

- [ ] **Step 3: Seed a handful of sample medicines (no photos yet — added later via the Catalog screen once your team has photographed real tablets)**

```sql
insert into public.medicines (name, category) values
  ('Paracetamol 500mg', 'Analgesic'),
  ('Amoxicillin 250mg', 'Antibiotic'),
  ('Cetirizine 10mg', 'Antihistamine'),
  ('Metformin 500mg', 'Antidiabetic'),
  ('Omeprazole 20mg', 'Antacid');
```

- [ ] **Step 4: Verify**

Supabase Dashboard → Table Editor → confirm `hospitals` has 1 row, `staff_profiles` has 1 row with a matching `hospital_id`, `medicines` has 5 rows.

- [ ] **Step 5: No commit** — this task only touches remote Supabase state, nothing in the repo changes.

---

### Task 6: Data access layer

Replaces `utils/mockDb.js` with real Supabase-backed functions, one file per domain concern. This is the layer every screen calls into — get the function names and shapes right here since Tasks 8–12 depend on them exactly as specified.

**Files:**
- Create: `lib/patients.js`
- Create: `lib/medicines.js`
- Create: `lib/dispenses.js`
- Create: `lib/reports.js`
- Create: `lib/__tests__/patients.test.js`
- Create: `lib/__tests__/dispenses.test.js`
- Create: `jest.config.js`
- Modify: `package.json` (add `test` script and `jest` devDependency)
- Delete: `utils/mockDb.js`

**Interfaces:**
- Consumes: `supabase` client from `utils/supabaseClient.js` (Task setup already done).
- Produces (exact names/signatures used by Tasks 8–12):
  - `findPatientByMobile(mobile: string): Promise<Patient | null>`
  - `createPatient({ mobile, name, age?, gender? }): Promise<Patient>`
  - `updatePatient(id: string, { name, age, gender }): Promise<Patient>`
  - `searchMedicines(query: string): Promise<Medicine[]>`
  - `createMedicine({ name, imageUrl?, category? }): Promise<Medicine>`
  - `updateMedicineImage(id: string, imageUrl: string): Promise<Medicine>`
  - `uploadMedicineImage(file: File, medicineId: string): Promise<string>` — returns the public URL
  - `createDispense({ patientId, hospitalId, staffId, notes?, items: {medicineId, timing, foodInstruction, quantity, durationDays}[] }): Promise<Dispense>`
  - `getDispenseHistory(patientId: string): Promise<DispenseWithItems[]>`
  - `uploadPatientReport({ patientId, hospitalId, staffId, label?, file: File }): Promise<PatientReport>`
  - `getPatientReports(patientId: string): Promise<PatientReport[]>`
  - `getSignedReportUrl(path: string): Promise<string>`

- [ ] **Step 1: Install Jest and add the test script**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npm install --save-dev jest
```

Edit `package.json` scripts block to add:

```json
"test": "jest"
```

- [ ] **Step 2: Create `jest.config.js`**

```js
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'node',
};

module.exports = createJestConfig(customJestConfig);
```

- [ ] **Step 3: Write the failing tests for `lib/patients.js`**

```js
// lib/__tests__/patients.test.js
jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { findPatientByMobile, createPatient } = require('../patients');

describe('findPatientByMobile', () => {
  it('returns the patient row when found', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: '1', mobile: '9999999999' }, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    const result = await findPatientByMobile('9999999999');

    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('mobile', '9999999999');
    expect(result).toEqual({ id: '1', mobile: '9999999999' });
  });

  it('throws when supabase returns an error', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('network down') });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ select });

    await expect(findPatientByMobile('9999999999')).rejects.toThrow('network down');
  });
});

describe('createPatient', () => {
  it('inserts a patient with nulled optional fields', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: '2', mobile: '8888888888', name: 'Lakshmi' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await createPatient({ mobile: '8888888888', name: 'Lakshmi' });

    expect(insert).toHaveBeenCalledWith({ mobile: '8888888888', name: 'Lakshmi', age: null, gender: null });
    expect(result.name).toBe('Lakshmi');
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail (module doesn't exist yet)**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npx jest lib/__tests__/patients.test.js
```

Expected: FAIL with "Cannot find module '../patients'".

- [ ] **Step 5: Create `lib/patients.js`**

```js
// lib/patients.js
import { supabase } from '../utils/supabaseClient';

export async function findPatientByMobile(mobile) {
  const { data, error } = await supabase.from('patients').select('*').eq('mobile', mobile).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPatient({ mobile, name, age, gender }) {
  const { data, error } = await supabase
    .from('patients')
    .insert({ mobile, name, age: age ?? null, gender: gender ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(id, { name, age, gender }) {
  const { data, error } = await supabase.from('patients').update({ name, age, gender }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npx jest lib/__tests__/patients.test.js
```

Expected: PASS, 3 tests.

- [ ] **Step 7: Write the failing test for `lib/dispenses.js` (the two-step insert is the riskiest logic in this layer)**

```js
// lib/__tests__/dispenses.test.js
jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { createDispense } = require('../dispenses');

describe('createDispense', () => {
  it('creates the dispense row then inserts its items', async () => {
    const dispenseSingle = jest.fn().mockResolvedValue({ data: { id: 'd1' }, error: null });
    const dispenseSelect = jest.fn().mockReturnValue({ single: dispenseSingle });
    const dispenseInsert = jest.fn().mockReturnValue({ select: dispenseSelect });

    const itemsInsert = jest.fn().mockResolvedValue({ error: null });

    supabase.from.mockImplementation((table) => {
      if (table === 'dispenses') return { insert: dispenseInsert };
      if (table === 'dispense_items') return { insert: itemsInsert };
      throw new Error(`unexpected table ${table}`);
    });

    const result = await createDispense({
      patientId: 'p1',
      hospitalId: 'h1',
      staffId: 's1',
      items: [{ medicineId: 'm1', timing: ['morning'], foodInstruction: 'after_food', quantity: '1 tablet', durationDays: 5 }],
    });

    expect(dispenseInsert).toHaveBeenCalledWith({ patient_id: 'p1', hospital_id: 'h1', staff_id: 's1', notes: null });
    expect(itemsInsert).toHaveBeenCalledWith([
      { dispense_id: 'd1', medicine_id: 'm1', timing: ['morning'], food_instruction: 'after_food', quantity: '1 tablet', duration_days: 5 },
    ]);
    expect(result).toEqual({ id: 'd1' });
  });

  it('throws if the items insert fails, without swallowing the error', async () => {
    const dispenseSingle = jest.fn().mockResolvedValue({ data: { id: 'd1' }, error: null });
    const dispenseSelect = jest.fn().mockReturnValue({ single: dispenseSingle });
    const dispenseInsert = jest.fn().mockReturnValue({ select: dispenseSelect });
    const itemsInsert = jest.fn().mockResolvedValue({ error: new Error('items insert failed') });

    supabase.from.mockImplementation((table) => {
      if (table === 'dispenses') return { insert: dispenseInsert };
      if (table === 'dispense_items') return { insert: itemsInsert };
    });

    await expect(
      createDispense({ patientId: 'p1', hospitalId: 'h1', staffId: 's1', items: [{ medicineId: 'm1', timing: ['morning'], foodInstruction: 'after_food', quantity: '1', durationDays: 5 }] })
    ).rejects.toThrow('items insert failed');
  });
});
```

- [ ] **Step 8: Run to verify it fails**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npx jest lib/__tests__/dispenses.test.js
```

Expected: FAIL with "Cannot find module '../dispenses'".

- [ ] **Step 9: Create `lib/medicines.js`, `lib/dispenses.js`, `lib/reports.js`**

```js
// lib/medicines.js
import { supabase } from '../utils/supabaseClient';

export async function searchMedicines(query) {
  let request = supabase.from('medicines').select('*').order('name');
  if (query) {
    request = request.ilike('name', `%${query}%`);
  }
  const { data, error } = await request.limit(50);
  if (error) throw error;
  return data;
}

export async function createMedicine({ name, imageUrl, category }) {
  const { data, error } = await supabase
    .from('medicines')
    .insert({ name, image_url: imageUrl ?? null, category: category ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMedicineImage(id, imageUrl) {
  const { data, error } = await supabase.from('medicines').update({ image_url: imageUrl }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function uploadMedicineImage(file, medicineId) {
  const ext = file.name.split('.').pop();
  const path = `${medicineId}.${ext}`;
  const { error } = await supabase.storage.from('medicine-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('medicine-images').getPublicUrl(path);
  return data.publicUrl;
}
```

```js
// lib/dispenses.js
import { supabase } from '../utils/supabaseClient';

export async function createDispense({ patientId, hospitalId, staffId, notes, items }) {
  const { data: dispense, error: dispenseError } = await supabase
    .from('dispenses')
    .insert({ patient_id: patientId, hospital_id: hospitalId, staff_id: staffId, notes: notes ?? null })
    .select()
    .single();
  if (dispenseError) throw dispenseError;

  const rows = items.map((item) => ({
    dispense_id: dispense.id,
    medicine_id: item.medicineId,
    timing: item.timing,
    food_instruction: item.foodInstruction,
    quantity: item.quantity,
    duration_days: item.durationDays,
  }));
  const { error: itemsError } = await supabase.from('dispense_items').insert(rows);
  if (itemsError) throw itemsError;

  return dispense;
}

export async function getDispenseHistory(patientId) {
  const { data, error } = await supabase
    .from('dispenses')
    .select(
      `id, notes, created_at,
       hospitals ( name ),
       dispense_items (
         id, timing, food_instruction, quantity, duration_days,
         medicines ( id, name, image_url )
       )`
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

```js
// lib/reports.js
import { supabase } from '../utils/supabaseClient';

export async function uploadPatientReport({ patientId, hospitalId, staffId, label, file }) {
  const ext = file.name.split('.').pop();
  const path = `${patientId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('patient-reports').upload(path, file);
  if (uploadError) throw uploadError;

  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
  const { data, error } = await supabase
    .from('patient_reports')
    .insert({
      patient_id: patientId,
      hospital_id: hospitalId,
      uploaded_by: 'hospital',
      uploaded_by_staff_id: staffId,
      label: label || null,
      file_url: path,
      file_type: fileType,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPatientReports(patientId) {
  const { data, error } = await supabase
    .from('patient_reports')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSignedReportUrl(path) {
  const { data, error } = await supabase.storage.from('patient-reports').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
```

- [ ] **Step 10: Run all `lib` tests to verify they pass**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npx jest lib/
```

Expected: PASS, 5 tests total.

- [ ] **Step 11: Delete the mock DB**

```bash
rm /Users/vardhanreddy/Desktop/medislash/medisin_app/utils/mockDb.js
```

- [ ] **Step 12: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add lib/ jest.config.js package.json package-lock.json
git rm utils/mockDb.js
git commit -m "Add Supabase-backed data access layer with unit tests, remove mock DB"
```

---

### Task 7: Staff authentication

Replaces the hardcoded-OTP demo with real Supabase Auth, and replaces the old localStorage-patient route guard with a real session guard.

**Files:**
- Modify: `utils/AuthContext.js`
- Modify: `pages/login.js`
- Modify: `pages/_app.js`

**Interfaces:**
- Consumes: `supabase.auth.*` from `utils/supabaseClient.js`; `staff_profiles` table from Task 3.
- Produces: `useAuth()` returning `{ session, staffProfile, loading, login(email, password), logout() }`, consumed by `TopNav` (Task 2), and every page in Tasks 8–12 that needs `staffProfile.hospital_id` / `staffProfile.id`.

- [ ] **Step 1: Rewrite `utils/AuthContext.js`**

```js
// utils/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setStaffProfile(null);
      return;
    }
    supabase
      .from('staff_profiles')
      .select('id, full_name, hospital_id, hospitals ( id, name )')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setStaffProfile(data));
  }, [session]);

  useEffect(() => {
    if (loading || !router.isReady) return;
    const isPublic = router.pathname === '/login';
    if (!isPublic && !session) router.replace('/login');
    if (isPublic && session) router.replace('/');
  }, [loading, session, router.isReady, router.pathname]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    router.replace('/');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ session, staffProfile, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Rewrite `pages/login.js`**

```jsx
// pages/login.js
import { useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Medico Kadapa</h1>
        <p className="text-sm text-muted mb-6">Staff sign in</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: `pages/_app.js` needs no further change** — `AuthProvider` (Task 1, Step 3) already wraps the app, and the redirect logic now lives inside `AuthProvider` itself (Step 1 above) rather than a separate guard component.

- [ ] **Step 4: Manual verification**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npm run dev
```

Open `http://localhost:3000` in a browser. Expected: redirected to `/login` (no session yet). Sign in with the email/password created in Task 5, Step 1. Expected: redirected to `/` (still the default Next.js template page until Task 8 — that's fine, this task only verifies the auth round-trip). Refresh the page — expected: still logged in (session persisted). Click nothing yet (logout button lives in `TopNav`, wired to real pages starting Task 8).

- [ ] **Step 5: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add utils/AuthContext.js pages/login.js
git commit -m "Replace demo OTP login with real Supabase Auth staff sign-in"
```

---

### Task 8: Home screen — patient search

**Files:**
- Modify: `pages/index.js` (currently the default Next.js template)

**Interfaces:**
- Consumes: `findPatientByMobile`, `createPatient` from `lib/patients.js`; `Card`, `Input`, `Button`, `TopNav` from `components/ui/`.

- [ ] **Step 1: Replace `pages/index.js`**

```jsx
// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { findPatientByMobile, createPatient } from '../lib/patients';

export default function Home() {
  const [mobile, setMobile] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const patient = await findPatientByMobile(mobile.trim());
      if (patient) {
        router.push(`/patient/${patient.mobile}`);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      const patient = await createPatient({ mobile: mobile.trim(), name: name.trim() });
      router.push(`/patient/${patient.mobile}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Find a patient</h1>
        <Card>
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              type="tel"
              mono
              placeholder="Patient mobile number"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setNotFound(false);
              }}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {notFound && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm text-muted">No patient with this number yet — register them below.</p>
              <div className="flex gap-3">
                <Input placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Button variant="secondary" onClick={handleRegister} disabled={loading}>
                  Register
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

With `npm run dev` running and logged in: type a mobile number that doesn't exist yet (e.g. `9000000001`) → expect the "register them below" prompt → enter a name → click Register → expect navigation to `/patient/9000000001` (a 404-ish blank page is fine here, that screen doesn't exist until Task 9 — this step only verifies search + register + navigation work). Go back to `/`, search the same number again → expect immediate navigation to the patient page (no "not found" prompt this time, confirming the earlier registration persisted in Supabase).

- [ ] **Step 3: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add pages/index.js
git commit -m "Build patient-search home screen"
```

---

### Task 9: Patient profile screen

**Files:**
- Create: `pages/patient/[mobile].js`
- Delete: `pages/patient.js` (old combined search+dispense prototype, superseded by Home + this screen + Task 10)
- Delete: `pages/dashboard.js` (bill-list prototype, the bill concept is dropped per spec §6)

**Interfaces:**
- Consumes: `findPatientByMobile` (`lib/patients.js`), `getDispenseHistory` (`lib/dispenses.js`), `getPatientReports` (`lib/reports.js`), `DosageTimingPicker`/`Card`/`Button`/`TopNav` (`components/ui/`).

- [ ] **Step 1: Create `pages/patient/[mobile].js`**

```jsx
// pages/patient/[mobile].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DosageTimingPicker from '../../components/ui/DosageTimingPicker';
import { findPatientByMobile } from '../../lib/patients';
import { getDispenseHistory } from '../../lib/dispenses';
import { getPatientReports } from '../../lib/reports';

export default function PatientProfile() {
  const router = useRouter();
  const { mobile } = router.query;
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mobile) return;
    (async () => {
      setLoading(true);
      const p = await findPatientByMobile(mobile);
      setPatient(p);
      if (p) {
        const [h, r] = await Promise.all([getDispenseHistory(p.id), getPatientReports(p.id)]);
        setHistory(h);
        setReports(r);
      }
      setLoading(false);
    })();
  }, [mobile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <p className="p-8 text-muted">Loading…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <p className="p-8 text-muted">No patient found for {mobile}.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{patient.name || 'Unnamed patient'}</p>
            <p className="font-mono text-sm text-muted">{patient.mobile}</p>
          </div>
          <div className="flex gap-3">
            <Button href={`/dispense/new?patient=${patient.mobile}`}>Dispense medicine</Button>
            <Button variant="secondary" href={`/reports/new?patient=${patient.mobile}`}>
              Attach report
            </Button>
          </div>
        </Card>

        <h2 className="font-display text-lg font-semibold text-ink mb-3">Medicine history</h2>
        {history.length === 0 && <p className="text-sm text-muted mb-8">No medicines dispensed yet.</p>}
        <div className="space-y-3 mb-8">
          {history.map((d) => (
            <Card key={d.id}>
              <p className="text-xs text-muted mb-2">
                {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {d.hospitals?.name ? ` · ${d.hospitals.name}` : ''}
              </p>
              <div className="space-y-3">
                {d.dispense_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.medicines.image_url ? (
                      <img
                        src={item.medicines.image_url}
                        alt={item.medicines.name}
                        className="h-12 w-12 rounded-control object-cover border border-line"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-control border border-line bg-paper" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-ink">{item.medicines.name}</p>
                      <p className="text-xs text-muted">
                        {item.quantity} · {item.food_instruction === 'before_food' ? 'Before food' : 'After food'} ·{' '}
                        {item.duration_days} days
                      </p>
                    </div>
                    <DosageTimingPicker value={item.timing} readOnly />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <h2 className="font-display text-lg font-semibold text-ink mb-3">Reports & scans</h2>
        {reports.length === 0 && <p className="text-sm text-muted">No reports attached yet.</p>}
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{r.label || 'Untitled report'}</p>
                <p className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
                  {r.uploaded_by === 'hospital' ? 'Added by hospital' : 'Added by patient'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Delete the superseded prototype pages**

```bash
rm /Users/vardhanreddy/Desktop/medislash/medisin_app/pages/patient.js
rm /Users/vardhanreddy/Desktop/medislash/medisin_app/pages/dashboard.js
```

- [ ] **Step 3: Manual verification**

Navigate to a registered patient's URL directly (e.g. `/patient/9000000001`). Expected: name/mobile card, "Dispense medicine" and "Attach report" buttons, "No medicines dispensed yet." and "No reports attached yet." (both empty states, since Tasks 10–11 haven't run yet). Navigate to `/patient/0000000000` (never registered). Expected: "No patient found for 0000000000."

- [ ] **Step 4: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add pages/patient/
git rm pages/patient.js pages/dashboard.js
git commit -m "Build patient profile screen with history and reports timeline"
```

---

### Task 10: Dispense Medicine screen

**Files:**
- Create: `pages/dispense/new.js`

**Interfaces:**
- Consumes: `findPatientByMobile` (`lib/patients.js`), `searchMedicines` (`lib/medicines.js`), `createDispense` (`lib/dispenses.js`), `useAuth()` for `staffProfile.hospital_id`/`staffProfile.id`, `DosageTimingPicker`/`SegmentedControl`/`Card`/`Input`/`Button`/`TopNav`.

- [ ] **Step 1: Create `pages/dispense/new.js`**

```jsx
// pages/dispense/new.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import SegmentedControl from '../../components/ui/SegmentedControl';
import DosageTimingPicker from '../../components/ui/DosageTimingPicker';
import { findPatientByMobile } from '../../lib/patients';
import { searchMedicines } from '../../lib/medicines';
import { createDispense } from '../../lib/dispenses';
import { useAuth } from '../../utils/AuthContext';

const FOOD_OPTIONS = [
  { value: 'before_food', label: 'Before food' },
  { value: 'after_food', label: 'After food' },
];

export default function NewDispense() {
  const router = useRouter();
  const { patient: mobile } = router.query;
  const { staffProfile } = useAuth();

  const [patient, setPatient] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mobile) return;
    findPatientByMobile(mobile).then(setPatient);
  }, [mobile]);

  useEffect(() => {
    searchMedicines(query).then(setResults);
  }, [query]);

  const addMedicine = (medicine) => {
    setItems((prev) => [
      ...prev,
      { medicine, timing: [], foodInstruction: 'after_food', quantity: '1 tablet', durationDays: 5 },
    ]);
    setQuery('');
    setResults([]);
  };

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');
    if (items.length === 0) {
      setError('Add at least one medicine.');
      return;
    }
    if (items.some((item) => item.timing.length === 0)) {
      setError('Every medicine needs at least one time of day.');
      return;
    }
    setSaving(true);
    try {
      await createDispense({
        patientId: patient.id,
        hospitalId: staffProfile.hospital_id,
        staffId: staffProfile.id,
        items: items.map((item) => ({
          medicineId: item.medicine.id,
          timing: item.timing,
          foodInstruction: item.foodInstruction,
          quantity: item.quantity,
          durationDays: Number(item.durationDays),
        })),
      });
      router.push(`/patient/${patient.mobile}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <p className="p-8 text-muted">Loading patient…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 pb-28">
        <Card className="mb-6">
          <p className="font-display text-xl font-semibold text-ink">{patient.name || 'Unnamed patient'}</p>
          <p className="font-mono text-sm text-muted">{patient.mobile}</p>
        </Card>

        <h1 className="font-display text-lg font-semibold text-ink mb-3">Add medicines</h1>
        <Card className="mb-6">
          <div className="relative">
            <Input placeholder="Search medicine catalog" value={query} onChange={(e) => setQuery(e.target.value)} />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-control border border-line bg-surface shadow-lg">
                {results.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => addMedicine(med)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-paper"
                  >
                    {med.image_url ? (
                      <img src={med.image_url} alt={med.name} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-paper border border-line" />
                    )}
                    <span className="text-sm text-ink">{med.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {items.map((item, index) => (
          <Card key={index} className="mb-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.medicine.image_url ? (
                  <img
                    src={item.medicine.image_url}
                    alt={item.medicine.name}
                    className="h-10 w-10 rounded-control object-cover border border-line"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-control border border-line bg-paper" />
                )}
                <p className="font-medium text-ink">{item.medicine.name}</p>
              </div>
              <button type="button" onClick={() => removeItem(index)} className="text-sm text-danger">
                Remove
              </button>
            </div>

            <DosageTimingPicker value={item.timing} onChange={(timing) => updateItem(index, { timing })} />

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SegmentedControl
                options={FOOD_OPTIONS}
                value={item.foodInstruction}
                onChange={(v) => updateItem(index, { foodInstruction: v })}
              />
              <Input
                placeholder="Quantity, e.g. 1 tablet"
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: e.target.value })}
              />
              <Input
                type="number"
                min="1"
                mono
                placeholder="Days"
                value={item.durationDays}
                onChange={(e) => updateItem(index, { durationDays: e.target.value })}
              />
            </div>
          </Card>
        ))}

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-4">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save & notify patient'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

From a patient profile, click "Dispense medicine". Search "para" → expect "Paracetamol 500mg" to appear in the dropdown → click it → expect it added as a card with the sun-arc timing picker. Tap "Morning" and "Night" → expect both to fill in with their respective colors. Leave food/quantity/duration at defaults. Click "Save & notify patient" → expect navigation back to the patient profile, with the new dispense now showing in "Medicine history" with the correct photo placeholder, quantity, food instruction, and filled morning/night dots (read-only). Try submitting a dispense with a medicine that has no timing selected → expect the inline error "Every medicine needs at least one time of day." and no navigation.

- [ ] **Step 3: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add pages/dispense/
git commit -m "Build dispense-medicine screen"
```

---

### Task 11: Attach Report screen

**Files:**
- Create: `pages/reports/new.js`

**Interfaces:**
- Consumes: `findPatientByMobile` (`lib/patients.js`), `uploadPatientReport` (`lib/reports.js`), `useAuth()`.

- [ ] **Step 1: Create `pages/reports/new.js`**

```jsx
// pages/reports/new.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { findPatientByMobile } from '../../lib/patients';
import { uploadPatientReport } from '../../lib/reports';
import { useAuth } from '../../utils/AuthContext';

export default function NewReport() {
  const router = useRouter();
  const { patient: mobile } = router.query;
  const { staffProfile } = useAuth();

  const [patient, setPatient] = useState(null);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mobile) return;
    findPatientByMobile(mobile).then(setPatient);
  }, [mobile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Choose a photo or PDF to attach.');
      return;
    }
    setSaving(true);
    try {
      await uploadPatientReport({
        patientId: patient.id,
        hospitalId: staffProfile.hospital_id,
        staffId: staffProfile.id,
        label: label.trim(),
        file,
      });
      router.push(`/patient/${patient.mobile}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <p className="p-8 text-muted">Loading patient…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <Card className="mb-6">
          <p className="font-display text-xl font-semibold text-ink">{patient.name || 'Unnamed patient'}</p>
          <p className="font-mono text-sm text-muted">{patient.mobile}</p>
        </Card>

        <h1 className="font-display text-lg font-semibold text-ink mb-3">Attach OP report or scan</h1>
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Label, e.g. OP visit 17 Jul" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Uploading…' : 'Attach report'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

From a patient profile, click "Attach report". Enter a label, choose any small image file, submit. Expected: navigation back to the patient profile, the new report listed under "Reports & scans" with the label and "Added by hospital". Try submitting with no file chosen → expect the inline error "Choose a photo or PDF to attach." and no navigation.

- [ ] **Step 3: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add pages/reports/
git commit -m "Build attach-report screen"
```

---

### Task 12: Catalog screen

**Files:**
- Create: `pages/catalog.js`

**Interfaces:**
- Consumes: `searchMedicines`, `createMedicine`, `updateMedicineImage`, `uploadMedicineImage` (`lib/medicines.js`).

- [ ] **Step 1: Create `pages/catalog.js`**

```jsx
// pages/catalog.js
import { useEffect, useState } from 'react';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { searchMedicines, createMedicine, updateMedicineImage, uploadMedicineImage } from '../lib/medicines';

export default function Catalog() {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => searchMedicines(query).then(setMedicines);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const medicine = await createMedicine({ name: name.trim() });
      if (file) {
        const imageUrl = await uploadMedicineImage(file, medicine.id);
        await updateMedicineImage(medicine.id, imageUrl);
      }
      setName('');
      setFile(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Medicine catalog</h1>

        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Add a medicine</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Medicine name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add medicine'}
            </Button>
          </form>
        </Card>

        <Input placeholder="Search catalog" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {medicines.map((med) => (
            <Card key={med.id} className="flex flex-col items-center text-center">
              {med.image_url ? (
                <img src={med.image_url} alt={med.name} className="h-16 w-16 rounded-control object-cover border border-line mb-2" />
              ) : (
                <div className="h-16 w-16 rounded-control border border-line bg-paper mb-2" />
              )}
              <p className="text-sm font-medium text-ink">{med.name}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Navigate to `/catalog`. Expected: the 5 seeded medicines shown in a grid, all with placeholder boxes (no photos yet). Add a new medicine "Ibuprofen 400mg" with a small test image → expect it to appear in the grid with the uploaded photo after the add completes. Search "ibu" → expect only that medicine to show. Try adding "paracetamol 500mg" (lowercase, already exists) → expect a Postgres unique-constraint error surfaced via the inline error text (confirms the case-insensitive de-dup index from Task 3 is working).

- [ ] **Step 3: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add pages/catalog.js
git commit -m "Build medicine catalog screen"
```

---

### Task 13: Remove the dropped "bill" concept

Per spec §6, the old bill/receipt prototype is superseded by the dispense flow, not fixed.

**Files:**
- Delete: `pages/bill/new.js`
- Delete: `pages/bill/[id].js`

**Interfaces:** None — these files aren't imported anywhere else (confirmed no cross-references during Task 9 file mapping).

- [ ] **Step 1: Delete the bill pages**

```bash
rm -rf /Users/vardhanreddy/Desktop/medislash/medisin_app/pages/bill
```

- [ ] **Step 2: Verify nothing else references them**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && grep -rn "bill/new\|bill/\[id\]\|pages/bill" --include="*.js" . | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add -A pages/bill
git commit -m "Remove superseded bill/receipt prototype"
```

---

### Task 14: Deployment prep and full smoke test

**Files:**
- Modify: `README.md` (replace the generic create-next-app boilerplate with real setup instructions)

**Interfaces:** None — this is verification and documentation only.

- [ ] **Step 1: Rewrite `README.md`**

```markdown
# Medico Kadapa — Pharmacy/Hospital Staff App

Staff-facing tool for dispensing medicines against patient mobile numbers, with dosage timing, before/after-food instructions, and OP report attachments. See `docs/superpowers/specs/2026-07-17-medico-kadapa-platform-design.md` for the full product design.

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL and publishable key (Dashboard → Project Settings → API).
3. Run the migrations in `supabase/migrations/` against your Supabase project via the SQL Editor, in order.
4. Seed a hospital, staff account, and sample medicines — see `docs/superpowers/plans/2026-07-17-phase1-backend-pharmacy-app.md` Task 5.
5. `npm run dev`, open `http://localhost:3000`.

## Deploying

Deploy to Vercel. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables in the Vercel project settings (same values as `.env.local`) — these are safe to expose client-side, they're the publishable key, not the secret key.
```

- [ ] **Step 2: Create `.env.local.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 3: Full end-to-end smoke test**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npm run build
```

Expected: build succeeds with no errors. Then `npm run dev` and walk through, in order: log in → search a new mobile number → register the patient → dispense two different medicines with different timing/food/quantity/duration → view the patient profile and confirm both show correctly in history → attach a report → confirm it appears → log out → confirm redirect to `/login` → log back in → confirm landing back on `/`.

- [ ] **Step 4: Run the full test suite one last time**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app && npx jest
```

Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/vardhanreddy/Desktop/medislash/medisin_app
git add README.md .env.local.example
git commit -m "Add setup docs and deployment instructions"
```

---

## Self-Review Notes

- **Spec coverage:** §3 (auth/roles) → Tasks 5, 7. §4 (schema) → Task 3. Storage buckets → Task 4. §6 (all 6 screens) → Tasks 7–12. §8 (hosting) → Task 14. §9 (out of scope items) respected — no bill/payment/localization/OTP work added. §5 (notifications) and Phase 2's patient-side auth are correctly deferred — `push_tokens`/`dose_logs` exist as locked-down tables only, per Global Constraints.
- **Type consistency check:** `createDispense`'s `items` shape (`medicineId`, `timing`, `foodInstruction`, `quantity`, `durationDays`) matches exactly between Task 6 (definition + test) and Task 10 (caller). `DosageTimingPicker`'s `value`/`onChange`/`readOnly` props match between Task 2 (definition) and Tasks 9–10 (usage). `Button`'s `href` prop (Task 2) is used correctly in Task 9 to avoid nesting a `<button>` inside an `<a>`.
- **Placeholder scan:** none found except one explicitly-justified skip (Task 2, Step 7) where a standalone render check genuinely has nothing to verify yet — its real verification is deferred to Task 8 and stated as such, not left silent.
