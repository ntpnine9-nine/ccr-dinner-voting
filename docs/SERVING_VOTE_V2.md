# Serving voting v2 — 22 October 2026

Category allocation and billing:

| Categories | Required selection units | Allowed allocation | Billing |
| --- | ---: | --- | --- |
| A, B, C, E, F | 2 | One menu ×2, or two menus ×1 | Unit price × selected quantity |
| D, G | 1 | One menu ×1 | Unit price ×1 |
| H | 1 | One rice menu | Unit price ×2 |

A complete ballot has 13 selection units and 14 billed servings. Each category must fill its quota. Unavailable items cannot be submitted. A ballot may exceed the suggested budget; the organizer can use the optimizer to build a feasible plan.

Canonical choices are nested maps, e.g. `A: {A1: 1, A2: 1}` and `H: {H1: 1}`. The shared model validates frontend selections and Edge payloads; PostgreSQL independently validates menu ownership, availability and quantities. The server ignores client prices. Unit prices are the existing 56 catalog reference prices, compared with the database; no new restaurant price verification or Excel workbook inspection was performed. Catalog version is 2. The existing ฿200 rice reserve and ฿120 drinks allowance remain separate from menu prices. Maximum food cost is ฿2,258, maximum including allowances is ฿2,578.

Raw historical ballots are retained without alteration. For comparison under the new quotas, legacy one-menu values are explicitly interpreted as that menu filling the category quota. The admin list and plan identify historical votes; participants should review quantities and submit again. This is an interpretation for display/tally, not evidence that an old voter chose two servings. Re-submission replaces the same participant ballot; aliases remain optional, nonunique labels and never grant ownership.

Each menu receives support equal to allocated selection units (H contributes 1). Each candidate table plan scores `sum(menu support × plan selection units)`. The optimizer enumerates all 28 allocations in two-unit categories and 7 in single-unit categories, then finds maximum weighted support under the total budget, breaking ties by lower price and deterministic IDs. Order CSVs flatten all selected menus with their actual billed quantities.

Validation:

- `npm test`: model constraints, mixed selections, rice billing, immutable legacy inputs, exhaustive enumeration vs budget optimizer, existing release and cloud-client tests.
- `npm run check`: 56 catalog entries and maximum cost.
- `python scripts/servings-smoke.py`: disposable live public submissions, idempotent retries, invalid quantities, catalog version rejection, legacy and anonymous paths, unauthorized admin rejection. It writes only cleanup hashes and receipts to `/tmp/ccr-serving-test-state.json`; remove those test identities through authorized database access afterwards.
- Database integration checks independently read the saved canonical ballot and exercise administrative save/delete plus audit logging in a rolled-back transaction. Historical record fingerprints are compared before/after.

Deploy the migration, then Edge `vote` with `index.ts`, `participant-label.ts` and the root `ballot-model.js` supplied as a deployment file. The static frontend and all module cache versions must be deployed together. Existing catalog-version-1 pages must refresh. Public HTML/modules are hosted on GitHub Pages. The optional static gateway allowlist/publisher include `ballot-model.js`.

Production verification: migration applied as `20261022044549_serving_quotas_v2`, vote Edge version 9. Live split ballot and anonymous legacy-shaped submission persisted in canonical form; retries reused the same receipt. Invalid allocation and unauthenticated admin requests were rejected. Admin save/delete, atomic audit, invalid-edit rollback, closed/frozen guards and function privileges passed database integration checks. Disposable public test identities and their ballot audit events were removed. All two original ballot and two original RSVP row fingerprints remained unchanged. GitHub release checks, public CDN checks, public gateway checks and Pages deployment passed for commit `8e51cd9`. Public browser verified 1+1 selection, switching 2 back to 1, full-quota locking, D single serving and H single-selection/double-price behavior.
