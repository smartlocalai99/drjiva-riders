# No-Auth Staff Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the splash screen and staff login so the app opens straight into a working dashboard, and extend it into a real admin tool for hospitals, patients, and medicine pricing.

**Architecture:** Replace `AuthContext`/login with a `HospitalContext` that just tracks "which hospital is this device working as" (persisted in `localStorage`, no password) — most tables are already anon-accessible from a prior "tablet app" effort, so this mostly means closing the remaining gaps (`dispenses`/`dispense_items` writes, `staff_id NOT NULL`) and adding three new thin `lib/*.js` data modules plus three page rewrites/additions.

**Tech Stack:** Next.js (pages router), React 19, Supabase (`@supabase/supabase-js`), Tailwind, Jest.

## Global Constraints

- Staff attribution is dropped entirely: new `dispenses` rows have `staff_id = null`. Do not reintroduce a login/staff-picker for identity.
- Hospital identity comes from a picker stored in `localStorage`, not a fixed hardcoded hospital, not derived from auth.
- Medicine pricing is a single `price numeric(10,2)` column — no cost price, no stock/inventory fields.
- No component/page-level automated tests exist in this repo (no React Testing Library is installed) — only `lib/*.js` functions get Jest tests, matching the existing `lib/__tests__/` convention. Page/component changes are verified manually in the browser (final task).
- Follow existing code style exactly: plain `fetch`-free Supabase wrappers in `lib/`, `Card`/`Input`/`Button`/`TopNav` components, Tailwind classes already used elsewhere (`bg-paper`, `text-ink`, `text-muted`, `text-danger`, `rounded-control`, etc.) — do not introduce a new UI library or new design tokens.
- Migrations go in `supabase/migrations/`, one file per task, following the numbering already present (last is `0013_add_hospital_logo_and_doctor_img.sql`). This project has no Supabase CLI installed locally — migrations are applied manually via the Supabase SQL editor (see `README.md`), so a migration task's "test" step is a read-back/manual-apply check, not an automated run.

---

### Task 1: Schema migration — nullable staff_id, anon dispense writes, medicine price

**Files:**
- Create: `supabase/migrations/0014_remove_auth_dashboard_access.sql`

**Interfaces:**
- Produces: `public.dispenses.staff_id` becomes nullable; `public.medicines.price numeric(10,2)` column; anon `insert` grants on `dispenses`/`dispense_items`; anon `update` grant on `patients`. All later tasks that write dispenses with `staff_id: null` or read/write `medicines.price` depend on this.

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Verify the file is syntactically self-consistent**

Read the file back and check every `create policy` / `grant` / `alter table` line ends with `;` and every table name (`dispenses`, `dispense_items`, `patients`, `medicines`) matches `supabase/migrations/0001_init_schema.sql`. There is no local Supabase instance to run this against automatically — this migration is applied the same way as `0001`–`0013`: paste it into the Supabase SQL editor for the linked project (see `README.md` step 3) before the app is used against a real database. Note this explicitly in the task's completion notes so the human running the app knows to apply it.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0014_remove_auth_dashboard_access.sql
git commit -m "$(cat <<'EOF'
Add migration for no-auth dashboard access and medicine pricing

Drops the NOT NULL constraint on dispenses.staff_id, opens anon insert
on dispenses/dispense_items and anon update on patients, and adds a
price column to medicines.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `lib/hospitals.js` — list/create/update hospitals

**Files:**
- Create: `lib/hospitals.js`
- Test: `lib/__tests__/hospitals.test.js`

**Interfaces:**
- Produces: `listHospitals(): Promise<Array<{id, name, code, address, phone, created_at}>>`, `createHospital({name, code, address, phone}): Promise<hospital>`, `updateHospital(id, {name, code, address, phone}): Promise<hospital>`. Used by Task 6 (`HospitalContext`) and Task 12 (`pages/hospitals/index.js`).

- [ ] **Step 1: Write the failing tests**

```js
// lib/__tests__/hospitals.test.js
jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { listHospitals, createHospital, updateHospital } = require('../hospitals');

describe('listHospitals', () => {
  it('returns hospitals ordered by name', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'h1', name: 'Alpha' }], error: null });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    const result = await listHospitals();

    expect(supabase.from).toHaveBeenCalledWith('hospitals');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('name');
    expect(result).toEqual([{ id: 'h1', name: 'Alpha' }]);
  });

  it('throws when supabase returns an error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('network down') });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    await expect(listHospitals()).rejects.toThrow('network down');
  });
});

describe('createHospital', () => {
  it('inserts a hospital with nulled optional fields', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'h2', name: 'Beta' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await createHospital({ name: 'Beta' });

    expect(insert).toHaveBeenCalledWith({ name: 'Beta', code: null, address: null, phone: null });
    expect(result.name).toBe('Beta');
  });
});

describe('updateHospital', () => {
  it('updates a hospital by id', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'h1', name: 'Alpha Updated' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ update });

    const result = await updateHospital('h1', { name: 'Alpha Updated', code: 'A', address: null, phone: null });

    expect(update).toHaveBeenCalledWith({ name: 'Alpha Updated', code: 'A', address: null, phone: null });
    expect(eq).toHaveBeenCalledWith('id', 'h1');
    expect(result.name).toBe('Alpha Updated');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/__tests__/hospitals.test.js`
Expected: FAIL with `Cannot find module '../hospitals'`

- [ ] **Step 3: Write the implementation**

```js
// lib/hospitals.js
import { supabase } from '../utils/supabaseClient';

export async function listHospitals() {
  const { data, error } = await supabase.from('hospitals').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createHospital({ name, code, address, phone }) {
  const { data, error } = await supabase
    .from('hospitals')
    .insert({ name, code: code ?? null, address: address ?? null, phone: phone ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHospital(id, { name, code, address, phone }) {
  const { data, error } = await supabase
    .from('hospitals')
    .update({ name, code, address, phone })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/__tests__/hospitals.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/hospitals.js lib/__tests__/hospitals.test.js
git commit -m "$(cat <<'EOF'
Add lib/hospitals.js for hospital CRUD

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `lib/patients.js` — add `listPatients`

**Files:**
- Modify: `lib/patients.js`
- Test: `lib/__tests__/patients.test.js` (append)

**Interfaces:**
- Produces: `listPatients({query, limit}?): Promise<Array<patient>>`. Used by Task 10 (`pages/patients/index.js`).
- Consumes: nothing new; `findPatientByMobile`/`createPatient`/`updatePatient` in this file are unchanged.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/patients.test.js` (after the existing `createPatient` describe block, same file, same mocks already declared at the top):

```js
describe('listPatients', () => {
  it('lists patients ordered by newest first with no filter', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Lakshmi' }], error: null });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    const result = await listPatients();

    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual([{ id: '1', name: 'Lakshmi' }]);
  });

  it('filters by name or mobile when a query is given', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    const or = jest.fn().mockReturnValue({ limit });
    const order = jest.fn().mockReturnValue({ or });
    const select = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({ select });

    await listPatients({ query: 'laksh', limit: 10 });

    expect(or).toHaveBeenCalledWith('name.ilike.%laksh%,mobile.ilike.%laksh%');
    expect(limit).toHaveBeenCalledWith(10);
  });
});
```

Also update the `require` line at the top of the file to include the new export:

```js
const { findPatientByMobile, createPatient, listPatients } = require('../patients');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/patients.test.js`
Expected: FAIL — `listPatients` is not a function / `or is not a function`

- [ ] **Step 3: Implement `listPatients`**

Add to `lib/patients.js` (after `updatePatient`):

```js
export async function listPatients({ query = '', limit = 50 } = {}) {
  let request = supabase.from('patients').select('*').order('created_at', { ascending: false });
  if (query) {
    request = request.or(`name.ilike.%${query}%,mobile.ilike.%${query}%`);
  }
  const { data, error } = await request.limit(limit);
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/__tests__/patients.test.js`
Expected: PASS (all tests including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/patients.js lib/__tests__/patients.test.js
git commit -m "$(cat <<'EOF'
Add listPatients for the patients management page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `lib/medicines.js` — price support

**Files:**
- Modify: `lib/medicines.js`
- Test: `lib/__tests__/medicines.test.js` (new)

**Interfaces:**
- Produces: `createMedicine({name, imageUrl, category, price})` (now accepts `price`); `updateMedicine(id, {name, price, category})` — a partial patch, only fields passed in are sent to Supabase. Used by Task 11 (`pages/catalog.js`).
- Consumes: nothing new; `searchMedicines`/`updateMedicineImage`/`uploadMedicineImage` unchanged.

- [ ] **Step 1: Write the failing tests**

```js
// lib/__tests__/medicines.test.js
jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { createMedicine, updateMedicine } = require('../medicines');

describe('createMedicine', () => {
  it('inserts a medicine with a price and nulled optional fields', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'm1', name: 'Paracetamol', price: 12.5 }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const result = await createMedicine({ name: 'Paracetamol', price: 12.5 });

    expect(insert).toHaveBeenCalledWith({ name: 'Paracetamol', image_url: null, category: null, price: 12.5 });
    expect(result.price).toBe(12.5);
  });

  it('defaults price to null when not given', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'm2', name: 'Vitamin C' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    await createMedicine({ name: 'Vitamin C' });

    expect(insert).toHaveBeenCalledWith({ name: 'Vitamin C', image_url: null, category: null, price: null });
  });
});

describe('updateMedicine', () => {
  it('only patches the fields provided', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'm1', price: 15 }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ update });

    const result = await updateMedicine('m1', { price: 15 });

    expect(update).toHaveBeenCalledWith({ price: 15 });
    expect(eq).toHaveBeenCalledWith('id', 'm1');
    expect(result.price).toBe(15);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/__tests__/medicines.test.js`
Expected: FAIL — `createMedicine` insert called without `price` key / `updateMedicine is not a function`

- [ ] **Step 3: Implement the changes**

Replace `createMedicine` in `lib/medicines.js` with:

```js
export async function createMedicine({ name, imageUrl, category, price }) {
  const { data, error } = await supabase
    .from('medicines')
    .insert({ name, image_url: imageUrl ?? null, category: category ?? null, price: price ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

Add `updateMedicine` after `updateMedicineImage`:

```js
export async function updateMedicine(id, { name, price, category }) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (price !== undefined) patch.price = price;
  if (category !== undefined) patch.category = category;
  const { data, error } = await supabase.from('medicines').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/__tests__/medicines.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/medicines.js lib/__tests__/medicines.test.js
git commit -m "$(cat <<'EOF'
Add price support to medicines (create + partial update)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `lib/dashboard.js` — aggregate counts

**Files:**
- Create: `lib/dashboard.js`
- Test: `lib/__tests__/dashboard.test.js`

**Interfaces:**
- Produces: `getDashboardStats(): Promise<{patients: number, medicines: number, hospitals: number, dispenses: number}>`. Used by Task 9 (`pages/index.js`).

- [ ] **Step 1: Write the failing tests**

```js
// lib/__tests__/dashboard.test.js
jest.mock('../../utils/supabaseClient', () => ({
  supabase: { from: jest.fn() },
}));

const { supabase } = require('../../utils/supabaseClient');
const { getDashboardStats } = require('../dashboard');

describe('getDashboardStats', () => {
  it('returns counts for patients, medicines, hospitals, and dispenses', async () => {
    const counts = { patients: 10, medicines: 20, hospitals: 3, dispenses: 45 };
    supabase.from.mockImplementation((table) => ({
      select: jest.fn().mockResolvedValue({ count: counts[table], error: null }),
    }));

    const result = await getDashboardStats();

    expect(result).toEqual(counts);
    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(supabase.from).toHaveBeenCalledWith('medicines');
    expect(supabase.from).toHaveBeenCalledWith('hospitals');
    expect(supabase.from).toHaveBeenCalledWith('dispenses');
  });

  it('throws if any count query fails', async () => {
    supabase.from.mockImplementation((table) => ({
      select: jest.fn().mockResolvedValue(
        table === 'medicines' ? { count: null, error: new Error('boom') } : { count: 1, error: null }
      ),
    }));

    await expect(getDashboardStats()).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/dashboard.test.js`
Expected: FAIL with `Cannot find module '../dashboard'`

- [ ] **Step 3: Implement `lib/dashboard.js`**

```js
// lib/dashboard.js
import { supabase } from '../utils/supabaseClient';

async function countRows(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

export async function getDashboardStats() {
  const [patients, medicines, hospitals, dispenses] = await Promise.all([
    countRows('patients'),
    countRows('medicines'),
    countRows('hospitals'),
    countRows('dispenses'),
  ]);
  return { patients, medicines, hospitals, dispenses };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/__tests__/dashboard.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard.js lib/__tests__/dashboard.test.js
git commit -m "$(cat <<'EOF'
Add lib/dashboard.js for overview stat counts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `utils/HospitalContext.js`

**Files:**
- Create: `utils/HospitalContext.js`

**Interfaces:**
- Consumes: `listHospitals()` from `lib/hospitals.js` (Task 2).
- Produces: `HospitalProvider` (React component) and `useHospital()` returning `{ hospitals: Array<hospital>, currentHospital: hospital | null, currentHospitalId: string | null, setCurrentHospitalId: (id: string) => void, loading: boolean }`. Used by Task 7 (`TopNav`, `_app.js`) and Task 8 (`dispense/new.js`, `reports/new.js`).
- No automated test for this file per Global Constraints (React context with `localStorage`, no RTL installed) — verified manually in Task 7's browser check.

- [ ] **Step 1: Write the implementation**

```js
// utils/HospitalContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { listHospitals } from '../lib/hospitals';

const HospitalContext = createContext(null);
const STORAGE_KEY = 'medisin_current_hospital_id';

export function HospitalProvider({ children }) {
  const [hospitals, setHospitals] = useState([]);
  const [currentHospitalId, setCurrentHospitalIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHospitals()
      .then((data) => {
        setHospitals(data);
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const validStored = data.find((h) => h.id === stored);
        setCurrentHospitalIdState(validStored ? stored : data[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setCurrentHospitalId = (id) => {
    setCurrentHospitalIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const currentHospital = hospitals.find((h) => h.id === currentHospitalId) ?? null;

  return (
    <HospitalContext.Provider
      value={{ hospitals, currentHospital, currentHospitalId, setCurrentHospitalId, loading }}
    >
      {children}
    </HospitalContext.Provider>
  );
}

export const useHospital = () => useContext(HospitalContext);
```

- [ ] **Step 2: Sanity-check with the existing jest suite**

Run: `npm test`
Expected: PASS — this file isn't imported by any existing test, so this just confirms nothing else broke.

- [ ] **Step 3: Commit**

```bash
git add utils/HospitalContext.js
git commit -m "$(cat <<'EOF'
Add HospitalContext to replace staff auth for hospital identity

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Remove login/splash, wire HospitalContext into the app shell

**Files:**
- Modify: `pages/_app.js`
- Modify: `components/ui/TopNav.js`
- Delete: `pages/login.js`
- Delete: `utils/AuthContext.js`
- Delete: `components/ui/SplashScreen.js`
- Delete: `public/splashscreen.mp4`

**Interfaces:**
- Consumes: `HospitalProvider`, `useHospital` from Task 6.
- Produces: no login redirect anywhere in the app; `TopNav` renders nav links (`Dashboard`, `Patients`, `Medicines`, `Hospitals`) and a hospital `<select>` instead of staff name + logout. Every later task that renders `<TopNav />` (Tasks 9–12) depends on this new, prop-free `TopNav`.

- [ ] **Step 1: Rewrite `pages/_app.js`**

```js
// pages/_app.js
import '../styles/globals.css';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { HospitalProvider } from '../utils/HospitalContext';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600'] });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex-sans', weight: ['400', '500', '600'] });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] });

function MyApp({ Component, pageProps }) {
  return (
    <div className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <HospitalProvider>
        <Component {...pageProps} />
      </HospitalProvider>
    </div>
  );
}

export default MyApp;
```

- [ ] **Step 2: Rewrite `components/ui/TopNav.js`**

```js
// components/ui/TopNav.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useHospital } from '../../utils/HospitalContext';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/patients', label: 'Patients' },
  { href: '/catalog', label: 'Medicines' },
  { href: '/hospitals', label: 'Hospitals' },
];

export default function TopNav() {
  const router = useRouter();
  const { hospitals, currentHospitalId, setCurrentHospitalId, loading } = useHospital();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 bg-ink px-4 sm:px-6">
      <div className="flex items-center gap-6 min-w-0">
        <span className="font-display text-lg font-semibold text-paper shrink-0">Medico Kadapa</span>
        <nav className="hidden sm:flex items-center gap-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${
                router.pathname === link.href ? 'text-paper font-medium' : 'text-paper/70 hover:text-paper'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <select
        value={currentHospitalId ?? ''}
        onChange={(e) => setCurrentHospitalId(e.target.value)}
        disabled={loading || hospitals.length === 0}
        className="rounded-control border border-paper/30 bg-ink px-3 py-1 text-sm text-paper shrink-0 max-w-[160px] sm:max-w-none"
      >
        {hospitals.length === 0 && <option value="">No hospitals</option>}
        {hospitals.map((h) => (
          <option key={h.id} value={h.id} className="text-ink">
            {h.name}
          </option>
        ))}
      </select>
    </header>
  );
}
```

- [ ] **Step 3: Delete the auth/splash files**

```bash
git rm pages/login.js utils/AuthContext.js components/ui/SplashScreen.js public/splashscreen.mp4
```

- [ ] **Step 4: Run the existing test suite**

Run: `npm test`
Expected: PASS — no existing test imports `AuthContext` or `SplashScreen`.

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: the page loads directly (no video, no login form, no redirect); the top bar shows "Dashboard / Patients / Medicines / Hospitals" links and a hospital dropdown on the right. Pick a hospital, reload the page, and confirm the same hospital stays selected (persisted via `localStorage`). Note: `pages/index.js`, `pages/patients/index.js`, and `pages/hospitals/index.js` don't exist yet at this point in the plan (Tasks 9/10/12), so `/` will 404 or show the old file if not yet replaced — that's expected; this step is only checking the nav bar and hospital picker render without crashing on whichever page currently exists at `/`.

- [ ] **Step 6: Commit**

```bash
git add pages/_app.js components/ui/TopNav.js
git commit -m "$(cat <<'EOF'
Remove splash screen and staff login

TopNav now shows real navigation and a hospital picker (persisted in
localStorage) instead of a logged-in staff name and logout button.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Repoint dispense and report flows at the hospital picker

**Files:**
- Modify: `pages/dispense/new.js`
- Modify: `pages/reports/new.js`
- Modify: `lib/__tests__/dispenses.test.js` (append)

**Interfaces:**
- Consumes: `useHospital()` from Task 6 (`{ currentHospital }`).
- Produces: both pages call their respective create functions with `staffId: null` and `hospitalId: currentHospital?.id`. No change to `lib/dispenses.js` or `lib/reports.js` function signatures — they already accept `staffId`/`hospitalId` as plain values.

- [ ] **Step 1: Write the additional failing test for a null staff id**

Append to `lib/__tests__/dispenses.test.js`:

```js
it('creates the dispense row with a null staff_id when no staff is set', async () => {
  const dispenseSingle = jest.fn().mockResolvedValue({ data: { id: 'd2' }, error: null });
  const dispenseSelect = jest.fn().mockReturnValue({ single: dispenseSingle });
  const dispenseInsert = jest.fn().mockReturnValue({ select: dispenseSelect });
  const itemsInsert = jest.fn().mockResolvedValue({ error: null });

  supabase.from.mockImplementation((table) => {
    if (table === 'dispenses') return { insert: dispenseInsert };
    if (table === 'dispense_items') return { insert: itemsInsert };
    throw new Error(`unexpected table ${table}`);
  });

  await createDispense({
    patientId: 'p1',
    hospitalId: 'h1',
    staffId: null,
    items: [{ medicineId: 'm1', timing: ['morning'], foodInstruction: 'after_food', quantity: '1 tablet', durationDays: 5 }],
  });

  expect(dispenseInsert).toHaveBeenCalledWith({ patient_id: 'p1', hospital_id: 'h1', staff_id: null, notes: null });
});
```

- [ ] **Step 2: Run test to verify it passes already**

Run: `npx jest lib/__tests__/dispenses.test.js`
Expected: PASS — `createDispense` already forwards `staffId` verbatim, so no source change is needed here; this test just locks in the new no-staff behavior as a contract.

- [ ] **Step 3: Update `pages/dispense/new.js`**

Replace the auth import and usage:

```js
import { useHospital } from '../../utils/HospitalContext';
```

(replacing `import { useAuth } from '../../utils/AuthContext';`)

```js
const { currentHospital } = useHospital();
```

(replacing `const { staffProfile } = useAuth();`)

In `handleSubmit`, replace:

```js
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
```

with:

```js
  const handleSubmit = async () => {
    setError('');
    if (!currentHospital) {
      setError('Pick a hospital from the top bar first.');
      return;
    }
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
        hospitalId: currentHospital.id,
        staffId: null,
```

(the rest of the function body — `items: items.map(...)`, `router.push`, `catch`, `finally` — is unchanged)

- [ ] **Step 4: Update `pages/reports/new.js`**

Replace the auth import and usage:

```js
import { useHospital } from '../../utils/HospitalContext';
```

(replacing `import { useAuth } from '../../utils/AuthContext';`)

```js
const { currentHospital } = useHospital();
```

(replacing `const { staffProfile } = useAuth();`)

In `handleSubmit`, replace:

```js
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
```

with:

```js
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!currentHospital) {
      setError('Pick a hospital from the top bar first.');
      return;
    }
    if (!file) {
      setError('Choose a photo or PDF to attach.');
      return;
    }
    setSaving(true);
    try {
      await uploadPatientReport({
        patientId: patient.id,
        hospitalId: currentHospital.id,
        staffId: null,
```

(the rest — `label`, `file`, `router.push`, `catch`, `finally` — is unchanged)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Manual browser check**

With the dev server running and a hospital picked in the nav bar: go to an existing patient (or register one via the flow built in Task 10) and complete a dispense. Confirm it saves and the new row shows up in the patient's medicine history (`pages/patient/[mobile].js`, unchanged).

- [ ] **Step 7: Commit**

```bash
git add pages/dispense/new.js pages/reports/new.js lib/__tests__/dispenses.test.js
git commit -m "$(cat <<'EOF'
Repoint dispense and report flows at the hospital picker

Drops staff attribution (staff_id is now always null) now that there
is no login; hospital_id comes from HospitalContext instead.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Dashboard home page

**Files:**
- Modify: `pages/index.js` (full rewrite — the old mobile-search widget moves to Task 10)

**Interfaces:**
- Consumes: `getDashboardStats()` from Task 5.

- [ ] **Step 1: Rewrite `pages/index.js`**

```js
// pages/index.js
import { useEffect, useState } from 'react';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getDashboardStats } from '../lib/dashboard';

const STATS = [
  { key: 'patients', label: 'Patients' },
  { key: 'medicines', label: 'Medicines' },
  { key: 'hospitals', label: 'Hospitals' },
  { key: 'dispenses', label: 'Dispenses' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Dashboard</h1>

        {error && <p className="mb-6 text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          {STATS.map((stat) => (
            <Card key={stat.key} className="text-center">
              <p className="font-display text-2xl font-semibold text-ink">{stats ? stats[stat.key] : '—'}</p>
              <p className="text-xs text-muted mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button href="/patients" className="w-full sm:w-auto">Patients</Button>
          <Button variant="secondary" href="/catalog" className="w-full sm:w-auto">Medicines</Button>
          <Button variant="secondary" href="/hospitals" className="w-full sm:w-auto">Hospitals</Button>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual browser check**

Run: `npm run dev`, open `/`.
Expected: four stat cards render with real counts (or `—` briefly while loading), and the three buttons navigate to `/patients`, `/catalog`, `/hospitals` (the latter two may still 404 until Tasks 10/12 land — that's fine at this point in the plan).

- [ ] **Step 3: Commit**

```bash
git add pages/index.js
git commit -m "$(cat <<'EOF'
Turn the home page into a stats dashboard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Patients management page

**Files:**
- Create: `pages/patients/index.js`

**Interfaces:**
- Consumes: `findPatientByMobile`, `createPatient`, `listPatients` from `lib/patients.js` (Task 3 adds `listPatients`; the other two already exist).

- [ ] **Step 1: Write `pages/patients/index.js`**

```js
// pages/patients/index.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { findPatientByMobile, createPatient, listPatients } from '../../lib/patients';

export default function Patients() {
  const [mobile, setMobile] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [listError, setListError] = useState('');
  const router = useRouter();

  useEffect(() => {
    listPatients({ query })
      .then((data) => {
        setListError('');
        setPatients(data);
      })
      .catch((err) => setListError(err.message));
  }, [query]);

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
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Find or register a patient</h1>
        <Card className="mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="tel"
              mono
              placeholder="Patient mobile number"
              className="flex-1"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setNotFound(false);
                setName('');
              }}
              disabled={loading}
              required
            />
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {notFound && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="mb-3 text-sm text-muted">No patient with this number yet — register them below.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="Patient name" className="flex-1" value={name} onChange={(e) => setName(e.target.value)} required />
                <Button variant="secondary" onClick={handleRegister} disabled={loading} className="w-full sm:w-auto">
                  Register
                </Button>
              </div>
            </div>
          )}
        </Card>

        <h2 className="font-display text-lg font-semibold text-ink mb-3">All patients</h2>
        <Input placeholder="Filter by name or mobile" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-4" />
        {listError && <p className="mb-4 text-sm text-danger">{listError}</p>}
        <div className="space-y-2">
          {patients.map((p) => (
            <Card key={p.id}>
              <button
                type="button"
                onClick={() => router.push(`/patient/${p.mobile}`)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="font-medium text-ink">{p.name || 'Unnamed patient'}</p>
                  <p className="font-mono text-xs text-muted">{p.mobile}</p>
                </div>
              </button>
            </Card>
          ))}
          {patients.length === 0 && !listError && <p className="text-sm text-muted">No patients yet.</p>}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual browser check**

Run: `npm run dev`, open `/patients`.
Expected: the search/register widget behaves exactly as the old home page did; below it, a list of patients renders and filters as you type in "Filter by name or mobile"; clicking a patient row navigates to `/patient/<mobile>`.

- [ ] **Step 3: Commit**

```bash
git add pages/patients/index.js
git commit -m "$(cat <<'EOF'
Add patients management page (search, register, browse)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Medicine prices in the catalog

**Files:**
- Modify: `pages/catalog.js`

**Interfaces:**
- Consumes: `updateMedicine` from `lib/medicines.js` (Task 4), plus the now-price-aware `createMedicine`.

- [ ] **Step 1: Rewrite `pages/catalog.js`**

```js
// pages/catalog.js
import { useEffect, useRef, useState } from 'react';
import TopNav from '../components/ui/TopNav';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { searchMedicines, createMedicine, updateMedicine, updateMedicineImage, uploadMedicineImage } from '../lib/medicines';

export default function Catalog() {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const requestIdRef = useRef(0);

  const runSearch = (q) => {
    const requestId = ++requestIdRef.current;
    searchMedicines(q)
      .then((data) => {
        if (requestIdRef.current === requestId) {
          setSearchError('');
          setMedicines(data);
        }
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          setSearchError(err.message);
        }
      });
  };

  const refresh = () => runSearch(query);

  useEffect(() => {
    runSearch(query);
  }, [query]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const medicine = await createMedicine({ name: name.trim(), price: price ? Number(price) : null });
      if (file) {
        const imageUrl = await uploadMedicineImage(file, medicine.id);
        await updateMedicineImage(medicine.id, imageUrl);
      }
      setName('');
      setPrice('');
      setFile(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (id, value) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, price: value } : m)));
  };

  const handlePriceSave = async (id, value) => {
    try {
      await updateMedicine(id, { price: value === '' ? null : Number(value) });
    } catch (err) {
      setSearchError(err.message);
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
            <Input
              type="number"
              step="0.01"
              min="0"
              mono
              placeholder="Price (₹)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
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
        {searchError && <p className="mb-4 text-sm text-danger">{searchError}</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {medicines.map((med) => (
            <Card key={med.id} className="flex flex-col items-center text-center p-3 sm:p-5">
              {med.image_url ? (
                <img src={med.image_url} alt={med.name} className="h-12 w-12 sm:h-16 sm:w-16 rounded-control object-cover border border-line mb-2" />
              ) : (
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-control border border-line bg-paper mb-2" />
              )}
              <p className="text-xs sm:text-sm font-medium text-ink line-clamp-2 mb-2">{med.name}</p>
              <Input
                type="number"
                step="0.01"
                min="0"
                mono
                placeholder="Price"
                value={med.price ?? ''}
                onChange={(e) => handlePriceChange(med.id, e.target.value)}
                onBlur={(e) => handlePriceSave(med.id, e.target.value)}
                className="text-center text-xs"
              />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual browser check**

Run: `npm run dev`, open `/catalog`.
Expected: the "Add a medicine" form now has a price field; created medicines show it. Each existing medicine card has an editable price input; typing a new value and clicking away (blur) saves it — reload the page and confirm the value persisted.

- [ ] **Step 3: Commit**

```bash
git add pages/catalog.js
git commit -m "$(cat <<'EOF'
Add price entry and inline price editing to the medicine catalog

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Hospitals management page

**Files:**
- Create: `pages/hospitals/index.js`

**Interfaces:**
- Consumes: `listHospitals`, `createHospital`, `updateHospital` from `lib/hospitals.js` (Task 2).

- [ ] **Step 1: Write `pages/hospitals/index.js`**

```js
// pages/hospitals/index.js
import { useEffect, useState } from 'react';
import TopNav from '../../components/ui/TopNav';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { listHospitals, createHospital, updateHospital } from '../../lib/hospitals';

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const refresh = () => {
    listHospitals()
      .then((data) => {
        setListError('');
        setHospitals(data);
      })
      .catch((err) => setListError(err.message));
  };

  useEffect(refresh, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createHospital({
        name: name.trim(),
        code: code.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
      });
      setName('');
      setCode('');
      setAddress('');
      setPhone('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (hospital) => {
    setEditingId(hospital.id);
    setEditValues({
      name: hospital.name ?? '',
      code: hospital.code ?? '',
      address: hospital.address ?? '',
      phone: hospital.phone ?? '',
    });
  };

  const saveEdit = async (id) => {
    try {
      await updateHospital(id, editValues);
      setEditingId(null);
      refresh();
    } catch (err) {
      setListError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">Hospitals</h1>

        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Add a hospital</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input placeholder="Hospital name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Code, e.g. AMSH" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add hospital'}
            </Button>
          </form>
        </Card>

        {listError && <p className="mb-4 text-sm text-danger">{listError}</p>}
        <div className="space-y-3">
          {hospitals.map((h) => (
            <Card key={h.id}>
              {editingId === h.id ? (
                <div className="space-y-2">
                  <Input value={editValues.name} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} />
                  <Input value={editValues.code} onChange={(e) => setEditValues((v) => ({ ...v, code: e.target.value }))} />
                  <Input value={editValues.address} onChange={(e) => setEditValues((v) => ({ ...v, address: e.target.value }))} />
                  <Input value={editValues.phone} onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(h.id)}>Save</Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">
                      {h.name}
                      {h.code ? ` (${h.code})` : ''}
                    </p>
                    <p className="text-xs text-muted">{[h.address, h.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                  </div>
                  <button type="button" onClick={() => startEdit(h)} className="text-sm font-medium text-ink underline">
                    Edit
                  </button>
                </div>
              )}
            </Card>
          ))}
          {hospitals.length === 0 && !listError && <p className="text-sm text-muted">No hospitals yet.</p>}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Manual browser check**

Run: `npm run dev`, open `/hospitals`.
Expected: existing hospitals list; adding a new one shows it immediately; clicking "Edit" on a hospital switches it to an editable form, "Save" persists the change (reload to confirm) and "Cancel" discards it. Confirm the hospital picker in `TopNav` also picks up newly added hospitals after a page reload.

- [ ] **Step 3: Commit**

```bash
git add pages/hospitals/index.js
git commit -m "$(cat <<'EOF'
Add hospitals management page (list, add, edit)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: PASS, all suites (`patients`, `hospitals`, `medicines`, `dashboard`, `dispenses`)

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors. If it flags anything in files touched by this plan, fix inline before proceeding (do not disable rules).

- [ ] **Step 3: Full manual walkthrough**

Run: `npm run dev` and, in the browser:
1. Load `/` — confirm it goes straight to the Dashboard (no splash, no login) and stat cards show real numbers.
2. Use the hospital picker in the nav — pick a hospital, reload, confirm it's still selected.
3. Go to `/patients` — search an existing mobile number, then a non-existent one to confirm the register flow works; confirm the new patient appears in the list below.
4. From a patient's page, dispense a medicine — confirm it saves and shows up in that patient's history.
5. Go to `/catalog` — add a medicine with a price, then edit an existing medicine's price inline and reload to confirm it persisted.
6. Go to `/hospitals` — add a hospital, edit one, and confirm both changes persist after reload and the new hospital appears in the `TopNav` picker.

- [ ] **Step 4: Confirm no dangling references to removed modules**

Run: `grep -rn "AuthContext\|useAuth\|SplashScreen\|staffProfile" --include="*.js" pages components lib utils`
Expected: no output. If anything remains, fix it before finishing.

No commit for this task — it's verification only. If Step 2 or Step 4 required fixes, commit those fixes with a message describing what was cleaned up.
