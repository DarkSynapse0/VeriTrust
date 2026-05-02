# VeriTrust

Tamper-evident credential verification. Institutions issue digital credentials (degrees, certificates, IDs); anyone verifies authenticity instantly via QR scan, PDF upload, or hash. Polygon as the trust notary; PostgreSQL for human-readable data; Cloudflare R2 for canonical JSON and PDFs.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript strict, Tailwind, shadcn-style UI
- **Wallet**: wagmi + viem + RainbowKit + SIWE (scaffold present; UI wiring in roadmap)
- **DB**: PostgreSQL via Prisma (`@veritrust/db` workspace)
- **Cache + rate-limit**: Upstash Redis
- **Storage**: Cloudflare R2 (S3-compatible)
- **Smart contract**: Solidity 0.8.24 + Hardhat + OpenZeppelin AccessControl
- **Chain**: Polygon Amoy testnet (chainId 80002)

## Workspace layout

```
veritrust/
├── apps/web/                  # Next.js app (UI + APIs + lib/)
├── packages/
│   ├── contracts/             # Solidity + Hardhat tests + deploy scripts
│   ├── shared-types/          # Cross-workspace TypeScript types
│   └── canonical-schemas/     # JSON schemas for credential types
└── infrastructure/
    └── prisma/                # Schema, migrations, generated client (@veritrust/db)
```

## Setup

```bash
# 1. Install
pnpm install

# 2. Generate the Prisma client (also runs on postinstall)
pnpm --filter @veritrust/db db:generate

# 3. Copy environment template and fill values (see "Required values" below)
cp .env.example .env

# 4. Apply database migrations (requires DATABASE_URL pointing at a Postgres you can reach)
pnpm --filter @veritrust/db db:migrate:dev

# 5. Run all tests
pnpm test          # 68 tests (48 contracts + 20 web/lib)

# 6. Build the web app and start
pnpm build
pnpm --filter @veritrust/web start
```

## Demo / preview (no env required)

The verification page renders all four states from static fixtures so you can see the UI without a deployed contract or a database:

```bash
pnpm --filter @veritrust/web dev
# Then open:
#   http://localhost:3000/                            (landing)
#   http://localhost:3000/verify?demo=verified
#   http://localhost:3000/verify?demo=tampered
#   http://localhost:3000/verify?demo=revoked
#   http://localhost:3000/verify?demo=not_registered
```

## Smart-contract tasks

```bash
pnpm --filter @veritrust/contracts compile
pnpm --filter @veritrust/contracts test       # 48 tests
pnpm --filter @veritrust/contracts coverage   # 100% line/branch/function/statement
pnpm --filter @veritrust/contracts deploy:amoy
```

## Required values to take this from preview → live

| Variable                                                      | What it is                                                                              | Where to get it                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` / `DIRECT_URL`                                 | PostgreSQL connection string                                                            | Supabase, Neon, or local Docker `postgres`           |
| `ALCHEMY_API_KEY`                                             | RPC for Polygon Amoy reads                                                              | alchemy.com → Create app → Polygon, Polygon Amoy     |
| `INFURA_API_KEY`                                              | Optional fallback RPC                                                                   | infura.io                                            |
| `POLYGONSCAN_API_KEY`                                         | Contract verification                                                                   | polygonscan.com → API Keys                           |
| `DEPLOYER_PRIVATE_KEY`                                        | 64-hex private key (not an address) for the deployer wallet, **funded with Amoy MATIC** | Generate fresh, fund via `faucet.polygon.technology` |
| `INITIAL_ADMIN_ADDRESS`                                       | 40-hex address granted DEFAULT_ADMIN_ROLE on deploy                                     | Your admin wallet's address                          |
| `NEXT_PUBLIC_REGISTRY_ADDRESS`                                | The deployed contract address                                                           | Output of `deploy:amoy`                              |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`         | Redis for cache + rate-limit                                                            | upstash.com                                          |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 credentials                                                               | dash.cloudflare.com → R2                             |
| `R2_BUCKET_CANONICAL` / `R2_BUCKET_PDFS`                      | Bucket names                                                                            | Create both buckets in R2                            |
| `SESSION_SECRET`                                              | 32+ random bytes for JWT signing                                                        | `openssl rand -base64 32`                            |

## Roadmap (what is **not** yet implemented)

The following surfaces are scaffolded but not yet wired:

- **Wallet auth UI** — RainbowKit + wagmi providers and SIWE button. Backend (`/api/auth/*`) is implemented and tested.
- **Issuer dashboard interactivity** — the page renders, but stat cards and activity feed need the data fetch + render.
- **Issuance form UI** — backend (`/api/issuance/single` + `/api/issuance/confirm`) implemented; the React form for filling fields and signing the on-chain registration is the next UI piece.
- **Batch issuance** — CSV upload + chain batch tx; backend pieces present, UI not yet.
- **Revocation modal** — `/api/revocation` is implemented; modal UI to drive it is not.
- **Public registry pages** — `/registry` shows an empty state; institution profile pages are not implemented.
- **Admin UI** — `/admin/*` route group not implemented; admin actions can be done from a CLI/cast.
- **`/api/verification/by-pdf`** — PDF upload + QR extraction not implemented; verifying by hash works.
- **PDF generator route** — `lib/pdf/generator.tsx` and `/api/pdf/[id]` not yet implemented (no @react-pdf/renderer code yet).
- **Chain webhooks** — `/api/webhooks/chain` not implemented; confirmation today happens via `waitForTransactionReceipt` synchronously.
- **End-to-end Playwright test** — recommended once the full UI is wired.
- **The Graph subgraph** — explicitly deferred per task list.
