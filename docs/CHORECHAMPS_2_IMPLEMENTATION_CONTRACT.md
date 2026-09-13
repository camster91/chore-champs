# ChoreChamps 2.0 — Implementation Contract

**Status:** Required companion to `docs/CHORECHAMPS_2_NATIVE_APP_PLAN.md`  
**Last end-to-end review:** 2026-09-13  
**Purpose:** Remove implementation ambiguity for future human or AI agents.  
**Authority:** If this contract conflicts with legacy web code, old store metadata, old Capacitor instructions, or historical issue text, this contract and the native app plan take precedence unless a newer checked-in decision explicitly supersedes them.

---

## 1. Agent operating rule

Before implementation, an agent must read:

1. `docs/CHORECHAMPS_2_NATIVE_APP_PLAN.md` in full.
2. This implementation contract in full.
3. Epic #231 and the active child issue.
4. The current `camster91/chore-champs` repository state.
5. The current `camster91/family-planner` schema, product program, consolidation plan, APIs, and relevant open issues.

The agent must not invent current Family Planner endpoints, schema fields, credentials, Apple platform requirements, migration status, or production state. Verify them first.

No production deployment, App Store submission, TestFlight distribution, billing change, destructive data operation, access change, message send, or other difficult-to-reverse action is permitted without explicit approval for that exact action.

---

## 2. Final product architecture

ChoreChamps 2.0 is a **native Apple child client**. Family Planner is the **canonical household backend and parent/admin product**.

```text
Family Planner
  canonical identity + family + roles + chores + habits + rewards + approvals
  PostgreSQL / Prisma / server authorization
                 |
         versioned child API
                 |
       ---------------------
       |                   |
ChoreChamps iOS/iPadOS   ChoreChamps watchOS
SwiftUI + SwiftData      SwiftUI + local cache
       |                   |
Widgets/App Intents      WidgetKit complications/Smart Stack
```

Do not build a second canonical family database inside ChoreChamps. SwiftData is a cache plus pending-write queue, not the source of truth.

---

## 3. Platform support contract

### Provisional minimums

Use the following as the starting compatibility target unless a documented architecture decision changes them after checking the actual Xcode/SDK feature requirements:

- iPhone/iPad: iOS/iPadOS 18+
- Apple Watch: watchOS 11+
- Swift: current stable Swift supported by the selected production Xcode toolchain
- Xcode: current production Xcode required for App Store submission at release time

These minimums are provisional because the project has not yet been scaffolded. Issue #232 must verify that every required API in the plan is available or has a graceful fallback. If widening compatibility materially increases complexity or removes important Watch/widget functionality, prefer the simpler reliable baseline and record the decision.

### Watch architecture

The Watch app is intended to run independently of its companion iPhone app for its core daily journey. Apple supports watchOS apps that run independently of their iOS companion. Core reads/writes therefore must not depend on a live WatchConnectivity session to the phone.

WatchConnectivity may accelerate setup or state transfer but is not the canonical transport for task completion.

### Required platform matrix before alpha

Document and test:

- smallest supported iPhone;
- current standard and large iPhones;
- iPad portrait and landscape;
- smallest supported Watch display;
- representative current larger Watch display;
- Watch with iPhone nearby;
- Watch with iPhone unavailable but Wi-Fi/cellular available;
- Watch offline with cached data.

---

## 4. Device topology and identity contract

### MVP rule: one child identity per app installation/device

To reduce accidental sibling data exposure, one ChoreChamps installation is paired to one child profile at a time.

Supported MVP topologies:

1. Child iPhone only.
2. Child iPhone + paired Apple Watch.
3. Independent-capable Apple Watch after parent-assisted setup.
4. Child iPad only.
5. Same child on multiple explicitly paired devices.

Deferred unless deliberately designed and tested:

- rapid sibling switching on one child device;
- multi-child home dashboard inside ChoreChamps;
- shared family iPad profile picker without a parental gate.

If shared-device switching is later added, it must prevent one child from viewing another child's private task state, reward history, notes, or proof media.

### Lost/replaced device

Parents must be able to revoke a device credential in Family Planner. A revoked client may retain only the minimum safe cached experience until it confirms revocation; it must not continue sending authenticated writes.

---

## 5. Canonical data ownership

Family Planner owns canonical:

- users and child/teen/parent role;
- family membership;
- schedules;
- chores and assignments;
- habits and habit logs;
- completion/approval state;
- XP/stars;
- levels/streaks;
- badges;
- rewards and redemptions;
- family goals;
- notification-device registrations;
- account deletion/export/audit history.

ChoreChamps owns only device-local cache, UI preferences allowed by the parent, pending idempotent mutations, and native presentation state.

A client never submits authoritative XP, family identity, approval requirement, reward cost, or badge eligibility.

---

## 6. Legacy ChoreChamps → Family Planner migration and cutover

This is a P0 data-integrity requirement, not cleanup work.

The legacy ChoreChamps schema currently has its own `Family`, `Parent`, `Kid`, `Chore`, `ChoreAssignment`, `Reward`, `Redemption`, `Habit`, `HabitLog`, `FamilyGoal`, badges, invites and related records. Family Planner already contains consolidated family-scoped chore, assignment, habit, badge, reward-redemption, goal, import-job and imported-record domains.

### Migration objective

Every approved legacy record must end in exactly one of these states:

1. mapped and imported into an explicit Family Planner target;
2. preserved in an archive/reconciliation record because no native target is appropriate;
3. explicitly excluded with a human-reviewed reason.

Never silently discard or guess identity mappings.

### Required source inventory

Before a real cutover, record:

- source database/export provenance;
- export timestamp;
- source application/version/commit where practical;
- SHA-256 checksum;
- row counts by model;
- family count;
- parent/member count;
- child count;
- chores and assignments;
- completion states;
- point balances and lifetime totals;
- habits/logs;
- rewards/redemptions;
- badge definitions/earned badges;
- family goals;
- push/device records if intentionally migrated;
- unresolved/invalid relationships.

### Identity rules

- Never match a child to a Family Planner user solely by display name.
- Never copy a legacy `Kid` record into the canonical `User` identity model without an explicit identity map.
- Parent/family mappings must be explicit and reviewable.
- Ambiguous rows remain unresolved; they are not guessed.

### Field-map artefact

Create a checked-in source→target map before real migration, covering at least:

- legacy Family → Family Planner Family;
- Parent/FamilyMember → canonical User/Family membership where applicable;
- Kid → canonical child/teen User;
- Chore → Chore template/current model;
- ChoreAssignment → ChoreAssignment;
- Habit/HabitLog → Habit/HabitLog;
- BadgeDefinition/EarnedBadge → corresponding domains;
- Reward/Redemption → Reward/RewardRedemption;
- FamilyGoal → FamilyGoal;
- balances/streaks/levels → documented canonical fields or reconciliation-only values.

### Import mechanics

Real import must be:

- dry-run first;
- versioned;
- idempotent;
- transactional per safe boundary;
- resumable or safely restartable;
- source-ID aware;
- count-reconciled;
- balance-reconciled;
- testable against an isolated restored backup.

Family Planner already has `ImportJob` and `ImportedRecord` concepts and a consolidation strategy that expects dry-run, explicit identity maps, source IDs and reconciliation. Reuse those concepts instead of creating a second migration framework.

### Cutover sequence

1. Freeze an approved legacy export/snapshot.
2. Back up legacy and Family Planner data.
3. Run dry-run import against review/staging.
4. Resolve identity and relationship exceptions.
5. Re-run dry-run until reconciliation is accepted.
6. Restore a fresh isolated Family Planner backup and rehearse persisted import.
7. Verify counts, balances, approvals, reward history and representative child journeys.
8. Define a cutover window and source write policy.
9. Migrate one module/domain at a time if safer.
10. Keep legacy source read-only/recoverable through the rollback window.
11. Switch ChoreChamps native clients only after Family Planner truth is verified.
12. Archive/retire old runtime only after explicit approval.

### Rollback

Rollback means restoring the last known-good Family Planner backup and/or returning clients to the previous supported API/client path without losing the frozen legacy source. Do not design a cutover that destroys the only copy of legacy data.

---

## 7. API lifecycle and versioning

### Contract principle

The native app needs an explicit child-client contract. Do not expose arbitrary internal Family Planner routes directly just because they exist.

The implementation may choose the actual route namespace after inspecting Family Planner, but the external mobile contract must be versioned conceptually as `v1` from the beginning.

### Versioning rules

- Additive compatible fields may be added within a major API version.
- Do not repurpose an existing field with a different semantic meaning.
- Removing/renaming required fields requires a new contract version or a staged compatibility path.
- Server should tolerate older supported client versions during the declared support window.
- Installed Watch clients must not break merely because the newest iPhone client shipped.
- Record minimum supported client/build version only when there is a concrete security or compatibility reason.
- Forced upgrade should be a last resort and must have child-friendly UX.

### Required response metadata where useful

Consider:

- contract version;
- server time;
- authoritative timezone/local-date context;
- sync cursor/version;
- entity `updatedAt`/version where conflicts matter;
- minimum-supported-client signal only if needed.

### Required states

Native UI must be able to distinguish:

- success;
- accepted but pending parent approval;
- already applied/idempotent replay;
- unauthorized/revoked;
- forbidden by role;
- not found without cross-family disclosure;
- stale/conflict;
- validation failure;
- rate limit;
- temporary server error.

---

## 8. Pairing and authentication lifecycle

Preferred flow:

1. Parent authenticates in Family Planner.
2. Parent selects exactly one child profile.
3. Family Planner creates a short-lived, one-time pairing token/code.
4. ChoreChamps redeems it over TLS.
5. Server binds the installation/device to that child and family.
6. Client receives revocable device credential(s).
7. Credential is stored in Keychain.
8. Watch receives/obtains an independent-capable credential through an approved setup path.

Requirements:

- one-time pairing token;
- short expiry;
- replay rejection;
- no plaintext child password;
- token rotation/refresh strategy;
- server-side revocation;
- local sign-out purge;
- lost-device revocation;
- audit-safe device label without unnecessary hardware fingerprinting.

Do not use a child name as authentication proof.

---

## 9. Security threat model

At minimum, implementation reviews must consider:

### Cross-family IDOR
Threat: child/client changes an ID and reads or writes another family's data.  
Mitigation: derive family from authenticated identity; family-scope every query; fail closed; two-family integration tests.

### Point/reward tampering
Threat: client submits a higher point amount or cheaper reward cost.  
Mitigation: server calculates all economic values from canonical records.

### Replay/double completion
Threat: retry, duplicate tap or malicious replay awards twice.  
Mitigation: stable idempotency key plus transactional state transition.

### Concurrent redemption
Threat: multiple devices spend the same balance.  
Mitigation: atomic balance check/decrement or equivalent serialized transaction.

### Offline client tampering
Threat: cached state is modified and later treated as authoritative.  
Mitigation: server revalidates every queued write; cache is untrusted.

### Stolen device
Threat: another person gains access to child data/actions.  
Mitigation: revocable token, minimal cached private content, protected local storage, optional parent re-pair.

### Sibling misuse
Threat: one sibling uses another's paired device.  
Mitigation: one-child device binding in MVP; no sibling selector without protected flow.

### Push-token leakage
Threat: notification endpoint/token is exposed or left after revoke.  
Mitigation: authenticate registration, rotate/update safely, revoke on device removal/sign-out, avoid private payloads.

### Proof-photo leakage
Threat: image URLs become public or long-lived.  
Mitigation: private authenticated/signed access, short retention, metadata stripping and strict logging policy.

### API downgrade/drift
Threat: old client interprets changed server semantics incorrectly.  
Mitigation: versioned contract, compatibility tests and explicit deprecation policy.

### Environment mix-up
Threat: review build writes production.  
Mitigation: separate configuration, visible review identity, protected secrets and environment assertions.

---

## 10. Local data protection and purge

- Credentials: Keychain only.
- SwiftData cache: minimum data necessary for offline child experience.
- Use appropriate iOS/watchOS data protection defaults/capabilities for private local files.
- Do not cache proof photos on Watch.
- Avoid retaining full-size proof media on iPhone after upload unless explicitly needed for retry.
- Sign-out/revocation purges credentials and child-private cache according to documented retention behaviour.
- Queued unsynced writes must not be silently dropped; if purge is required, clearly tell the parent/user before a destructive local reset where feasible.
- App extensions/widgets must receive only the minimum shared state they need through an App Group or other approved mechanism.

---

## 11. Sync and conflict contract

### Local state categories

- authoritative cached server record;
- locally optimistic presentation;
- pending mutation;
- failed/retryable mutation;
- needs re-auth;
- conflict requiring authoritative refresh.

### Mutation queue

Every queued write stores:

- unique mutation ID/idempotency key;
- authenticated child/device context reference;
- target canonical record ID;
- mutation type;
- minimum payload required;
- created timestamp;
- retry metadata;
- last error category, not raw sensitive server text.

### Retry

- exponential/backoff strategy with bounded retries;
- opportunistic retry on app foreground/connectivity restoration;
- no hot loops;
- server idempotency is still required even when client queue is correct.

### Conflict rules

Examples:

- task already completed elsewhere → treat server result as authoritative success when semantically equivalent;
- task removed/reassigned → refresh and explain that it changed;
- approval state changed → refresh silently or show new status;
- auth revoked → stop queue and require re-pair;
- reward balance changed → never locally force redemption through.

---

## 12. Notification delivery architecture

Use a hybrid model.

### Local notifications

Best for predictable routine reminders already present in the child's synced schedule. Local scheduling reduces server dependency and works when temporarily offline.

### Server/APNs notifications

Best for remote events such as:

- parent approved/rejected completion;
- reward request status changed;
- newly assigned one-off task;
- schedule changed materially;
- device/security/re-pair notice.

### Deduplication

Each logical reminder/event needs a stable notification identifier so iPhone and Watch do not create confusing duplicate reminders. The exact device-delivery strategy must be tested; do not assume Apple always deduplicates companion notifications in the way product UX requires.

### Completion cancellation

When a task becomes complete or irrelevant, cancel future local reminders for that occurrence where possible.

### Privacy

Parent-selectable lock-screen mode:

- Detailed: task title may appear.
- Private: generic copy such as `You have a ChoreChamps mission waiting.`

Never put proof images, private parent notes, health context or sensitive household details in push payloads.

### Bounded reminder policy

Default: one reminder plus at most one follow-up. No repeated nag loop.

---

## 13. Proof photo/media contract

Photo proof is **off by default** and used only when a parent enables it for an appropriate chore.

MVP rules:

- iPhone/iPad capture/upload only; Watch photo proof is out of scope;
- compress before upload to a reasonable display/verification size;
- strip unnecessary EXIF/location metadata before upload;
- do not make objects publicly enumerable;
- use authenticated or short-lived signed access;
- parent/authorized server access only;
- no photo bytes/content in analytics or logs;
- local temporary upload copies should be deleted after confirmed upload unless needed for an explicit retry;
- parent can delete proof through the canonical product's deletion controls;
- document server retention before launch.

Default retention target: delete proof no later than 30 days after the associated approval/rejection unless a parent explicitly opts into a longer audit/history policy and that policy is disclosed. Final retention must be reviewed against actual Family Planner storage behaviour and privacy policy before public release.

---

## 14. Figma and design source of truth

Native code should not become the only design specification.

### Figma-first requirement

Before polishing each major feature, establish or update a Figma source with reusable components and screen states. Foundation/scaffolding can begin before final visuals, but production UI should reconcile to the approved Figma system.

Required screen/state inventory:

- pairing: start/code/expired/success/revoked;
- Today: loading/cached/refreshing/current routine/upcoming/all done/empty/offline;
- task: simple completion/checklist/timer/approval/photo;
- pending approval/approved/rejected or needs attention;
- Quests;
- Rewards: catalogue/favourite/request/pending/redeemed/insufficient balance;
- Progress: streak/level/badges/weekly recap;
- Me/profile/preferences;
- Focus Mode;
- young-child/school-age/teen variants;
- notification permission states;
- widgets and privacy variants;
- Watch Today/Next Up/task/completion/pending/offline/error/re-pair;
- accessibility-large-text examples.

### Design tokens

Define reusable semantic tokens for:

- spacing;
- typography hierarchy;
- corner radii;
- surfaces;
- semantic success/warning/error/pending colours;
- age-mode presentation differences;
- animation/haptic intensity.

Use SF Symbols where appropriate. Do not copy another app's protected visual design.

---

## 15. Child UX rules

- Today is the primary workflow.
- One-tap completion from Today when no extra input is required.
- Do not expose implementation status names such as `PENDING` or `VERIFIED` to young children.
- Current routine should dominate; completed past routines collapse.
- Next Up should reduce decision load.
- Empty state gives closure, not a blank dashboard.
- Approval-required work must not visually spend points before approval.
- Gamification celebrates progress without guilt.
- No sibling leaderboard is necessary for the core product.

Age modes:

- Young child: larger visuals, fewer words, simplest navigation.
- School age: quests, points, rewards, badges, progress.
- Teen: cleaner styling, less childish terminology, same canonical data.

Focus Mode may present one task at a time.

---

## 16. Apple Watch contract

Watch is a first-class client for the child daily loop, not merely a notification accessory.

Required MVP:

- cached Today/current routine;
- Next Up;
- one-tap eligible completion;
- pending-approval state;
- points/streak summary;
- favourite reward progress;
- offline queue;
- independent refresh/write over its own network where supported;
- clear re-pair state;
- haptic feedback;
- one useful complication;
- Smart Stack widget.

Out of scope:

- parent admin;
- long-form analytics;
- complex content creation;
- proof-photo capture;
- account deletion;
- reward authoring.

The Watch must not depend on the phone being reachable to complete an already-paired child's normal supported task.

---

## 17. Widgets, complications and App Intents

Use WidgetKit for current Apple widget/complication surfaces. Keep widgets glanceable and privacy-aware.

Potential iPhone widgets:

- next task;
- daily progress;
- stars/streak;
- favourite reward progress.

Potential Watch complications:

- remaining tasks;
- progress;
- streak;
- stars;
- next task.

Smart Stack should favour the current routine rather than a static dashboard.

App Intent read actions may answer what is next, remaining count and points. A write intent may complete an exact authorized task, but it must use the same idempotent server operation and must not infer an ambiguous target.

---

## 18. Accessibility contract

Every core feature is incomplete until representative accessibility validation passes.

Required:

- VoiceOver labels and logical order;
- Dynamic Type including accessibility sizes;
- Reduce Motion alternatives;
- sufficient contrast;
- status not conveyed by colour alone;
- 44pt+ touch targets where appropriate;
- accessible progress indicators;
- readable Watch layouts;
- plain age-appropriate copy;
- Focus Mode/low-cognitive-load route.

Large text must not hide the primary action or points/approval meaning.

---

## 19. Localization, time, timezone and calendars

### MVP language

English first, but use String Catalogs/localizable resources from the start. Do not hard-code user-visible strings throughout views.

### Locale

- Use system locale for time/date/number display.
- Avoid hard-coded US month/day formatting.
- Product copy should work in Canadian English without assuming US-only terminology.

### Time semantics

The backend and client must explicitly distinguish:

- absolute timestamp;
- family/child local calendar date;
- recurrence timezone;
- due window/time of day.

Do not calculate streaks from raw UTC date boundaries alone.

Required fixtures:

- America/Toronto normal day;
- DST spring transition;
- DST fall transition;
- travel/timezone change;
- task around midnight;
- device timezone different from stored family schedule.

### Localization expansion

Future languages should not require redesigning layout or database fields. Avoid image-embedded text.

---

## 20. Dependency policy

Prefer Apple system frameworks and a small dependency surface.

A third-party Swift package requires explicit justification covering:

- why an Apple framework is insufficient;
- maintenance activity;
- license;
- binary/SDK privacy implications;
- data/network behaviour;
- App Store privacy manifest impact;
- exit/removal strategy.

Do not add analytics, authentication, image, networking or animation SDKs merely for convenience when native APIs are sufficient.

Pin/update dependencies deliberately and test updates before release.

---

## 21. Privacy, Kids Category and parental gates

Product direction is child-facing and should be engineered so Kids Category compliance is feasible.

Before creating the final App Store listing, explicitly decide and record whether to select Apple's Kids Category. Current Apple guidance uses Kids Category age bands and requires age-appropriate experiences and parental gates for certain external/purchasing actions. Once an app marked Made for Kids is approved, Apple states that selection cannot later be changed and subsequent updates remain subject to the Kids requirements.

Therefore do not casually set or submit the Made for Kids flag during development.

Regardless of category selection:

- no behavioural advertising;
- no data sale;
- avoid third-party analytics;
- no continuous location tracking;
- parent-controlled child identity/data;
- privacy policy must match runtime behaviour;
- external links/account-impacting actions shown to children need an appropriate protected flow;
- diagnostics minimize identifiers;
- App Privacy answers are reviewed against the final binary.

Privacy manifests must accurately declare collected data and required-reason APIs used by the app or bundled SDKs.

---

## 22. Signing, entitlements and secret management

Issue #232/#243 must produce a checked-in non-secret signing/configuration document.

Expected identifiers start from the legacy bundle ID `com.chorechamps.app`, but verify App Store/Developer account ownership before relying on it.

Define identifiers for:

- iOS/iPadOS app;
- watchOS app;
- iOS widgets;
- watchOS widgets/complications;
- App Groups if used;
- Keychain access groups if needed.

Expected capabilities may include:

- Keychain;
- App Groups;
- Push Notifications;
- Background modes only when justified;
- associated capabilities required by widgets/Watch.

Secrets:

- never commit signing certificates/private keys;
- never commit APNs auth keys;
- never commit App Store Connect API private keys;
- never commit production API credentials;
- CI obtains secrets from approved secret storage;
- review and production use separate configuration/credentials where practical;
- rotation/revocation runbook must exist before public launch.

Release automation must not be allowed to submit to App Store or production without the explicit human approval gate.

---

## 23. Observability and support

Need privacy-safe operational visibility without surveilling children.

Useful technical signals:

- app version/build;
- platform/OS major version;
- endpoint category/status;
- sync success/failure category;
- mutation queue age/count buckets;
- crash/hang/performance diagnostics;
- notification registration status;
- API contract version.

Do not log:

- child name;
- chore title unless absolutely required for a temporary protected diagnostic;
- parent notes;
- proof-photo URL/content;
- health/sick-day context;
- reward private notes;
- authentication tokens.

Before beta, define:

- support contact;
- security contact;
- privacy contact;
- incident escalation path;
- method to correlate an opaque support case to backend logs without exposing child information.

---

## 24. Performance, battery and network budgets

Initial targets are acceptance goals to measure, not current claims.

### iPhone/iPad

- Cached Today usable within ~500 ms after app UI appears on a representative supported device.
- Local completion feedback within ~100 ms, independent of network round trip.
- Normal Today refresh should avoid excessive repeated API calls.

### Watch

- Cached main/Next Up screen should become useful quickly without waiting for network.
- Avoid frequent background polling.
- Prefer push/local scheduling/contextual refresh over battery-expensive timers/network loops.
- Complication/widget refresh strategy must respect system budgets rather than trying to force real-time updates.

### Network

- Today payload should be compact and task-media independent.
- Do not download proof photos or large illustration bundles to render the normal daily loop.
- Use conditional/cursor/version refresh where it materially reduces transfer and complexity remains reasonable.

Measure actual cold/warm launch, API p50/p95, sync latency and Watch battery behaviour during beta.

---

## 25. Product analytics and success metrics

No product metric justifies child tracking beyond what is necessary.

Use opaque family/user/device identifiers if instrumentation is added.

### Alpha reliability criteria

- zero confirmed cross-family data exposure;
- duplicate/replay completion awards points exactly once;
- no negative reward balance under concurrency;
- offline queued writes survive restart and reconcile;
- revoked device stops authenticated writes;
- Watch and iPhone converge on canonical server state.

### Beta product metrics

Track privacy-safe aggregates such as:

- pairing success rate;
- median time from pairing to first completed task;
- percentage of activated child profiles completing at least one task per week;
- percentage of active families completing the plan→assign→complete→approve→reward loop;
- Watch vs iPhone completion share;
- pending-sync age/failure rate;
- parent approval latency bucket;
- reminder-to-completion conversion only if collected without manipulative optimization;
- notification opt-in rate;
- reward-redemption usage;
- child/parent qualitative feedback.

Do not optimize for screen time, notification opens or streak anxiety.

---

## 26. Design-partner beta

Coordinate with the Family Planner beta rather than creating a separate unrelated recruitment program.

Suggested native beta sequence:

1. Owner-family internal alpha.
2. One trusted external household.
3. Five independent design-partner households once security/reliability gates pass.
4. Four-week observation of the core weekly loop where practical.

For each participating household record only approved, privacy-safe product evidence.

Stop/rollback conditions include:

- cross-family read/write;
- point/reward corruption;
- unrecoverable sync loss;
- repeated pairing/auth failures preventing normal use;
- privacy disclosure mismatch;
- severe Watch battery/network regression.

---

## 27. Store metadata and legacy claim review

Legacy `README.md`, `store-listing.md`, `submission-checklist.md` and privacy-policy text were written for the Next.js/Capacitor v1 product. They include claims and instructions that must **not** be copied blindly into the native release.

Before App Store submission, re-review:

- one-time price / subscription claims;
- bundle ID;
- Kids Category/Made for Kids selection;
- age rating;
- screenshots;
- parent-dashboard claims that may no longer exist in ChoreChamps;
- “works on all devices” language;
- analytics/subprocessor claims;
- photo-data statements;
- hosting/provider details;
- privacy policy;
- support URL;
- App Store screenshot dimensions/current requirements;
- export-compliance answers.

Current native monetization is undecided. Do not inherit `$1.99` or “no subscription” as a product requirement merely because v1 metadata says so.

---

## 28. Release and API support policy

### Release stages

0. Local simulator prototype.
1. Review backend integration.
2. Internal physical iPhone + Watch alpha.
3. Controlled TestFlight beta.
4. App Store candidate.

Each stage has a separate approval boundary.

### Installed-client compatibility

Before removing an API path or changing required semantics, determine the oldest still-supported installed ChoreChamps build. Maintain backward compatibility or require a deliberate upgrade with a documented reason.

### Rollback

Keep:

- known-good backend image/version;
- known-good API contract;
- last known-good native build identity;
- legacy web source/export recovery path until migration window closes.

App Store rollback usually means halting rollout/fixing forward while server remains compatible; design backend changes so a bad mobile release does not force data corruption.

---

## 29. QA expansion

In addition to the native plan's existing QA matrix, require:

### Migration

- zero-record family;
- one child;
- multiple children with same display name edge case;
- duplicate source export replay;
- partial import interruption;
- invalid/orphaned source relations;
- point/streak reconciliation;
- reward redemption reconciliation.

### Device topology

- same child on phone and Watch;
- same child on two phones/devices if supported;
- revoked old phone after replacement;
- sibling attempts to use paired device;
- Watch without phone connection;
- fresh Watch re-pair.

### API compatibility

- current client/current server;
- previous supported client/current server;
- extra unknown additive response fields;
- missing optional fields;
- minimum-client policy if introduced.

### Media

- camera denied;
- upload interrupted;
- oversized photo;
- unsupported image;
- metadata stripped;
- signed URL expiration;
- deletion/retention.

### Notifications

- notifications denied;
- local reminder fires offline;
- remote approval notification;
- duplicate phone/Watch delivery;
- completion cancels later reminder;
- quiet period;
- timezone/DST shift.

### Data purge

- sign-out;
- parent revokes device;
- account/child deletion;
- app reinstall;
- queued write present during revoke.

---

## 30. Implementation waves after review

### Wave 0 — source truth and preservation

- Preserve legacy branch/tag/export path.
- Make `AGENTS.md` point to native plan/contract.
- Confirm Family Planner current schema/import foundations.
- Complete legacy→Family Planner field map and migration rehearsal design.
- Record platform/device decisions as ADRs.

### Wave 1 — native shell and API contract

- SwiftUI iPhone/iPad + watchOS project.
- Shared models/networking.
- review/production environment separation.
- versioned child-client API spec and mocks.
- Figma design-system foundation.

### Wave 2 — pairing and Today vertical slice

- Parent-assisted pairing.
- Keychain auth.
- cached Today.
- Next Up.
- online idempotent completion.
- approval state.

### Wave 3 — offline/watch reliability

- SwiftData cache.
- pending mutation queue.
- conflict rules.
- independent-capable Watch reads/writes.
- physical Watch QA.

### Wave 4 — rewards and system surfaces

- reward catalogue/favourite/redemption.
- badges/weekly recap.
- complication/Smart Stack.
- widgets/App Intents.
- hybrid notification architecture.

### Wave 5 — privacy/accessibility/release

- age modes and Focus Mode.
- VoiceOver/Dynamic Type/Reduce Motion.
- proof-media policy if enabled.
- privacy manifest/App Privacy review.
- Kids Category decision.
- signing/release automation.
- TestFlight beta.

### Wave 6 — cutover and retirement

Only after approved migration evidence and native beta:

- final source export;
- reconciled Family Planner import;
- rollback window;
- native client cutover;
- retirement/archive of legacy runtime only after explicit approval.

---

## 31. Decision register

### Confirmed

- Family Planner is canonical backend and parent/admin product.
- ChoreChamps is native child-facing Apple client.
- SwiftUI is the target UI technology.
- SwiftData is cache/queue, not canonical storage.
- Watch is a first-class independent-capable daily client.
- Today is the primary child experience.
- Chores and habits remain semantically distinct; “Quest” is presentation.
- Server calculates authoritative points/rewards/approval.
- Offline writes require idempotency and reconciliation.
- No ads/behavioural advertising.
- No GPS/location tracking in MVP.
- No sibling leaderboard as core motivation.
- No production/App Store action without explicit approval.

### Provisional

- iOS/iPadOS 18+ and watchOS 11+ minimum targets, subject to #232 verification.
- One child identity per app installation/device in MVP.
- Photo proof off by default, iPhone/iPad only if enabled.
- Hybrid local + APNs notification architecture.
- 30-day-or-less default proof retention target unless explicitly changed after privacy/backend review.

### Explicitly unresolved

- Final Kids Category/Made for Kids decision.
- Final public pricing/monetization.
- Final analytics/crash provider, if any.
- Final source of remote media storage and retention implementation.
- Final minimum OS after prototype/API availability verification.
- Final shared-family-iPad multi-profile strategy.
- Mascot/avatar economy depth.
- Android roadmap timing.

An AI agent must not silently resolve an unresolved item by implementation convenience. Create/record an ADR or ask for the required decision when it materially affects architecture or irreversible setup.

---

## 32. Current authoritative external Apple references checked 2026-09-13

Future agents should re-check these before release because platform rules change.

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Designing safe/age-appropriate experiences and Kids Category: https://developer.apple.com/kids/
- App Store Connect app information / Made for Kids: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- watchOS project setup: https://developer.apple.com/documentation/watchOS-Apps/setting-up-a-watchos-project
- Independent Watch companion setting: https://developer.apple.com/documentation/bundleresources/information-property-list/wkrunsindependentlyofcompanionapp
- WidgetKit: https://developer.apple.com/documentation/WidgetKit
- Accessory widgets / Watch complications: https://developer.apple.com/documentation/widgetkit/creating-accessory-widgets-and-watch-complications
- Required-reason APIs / privacy manifests: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api

Do not treat a checked date as permanent truth; verify current Apple requirements before App Store work.

---

## 33. End-to-end definition of execution-ready

The plan is considered execution-ready when a future agent can answer, from checked-in sources rather than guessing:

- what the product is and is not;
- which app owns which data;
- which child/device scenarios are supported;
- how Watch works without phone proximity;
- how authentication/pairing works;
- how API compatibility is maintained;
- how offline writes reconcile;
- how legacy data reaches Family Planner;
- how points/rewards remain correct;
- how notifications are scheduled/deduplicated;
- how proof media is protected;
- how UI is specified in Figma and SwiftUI;
- how accessibility/age modes work;
- how privacy/Kids Category decisions are gated;
- how signing/secrets/releases work;
- how to test, measure, roll back and support the product;
- which questions remain intentionally unresolved.

A coding agent should choose the smallest safe slice that advances the active issue and should never substitute speculative breadth for verified vertical end-to-end progress.
