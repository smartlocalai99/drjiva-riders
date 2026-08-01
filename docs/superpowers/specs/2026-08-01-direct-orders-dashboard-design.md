# Direct Orders Dashboard Design

## Outcome

Opening the production PWA goes directly to the live DRJIVA Order Dispatch dashboard. There is no dispatcher access-code form, login screen, lock action, or secondary link.

## Architecture

The browser calls one same-origin Next.js API route for protected order operations. That route adds the order-dashboard credential from the server-only `ORDER_DASHBOARD_ACCESS_CODE` environment variable and forwards a fixed allowlist of operations to Supabase RPCs. The credential is never rendered into the page bundle or stored in browser storage.

The existing public Supabase Realtime order-event signal remains browser-side because it contains only refresh events. Orders, customer details, status updates, rider assignment, pickup settings, and push-subscription changes use the server route.

## User Interface

`/` renders `OrderConsole` immediately. The current dispatch layout, filters, order details, notification controls, and pickup settings remain unchanged. The `Lock` button and the access-code screen are removed because they no longer represent a valid workflow.

## Errors and Validation

The API accepts `POST` requests only, rejects unknown operations, validates required values, and returns stable non-secret error messages. Missing server configuration produces a clear operational error without exposing credentials or Supabase internals.

## Verification

Automated tests cover the browser request contract, operation allowlist, server-side credential injection, validation, and direct dashboard rendering. The full Jest suite, lint, and production build must pass. The deployed URL is then checked to confirm it opens the Orders dashboard directly.

