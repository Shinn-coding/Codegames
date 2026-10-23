# plan.md — CodeGems: Developer Source Code & Micro-SaaS Storefront

## 1. Ringkasan

Bangun storefront untuk menjual source code, boilerplate, dan kit developer.
Visual mengadaptasi referensi BlockGems NFT (cream + forest green), tetapi
copy, konten, dan fitur diubah menjadi toko lisensi kode.

- Working dir: `/home/shinn/work/gabut`
- Bahasa UI: English
- Mata uang: IDR (Midtrans)
- Brand placeholder: **CodeGems** (mudah diganti di `src/config/site.ts`)

## 2. Keputusan Final

| Item | Nilai |
|---|---|
| Stack | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| DB | Neon Postgres + Prisma 6 |
| Auth | Google OAuth saja (Auth.js v5, database session) |
| Payment | Midtrans Snap (sandbox dulu), IDR |
| Storage dev | Local `./storage` (private, via API route) |
| Storage prod | Vercel Blob (adapter, belum diaktifkan) |
| Email | Resend |
| Statistik hero | Placeholder, editable dari admin |
| Deploy | User sendiri; project hanya sampai QA + README |
| Checkout | Wajib login (tidak ada guest checkout) |

## 3. Scope

### In scope
- Landing page sesuai referensi
- Katalog + detail produk + changelog
- Google login
- Checkout Midtrans + webhook
- License key generator + email
- Protected download (token pendek, single-use)
- Dashboard user (orders, licenses, downloads)
- Admin (produk, file, settings, order, revoke license)
- Security hardening + test + README handoff

### Non-goals
- Deploy, domain, CI/CD, monitoring produksi
- Multi-vendor / marketplace
- Subscription / recurring billing
- Multi-currency, i18n, affiliate, mobile app
- Packaging ZIP produk #1–#3 (pekerjaan terpisah setelah toko jalan)

## 4. Skills

Load dengan `skill` tool pada urutan ini.

### Wajib
| Skill | Kapan | Untuk |
|---|---|---|
| `design-taste-frontend` | Fase 1 | design read, anti-default, layout |
| `high-end-visual-design` | Fase 1 | depth, shadow, tipografi, motion |
| `redesign-existing-projects` | Fase 1 | adaptasi layout NFT → storefront |
| `security-guard` | Fase 0,3,4,5,6,7 | auth, payment, license, download, upload |
| `full-output-enforcement` | Semua fase | file utuh, tanpa placeholder |
| `neon-postgres` | Fase 0,2 | koneksi, migrasi, backup |
| `prisma-client-api` | Fase 2,5,7 | schema, query, transaksi |
| `tdd` | Fase 2,4,5,6 | test logic kritis |
| `code-review-and-quality` | Fase 8 | review akhir |

### Situational
| Skill | Kapan |
|---|---|
| `systematic-debugging` | saat ada bug/error |
| `receiving-code-review` | saat menerima temuan review |

### Tidak dipakai
`image-to-code`, `brandkit`, `imagegen-*`, `gpt-taste`,
`industrial-brutalist-ui`, `minimalist-ui`, `stitch-design-taste`.

## 5. Design Spec

### Token
```
bg        #F4F2EC
surface   #FBFAF6
ink       #16241F
forest    #243B33
forest-2  #2E4A40
mint      #BFE0C8
line      rgba(22,36,31,0.12)
```
- Radius: 28px card, 20px inner, 999px pill
- Shadow: tinted green, lembut, satu arah cahaya
- Font: Space Grotesk (display), Plus Jakarta Sans (body),
  JetBrains Mono (angka, license key, statistik)
- Ikon: Phosphor Light
- Motion: reveal bertahap, hover lift 4px, countdown tick.
  Wajib hormati `prefers-reduced-motion`.

### Dials
`DESIGN_VARIANCE: 7`, `MOTION_INTENSITY: 5`, `VISUAL_DENSITY: 4`

### Section landing (urutan)
1. Navbar sticky transparan, logo, Products / Pricing / Changelog / Docs, Login
2. Hero split: headline + subcopy + CTA | featured card gambar + countdown
3. Wave/organic divider dari dark ke cream
4. Stats: 3 angka editable
5. Core Principles: 4 kartu ikon mint
6. Featured banner lebar (bundle of the month)
7. Product grid/carousel: 4 kartu
8. Roadmap / changelog ringkas
9. FAQ accordion
10. CTA band
11. Footer

### Copy mapping
| Referensi | Menjadi |
|---|---|
| Next Generation of Digital Arts | Next Generation of Production-Ready Code |
| Remaining time | Early-bird license ends in |
| 10,000+ Artworks Sold | 10,000+ Licenses Issued |
| $5M+ in Transaction | $5M+ Developer Revenue |
| 90% Customer Satisfaction | 99.9% API Uptime |
| Innovation / Quality / Community / Sustainability | Clean Architecture / Lifetime Updates / Zero Lock-in / Direct Support |
| Trending Gems | Trending Kits |
| Bid Now | Buy License |
| Our Journey | Release Roadmap |

### Aturan UI
- Mobile 360, tablet 768, desktop 1440
- `min-h-[100dvh]`, bukan `h-screen`
- Kontras AA, focus-visible jelas, alt text, carousel bisa keyboard
- Angka pakai `tabular-nums`
- Jangan pakai Inter/Roboto/Arial
- Jangan pakai gradient ungu AI, jangan 3 kartu fitur simetris generik

## 6. Konten Awal

### Produk seed
| Slug | Nama | Status | Harga IDR |
|---|---|---|---|
| nextjs-saas-starter | Next.js SaaS Starter | AVAILABLE | 1.099.000 |
| midtrans-payment-kit | Midtrans Payment Kit | AVAILABLE | 629.000 |
| license-download-kit | License & Secure Download Kit | AVAILABLE | 799.000 |
| ai-agent-starter-kit | AI Agent Starter Kit | COMING_SOON | 1.299.000 |
| admin-dashboard-ui-kit | Admin Dashboard UI Kit | COMING_SOON | 459.000 |
| cli-boilerplate-generator | CLI Boilerplate Generator | COMING_SOON | 629.000 |
| launch-kit-bundle | Launch Kit Bundle | AVAILABLE | 1.999.000 |

- `COMING_SOON`: tombol beli disabled, tampilkan "Notify me".
- Cover: gradient/abstract CSS sesuai palet, bukan gambar eksternal.
- Detail produk: fitur, stack, versi, changelog, demo URL, license type.
- Statistik placeholder:
  `10,000+`, `$5M+`, `99.9%` — semua bisa diedit admin.

## 7. Stack & Dependency

```
next@16, react@19, typescript
tailwindcss@4, @tailwindcss/postcss
prisma@6, @prisma/client@6
next-auth@beta (Auth.js v5), @auth/prisma-adapter
zod
resend
@vercel/blob
@phosphor-icons/react
motion
clsx, tailwind-merge, class-variance-authority
eslint, prettier, tsx
```
- Midtrans: panggil REST API langsung via `fetch` (hindari dependency usang).
- Rate limit: tabel Postgres fixed-window (tanpa layanan tambahan).
- PDF invoice: halaman HTML printable (browser print), bukan library PDF.

## 8. Struktur Folder

```
gabut/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.ts
│  └─ migrations/
├─ public/
├─ storage/                     # gitignored, dev only
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/
│  │  │  ├─ page.tsx
│  │  │  ├─ products/page.tsx
│  │  │  ├─ products/[slug]/page.tsx
│  │  │  ├─ pricing/page.tsx
│  │  │  └─ changelog/page.tsx
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (dashboard)/dashboard/
│  │  │  ├─ page.tsx
│  │  │  ├─ orders/page.tsx
│  │  │  ├─ orders/[orderNumber]/invoice/page.tsx
│  │  │  └─ licenses/page.tsx
│  │  ├─ admin/
│  │  │  ├─ page.tsx
│  │  │  ├─ products/page.tsx
│  │  │  ├─ products/[id]/page.tsx
│  │  │  ├─ orders/page.tsx
│  │  │  └─ settings/page.tsx
│  │  ├─ checkout/success/page.tsx
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ checkout/route.ts
│  │  │  ├─ webhooks/midtrans/route.ts
│  │  │  ├─ licenses/activate/route.ts
│  │  │  ├─ licenses/[id]/download/route.ts
│  │  │  ├─ download/[token]/route.ts
│  │  │  ├─ admin/.../route.ts
│  │  │  └─ health/route.ts
│  │  ├─ layout.tsx
│  │  ├─ error.tsx
│  │  ├─ not-found.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ marketing/
│  │  ├─ dashboard/
│  │  └─ admin/
│  ├─ config/site.ts
│  ├─ lib/
│  │  ├─ db.ts
│  │  ├─ env.ts
│  │  ├─ auth.ts
│  │  ├─ rate-limit.ts
│  │  ├─ license.ts
│  │  ├─ download.ts
│  │  ├─ pricing.ts
│  │  ├─ email.ts
│  │  ├─ audit.ts
│  │  ├─ storage/index.ts
│  │  ├─ storage/local.ts
│  │  ├─ storage/vercel-blob.ts
│  │  ├─ payments/provider.ts
│  │  └─ payments/midtrans.ts
│  ├─ validation/
│  └─ middleware.ts
├─ tests/
├─ .env.example
├─ .gitignore
└─ README.md
```

## 9. Data Model (Prisma)

```prisma
enum Role            { USER ADMIN }
enum ProductStatus   { DRAFT AVAILABLE COMING_SOON ARCHIVED }
enum OrderStatus     { PENDING PAID EXPIRED FAILED REFUNDED }
enum LicenseStatus   { ACTIVE REVOKED EXPIRED }

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  role          Role      @default(USER)
  accounts      Account[]
  sessions      Session[]
  orders        Order[]
  licenses      License[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// Account, Session, VerificationToken: standar Auth.js Prisma adapter

model Product {
  id                 String        @id @default(cuid())
  slug               String        @unique
  name               String
  tagline            String
  description        String        // markdown
  category           String
  status             ProductStatus @default(DRAFT)
  priceIdr           Int
  earlyBirdPriceIdr  Int?
  earlyBirdEndsAt    DateTime?
  licenseType        String        @default("personal")
  version            String        @default("1.0.0")
  coverGradient      String?
  demoUrl            String?
  featured           Boolean       @default(false)
  sortOrder          Int           @default(0)
  files              ProductFile[]
  orders             Order[]
  licenses           License[]
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  @@index([status, sortOrder])
}

model ProductFile {
  id             String   @id @default(cuid())
  productId      String
  product        Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  version        String
  storageKey     String
  fileName       String
  mimeType       String
  sizeBytes      Int
  checksumSha256 String
  isCurrent      Boolean  @default(true)
  createdAt      DateTime @default(now())
  @@unique([productId, version])
}

model Order {
  id             String      @id @default(cuid())
  orderNumber    String      @unique
  userId         String?
  user           User?       @relation(fields: [userId], references: [id])
  email          String
  productId      String
  product        Product     @relation(fields: [productId], references: [id])
  amountIdr      Int
  currency       String      @default("IDR")
  status         OrderStatus @default(PENDING)
  provider       String      @default("midtrans")
  providerRef    String?
  idempotencyKey String      @unique
  paidAt         DateTime?
  expiresAt      DateTime
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  license        License?
  @@index([userId, status])
  @@index([status, expiresAt])
}

model License {
  id              String        @id @default(cuid())
  orderId         String        @unique
  order           Order         @relation(fields: [orderId], references: [id])
  productId       String
  product         Product       @relation(fields: [productId], references: [id])
  userId          String?
  user            User?         @relation(fields: [userId], references: [id])
  keyHash         String        @unique
  keyPrefix       String
  keyLast4        String
  type            String        @default("personal")
  maxActivations  Int           @default(1)
  activationCount Int           @default(0)
  status          LicenseStatus @default(ACTIVE)
  issuedAt        DateTime      @default(now())
  expiresAt       DateTime?
  revokedAt       DateTime?
  activations     Activation[]
  downloadTokens  DownloadToken[]
  downloadLogs    DownloadLog[]
  @@index([userId, status])
}

model Activation {
  id           String   @id @default(cuid())
  licenseId    String
  license      License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)
  instanceId   String
  ipHash       String?
  userAgentHash String?
  createdAt    DateTime @default(now())
  lastSeenAt   DateTime @default(now())
  @@unique([licenseId, instanceId])
}

model DownloadToken {
  id        String   @id @default(cuid())
  licenseId String
  license   License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  maxUses   Int      @default(2)
  usedCount Int      @default(0)
  createdAt DateTime @default(now())
  @@index([expiresAt])
}

model DownloadLog {
  id        String   @id @default(cuid())
  licenseId String
  license   License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)
  tokenId   String?
  ipHash    String?
  userAgent String?
  createdAt DateTime @default(now())
  @@index([licenseId, createdAt])
}

model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String
  eventId     String   @unique
  orderNumber String?
  payloadHash String
  status      String
  processedAt DateTime @default(now())
}

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}

model RateLimit {
  key         String
  windowStart DateTime
  count       Int      @default(1)
  @@id([key, windowStart])
  @@index([windowStart])
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String
  entity    String
  entityId  String?
  meta      Json?
  ipHash    String?
  createdAt DateTime @default(now())
  @@index([entity, entityId])
  @@index([createdAt])
}
```

Aturan:
- Harga efektif dihitung server dari `Product` + early bird.
- Order → License harus dalam satu `$transaction`.
- `License.orderId` unik = jaminan tidak ada license ganda.
- Jangan simpan license key mentah. Simpan `keyHash` (HMAC-SHA256).
- Jangan simpan token download mentah. Simpan SHA-256.

## 10. Fitur per Modul

### 10.1 Public / Marketing
- [ ] Navbar + mobile menu
- [ ] Hero + featured product + countdown server-driven
- [ ] Stats editable
- [ ] 4 principles
- [ ] Featured bundle banner
- [ ] Product carousel/grid
- [ ] Roadmap/changelog
- [ ] FAQ accordion
- [ ] CTA + footer
- [ ] `/products` filter kategori + sort (whitelist)
- [ ] `/products/[slug]`: detail, fitur, versi, changelog, demo, CTA
- [ ] `/pricing`: perbandingan lisensi Personal/Team/Agency
- [ ] `/changelog`: riwayat rilis

### 10.2 Auth (Google only)
- [ ] Auth.js v5 + Prisma adapter, database session
- [ ] Google provider
- [ ] `callbacks.session` menyertakan `role`
- [ ] `events.signIn` set admin dari `ADMIN_EMAILS`
- [ ] Login page + tombol Google
- [ ] Proteksi `/dashboard` dan `/admin`
- [ ] Admin dicek ulang di server (layout + setiap action)

### 10.3 Checkout & Payment
- [ ] `POST /api/checkout`: auth, Zod, rate limit
- [ ] Hitung harga server-side + early bird
- [ ] Buat Order PENDING + `orderNumber`
- [ ] Idempotency key unik
- [ ] Buat transaksi Midtrans Snap → `redirect_url`
- [ ] Redirect ke Snap
- [ ] Halaman `/checkout/success`
- [ ] Webhook Midtrans:
  - verifikasi signature
  - re-fetch status ke API Midtrans
  - cek amount == order.amountIdr
  - idempotency `WebhookEvent.eventId`
  - update PAID / EXPIRED / REFUNDED
- [ ] Expiry order 24 jam (lazy check)
- [ ] Invoice printable di dashboard

### 10.4 License
- [ ] Generator: 16 char Crockford Base32, format `GABUT-XXXX-XXXX-XXXX-XXXX`
- [ ] 80-bit entropy, `crypto.randomBytes`
- [ ] Hash HMAC-SHA256, simpan prefix + last4
- [ ] Issue otomatis setelah webhook PAID (transaksional)
- [ ] Email license via Resend
- [ ] Halaman sukses menampilkan key sekali
- [ ] `POST /api/licenses/activate`: validasi + instanceId + rate limit
- [ ] Revoke license (admin) + audit log
- [ ] Tampilan dashboard: masked key

### 10.5 Protected Download
- [ ] `POST /api/licenses/[id]/download`: cek auth + ownership + status
- [ ] Buat DownloadToken: 32 byte acak, hash SHA-256, TTL 30 menit, max 2x
- [ ] `GET /api/download/[token]`: hash lookup, cek expiry/uses/status
- [ ] Increment usedCount dalam transaksi
- [ ] Stream file dari storage adapter
- [ ] Header: `Content-Disposition: attachment`,
      `Content-Type: application/octet-stream`, `Cache-Control: no-store`
- [ ] Log unduhan (IP hash, UA)
- [ ] Tidak ada public blob URL

### 10.6 Dashboard User
- [ ] Ringkasan akun
- [ ] Orders + status + invoice
- [ ] Licenses + masked key + tombol download
- [ ] Riwayat download
- [ ] Sign out

### 10.7 Admin
- [ ] CRUD produk
- [ ] Upload file produk (ZIP/PDF, max 50MB, magic bytes)
- [ ] Set versi + changelog + `isCurrent`
- [ ] Publish / unpublish / coming soon
- [ ] Edit settings (stats, hero copy, featured, announcement)
- [ ] Orders list + filter
- [ ] Revoke license
- [ ] Resend license email
- [ ] Audit log aksi admin

### 10.8 Settings
Key: `stats.licenses`, `stats.gmv`, `stats.uptime`,
`hero.headline`, `hero.subheadline`, `featured.slug`,
`featured.endsAt`, `announcement`.
Fallback ke `src/config/site.ts` jika DB kosong.

## 11. Routes & Auth Matrix

| Route | Method | Auth | Rate limit |
|---|---|---|---|
| `/api/checkout` | POST | User | 5/min/user |
| `/api/webhooks/midtrans` | POST | Signature | 120/min/IP |
| `/api/licenses/activate` | POST | Public (key) | 10/min/IP |
| `/api/licenses/[id]/download` | POST | Owner | 10/min/user |
| `/api/download/[token]` | GET | Token | 30/min/IP |
| `/api/admin/*` | * | ADMIN | 60/min/user |
| `/api/auth/*` | * | - | 20/min/IP |
| `/api/health` | GET | Public | - |

## 12. Security Requirements

### Wajib
- [ ] Semua secret dari env; `.env` di `.gitignore`; `.env.example` tanpa nilai
- [ ] Validasi env saat boot dengan Zod (`src/lib/env.ts`)
- [ ] Zod di semua route handler dan server action
- [ ] Prisma only; raw query hanya tagged template
- [ ] Tanpa `dangerouslySetInnerHTML`; sanitasi markdown changelog
- [ ] Cek ownership order/license/download di server
- [ ] Admin check di server, bukan hanya hide UI
- [ ] Webhook: signature + re-fetch + amount + idempotency + replay window
- [ ] License: 80-bit entropy, HMAC hash, rate limit
- [ ] Download: token hash, TTL pendek, single-use, no public URL
- [ ] Upload: admin only, MIME + magic bytes, size limit, nama acak
- [ ] CSP nonce, HSTS (prod), nosniff, frame-ancestors, Referrer-Policy
- [ ] Logging tanpa secret/PII; error generik di produksi
- [ ] `npm audit` bersih (atau terdokumentasi)
- [ ] Refund → revoke license + token

### CSP awal
```
default-src 'self';
script-src 'self' 'nonce-{nonce}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self';
connect-src 'self' https://api.sandbox.midtrans.com https://api.midtrans.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

### Catatan
- Snap memakai `redirect_url`, jadi tidak perlu script Midtrans di client.
- Jangan pernah menaruh `MIDTRANS_SERVER_KEY` di bundle client.
- Jangan log license key/token mentah.

## 13. Fase Eksekusi

### Fase 0 — Scaffold & Baseline
- [ ] `create-next-app` (TS, App Router, Tailwind)
- [ ] ESLint, Prettier, `tsx`
- [ ] Prisma init + koneksi Neon (pooled + direct)
- [ ] Auth.js + Prisma adapter
- [ ] `src/lib/env.ts` (Zod)
- [ ] `.env.example`, `.gitignore` (termasuk `storage/`)
- [ ] Security headers + `middleware.ts`
- [ ] Rate limit helper
- [ ] Storage adapter (`local` dulu)
- [ ] Script: `dev`, `build`, `lint`, `typecheck`, `test`, `db:migrate`, `db:seed`, `db:studio`
- **Acceptance:** `npm run build` dan `npm run lint` lolos.

### Fase 1 — Design System + Landing
- [ ] Token + font + komponen UI dasar
- [ ] Semua section landing + responsive + a11y
- [ ] Countdown server-driven
- [ ] Seed produk + settings
- [ ] Cover gradient
- **Acceptance:** landing sesuai referensi di 360/768/1440,
  tidak ada overflow, keyboard nav jalan.

### Fase 2 — Katalog & Detail
- [ ] `/products` + filter + sort whitelist
- [ ] `/products/[slug]`
- [ ] `/pricing`, `/changelog`
- [ ] Test unit harga efektif + filter
- **Acceptance:** produk COMING_SOON tidak bisa dibeli.

### Fase 3 — Auth
- [ ] Google OAuth flow
- [ ] Session + role
- [ ] Proteksi route
- [ ] Login page
- **Acceptance:** user biasa tidak bisa akses `/admin`.

### Fase 4 — Checkout & Webhook
- [ ] Checkout + Snap redirect
- [ ] Webhook verifikasi + idempotency
- [ ] Test signature valid/invalid, replay, amount salah
- **Acceptance:** webhook ganda tidak membuat license ganda.

### Fase 5 — License
- [ ] Generator + hash
- [ ] Issue transaksional
- [ ] Email
- [ ] Halaman sukses
- [ ] Activation API
- [ ] Test collision, format, HMAC
- **Acceptance:** key hanya tampil sekali; email terkirim.

### Fase 6 — Download
- [ ] Token + streaming
- [ ] Test expired, over-use, wrong owner, unpaid order
- **Acceptance:** tidak ada file yang bisa diakses tanpa token valid.

### Fase 7 — Dashboard & Admin
- [ ] Dashboard user
- [ ] Admin CRUD + upload + settings + revoke
- [ ] Audit log
- **Acceptance:** admin bisa ganti stats tanpa rebuild.

### Fase 8 — QA & Handoff
- [ ] Unit + integration test
- [ ] `lint`, `typecheck`, `build`, `npm audit`
- [ ] Security review checklist
- [ ] README lengkap
- **Acceptance:** semua command lolos; README bisa diikuti dari nol.

## 14. Testing

### Unit
- [ ] License key: format, normalisasi, entropy, HMAC
- [ ] Harga efektif + early bird window
- [ ] Download token: TTL, max uses
- [ ] Signature Midtrans valid/invalid
- [ ] Mapping status Midtrans

### Integration
- [ ] Checkout membuat order PENDING
- [ ] Webhook PAID membuat tepat 1 license
- [ ] Webhook duplikat no-op
- [ ] Amount mismatch ditolak
- [ ] Download ditolak untuk bukan owner
- [ ] Download ditolak untuk order belum PAID
- [ ] Token expired/over-use ditolak

### Manual / E2E
- [ ] Login Google
- [ ] Beli via Midtrans sandbox
- [ ] Terima email license
- [ ] Download file
- [ ] Admin edit stats → landing berubah

### Commands
```
npm run lint
npm run typecheck
npm test
npm run build
```

## 15. Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=            # pooled
DIRECT_URL=              # direct, untuk migrasi

# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAILS=you@example.com

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# License
LICENSE_HMAC_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=CodeGems <noreply@example.com>

# Storage
STORAGE_DRIVER=local          # local | vercel-blob
LOCAL_STORAGE_DIR=./storage
BLOB_READ_WRITE_TOKEN=
```

## 16. Setup Eksternal (untuk user, nanti)

### Google OAuth
1. Google Cloud Console → New Project
2. APIs & Services → OAuth consent screen → External
3. Credentials → Create OAuth Client ID → Web application
4. Authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID + Secret ke `.env`

### Midtrans Sandbox
1. Daftar di `dashboard.sandbox.midtrans.com`
2. Settings → Access Keys → copy Server Key + Client Key
3. Settings → Payment → aktifkan metode yang diinginkan
4. Webhook URL (nanti saat deploy):
   `https://<domain>/api/webhooks/midtrans`
5. Untuk lokal, gunakan tunnel (ngrok/cloudflared) saat tes webhook.

### Vercel Blob (hanya saat deploy)
1. Buat project Vercel
2. Storage → Create → Blob
3. Copy `BLOB_READ_WRITE_TOKEN`
4. Set `STORAGE_DRIVER=vercel-blob`
5. Upload file produk lewat admin

## 17. Definition of Done

- [ ] Landing + katalog + detail sesuai design spec
- [ ] Google login bekerja
- [ ] Checkout sandbox → webhook → license → email → download bekerja
- [ ] License key tidak bisa dipakai ulang melebihi batas
- [ ] Download token expire dan tidak bisa di-share bebas
- [ ] Admin bisa kelola produk + stats
- [ ] Semua test, lint, typecheck, build lolos
- [ ] Tidak ada secret di repo
- [ ] README bisa diikuti dari nol
- [ ] Tidak ada deploy/domain/CI (sesuai scope)

## 18. Risiko & Catatan

- **Midtrans butuh KYC** untuk produksi; sandbox aman untuk development.
- **Google OAuth** dalam mode testing hanya untuk test user sampai dipublish.
- **Vercel filesystem ephemeral** — wajib object storage di produksi.
- **Jangan jual kode milik orang lain.** Produk #1–#3 harus dibuat sendiri.
- **Lisensi pihak ketiga** ikut disertakan di ZIP produk.
- **ZIP produk belum dibuat** di plan ini; fokus dulu ke toko.
- **Harga & statistik** placeholder; ganti sebelum publik.
