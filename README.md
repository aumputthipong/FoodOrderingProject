# Canteen

[![CI](https://github.com/aumputthipong/FoodOrderingProject/actions/workflows/ci.yml/badge.svg)](https://github.com/aumputthipong/FoodOrderingProject/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)
![Express 5](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL 8.4](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)

A food-ordering app for a university canteen. Customers order from their table on their phone and track their queue ticket; vendors manage incoming orders from a tablet or laptop at the counter.

Originally a 2nd-year coursework project (Vue 2, Express, MySQL). I rebuilt it from scratch as a typed full-stack monorepo with tests, CI, and a one-command Docker setup.

**Status:** backend, frontend, and UX polish are done. Real-time order updates (Socket.IO) and a live demo are next — see [Roadmap](#roadmap).

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/home-mobile.jpg" width="240" alt="Home: canteen shop list" /><br/>Home</td>
    <td align="center"><img src="docs/screenshots/shop-mobile.jpg" width="240" alt="Shop page with menu" /><br/>Shop and menu</td>
    <td align="center"><img src="docs/screenshots/queue-mobile.jpg" width="240" alt="Customer queue ticket with progress" /><br/>Queue ticket</td>
  </tr>
  <tr>
    <td colspan="3" align="center"><img src="docs/screenshots/merchant-queue-desktop.jpg" width="760" alt="Vendor order queue on desktop" /><br/>Vendor order queue (desktop)</td>
  </tr>
</table>

## Features

**Customers**
- Browse and search canteen shops, view menus (sold-out items are clearly marked)
- Add items to a per-shop cart and place orders
- Track each order as a queue ticket with item-by-item progress

**Vendors**
- Order queue with per-item check-off, "complete order" with undo, and wait-time indicators
- Manage the shop profile and menu (add/edit items, toggle availability, upload photos)

## Try it locally

Requires Docker.

```bash
docker compose up --build
```

Open http://localhost:8080 and sign in with a demo account:

| Role | Username | Password |
|---|---|---|
| Customer | `customer1` | `Password123` |
| Vendor (shops 1–5) | `merchant1` – `merchant5` | `Password123` |

To see the order flow end to end, use two browser windows: place an order as `customer1` at "ร้านอาหารตามสั่ง", then check items off as `merchant2`. The customer's queue ticket updates within 15 seconds.

API documentation (Swagger UI): http://localhost:3000/api/docs

## Tech stack

| Area | Technology | Role |
|---|---|---|
| Language | TypeScript (strict) | One language across API, web, and shared code |
| Monorepo | pnpm workspaces | `apps/api`, `apps/web`, `packages/shared` |
| Shared contract | Zod | One set of schemas validates API requests, generates the OpenAPI docs, types API responses, and validates frontend forms |
| Backend | Express 5, Drizzle ORM, MySQL 8.4 | Feature-based modules (routes → controller → service → repository), versioned migrations |
| Frontend | Vue 3, Vite, Vue Router | Feature-based folders mirroring the API |
| Data fetching | TanStack Query | Caching, invalidation, optimistic updates, queue polling |
| UI | Tailwind CSS, shadcn-vue | Design tokens, accessible components (WCAG AA contrast, visible focus, 44px touch targets) |
| Testing | Vitest, Supertest, Vue Test Utils, MSW | 400+ tests: API against a real MySQL database, frontend with network-level API mocks |
| DevOps | Docker Compose, nginx, GitHub Actions | One-command local stack; CI runs lint, type-check, tests, and build on every push |

## Engineering highlights

- **Cart updates stay consistent under rapid taps.** The cart API replaces a shop's cart in one request, so naive "send on every tap" can apply responses out of order. The shop page updates instantly, debounces, sends one request at a time per shop, and blocks edits until the existing cart has loaded. ([useShopCartDraft.ts](apps/web/src/features/cart/composables/useShopCartDraft.ts))
- **Optimistic UI that polling can't undo.** The vendor queue refreshes every 15 seconds; a refresh that lands while a check-off is still saving is discarded instead of reverting the checkbox. ([merchant/queries.ts](apps/web/src/features/merchant/queries.ts))
- **Safe under concurrent requests.** Cart and checkout run in transactions with row locks and automatic deadlock retry, covered by tests that fire parallel requests. ([db/client.ts](apps/api/src/db/client.ts))
- **Single source of truth for data shapes.** Shared Zod schemas keep the API, its documentation, and the frontend in sync; validation errors are translated into clear Thai messages for users.
- **Centralised error and session handling.** All API errors are normalised in one client. An expired session clears cached data and returns the user to login on the page they were on, so a shared device never shows the previous user's cart.

## Security

- nginx sends a Content Security Policy, `X-Content-Type-Options`, and `Referrer-Policy` on every response, and serves the web app and API from one origin
- API: Helmet, rate-limited login, bcrypt password hashing, session tokens stored only as SHA-256 hashes, validated file uploads
- Web: no raw HTML rendering, post-login redirects limited to internal paths, every API response validated against its schema

## Development

Requires Node 24+, pnpm (via Corepack), and Docker.

```bash
corepack enable
pnpm install
docker compose up -d db                   # MySQL on port 3307
cp apps/api/.env.example apps/api/.env
pnpm db:reset                             # run migrations and load demo data
pnpm dev                                  # API on :3000, web on :5173
```

Other commands:

```bash
pnpm test        # requires the db container (uses the canteen_test database)
pnpm lint
pnpm typecheck
pnpm build
```

Notes:
- `docker/mysql/init.sql` creates the test database only when the `db-data` volume is first created.
- Seeding copies missing demo images into uploads and never overwrites existing files. To start completely fresh, run `docker compose down -v` (this deletes all demo data and uploads).
- To show the demo-account hint on the login page in a Docker build, pass the build arg `VITE_DEMO_HINT=true` to the `web` service.
- Demo food photos are from Unsplash; see [CREDITS.md](apps/api/seed/images/CREDITS.md).

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Backend rebuild: monorepo, Express 5, Drizzle, migrations, tests, Docker, CI, API docs | Done |
| 2 | New frontend: Vue 3, TypeScript, Tailwind / shadcn-vue, new design | Done |
| 2.5 | UX polish: design tokens, accessibility, empty states, desktop layouts | Done |
| 3 | Real-time order status with Socket.IO and notifications for vendors and customers | Planned |
| 4 | Live demo deployment and walkthrough GIFs | Planned |

Design documents and implementation plans for each phase are in [docs/superpowers](docs/superpowers).
