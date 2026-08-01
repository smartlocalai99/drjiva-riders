# Direct Orders Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the production PWA open directly to live orders without an access-code screen while keeping the dashboard credential server-side.

**Architecture:** A single allowlisted Next.js API route injects the server-only credential into existing protected Supabase RPCs. Browser helpers call that route, while the non-sensitive Realtime refresh channel stays on the existing public Supabase client.

**Tech Stack:** Next.js 16 Pages Router, React 19, Supabase REST RPC, Jest, Vercel.

## Global Constraints

- `/` must immediately render the Orders dashboard.
- Do not expose or persist the plaintext dashboard credential in browser code.
- Preserve all existing order, rider, pickup, notification, polling, and Realtime behavior.
- Remove both the access-code screen and the `Lock` action.

---

### Task 1: Protected server RPC bridge

**Files:**
- Create: `lib/server/orderRpc.js`
- Create: `pages/api/orders.js`
- Test: `lib/__tests__/serverOrderRpc.test.js`
- Test: `pages/api/__tests__/orders.test.js`

**Interfaces:**
- Produces: `callProtectedOrderRpc(name, params, env?)` and `ordersApiHandler(req, res)`.
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `ORDER_DASHBOARD_ACCESS_CODE`.

- [ ] Write tests proving the server injects `p_access_code`, never accepts a credential from the request, rejects unknown operations, and returns stable errors.
- [ ] Run the focused tests and confirm RED because the server bridge does not exist.
- [ ] Implement the fixed operation map and Supabase REST RPC request.
- [ ] Run the focused tests GREEN.

### Task 2: Direct browser dashboard

**Files:**
- Modify: `lib/orders.js`
- Modify: `lib/__tests__/orders.test.js`
- Modify: `pages/index.js`
- Modify: `components/orders/OrderConsole.js`
- Modify: `components/orders/NotificationSetup.js`
- Modify: `components/orders/PickupSettings.js`

**Interfaces:**
- Produces: order helpers with no `accessCode` parameter and an immediate `<OrderConsole />` home page.
- Consumes: `POST /api/orders` from Task 1.

- [ ] Write failing tests for same-origin API calls with operation payloads and error propagation.
- [ ] Run the focused tests and confirm RED against the current direct-Supabase implementation.
- [ ] Route protected helpers through `/api/orders`, remove access-code props, remove `AccessGate` rendering, and remove `Lock`.
- [ ] Run the focused tests GREEN.

### Task 3: Production configuration and release

**Files:**
- Modify: `.env.local.example`
- Create in DRJIVA backend: `supabase/migrations/20260801170000_rotate_order_dashboard_access_for_server_bridge.sql`

**Interfaces:**
- Produces: matching server credential and SHA-256 database configuration.

- [ ] Generate a high-entropy credential locally, commit only its SHA-256 digest in the migration, and add the plaintext value only to Vercel Production environment settings.
- [ ] Apply the linked Supabase migration.
- [ ] Run all Jest tests, lint, and production build.
- [ ] Commit and push the feature branch and `main` to `smartlocalai99/drjiva-riders.git`.
- [ ] Deploy production to the existing Vercel project and confirm `/` displays Order Dispatch without a gate.
