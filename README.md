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
| `api/`   | Node + Express + Prisma + SQLite | REST API: JWT auth, JR wallet engine, purchases, partnership commissions, admin management |
| `front/` | React + Vite | Consumer platform (news, wallet, programs, purchase flow, bonuses, partnership, settings) |
| `cms/`   | React + Vite | Admin back-office (users, payments, catalogue, parameters, statistics) |

## Running it

Three processes. Start the API first.

```bash
# 1) API  (http://localhost:4000)
cd api
npm install
npm run setup      # generate client + create SQLite db + seed demo data
npm run dev

# 2) Consumer front  (http://localhost:5173)
cd front
npm install
npm run dev

# 3) CMS  (http://localhost:5174)
cd cms
npm install
npm run dev
```

Both frontends proxy `/api` to the API at `localhost:4000`.

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
