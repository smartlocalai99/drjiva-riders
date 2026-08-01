# Asian Hospitals Order Desk

An installable, single-purpose PWA for receiving DRJIVA cash-on-delivery
medicine orders. Supabase stores the durable queue; Realtime refreshes open
devices; standards-based Web Push alerts installed devices in the background.

## Local setup

```bash
npm install
npm run dev
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be set
in `.env.local`. They are browser-publishable values, not server secrets. Safe
fallbacks are checked in so claimable preview deployments still connect to the
correct Supabase project.

Unlock the console with the separately delivered high-entropy hospital access
code. The plaintext code and VAPID private key are not present in this repo.

## First device setup

1. Open the HTTPS deployment.
2. Unlock with the hospital access code.
3. Open Hospital pickup settings and save the real Asian Hospitals address and
   phone. This becomes the origin for future delivery routes.
4. Install the PWA. On iPhone, use Share → Add to Home Screen and reopen it from
   the new icon.
5. Tap Enable alerts and accept browser notifications.

The hospital has explicitly chosen full customer, phone, medicine, COD total,
and address details in notification previews. The device owner can still hide
previews in operating-system notification settings.

## Verification

```bash
npm test -- --runInBand
npm run lint
npm run build
```

## Rotate the access code

Generate a new high-entropy code, hash it with SHA-256, and update
`public.order_dashboard_config.access_code_sha256` through a private database
administration session. Never commit the plaintext code. Existing installed
devices will be asked to unlock with the new value after their next validation.

## Push delivery

The Supabase `notify-new-order` Edge Function holds `VAPID_SUBJECT`,
`VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` as function secrets. The database
webhook secret lives in Supabase Vault. Only the VAPID public key is returned to
an unlocked browser.
