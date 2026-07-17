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
