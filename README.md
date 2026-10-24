# CodeGems

Developer source-code and Micro-SaaS storefront. The product direction follows
[`plan.md`](./plan.md); the visual language adapts the BlockGems reference
without reusing its NFT content.

## Status: Phase 8 complete (demo mode)

The public storefront, authentication, checkout/payment path, license
lifecycle, protected downloads, customer library, and admin console are
implemented and covered by unit and database integration tests:

- Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS 4
- Prisma 6 with a local Prisma Postgres dev database
- Auth.js v5 with Google wired in code and a local-only dev login provider
- Next.js proxy (the Next 16 replacement for middleware) with a per-request CSP
  nonce and early redirects for protected routes
- Database sessions for the production Google flow; JWT sessions for the local
  Credentials provider, because Auth.js does not allow Credentials with database
  sessions
- Server-side checkout authorization, pricing, validation, and rate limiting
- PENDING orders with unique idempotency keys and 24-hour expiry
- Midtrans Snap adapter plus a local mock provider
- Midtrans webhook with signature verification, authoritative re-fetch, amount
  checks, persisted event idempotency, and safe status transitions
- Mock settlement through the same persisted, idempotent event path as Midtrans
- Transactional license issuance on `PAID`: one license per order, 16-character
  Crockford Base32 key, HMAC-SHA256 hash at rest, and a unique order/key guard
- License email delivery through Resend or the redacting console provider
- One-time key reveal on `/checkout/success` through an encrypted, HttpOnly,
  five-minute cookie; later views show only the masked key
- Public activation API with per-instance idempotency and a one-activation limit
- Refund events revoke the matching license and invalidate its download tokens
- Owner-only download link issuance with a 30-minute TTL and a two-download cap
- Bearer-token download route with an atomic use counter, private local storage,
  attachment headers, and per-download audit logging
- `/checkout/mock`, `/checkout/success`, and a printable receipt
- Download action on the paid receipt with a demo delivery file for every
  purchasable product
- Customer library at `/dashboard` with account summary, order list, printable
  invoices, licenses, and download history
- Admin console at `/admin` with product CRUD, private archive uploads, version
  and changelog editing, publishing controls, order/license views, revoke and
  resend actions, landing settings, and an audit log
- Public landing page plus `/products`, `/products/[slug]`, `/pricing`, and
  `/changelog`
- Unit tests for pricing, checkout, license, download, upload, admin, and
  Midtrans logic, plus a database integration suite for the payment → license
  → download → refund lifecycle

## Demo setup (from zero)

Prerequisites: Node.js 24.22.1+ (Node 24 LTS) and npm. This is the first
patched 24.x release for CVE-2026-111497.

```bash
npm install
npx prisma dev --name codegems --detach
npx prisma dev ls
```

`prisma dev ls` prints a `DATABASE_URL` proxy URL and a TCP URL (normally
`postgres://postgres:postgres@localhost:51214/template1?sslmode=disable`).
`prisma dev` already provisions the database for the named server; do not create
a separate database manually.

```bash
cp .env.example .env

# Fill in DATABASE_URL from the proxy URL and DIRECT_URL from the TCP URL
# (append pgbouncer=true). Then generate two local secrets and paste the
# output lines into .env:
node -e "console.log('AUTH_SECRET=' + require('node:crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('LICENSE_HMAC_SECRET=' + require('node:crypto').randomBytes(32).toString('base64url'))"

# Apply the committed migration, seed demo data, and start the app.
npm run db:deploy
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. `.env.example` contains no real secrets; the
values above are local-only. Do not reuse them outside this workspace.

Both Next.js and the Prisma CLI read `.env`. This workspace also keeps
`.env -> .env.local` so both tools see the same values; a fresh clone can use a
single `.env` file instead.

`npm run db:seed` also writes a small private demo delivery file under
`storage/products/<slug>/` for each `AVAILABLE` product and records it as the
current `ProductFile`. Admin uploads replace or add versions through the same
storage adapter; the delivery path and access checks stay the same.

The Prisma dev CLI exposes a `prisma+postgres` proxy URL for the app and a TCP
URL for migrations. Keep `DATABASE_URL` on the proxy URL; use the TCP URL as
`DIRECT_URL` with `pgbouncer=true`. Without that flag, the local pooler can
emit `prepared statement "s0" already exists` errors under concurrent requests.
If the Prisma dev server is recreated, refresh both URLs with
`npx prisma dev ls`.

### Demo accounts

| Account            | Role  | How to sign in                   |
| ------------------ | ----- | -------------------------------- |
| `admin@local.test` | ADMIN | `/login` or `/dev-login` → Admin |
| `user@local.test`  | USER  | `/login` or `/dev-login` → User  |

`DEV_AUTH=true` enables the Credentials provider only outside production. If
`DEV_AUTH` is left on in production, the provider is still not registered and
`authorize()` refuses to issue a session.

### Google OAuth

Google remains the production sign-in route. It is only registered when
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are both set. Leaving them empty in
demo mode keeps the app fully usable without external credentials.

## Testing

```bash
npm test                  # unit tests, no database required
npm run test:integration  # database lifecycle tests
npm run test:all          # both
```

`npm test` runs the deterministic unit suite with Node's built-in test runner.
It covers catalog filtering, effective pricing and the early-bird window,
checkout validation and order numbers, Midtrans signatures and status mapping,
license format/HMAC/redaction, download token TTL/use/ownership, upload magic
bytes, and admin form parsing.

`npm run test:integration` reads the same `.env` as the app. It creates a
unique user, product, order, product file, and storage object, then exercises:

- `PAID` → exactly one license, valid key format, HMAC stored instead of the key
- duplicate webhook → no-op, no second license, `paidAt` unchanged
- amount mismatch → rejected before writing an event
- owner-only download link issuance, two successful uses, third use rejected
- expired token rejection
- refund → order `REFUNDED`, license `REVOKED`, outstanding tokens expired,
  further link issuance and downloads blocked

The suite removes its fixtures in `after()`, including the storage object. It
refuses to run with `NODE_ENV=production`; point `DATABASE_URL` at a disposable
database, never at production. If a run is interrupted, remove any leftover
`storage/products/integration-*` directory.

### Manual checks

| Check                                                    | Result                                        |
| -------------------------------------------------------- | --------------------------------------------- |
| Mock checkout → PAID → license → receipt                 | Pass                                          |
| One-time key reveal and masked refresh                   | Pass                                          |
| Download link issuance, 2-use cap, private file          | Pass                                          |
| Dashboard overview, orders, licenses, downloads, invoice | Pass                                          |
| Admin product edit, ZIP upload, version switch, audit    | Pass                                          |
| Admin settings save → landing changes without a rebuild  | Pass                                          |
| Admin orders/license views, resend access, revoke        | Pass                                          |
| Google OAuth and Midtrans sandbox                        | Not run: requires external credentials        |
| Resend delivery                                          | Not run: local demo uses the console provider |

## Checkout demo flow

1. Sign in as `user@local.test`.
2. Open an `AVAILABLE` product and press **Buy now**.
3. On `/checkout/mock`, press **Simulate payment**.
4. `/checkout/success` shows the PAID receipt, the full license key once, and
   the order appears in `/dashboard`.
5. Refresh the receipt. The key is masked to
   `GABUT-••••-••••-••••-XXXX`; the full value is gone from the page.
6. Press **Download files** to exercise the protected download flow.
7. Use the key with `POST /api/licenses/activate` (see below).

The browser never sends a price. `POST /api/checkout` reloads the product,
checks `AVAILABLE`, resolves the effective price on the server, and stores that
amount on the order. Repeated requests with the same idempotency key return the
existing order instead of creating a second one. `COMING_SOON` products expose
no purchase UI and the API rejects them.

## License flow

A `PAID` event creates the order's license inside the same database transaction
as the status transition. `License.orderId` is unique, so a replayed or
concurrent payment event cannot create a second license. A key-hash collision or
an order conflict retries the transaction with a fresh random key; the
`WebhookEvent.eventId` replay guard remains the primary idempotency boundary.

- Key format: `GABUT-XXXX-XXXX-XXXX-XXXX` using Crockford Base32, with 16 random
  characters (80 bits of entropy). Normalization accepts lower case and the
  Crockford aliases `O` → `0`, `I`/`L` → `1`.
- Hashing: keys are stored as an HMAC-SHA256 digest using
  `LICENSE_HMAC_SECRET`. Only `keyPrefix` (`GABUT`) and `keyLast4` are stored in
  clear text for support and masking. The raw key is never written to the
  database.
- Delivery: the full key is included in the license email and, for the mock
  payment demo, in an encrypted `HttpOnly` cookie scoped to the user and order.
  The cookie expires after five minutes. `POST /api/licenses/reveal` consumes it
  once and returns the full key. Refreshing the receipt after that shows only
  the masked key.
- Email: `EMAIL_PROVIDER=resend` sends through Resend when `RESEND_API_KEY` is
  set. The default `console` provider writes the email body to the dev log, but
  redacts full license keys. Use the one-time reveal or a real Resend key to see
  the complete key.
- Refunds: a `REFUNDED` event sets the order to `REFUNDED`, revokes the license,
  and makes activation return `403`.

### Activation API

`POST /api/licenses/activate` is public, validates a key and an `instanceId`, and
is limited to 10 requests per minute per IP. A license has one activation slot
by default. Repeating the same `instanceId` is idempotent; a different instance
after the limit returns `409`.

```bash
curl -X POST http://localhost:3000/api/licenses/activate \
  -H 'Content-Type: application/json' \
  -d '{"licenseKey":"GABUT-XXXX-XXXX-XXXX-XXXX","instanceId":"machine-1"}'
```

Successful response:

```json
{
  "ok": true,
  "activated": true,
  "alreadyActive": false,
  "license": {
    "id": "license_id",
    "type": "personal",
    "status": "ACTIVE",
    "activationCount": 1,
    "maxActivations": 1,
    "issuedAt": "2026-10-22T04:41:17.219Z"
  }
}
```

Invalid or unknown keys return `404`, inactive/revoked licenses return `403`, and
rate-limited requests return `429`.

## Download flow

Downloads are private by default. The receipt's **Download files** button calls
`POST /api/licenses/[id]/download`; that route requires a signed-in user, checks
that the license belongs to them, and verifies that the order is `PAID` and the
license is `ACTIVE`. Missing and foreign licenses both return `404` so the route
does not disclose another customer's license. The route is limited to 10
requests per minute per user.

A successful request returns a short-lived URL:

```json
{
  "ok": true,
  "url": "/api/download/<opaque-token>",
  "fileName": "codegems-license-download-kit-1.2.0-demo.txt",
  "sizeBytes": 406,
  "expiresAt": "2026-10-22T06:01:09.079Z",
  "maxUses": 2
}
```

The token is 32 random bytes encoded as base64url. Only its SHA-256 digest is
stored in `DownloadToken`; the raw token is never written to the database or the
logs. Tokens expire after 30 minutes and allow at most two downloads.

`GET /api/download/[token]` is a bearer-token route limited to 30 requests per
minute per IP. It:

1. Checks the token format, hash, expiry, and use count.
2. Re-checks the license status and order status, so a refund or expiry blocks
   an already-issued token.
3. Resolves the current `ProductFile` and reads it from the private storage
   adapter.
4. Increments `usedCount` with a conditional update and writes a `DownloadLog`
   row with a hashed IP and the user agent in the same transaction.
5. Returns the bytes with `Content-Disposition: attachment`,
   `Content-Type: application/octet-stream`, `Content-Length`, and
   `Cache-Control: no-store`.

Expired or exhausted tokens return `410`; inactive/unpaid/refunded licenses
return `403`; unknown tokens return `404`. There is no public blob URL and the
`storage/` directory must never be exposed by the web server.

## Customer library

`/dashboard` is the signed-in customer surface. Every query is scoped by
`session.user.id`; another customer's order number returns `404`.

| Route                           | Contents                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| `/dashboard`                    | Account summary, spend, recent orders, licenses, downloads    |
| `/dashboard/orders`             | All orders with status filters and receipt links              |
| `/dashboard/orders/[n]/invoice` | Printable invoice; owner-scoped and marked demo or Midtrans   |
| `/dashboard/licenses`           | Masked keys, activation counters, download button, curl guide |
| `/dashboard/downloads`          | Download log: product, masked key, timestamp                  |

The full license key cannot be recovered after the one-time reveal. The library
always shows `GABUT-••••-••••-••••-XXXX` plus the stored masked fields.

## Admin console

`/admin` requires `role === "ADMIN"`. Layouts enforce it for navigation, and
every Server Action and the upload route re-check the session independently, so
an action cannot be replayed by a signed-in non-admin.

- **Products** — create and edit catalog fields, price/early-bird window,
  version, changelog JSON, features, stack, cover gradient, and sort order.
  `Publish`, `Unpublish`, `Coming soon`, and `Archive` change status without
  touching history. Products are never hard-deleted; orders and licenses keep
  their foreign keys.
- **Delivery files** — local demo uploads use
  `POST /api/admin/products/[id]/files` because Server Action bodies default to
  1 MB. With `STORAGE_DRIVER=vercel-blob`, the browser uploads directly to a
  private Blob store through `POST /api/admin/products/[id]/files/upload` and
  `POST /api/admin/products/[id]/files/finalize`, avoiding Vercel's 4.5 MB
  function body limit. Both paths are admin-only, same-origin, limited to 60
  requests/minute per user, cap the file at 50 MB, and accept ZIP, PDF, TXT, or
  MD only. The extension and magic bytes must agree; an executable renamed to
  `.zip` is rejected. Files are stored privately with a generated key, SHA-256
  checksum, and normalized display name.
- **Versions** — one `ProductFile` per product/version. Uploading an existing
  version replaces its bytes; uploading a new version makes it current and
  clears the old current flag. `Set current` and `Delete` are audited, and
  deleting the current file promotes the newest remaining file.
- **Orders** — filter by status and search by order number, email, or product,
  with pagination.
- **Licenses** — filter/search, inspect activation and download counts, revoke,
  or resend access. Revoking sets `REVOKED`, records `revokedAt`, and expires
  every outstanding download token in the same transaction.
- **Resend access** — the raw key is only stored as an HMAC digest, so it cannot
  be re-emailed. Instead the action issues a fresh 30-minute, two-use download
  link and emails it with the masked key and receipt link. This is the
  deliberate, security-preserving interpretation of "resend license email".
- **Settings** — edits `stats.licenses`, `stats.gmv`, `stats.uptime`,
  `hero.headline`, `hero.subheadline`, `featured.slug`, `featured.endsAt`, and
  `announcement`. Values are validated, upserted, and revalidated so the
  storefront changes without a rebuild.
- **Audit log** — every mutation writes `AuditLog` with actor, action, entity,
  short metadata (never keys or tokens), hashed IP, and timestamp. Audit write
  failures are logged but never block the operation.

## Midtrans integration

Local demo mode uses `PAYMENT_PROVIDER=mock`. To exercise the real adapter:

```dotenv
PAYMENT_PROVIDER=midtrans
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
MIDTRANS_IS_PRODUCTION=false
```

The checkout route creates a Snap transaction and redirects to Midtrans. Set the
webhook URL in the Midtrans dashboard to:

```text
https://<your-domain>/api/webhooks/midtrans
```

For local webhook testing, expose the dev server through a tunnel such as
`cloudflared` or `ngrok` and set `NEXT_PUBLIC_APP_URL` to the tunnel URL.

The webhook does not trust the notification body alone:

1. It verifies the SHA-512 signature with the server key.
2. It re-fetches transaction status from Midtrans.
3. It compares both amounts with the stored order amount.
4. It records a unique `WebhookEvent.eventId` and applies the status change in a
   single transaction.
5. Replays are no-ops, and a late `EXPIRED`/`FAILED` event cannot downgrade a
   `PAID` order.

## Environment

Copy `.env.example` when setting up a fresh environment. `env.ts` validates all
server variables at startup. Key values:

| Variable                 | Demo value                                             |
| ------------------------ | ------------------------------------------------------ |
| `DATABASE_URL`           | Prisma dev proxy (`prisma+postgres://localhost:51213`) |
| `DIRECT_URL`             | Prisma dev TCP (`localhost:51214`, `pgbouncer=true`)   |
| `DEV_AUTH`               | `true`                                                 |
| `PAYMENT_PROVIDER`       | `mock`                                                 |
| `MIDTRANS_SERVER_KEY`    | empty in mock mode                                     |
| `MIDTRANS_CLIENT_KEY`    | empty in mock mode                                     |
| `MIDTRANS_IS_PRODUCTION` | `false`                                                |
| `EMAIL_PROVIDER`         | `console`                                              |
| `EMAIL_FROM`             | `CodeGems <noreply@example.com>`                       |
| `RESEND_API_KEY`         | empty in console mode; required for `resend`           |
| `LICENSE_HMAC_SECRET`    | local-only secret, at least 32 characters              |
| `STORAGE_DRIVER`         | `local`                                                |
| `LOCAL_STORAGE_DIR`      | `./storage`                                            |
| `BLOB_READ_WRITE_TOKEN`  | empty in local mode; required for `vercel-blob`        |

Never commit `.env.local`, `.env`, license signing secrets, or provider tokens.

Prisma CLI loads `.env`; Next.js loads `.env.local`. This workspace uses
`.env -> .env.local` so both tools see the same locally generated values.

## Scripts

| Command                    | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Start Next.js on port 3000                               |
| `npm run build`            | Production build                                         |
| `npm run lint`             | ESLint                                                   |
| `npm run typecheck`        | `tsc --noEmit`                                           |
| `npm test`                 | Unit tests (no database required)                        |
| `npm run test:integration` | Database lifecycle tests against `.env`                  |
| `npm run test:all`         | Unit and integration tests                               |
| `npm run db:deploy`        | Apply committed migrations (local first run and production) |
| `npm run db:push`          | Sync schema without migration history (prototyping only) |
| `npm run db:seed`          | Seed demo users, products, settings, and delivery files  |
| `npm run db:migrate`       | Create a new migration during development                |
| `npm run db:studio`        | Prisma Studio                                            |
| `npm run db:dev`           | Start Prisma dev server (foreground)                     |

## Routes

| Route                                 | Access                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `/`                                   | Public landing page                                             |
| `/products`                           | Public catalog with category filter and allow-listed sort       |
| `/products/[slug]`                    | Public product detail; `COMING_SOON` items are not purchasable  |
| `/pricing`                            | Public license comparison                                       |
| `/changelog`                          | Public release history                                          |
| `/login`                              | Public when signed out; redirects when signed in                |
| `/dev-login`                          | Demo-only dev sign-in (disabled in production)                  |
| `/dashboard`                          | Authenticated; owner-scoped account summary and recent activity |
| `/dashboard/orders`                   | Authenticated owner; order list and status filters              |
| `/dashboard/orders/[n]/invoice`       | Authenticated owner; printable invoice                          |
| `/dashboard/licenses`                 | Authenticated owner; masked keys and download actions           |
| `/dashboard/downloads`                | Authenticated owner; download history                           |
| `/admin`                              | ADMIN role only; overview, revenue, recent activity             |
| `/admin/products`                     | ADMIN; catalog list                                             |
| `/admin/products/new`                 | ADMIN; create product                                           |
| `/admin/products/[id]`                | ADMIN; edit product, status, delivery files                     |
| `/admin/orders`                       | ADMIN; orders, filters, search, pagination                      |
| `/admin/licenses`                     | ADMIN; revoke and resend access                                 |
| `/admin/settings`                     | ADMIN; landing copy and featured kit                            |
| `/admin/audit`                        | ADMIN; last 100 audited mutations                               |
| `/checkout/mock`                      | Authenticated owner; demo payment simulator                     |
| `/checkout/success`                   | Authenticated owner; receipt, payment status, license           |
| `POST /api/checkout`                  | Authenticated user; 5 requests/minute/user                      |
| `POST /api/webhooks/midtrans`         | Midtrans signature; 120 requests/minute/IP                      |
| `POST /api/licenses/activate`         | Public; key + instance ID; 10 requests/minute/IP                |
| `POST /api/licenses/reveal`           | Authenticated owner; consumes the one-time reveal cookie        |
| `POST /api/licenses/[id]/download`    | Authenticated owner; 10 requests/minute/user                    |
| `POST /api/admin/products/[id]/files` | ADMIN; 60 requests/minute/user; 50 MB; magic-byte checked       |
| `POST /api/admin/products/[id]/files/upload` | ADMIN; private Blob client-token route; 60/minute/user   |
| `POST /api/admin/products/[id]/files/finalize` | ADMIN; validates uploaded Blob bytes and records metadata |
| `GET /api/download/[token]`           | Bearer token; 30 requests/minute/IP                             |
| `/api/auth/*`                         | Auth.js handlers                                                |
| `/api/health`                         | Public JSON health check                                        |

## Security notes

- Protected pages re-check the session server-side. The proxy only performs an
  early redirect when the session cookie is absent; it is not the authorization
  boundary.
- Checkout rejects cross-site origins, validates JSON with Zod, applies the
  session/role check, rate-limits per user, and ignores client-side prices.
- Webhook signatures are compared with `timingSafeEqual`; the provider payload is
  re-fetched and both amounts must match the order before any state change.
- `WebhookEvent.eventId` is the replay guard. Payment events, order updates, and
  license issuance are written in one transaction, and PAID orders cannot be
  downgraded. A refund revokes the license.
- License keys are generated with 80 bits of entropy and stored only as an
  HMAC-SHA256 digest. The DB keeps just the prefix and last four characters for
  masked support views; full keys appear only in the email and the short-lived
  encrypted reveal cookie.
- The reveal cookie is AES-256-GCM encrypted, `HttpOnly`, `SameSite=Lax`,
  scoped to the user and order, and consumed by a same-origin authenticated
  route. No full key is embedded in the initial success-page HTML.
- Download tokens are bearer secrets with 256 bits of entropy, stored only as a
  SHA-256 digest. Issuance checks ownership, order status, and license status;
  consumption re-checks order/license status and uses a conditional counter so
  concurrent requests cannot exceed the two-use limit.
- Downloads are logged with a hashed IP and a truncated user agent. Raw tokens
  are never logged. Refunds revoke the license and expire its outstanding
  tokens.
- The console email provider redacts license keys and bearer download tokens
  before writing the message body to the log. The Resend provider sends the
  real values only to the recipient.
- `ProductFile.storageKey` is private. Local storage rejects traversal keys, and
  `storage/` is never served directly; there is no public blob URL.
- Admin pages, Server Actions, and the upload route each re-check
  `role === "ADMIN"`. The admin upload route is same-origin, rate-limited, size
  capped, and rejects files whose extension, declared type, and magic bytes do
  not agree.
- Admin upload names are normalized, storage keys are generated from the slug,
  version, and a random ID, and the checksum is recorded. Replaced bytes are
  deleted only after the database transaction commits.
- `AuditLog` stores the actor, action, entity, short metadata, and a hashed IP.
  License keys and download tokens are never written to the audit metadata.
- Revoking a license expires its download tokens immediately. "Resend access"
  cannot reveal the old key because only the HMAC digest is stored; it sends a
  fresh short-lived download link instead.
- Every customer and admin query is scoped server-side. A foreign order number
  in `/dashboard/orders/[n]/invoice` returns `404`.
- CSP is generated per request in `src/proxy.ts` (Next.js 16's replacement for
  middleware); development adds `'unsafe-eval'` and websocket origins for
  Next.js HMR only.
- HSTS is emitted only in production. Other security headers are always on.
- The rate limiter uses an atomic Postgres upsert. Checkout, webhook, license
  activation, license reveal, download issuance, token downloads, and admin
  uploads use it today.
- The Vercel Blob driver is private-only and requires
  `BLOB_READ_WRITE_TOKEN`; it never exposes a public blob URL. Local demo mode
  continues to use the filesystem adapter.
- The runtime is pinned to Node 24.22.1+ through `engines` and `.nvmrc`. That
  release includes the fix for CVE-2026-111497, a high-severity Brotli decoder
  issue also fixed in Node 22.23.4 and 26.12.1. `npm audit` does not scan the
  Node.js runtime itself. Vercel must be set to Node.js 24.x.

## Security review

Checked against the mandatory list in `plan.md`:

- [x] Secrets come from env; `.env` is ignored and `.env.example` has empty
      secret values
- [x] Zod validates environment variables at boot and request/server-action
      inputs
- [x] Prisma is the only data layer; the sole raw query is a tagged-template
      rate-limit upsert
- [x] No `dangerouslySetInnerHTML`; React escapes changelog and user content
- [x] Order, license, and download ownership is checked server-side; admin
      checks are repeated in actions and the upload route
- [x] Webhook verifies the signature, re-fetches the transaction, checks both
      amounts, and uses a persisted event ID for replay protection
- [x] Refunds revoke the license and expire outstanding download tokens
- [x] License keys use 80-bit entropy and are stored as HMAC-SHA256 digests
- [x] Download tokens are stored as SHA-256 digests with a 30-minute TTL, a
      two-use cap, and no public blob URL
- [x] Uploads are admin-only, size-capped, magic-byte checked, and stored under
      generated names
- [x] CSP nonce, HSTS in production, `nosniff`, `frame-ancestors`/`DENY`, and
      `Referrer-Policy` are configured
- [x] License keys and download tokens are redacted from console email logs
- [x] Dependency audit is documented, including the remaining transitive
      advisory in the Vercel Blob dependency chain

### Dependency audit

`npm audit --omit=dev` reports 4 high-severity advisories from a `zod` version
nested under `@vercel/blob` → `@vercel/oidc` → `@vercel/cli-config`. The
application does not accept untrusted Zod schemas from that package, and
`npm audit fix --force` would downgrade `@vercel/blob` to 2.4.0, so the forced
downgrade is not applied. Track the upstream fix.

The full `npm audit` currently reports the same advisories; no separate
dev-tool advisory remains. A Prisma CLI advisory on `deepmerge-ts` was fixed
with an npm override to `^8.0.2` after confirming Prisma 6.19 still generates
and builds.

## Verification

```bash
npm run test:all
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

Expected: 65 unit tests and 8 integration tests pass, and lint/typecheck/build
are clean. Review the dependency audit note above before deployment.

## Production handoff

This project stops at QA and documentation; there is no deployment, domain, or
CI configuration in scope. To deploy later:

1. **Database** — create a Neon project. Use the pooled connection string as
   `DATABASE_URL` and the direct string as `DIRECT_URL`. The repo includes the
   initial migration under `prisma/migrations/`; run `npm run db:deploy`
   (`prisma migrate deploy`) against the production database before the first
   boot and on every release. Do not use `db push` in production.
2. **Storage** — create a Vercel Blob store, set `STORAGE_DRIVER=vercel-blob`
   and `BLOB_READ_WRITE_TOKEN`. The local filesystem is ephemeral on Vercel.
3. **Email** — set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and a verified
   `EMAIL_FROM` domain.
4. **Auth** — set `AUTH_SECRET`, `AUTH_URL`/`NEXT_PUBLIC_APP_URL`, Google OAuth
   client ID/secret, and the redirect URI
   `https://<domain>/api/auth/callback/google`. Set `ADMIN_EMAILS` to the real
   admin address and `DEV_AUTH=false`.
5. **Payments** — set Midtrans production keys,
   `MIDTRANS_IS_PRODUCTION=true`, and the webhook URL
   `https://<domain>/api/webhooks/midtrans`. Sandbox keys require
   `MIDTRANS_IS_PRODUCTION=false`; production requires KYC.
6. **HTTPS and headers** — run with `NODE_ENV=production` so HSTS is emitted.
   The CSP is generated per request in `src/proxy.ts`.
7. **Rate limits** — place the app behind a proxy that overwrites
   `X-Forwarded-For`; the limiter hashes the first hop.
8. **Backups/monitoring** — not configured. Add database backups and error
   monitoring before taking real payments.

Keep `.env`, `.env.local`, `storage/`, and all provider tokens out of version
control.

## Troubleshooting

- `fetch failed` or `P1001` — the Prisma dev server is stopped. Run
  `npx prisma dev start codegems` and retry.
- `prepared statement "s0" already exists` — `DIRECT_URL` is missing
  `pgbouncer=true` for the local pooler.
- `Invalid environment configuration` — compare `.env` with `.env.example`;
  `AUTH_SECRET` and `LICENSE_HMAC_SECRET` must be at least 32 characters.
- Demo data drift — reset with `npx prisma migrate reset --force`. This deletes
  all local data, reapplies migrations, and runs the seed.
- Integration test leftovers — remove `storage/products/integration-*`; the
  database fixtures are cleaned by `after()` unless the process was killed.

## Scope

Phase 8 is the final planned phase. Deployment, domain setup, CI/CD, and
production monitoring are intentionally out of scope.
