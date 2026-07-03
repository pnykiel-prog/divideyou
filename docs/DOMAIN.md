# DivideYou — Domain Model (rebuild reference)

DivideYou is a consumer savings/group-buying platform built around an internal
virtual currency called **JR** (*Jednostka Rozliczeniowa* — "settlement unit").
Users top up JR with real money (PLN), spend JR on **Programs** / **Locations** /
**Bonuses**, pay recurring **subscriptions**, earn **partnership commissions**
from referrals, and can withdraw JR back to money. Two apps sit on top of one API:
a **consumer platform** (`front`) and a **back-office CMS** (`cms`).

## Money

Two currencies, both stored as **integers in minor units** (never floats):

- **JR** — internal currency. Stored ×100 (2 decimals). Displayed `value / 100`.
- **PLN** — real money (grosze). Stored ×100.
- Conversion uses the current `Settings.jrExchangeRate` (PLN per 1 JR):
  `pln = jr/100 * rate`, `jr = pln/rate * 100`.

> The legacy app scaled JR by 1e8; the rebuild uses ×100 to stay within JS safe
> integers while preserving 2-decimal precision. Behaviour is otherwise identical.

## Wallet (derived, never stored authoritatively)

A client's balance is computed by **replaying their transaction ledger** in
sequence into 6 buckets (`WalletModel`):

| Bucket | Meaning |
|---|---|
| `active` | spendable JR (accepted top-ups, donations, personal commissions) |
| `pending` | JR from top-ups whose payment is not yet accepted |
| `inactive` | JR already spent (running total consumed) |
| `toPayout` | JR eligible for cash withdrawal (past the withdrawal period) |
| `toCommissionPayout` | commission JR eligible for payout |
| `blocked` | collateral frozen by active purchases |

## Transactions (JR ledger, append-only)

| Type | Effect |
|---|---|
| `JR_PURCHASE` / `JR_PURCHASE_ONLINE` | +active when payment accepted (else +pending); becomes toPayout after `jrWithdrawalPeriodDays` |
| `PROGRAM_PURCHASE` / `BONUS_PURCHASE` | active → inactive (spends toPayout first) |
| `ACCOUNT_DONATION` | +active (admin credit) |
| `REQUEST_DONATION` | +active (admin grants a request as credit) |
| `SUBSCRIPTION_FEE` | active → inactive (monthly charge) |
| `PARTNERSHIP_COMMISSION_INCOME` | +active and +toCommissionPayout |
| `PAYOUT` | −active / −toPayout → inactive when accepted |
| `COMMISSION_PAYOUT` | −toCommissionPayout (→ toPayout when accepted) |
| `REQUEST_PAYOUT` | −active → inactive when the request is accepted |
| `FROZEN_RESOURCES` | +blocked while purchase active; returns to +active on expiry/finish/cancel |
| `CANCELLATION` | reversal marker |

## Payments (PLN, real cash)

`type`: JR_PURCHASE, ACCESS_FEE, JR_PAYOUT, COMMISSION_PAYOUT, ACCESS_PAYOUT.
`status`: INIT, PENDING, ACCEPTED, REJECTED. Admin flips status; status drives
whether linked JR is `active` vs `pending`.

## Core entities

- **User** — auth identity. `type`: CLIENT / ADMIN. `blockedStatus`:
  UNBLOCKED / SUBSCRIPTION_UNPAID / DEMO_EXPIRED / BY_ADMIN. Roles derived
  dynamically (ROLE_CLIENT, ROLE_CLIENT_PAID, ROLE_CLIENT_PARTNER, ROLE_ADMIN, …).
- **UserClient** — customer profile. `type`: PERSONAL / BUSINESS. Referral fields
  (`partnerNumber`, `partnerOf`), access-fee state, denormalized balances.
- **UserAdmin** — admin profile with a granular permission matrix + `superAdmin`.
- **Program** — sellable offering. Normal programs are sold through child
  **Locations**; `isBonus` programs are sold directly (capped by `maxPurchases`).
  Fields: entryFee, subscriptionPrice, amountBlocked, gracePeriod (months),
  vip, recommended, visible, minimalJrForView.
- **Location** — the buyable unit of a normal Program (place with own fees,
  purchaseDuration, coordinates, attributes).
- **ProgramAttribute / PurchaseAttribute** — tree-structured configurable options
  with their own pricing (startFee, subscriptionPrice, amountBlocked), limits and
  types (LABEL / CHECKBOX / NUMERICAL).
- **Purchase** — a client's purchase of one Location or one bonus Program.
  Snapshots price/subscriptionFee/amountBlocked; lifecycle draft → active →
  finished/canceled; `nextPaymentDate` advances monthly.
- **Transaction / Payment / ClientRequest** — see money model above.
- **PartnershipCommissionThreshold** — commission % tiers by downline size
  (global or per-client override).
- **Settings** — versioned config: demoAccessDays, accessPrice (PLN),
  jrExchangeRate, jrWithdrawalPeriodDays, jrProtectionPeriodDays, minJrForVip,
  minJrForBonus, partnerTerm.
- **RegistrationRule / ElectronicRules / GDPRAgreement** — legal/consent content.
- **News / FAQ / File / ObservedItem / Invitation / Log** — content & support.

## Partnership / commissions

Single-level referral tree via `UserClient.partnerOf`. When a downline client
**buys JR**, the upline earns a `PARTNERSHIP_COMMISSION_INCOME` transaction.
Rate = `value * percentage%`, where percentage comes from the first matching
commission threshold (personal override, else global) for the partner's downline
count. Business clients withdraw commissions via commission payout.

## Cron / background recompute

- Expire demo accounts past `demoAccessDays` that never paid the access fee.
- Charge due subscriptions from `active` JR; advance `nextPaymentDate`;
  finish purchases past `endDate`.
- Escalating unpaid-subscription reminders; recompute denormalized balances.
