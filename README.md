# Come Thru Tickets

This is the Come Thru event website and ticketing system for their Sydney/Eora dance music events.

It is a Next.js app with:

- a public landing page
- a current-event ticket page
- Stripe Checkout for paid tickets
- support for free events with no checkout step
- Stripe webhooks that create tickets after payment
- PDF ticket emails through Resend
- QR ticket generation
- a phone-friendly admin scanner for door staff
- Supabase tables and an atomic ticket redemption function
- contact, FAQ, terms, privacy, success, and error pages

## Main Routes

- `/` shows the brand page, archive gallery, social links, and the current event CTA.
- `/tickets` shows the current published event, event image, event details, ticket types, remaining capacity, and checkout panel.
- `/success` confirms payment and tells the buyer to check their email for tickets.
- `/admin/scan` lets door staff log in with a 6-digit PIN and scan ticket QR codes.
- `/contact` sends enquiries to the Come Thru team.
- `/faq`, `/terms`, and `/privacy` are static support/legal pages.

## How Ticketing Works

1. The app reads the current event from Supabase where `ticketing_events.status = 'published'` and `ticketing_events.is_current = true`.
2. Active ticket types are loaded from `ticketing_ticket_types`.
3. Paid events use `/api/checkout` to create a pending order and open Stripe Checkout.
4. Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`.
5. The webhook marks the order as paid, creates one `ticketing_tickets` row per purchased ticket, generates QR codes, builds a PDF, and emails the buyer through Resend.
6. Door staff scan ticket QR codes at `/admin/scan`.
7. `/api/tickets/redeem` hashes the ticket secret and calls `public.ticketing_redeem_ticket(...)` so redemption is atomic in Postgres.
8. Each scan is recorded in `ticketing_checkins` as `valid`, `invalid`, `already_redeemed`, `wrong_event`, or the ticket status.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Postgres
- Stripe Checkout
- Resend
- PDFKit
- `qrcode`
- `html5-qrcode`
- Tailwind CSS 4

## Environment Variables

Copy the template:

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=
EMAIL_FROM="Come Thru Tickets <tickets@example.com>"

ADMIN_SCAN_PIN=123456
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is used server-side only.
- `STRIPE_WEBHOOK_SECRET` comes from the Stripe CLI or Stripe dashboard webhook endpoint.
- `RESEND_API_KEY` and `EMAIL_FROM` are required for ticket emails. Ticket email sending is skipped if either is missing.
- `ADMIN_SCAN_PIN` must be exactly 6 digits.
- `NEXT_PUBLIC_APP_URL` is used when building success URLs and ticket QR URLs.

## Database Setup

Run the SQL in this order:

```bash
supabase/migrations/001_initial_ticketing.sql
supabase/seed.sql
```

The migration creates:

- `ticketing_events`
- `ticketing_ticket_types`
- `ticketing_orders`
- `ticketing_order_items`
- `ticketing_tickets`
- `ticketing_checkins`
- `ticketing_webhook_events`
- `public.ticketing_redeem_ticket(...)`

The seed creates the current Come Thru event and a general admission ticket type. Before selling real tickets, set the matching `stripe_price_id` on each `ticketing_ticket_types` row.

## Stripe Setup

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

Each paid ticket type must have a Stripe Price ID in `ticketing_ticket_types.stripe_price_id`. The checkout API refuses to sell a ticket type without one.

## Admin Scanner

Open this on a phone:

```text
/admin/scan
```

Enter the 6-digit `ADMIN_SCAN_PIN`, allow camera access, then scan each ticket QR once.

Scanner results:

- `valid`: ticket was accepted and redeemed.
- `already_redeemed`: ticket was real but has already been used.
- `wrong_event`: ticket is valid, but not for the current event.
- `invalid`: QR code is not a valid ticket.

The scanner session is stored in an HTTP-only cookie for 12 hours.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run build
```

## Current Caveat

Capacity is checked immediately before Stripe Checkout is created. That is enough for small events, but it is not a hard reservation. For high-demand launches, move reservation into Postgres with a short-lived reservation table or RPC before payment starts.
