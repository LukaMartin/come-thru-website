# Come Thru Website

This is the Come Thru event website and ticketing system for their Sydney/Eora dance music events.

It is a Next.js app with:

- a public landing page
- a current-event ticket page
- Stripe Checkout for paid tickets
- support for free events with no checkout step
- Stripe webhooks that create tickets after payment
- PDF ticket emails through Resend
- QR ticket generation
- contact, FAQ, terms, privacy, success, and error pages

## Main Routes

- `/` shows the brand page, archive gallery, social links, and the current event CTA.
- `/event-info` shows the current published event, event image, event details, ticket types, remaining capacity, and checkout panel.
- `/success` confirms payment and tells the buyer to check their email for tickets.
- `/contact` sends enquiries to the Come Thru team.
- `/faq`, `/terms`, and `/privacy` are static support/legal pages.
- `/tickets` shows a ticket QR code with the provided code and secret

## How Ticketing Works

1. The app reads the current event from Supabase where `ticketing_events.status = 'published'` and `ticketing_events.is_current = true`.
2. Active ticket types are loaded from `ticketing_ticket_types`.
3. Paid events use `/api/checkout` to create a pending order and open Stripe Checkout.
4. Stripe sends `checkout.session.completed` to `/api/webhooks/stripe`.
5. The webhook marks the order as paid, creates one `ticketing_tickets` row per purchased ticket, generates QR codes, builds a PDF, and emails the buyer through Resend.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Postgres
- Stripe Checkout
- Resend
- PDFKit
- `qrcode`
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
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is used server-side only.
- `STRIPE_WEBHOOK_SECRET` comes from the Stripe CLI or Stripe dashboard webhook endpoint.
- `RESEND_API_KEY` and `EMAIL_FROM` are required for ticket emails. Ticket email sending is skipped if either is missing.
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
