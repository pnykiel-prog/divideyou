# DivideYou

A modern rebuild of the legacy **DivideYou** platform — a consumer
savings/group-buying service built around an internal virtual currency (**JR**).
It reproduces the functionality of the original three-part application (a
Symfony API + two Angular apps) in a cohesive, runnable TypeScript stack.

The original source (for reference) is preserved in `divideyou-main.zip`.
See [`docs/DOMAIN.md`](docs/DOMAIN.md) for the domain model the rebuild is based on.

## What it does

Users top up **JR** with real money, spend it on **Programs** (sold through
physical **Locations**) and **Bonuses**, pay monthly **subscriptions**, earn
**partnership commissions** by referring others, and withdraw JR back to money.
A back-office **CMS** manages users, catalogue, payments, settings and statistics.

## Structure

| Folder | Stack | Description |
|--------|-------|-------------|
| `server/` | Node + Express + Prisma + PostgreSQL | REST API: JWT auth, JR wallet engine, purchases, partnership commissions, admin management |
| `front/`  | React + Vite | Consumer platform (news, wallet, programs, purchase flow, bonuses, partnership, settings) |
| `cms/`    | React + Vite | Admin back-office (users, payments, catalogue, parameters, statistics) |
| `api/`    | Vercel function | Serverless entry that serves the Express app on Vercel |

## Local development

Needs **Node 20+** and a **PostgreSQL** database (local or a Neon URL).

```bash
# 1) API  (http://localhost:4000)
cd server
cp .env.example .env          # set DATABASE_URL (+ JWT_SECRET, SEED_SECRET)
npm install
npm run setup                 # prisma generate + db push + seed demo data
npm run dev

# 2) Consumer front  (http://localhost:5173)
cd front && npm install && npm run dev

# 3) CMS  (http://localhost:5174)
cd cms && npm install && npm run dev
```

Both frontends proxy `/api` to the API at `localhost:4000`.

## Deploying to Vercel

The repo deploys as a **single Vercel project** (root `vercel.json`):
the consumer app is served at `/`, the CMS at `/cms`, and the Express API runs
as a serverless function at `/api/*`. Data lives in **Neon** (serverless Postgres).

1. **Create a Neon database** and copy its **pooled** connection string.
2. In the Vercel project → **Settings → Environment Variables**, add:
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | your Neon pooled connection string (`?sslmode=require`) |
   | `JWT_SECRET` | a long random string |
   | `SEED_SECRET` | a secret guarding the one-time demo-data endpoint |
   | `FRONT_URL` | your deployment URL (used for referral links) |
3. **Deploy.** The build (`npm run vercel-build`) runs `prisma generate`,
   syncs the schema to Neon (`prisma db push`), builds both SPAs and assembles
   the static output. Set `DATABASE_URL` **before** the first deploy so the
   schema is created; otherwise redeploy after adding it.
4. **Seed demo data once** by visiting:
   `https://YOUR_APP.vercel.app/api/bootstrap?secret=YOUR_SEED_SECRET`
   (idempotent — it only seeds an empty database; append `&force=1` to re-seed).

The Vercel project is expected to have its **Root Directory** set to the repo
root, with **auto-deploy on push** to the connected GitHub branch.

## Demo accounts (seeded)

| Role | Email | Password |
|------|-------|----------|
| Super admin (CMS) | `admin@divideyou.test` | `Password1` |
| Partner (funded, has referrals) | `anna@divideyou.test` | `Password1` |
| Client (owns a program) | `jan@divideyou.test` | `Password1` |
| Demo (unpaid access) | `demo@divideyou.test` | `Password1` |

## Money model in brief

- Money is stored as integers in minor units (×100) — never floats.
- A client's balance is **derived** by replaying their transaction ledger into
  six buckets: `active`, `pending`, `inactive`, `toPayout`,
  `toCommissionPayout`, `blocked`.
- JR bought becomes withdrawable only after the configured withdrawal period.
- Referral commissions are paid to the upline when a downline client buys JR,
  at a rate that scales with the number of partners recruited.

See [`docs/DOMAIN.md`](docs/DOMAIN.md) for the full model, transaction types and
wallet rules.
