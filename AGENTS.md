# AGENTS.md

## ChoreChamps 2.0 — mandatory agent orientation

ChoreChamps is transitioning from the legacy Next.js/Capacitor application in this repository to a **native SwiftUI iPhone/iPad + Apple Watch child companion to Family Planner**.

Before changing code, read in this order:

1. `docs/CHORECHAMPS_2_NATIVE_APP_PLAN.md` — canonical product/UX/architecture plan.
2. `docs/CHORECHAMPS_2_IMPLEMENTATION_CONTRACT.md` — mandatory implementation, migration, platform, security, privacy, release and decision contract.
3. GitHub epic #231 and the active child issue.
4. Current `camster91/chore-champs` repository state and open PRs.
5. Current `camster91/family-planner` schema/product program/consolidation plan and relevant APIs before inventing any mobile contract.

If legacy documentation, old web code, old App Store copy, or historical issues conflict with the two ChoreChamps 2.0 documents above, treat the legacy material as reference unless a newer checked-in decision explicitly supersedes the native plan.

## Non-negotiable product rules

- Family Planner is the canonical household backend and parent/admin product.
- ChoreChamps is the child-facing native Apple client.
- Do not create a second canonical family/child/chore/reward database.
- Server authorization determines family scope and role; never trust client-supplied family IDs.
- Server calculates authoritative XP/stars, approvals, badges and reward spending.
- Retry/replay must not duplicate completion, XP or reward spending.
- SwiftData is local cache + pending mutation queue, not source of truth.
- Apple Watch is a first-class independent-capable daily client; the core loop must not require live iPhone proximity.
- Today is the primary child journey.
- Preserve accessibility, child privacy, offline reliability and age-appropriate UX in every relevant change.
- Do not add ads, behavioural tracking, GPS tracking, sibling leaderboards, or manipulative streak mechanics.

## External-action approval gates

Never deploy to production, submit/distribute through App Store/TestFlight, send messages, spend money, alter billing, delete production data, retire the legacy runtime, change account access, or perform another difficult-to-reverse action without explicit approval for that exact action.

Passing tests, merging a PR, or obtaining a build is not production approval.

## Agent execution workflow

For each issue:

1. Re-read the two native plan documents and active issue.
2. Inspect repository and Family Planner reality rather than relying on stale assumptions.
3. Identify unresolved product/architecture decisions before coding.
4. Choose the smallest vertical implementation slice.
5. Add tests with the implementation.
6. Validate family isolation, idempotency, offline/retry behaviour, privacy and accessibility where relevant.
7. Run available build/test/lint/QA gates.
8. Review the diff for accidental production coupling or legacy assumptions.
9. Open a focused PR with evidence, limitations and rollback notes.
10. Do not claim runtime verification that was not actually performed.

If an issue is too large, split it into ordered child issues instead of delivering an oversized speculative PR.

## Native target direction

Provisional baseline, subject to verification in issue #232:

- iOS/iPadOS 18+
- watchOS 11+
- SwiftUI
- SwiftData
- URLSession + async/await
- Keychain
- WidgetKit
- App Intents
- UserNotifications / APNs
- Swift Testing/XCTest/XCUITest
- `xcodebuild` CI

Prefer Apple frameworks. Any third-party Swift package requires a clear justification, privacy/license review and exit strategy.

## Legacy web application

The current repository still contains the v1 Next.js 16 / React / Prisma / PostgreSQL / NextAuth / Capacitor application. It is migration and rollback reference material until the native replacement and Family Planner cutover are verified.

Do not delete or destructively restructure legacy code before the preservation branch/tag and migration/recovery requirements in the native plan are satisfied.

When specifically working on legacy-v1 preservation, migration, security evidence or exports, the historical commands remain relevant:

- `npm run dev`
- `npm run lint`
- `npm test`
- `npm run build`
- local development uses a clean PostgreSQL database with `prisma db push` as documented in the legacy README/setup material;
- production database operations require the legacy production runbook and separate approval.

Do **not** interpret these legacy commands as the architecture for ChoreChamps 2.0.

## Source-of-truth hierarchy

1. Newer explicitly approved checked-in decision/ADR.
2. `docs/CHORECHAMPS_2_IMPLEMENTATION_CONTRACT.md` for implementation/cutover/platform rules.
3. `docs/CHORECHAMPS_2_NATIVE_APP_PLAN.md` for product/UX/architecture intent.
4. Epic #231 and child issue acceptance criteria.
5. Current verified Family Planner contracts/schema.
6. Legacy ChoreChamps web code and historical documentation as reference only.
