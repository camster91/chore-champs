# ChoreChamps 2.0 — Canonical Native iPhone + Apple Watch Product and Execution Plan

**Status:** Approved product direction  
**Purpose:** Canonical source of truth for future human or AI implementation work  
**Primary platforms:** iPhone, iPad, Apple Watch  
**Native stack:** Swift, SwiftUI, SwiftData, WidgetKit, App Intents, UserNotifications  
**Backend direction:** Family Planner is the canonical household backend and source of truth  
**Primary epic:** GitHub issue #231  
**Implementation issues:** #232–#243

---

## 0. AI agent instructions — read this first

This file is intentionally detailed so a future AI coding agent can resume the project without reconstructing product intent from old conversations.

### Required behaviour

Before changing code, the agent must:

1. Read this entire document.
2. Read issue #231 and the relevant child issue(s).
3. Inspect the current `camster91/chore-champs` repository before assuming file structure or implementation state.
4. Inspect the current `camster91/family-planner` API/schema before inventing endpoints, fields, authentication flows, or data semantics.
5. Treat Family Planner as canonical for family identity, permissions, schedules, chores, habits, XP/rewards, approvals, account lifecycle, and cross-device truth unless this plan is explicitly revised.
6. Preserve the legacy ChoreChamps web implementation until a verified native replacement and migration/recovery plan exist.
7. Make changes in small, reviewable, one-purpose PRs with tests and explicit acceptance evidence.
8. Prefer additive/non-destructive work while architecture is being established.
9. Never send messages, publish, deploy to production, submit to the App Store, spend money, delete data, change account access, alter billing, or perform another difficult-to-reverse external action without explicit approval for that exact action.
10. Never claim something is built, tested, deployed, synced, secure, accessible, or App Store-ready without evidence.

### Product decision hierarchy

When implementation choices conflict, prioritize in this order:

1. Child safety and family data isolation
2. Correctness and idempotency
3. Simple daily child experience
4. Offline reliability
5. Accessibility
6. Parent control and transparency
7. Native Apple platform quality
8. Delight/gamification
9. Optional breadth

### North-star rule

> A child should be able to complete a normal day using only the Today screen and their Apple Watch.

Watch shorthand:

> What's next -> do it -> tap done -> feel progress.

If a proposed feature makes the daily loop materially harder, adds unnecessary navigation, or duplicates Family Planner administration, it should be reconsidered.

---

# 1. Product vision

ChoreChamps 2.0 is the **native child-facing companion to Family Planner**.

It should feel like a calm, playful daily game for a child rather than a miniature household-management system.

The app should answer three questions immediately:

1. What do I need to do?
2. What do I get for doing it?
3. How am I progressing?

Core loop:

`see what is next -> do it -> tap complete -> receive feedback -> build progress -> unlock reward`

The product should promote responsibility, routine, independence, and positive reinforcement without turning household tasks into manipulative engagement mechanics.

---

# 2. Product boundary: ChoreChamps vs Family Planner

## ChoreChamps owns

- child-facing daily routine experience;
- Today screen;
- chores and habits presentation;
- task completion interactions;
- child-facing approval state;
- XP/stars, levels, streaks, badges and personal progress;
- reward browsing and reward requests;
- native reminders;
- iPhone/iPad widgets;
- Apple Watch app;
- complications and Smart Stack;
- offline cache and queued completion writes;
- child profile personalization;
- child-safe settings;
- age-adaptive UI;
- Focus Mode;
- native haptics/celebrations;
- simple child-facing weekly recap.

## Family Planner owns

- family creation;
- account ownership;
- parent/admin roles;
- family membership;
- child profile creation and deletion;
- chore/habit authoring;
- recurrence and schedules;
- point values and reward economy controls;
- approval rules;
- reward catalogue management;
- parent approval inbox;
- detailed analytics;
- calendar context;
- household context;
- sick-day/travel/vacation state when implemented;
- account lifecycle;
- export and deletion;
- canonical authorization;
- canonical database state;
- audit history.

## ChoreChamps must not become

- a second canonical family database;
- a duplicate parent admin product;
- a location tracker;
- an advertising platform;
- an open-ended social network;
- a sibling-ranking product;
- a medical/treatment system;
- a generic life-management app for adults.

---

# 3. Legacy repository transition

The current repository contains a mature legacy web implementation built with Next.js/React/Prisma/Capacitor. It contains valuable domain logic, migration history, security lessons, tests, and UI references.

### Preservation requirements

Before destructive restructuring:

1. Preserve the current legacy state on a durable branch/tag such as `legacy/web-v1` and `legacy-web-v1` if not already done.
2. Keep historical migration files and schema references until data migration/reconciliation is fully understood.
3. Preserve security fixes and related test evidence.
4. Preserve any current production-data import/export capability until the new architecture has a verified replacement.
5. Treat the old Capacitor/iOS wrapper as reference material, not the target native architecture.
6. Do not delete legacy code or source data merely because native scaffolding exists.

### Native transition principle

The native app should be built as a new Apple client against a deliberate API boundary, not by incrementally wrapping more web UI in Capacitor.

---

# 4. Target architecture

```text
                         FAMILY PLANNER
                    canonical household backend
                             + API
                               |
              +----------------+----------------+
              |                                 |
      Family Planner UI                    ChoreChamps
       parent/family                     native Apple client
                                                |
                                   +------------+------------+
                                   |                         |
                              iPhone / iPad               Apple Watch
                                SwiftUI                      SwiftUI
                                   |                         |
                         Widgets / App Intents     Complications / Smart Stack
                                   |                         |
                                   +------ shared models ----+
```

## Native stack

- Swift
- SwiftUI
- SwiftData
- URLSession + async/await
- Keychain
- WidgetKit
- App Intents
- UserNotifications / APNs
- WatchConnectivity only where useful
- Swift Testing / XCTest
- XCUITest
- `xcodebuild` for CI

## Architecture principles

- The Watch should not require constant iPhone proximity for its core daily loop.
- Family Planner remains authoritative.
- Client state may be optimistic, but server truth wins on reconciliation.
- Use protocol-driven networking and repository boundaries so API mocks/tests remain straightforward.
- Keep UI models separate from transport/domain models where useful.
- Avoid architecture that requires a global singleton for everything.
- Prefer composable features and shared domain types over duplicated iOS/watchOS model definitions.

---

# 5. Security and correctness rules

These are non-negotiable.

- Never trust client-supplied point values.
- Never trust client-supplied family IDs for authorization.
- Never let a client choose whether approval is required.
- Never let replayed completion award XP twice.
- Never allow concurrent reward redemption to create a negative balance.
- Never reveal another family's record existence through error differences where avoidable.
- Every write needs authorization at execution time.
- Every retryable mutation must be idempotent.
- Device credentials must be revocable.
- Tokens belong in Keychain, not plaintext storage.
- Logs/analytics must avoid task photos, private notes, child names, or unnecessary content.
- App errors shown to kids must be sanitized and age-appropriate.
- Production and review/test environments must be visibly and technically distinct.

---

# 6. Core domain model and terminology

The UI may use playful language, but canonical data semantics must remain precise.

## Routine

A time/context grouping such as:

- Morning
- Before School
- After School
- Evening
- Bedtime
- Weekend
- Vacation
- Grandma's
- Custom

## Habit

A repeated personal behaviour, for example:

- brush teeth;
- read 20 minutes;
- practise piano;
- drink water;
- pack backpack.

Habits generally record a recurring behaviour and may not require parent approval.

## Chore

A household responsibility, for example:

- make bed;
- clean bedroom;
- empty dishwasher;
- take out garbage;
- feed pet;
- put laundry away.

Chores may require parent approval or proof.

## Quest

A child-facing presentation layer for a chore, habit, weekly mission, or special challenge.

Example:

Canonical backend:

`Clean bedroom — chore — weekly — approval required — 25 XP`

Child presentation:

`Room Rescue — Clean your bedroom — +25 stars`

The client should not collapse chores and habits into a single canonical data type just because both can render as quests.

---

# 7. iPhone / iPad information architecture

Primary navigation:

1. **Today**
2. **Quests**
3. **Rewards**
4. **Progress**
5. **Me**

The parent should not need a parallel admin area in ChoreChamps. Parent configuration belongs in Family Planner.

---

# 8. Today — primary product experience

Today is the most important screen in the app.

A normal child should be able to complete an ordinary day without navigating to another tab.

Example:

```text
Good morning, Adelaide

🔥 6 day streak               ⭐ 340

TODAY
████████████░░░  8 / 11

Morning                         2 / 3
✓ Brush teeth                    +5
✓ Make bed                      +10
○ Pack backpack                 +10

After School                    0 / 3
○ Homework                      +15
○ Read for 20 minutes           +10
○ Tidy room                     +10

Saving for
🎬 Movie Night
340 / 400 ⭐
```

## Today sections

- greeting/avatar;
- points and current streak;
- overall daily progress;
- current routine;
- Next Up;
- upcoming routines;
- pending-approval tasks;
- favourite reward progress;
- done-for-now state when relevant.

## Smart ordering

Order tasks/routines by:

1. due now;
2. current routine;
3. overdue but still actionable;
4. upcoming today;
5. optional items.

Past completed routines should collapse automatically.

## Done-for-now state

When the current routine is complete, show closure rather than an empty list:

```text
Morning complete
You earned 30 ⭐
Next up: After School at 3:45 PM
```

If everything is complete:

```text
All done for today
You earned 65 ⭐
Go enjoy your day.
```

---

# 9. Next Up

Next Up should be a persistent contextual card and may become the Watch's default view.

Example:

```text
Next up
Pack your backpack
Before 8:15 AM
+10 ⭐
```

The goal is to reduce planning burden for the child.

The app should feel smart because it presents the right next responsibility, not because it adds an AI chat surface.

---

# 10. Task detail UX

A task may include:

- icon or illustration;
- kid-facing quest name;
- plain-language task name;
- short description;
- sub-steps;
- estimated duration;
- points;
- due time/window;
- approval requirement;
- photo/proof requirement;
- optional timer;
- short parent note.

Example:

```text
ROOM RESCUE 🧹

Clean your bedroom

1. Put clothes away
2. Make your bed
3. Put toys away
4. Clear the floor

About 10 min
+25 ⭐

[ Start Quest ]
```

For young children, avoid technical status labels like `Pending`, `In Progress`, `Verified`, or `Rejected` unless there is no clearer alternative.

---

# 11. Completion modes

Parents configure completion/approval behaviour in Family Planner.

## Automatic

Child taps done -> server validates -> task completes -> XP awarded exactly once.

Good for low-risk habits such as brushing teeth or packing a bag.

## Parent check

Child taps done -> awaiting parent -> XP awarded only after approval.

Good for chores such as cleaning a room.

## Photo check

Child submits optional/required proof -> parent reviews.

Use only where genuinely useful. Do not make photo submission the default.

## Checklist confirmation

Required substeps must be acknowledged before completion.

Useful for multi-step chores.

### Pending copy

Prefer:

`A parent is checking this one. Your stars will arrive after approval.`

Do not imply the child has already earned spendable points when approval is pending.

---

# 12. Visual timers

Optional visual timers can help with bounded tasks:

- brushing teeth — 2 min;
- tidy toys — 5 min;
- reading — 20 min;
- instrument practice — 15 min.

Timers should guide rather than pressure. They are not races and should not punish slower completion.

Watch example:

```text
Brush Teeth
1:34 remaining
████████░░░
+5 ⭐
```

---

# 13. Apple Watch product design

The Watch experience must be narrower than the iPhone app.

## Core loop

`what's next -> do it -> tap done -> feel progress`

## Main Watch screen

```text
TODAY
🔥 6      ⭐ 340

Morning
✓ Brush teeth
○ Make bed
○ Vitamins

2 left
```

## Task view

```text
Make Bed
+10 ⭐

[ Complete ]
```

## Completion feedback

```text
Done!
+10 ⭐
350 total
50 until Movie Night
```

## Required Watch capabilities

- cached Today view;
- current routine;
- Next Up;
- one-tap completion where allowed;
- pending-approval state;
- offline queue;
- direct network refresh when available;
- haptic feedback;
- points/streak summary;
- favourite reward progress;
- optional visual timer;
- actionable reminders;
- complication support;
- Smart Stack support.

## Explicitly out of scope for Watch

- parent admin;
- family management;
- long analytics;
- complex reward creation;
- account lifecycle;
- large text-entry workflows.

---

# 14. Watch complications

Offer a small set of genuinely useful choices:

- **Remaining** — `3 left`
- **Progress** — `3/5`
- **Streak** — `🔥 7`
- **Stars** — `⭐ 425`
- **Next** — `Teeth 8:00`

Do not cram multiple metrics into unreadable complications.

---

# 15. Smart Stack

Smart Stack should be contextual.

Morning:

`Morning — 2 tasks left`

Afternoon:

`After School — Homework next`

Evening:

`Bedtime — 3 tasks left`

Everything done:

`All done today — 65 ⭐ earned`

---

# 16. iPhone widgets

Potential widget surfaces:

## Small

- stars + streak;
- or next task.

## Medium

- daily progress;
- next 2–3 tasks;
- current routine.

## Large

- routine overview;
- favourite reward progress;
- next-up detail.

Lock-screen and widget privacy must be parent-configurable.

---

# 17. App Intents / Siri

Target read intents:

- “What chores do I have?”
- “What's next in ChoreChamps?”
- “How many stars do I have?”
- “How many tasks are left?”

Possible write intent:

- “Mark my bed as made.”

Write rules:

- resolve exactly one authorized task;
- never infer which task from ambiguous context;
- confirm when ambiguity exists;
- call the same server-side idempotent completion path as the app;
- never let Siri bypass approval requirements.

---

# 18. Notifications

Notifications should remind without nagging.

Prefer:

`Morning mission waiting — Brush teeth • +5 ⭐`

Avoid:

`Task overdue: Brush teeth`

## Default reminder model

- one friendly reminder;
- optionally one follow-up;
- then stop;
- honour quiet periods;
- parent controls categories/cadence.

## Watch actions

Example:

```text
Time for your morning mission
Make your bed
+10 ⭐

[ Done ]  [ Later ]
```

`Done` must run the same authoritative completion path as the app.

Lock-screen content should become more generic when privacy mode is enabled.

---

# 19. Offline-first behaviour

Offline reliability is a first-class feature, especially on Watch.

```text
Child taps Complete
        |
        v
SwiftData pendingSync
        |
        +-- online --> send immediately
        |
        +-- offline --> persist queue
                          |
                          v
                      reconnect
                          |
                          v
               server idempotency check
                          |
                 +--------+--------+
                 |                 |
              accepted          conflict
                 |                 |
              reconcile       refresh truth
```

## Rules

- stable client-generated idempotency key;
- queued writes persist across process/device restart;
- retry cannot duplicate XP;
- stale state may be rejected by server;
- server truth wins;
- client clearly distinguishes local-pending from synced;
- queue processing must be bounded;
- auth expiration while queued must result in re-auth/re-pair rather than silent data loss.

Friendly copy:

`You're offline. We'll save this and sync it when you're connected.`

---

# 20. Parent-assisted pairing and child authentication

The child should not need to manage an adult-style account/password flow.

Preferred direction:

1. Parent opens Family Planner.
2. Parent selects child profile.
3. Parent creates a short-lived pairing code/token.
4. ChoreChamps enters/scans the code.
5. Server binds that device to exactly one authorized child profile.
6. Device receives a revocable credential.
7. Credential is stored in Keychain.
8. Watch receives an independent-capable credential/session through a secure approved setup path.

## Requirements

- short-lived tokens;
- one-time use;
- family-scoped validation;
- revocation;
- lost-device removal;
- friendly expired/re-pair state;
- no plaintext child passwords;
- sign-out clears sensitive local data according to retention policy.

---

# 21. Rewards

Rewards are parent-controlled, child-visible.

## Reward catalogue

Child can see:

- reward name;
- cost;
- availability;
- progress;
- request status.

## Favourite reward

Child selects one goal:

```text
Saving for Movie Night
425 / 500 ⭐
████████████████░░
75 more!
```

This may appear on Today and Watch.

## Reward suggestions

Later, child can suggest a reward.

Example:

Child: `Lego set`

Parent sees in Family Planner:

`Adelaide suggested “Lego set” as a reward.`

Parent may approve, rename, price, or reject it.

The suggestion itself must never become redeemable automatically.

## Allowance integration — later

Parents may explicitly map a reward to an allowance bonus, for example:

`1000 stars -> $5 allowance bonus`

Points must never automatically convert to money.

---

# 22. Parent approval inbox — Family Planner integration target

Family Planner should eventually make approval friction very low.

Example:

```text
Needs your review

Adelaide
• Clean bedroom      +25
• Put laundry away   +15

Madden
• Feed dog           +10

[ Approve all ]
```

Batch approval must preserve per-item audit history and server-side validation.

---

# 23. Gamification philosophy

Gamification should support responsibility, not addiction.

## V1

- XP/stars;
- levels;
- streaks;
- badges;
- personal goals;
- parent-controlled rewards;
- simple progress celebrations.

## V2 / later

- weekly missions;
- cooperative family goals;
- avatar unlocks;
- collectible badge sets;
- optional mascot/companion;
- visual themes;
- independent-completion bonuses.

## Avoid

- loot boxes;
- randomized paid rewards;
- behavioural ads;
- infinite feeds;
- coercive streak-loss messaging;
- pay-to-progress mechanics;
- sibling leaderboard as the primary experience.

---

# 24. Streak design

Avoid punitive language.

Do not say:

`YOU LOST YOUR 14 DAY STREAK`

Prefer:

`Your best streak is 14 days. Start another one today.`

Paused, unscheduled, sick-day, travel, and vacation days must not silently count as failures when the backend says they are exempt.

Potential parent-configurable grace-day support can be explored later.

---

# 25. Weekly missions

Examples:

- finish bedtime routine 5 times;
- complete 10 chores;
- read on 5 days;
- finish every morning routine;
- help another family member;
- complete 3 responsibilities before reminders.

Example:

```text
THIS WEEK'S MISSION
Complete your bedtime routine 5 times
██████░░ 3 / 5
Reward: +50 ⭐ + Night Owl badge
```

Parents choose/approve active missions.

---

# 26. Cooperative family goals

Prefer cooperation over sibling competition.

Example:

```text
FAMILY GOAL: Movie Night
Earn 800 ⭐ together this week
███████████░ 650 / 800
```

Do not require a child-vs-child leaderboard.

---

# 27. Badges

Badge awards must be deterministic and idempotent.

Suggested groups:

## Consistency

- First Step
- 3-Day Streak
- Week Warrior
- Routine Master

## Responsibility

- Room Ranger
- Laundry Helper
- Kitchen Helper
- Pet Pal

## Growth

- Early Starter
- Independent
- No Reminder Needed
- Comeback Kid

## Special

- Family Helper
- Super Reader
- Birthday Week if appropriate/configured

Children may choose a few earned badges to display on their profile.

---

# 28. Avatar and visual progression — later

Potential unlocks:

- hats;
- shirts;
- backgrounds;
- frames;
- nameplates;
- room decorations;
- mascot accessories.

Unlocks should be earned through progress, not paid loot boxes.

---

# 29. Optional mascot / companion — later

A mascot could make the app feel distinctive, but it must not guilt the child.

Possible forms:

- small monster;
- robot;
- animal;
- star creature;
- customizable “Champ.”

Simple states:

- sleepy;
- ready;
- happy;
- celebrating;
- resting.

Never use language like:

`Your pet is sad because you didn't do your chores.`

The mascot should celebrate progress, not emotionally punish absence.

---

# 30. Celebration system

Scale celebration to importance.

## Normal task

- small haptic;
- check animation;
- subtle star feedback.

## Routine complete

- stronger haptic;
- short completion animation;
- points summary.

## Badge earned

- badge reveal.

## Level-up

- richer celebration.

## Cooperative family goal

- full celebration.

Do not fire confetti for every routine interaction.

---

# 31. Sound and haptics

Use optional sound sparingly.

Potential sounds:

- soft completion tick;
- reward sparkle;
- level-up cue.

Parents/children should be able to disable sounds.

Watch should favour haptics over audio.

---

# 32. Age-adaptive presentation

Same canonical data, different presentation.

## Young child

- very large icons;
- fewer words;
- stronger visual routines;
- minimal navigation;
- simple celebrations.

## School age

- quests;
- points;
- rewards;
- streaks;
- badges;
- progress.

## Teen

- cleaner styling;
- less cartoon language;
- optional “Responsibilities” instead of “Missions/Quests”;
- reduced celebration intensity if preferred.

Goal: children should not feel they have “aged out” of the app too quickly.

---

# 33. Focus Mode

Optional one-task-at-a-time experience.

```text
One thing at a time

Put clothes in hamper

[ Done ]
```

While active, hide unrelated rewards, analytics, and extra tasks until the current action is resolved.

This should be especially useful for children who benefit from lower cognitive load.

---

# 34. Themes and personalization

Child may personalize safe visual preferences:

- accent colour;
- avatar;
- background/theme;
- badge showcase;
- mascot appearance when introduced.

Parents remain authoritative over permissions and functional settings.

---

# 35. Routine preview

Optional evening preview for older children:

```text
Tomorrow
7 morning missions
Soccer at 6:00 PM
1 special chore
```

This may be hidden for younger children to keep the product simple.

---

# 36. Visual instructions

Parents may attach a helpful image or reference photo to a task.

Examples:

- where dishes belong;
- where backpack hangs;
- what “tidy room” means.

Photos should be optional and handled with clear retention/privacy rules.

---

# 37. Context modes without location tracking

Initial product should avoid GPS-based automation.

Support parent-defined contexts instead:

- Home
- Weekend
- Grandma's
- Vacation
- School Day
- Custom

This keeps the product useful without introducing unnecessary location/privacy complexity.

---

# 38. Sick-day integration — later

Family Planner may mark a child as having a sick/rest day.

ChoreChamps can then:

- pause streak penalties;
- hide optional chores;
- keep only explicitly required routines;
- show calmer UI.

Example:

`Rest day — your streak is protected.`

ChoreChamps must not diagnose conditions, suggest treatment, or determine medication doses.

---

# 39. Vacation / travel mode — later

Parent activates a vacation context.

Selected essential routines may continue:

- brushing teeth;
- reading;
- bedtime;
- other parent-selected items.

Household chores can pause without harming streaks.

---

# 40. Independent-completion bonus — experiment later

Optional parent-controlled idea:

If a child completes a task before any reminder fires:

`Independent bonus +2`

This rewards initiative rather than merely responsiveness to reminders.

Must be optional and economy-safe.

---

# 41. Parent notes

Parent may attach a short positive note to a task/completion.

Example:

`Thanks for helping with the recycling!`

This can create warmth without adding a full open-ended chat system.

---

# 42. Child weekly recap

Avoid a dense analytics dashboard for children.

Prefer a story-like recap:

```text
Your week
42 missions completed
320 ⭐ earned
5-day bedtime streak
2 new badges
Best day: Tuesday
```

Detailed parent analytics stay in Family Planner.

---

# 43. Empty, loading, error and edge-state copy

These states are product features, not leftovers.

## Nothing left

`All done — go enjoy your day.`

## No rewards yet

`Your family hasn't added rewards yet. Keep earning stars — they'll still be here.`

## Awaiting approval

`A parent is checking this one. Your stars will arrive after approval.`

## Offline

`You're offline. We'll save this and sync it when you're connected.`

## Sync conflict

`We refreshed this task because it changed on another device.`

## Auth expired

`This device needs to be paired again by a parent.`

Never expose raw HTTP/Prisma/database error text to a child.

---

# 44. Accessibility requirements

Accessibility is part of feature completion, not a final polish pass.

Required baseline:

- VoiceOver;
- logical reading order;
- Dynamic Type, including accessibility sizes;
- sufficient contrast;
- status not communicated by colour alone;
- 44pt+ touch targets where appropriate;
- Reduce Motion equivalents;
- clear focus states;
- concise labels;
- large hit targets on Watch;
- accessible progress indicators;
- no critical information encoded only in animation.

Representative testing should include:

- small iPhone;
- standard iPhone;
- large iPhone;
- iPad portrait;
- iPad landscape;
- representative small/large Watch screens;
- VoiceOver;
- Reduce Motion;
- very large Dynamic Type.

---

# 45. Child privacy and platform safety

Design for a child-facing App Store product from day one.

Principles:

- no ads;
- no behavioural advertising;
- no child/family data sale;
- minimize third-party SDKs;
- avoid child email requirement where possible;
- parent-controlled child profiles;
- parent-controlled export/deletion;
- no continuous location tracking;
- minimal lock-screen content;
- parental gates where appropriate;
- privacy manifest and App Store answers must match runtime behaviour;
- diagnostics must not include private task content unnecessarily;
- photo proof requires explicit retention/access rules.

A Kids Category decision should be made deliberately before submission, because it changes compliance and review requirements.

No App Store submission without explicit approval.

---

# 46. API contract requirements

The native client requires a deliberate Family Planner child-client API.

## Read models

At minimum:

- authenticated child profile;
- family context safe for child display;
- Today payload grouped by routine;
- chores/habits and current completion state;
- Next Up;
- points/star balance;
- streak;
- level;
- reward catalogue;
- favourite reward;
- child-safe notification/preferences summary;
- server time/timezone metadata where needed for consistency.

## Writes

At minimum:

- complete/log task with idempotency key;
- start/finish timed task if timing is persisted;
- submit optional proof when enabled;
- request reward redemption;
- suggest reward later;
- select favourite reward;
- register/revoke notification device token;
- pair/revoke device.

## API behaviour

Every response should support truthful UI for:

- success;
- pending approval;
- already complete/idempotent replay;
- unauthorized;
- stale/conflict;
- validation error;
- rate limit;
- server failure;
- empty state.

Do not invent Family Planner endpoints without inspecting the current backend.

---

# 47. Suggested native module structure

This is guidance, not a requirement if a better structure is justified.

```text
ChoreChamps/
  App/
    ChoreChampsApp.swift
    AppEnvironment.swift
  Core/
    Models/
    Networking/
    Auth/
    Persistence/
    Sync/
    DesignSystem/
    Accessibility/
  Features/
    Pairing/
    Today/
    Quests/
    Rewards/
    Progress/
    Profile/
  Widgets/
  WatchApp/
    Today/
    Task/
    Sync/
  Shared/
    AppIntents/
    DTOs/
    Utilities/
  Tests/
    Unit/
    Integration/
    UI/
```

Prefer reusable components and shared domain contracts over copy/paste between iPhone and Watch.

---

# 48. Local persistence model

SwiftData should primarily cache server state and hold pending mutations.

Potential local entities:

- CachedChildProfile
- CachedRoutine
- CachedTask
- CachedReward
- CachedProgress
- PendingMutation
- DeviceSyncMetadata

Local IDs must preserve canonical server IDs and idempotency keys.

Do not accidentally turn SwiftData into a second source of truth.

---

# 49. Sync-state UX

Potential states:

- synced;
- pending upload;
- refreshing;
- conflict resolved;
- needs re-auth;
- failed with retry.

Most children should not see technical labels.

Use subtle indicators and plain-language states only when action is needed.

---

# 50. Analytics / telemetry

If analytics are introduced, keep them privacy-safe and minimal.

Allowed examples:

- anonymous/opaque family or role identifier;
- screen/view event;
- task completion success/failure category;
- sync latency bucket;
- crash/performance metrics;
- accessibility setting category if needed for QA and not identifying.

Do not send:

- child name;
- chore title where unnecessary;
- task notes;
- photos;
- reward notes;
- private messages;
- medical context.

No third-party analytics SDK should be added merely for convenience without privacy review.

---

# 51. Performance targets

Initial qualitative targets:

- Today should feel immediate from local cache;
- first meaningful content should render before a network refresh completes when cached state exists;
- tapping complete should give local feedback immediately while clearly preserving pending-sync semantics;
- Watch main screen should avoid long loading states;
- widgets should render from cached shared state;
- image-heavy features must not make Today dependent on downloading large assets.

Set measurable budgets after the native shell exists.

---

# 52. Design system direction

ChoreChamps should look native, calm, playful, and age-adaptive.

Avoid simply porting Tailwind/web styles into SwiftUI.

Use:

- native typography conventions;
- clear hierarchy;
- generous spacing;
- large interaction targets;
- restrained cards;
- progress that is understandable at a glance;
- system materials/effects where appropriate;
- SF Symbols where they fit;
- custom illustrations only where they add meaning.

Reference apps may inspire hierarchy and interaction patterns, but do not clone another app's visual design.

---

# 53. Product waves

## Wave A — MVP / alpha

Required:

- native SwiftUI iPhone app;
- native watchOS app;
- parent-assisted pairing;
- secure device auth;
- Today screen;
- routine groups;
- chores + habits;
- Next Up;
- task completion;
- parent approval state;
- points/streak summary;
- reward catalogue;
- favourite reward;
- SwiftData cache;
- persistent offline mutation queue;
- Watch offline completion;
- bounded reminders;
- one useful Watch complication;
- Smart Stack basic view;
- accessibility baseline;
- privacy-safe diagnostics;
- review/TestFlight-ready build path.

## Wave B — engagement and polish

- richer badges;
- weekly recap;
- weekly missions;
- cooperative family goals;
- widgets;
- App Intents;
- visual timers;
- child reward suggestions;
- child themes;
- age-adaptive UI;
- Focus Mode;
- richer Watch complications;
- more refined celebration system.

## Wave C — contextual family intelligence

- sick-day/rest integration;
- vacation/travel context;
- routine preview;
- visual instructions;
- parent notes;
- independence bonus experiment;
- avatar progression;
- optional mascot;
- allowance reward mapping;
- smarter reminder timing based on actual routine state.

## Deferred / not required for Apple MVP

- Android native rewrite;
- location tracking;
- generic AI chat;
- hardware accessories;
- public social features;
- subscription implementation;
- broad monetization experiments.

---

# 54. Implementation issue map and dependencies

Canonical epic: **#231**

Suggested order:

1. **#232 — Native foundation / legacy preservation**
2. **#233 — Family Planner API contract**
3. **#234 — Pairing and authentication**
4. **#235 — Today / routines / completion UX**
5. **#236 — Offline and sync**
6. **#237 — Rewards and progression**
7. **#238 — watchOS daily experience**
8. **#239 — widgets / complications / Smart Stack / App Intents**
9. **#240 — notifications**
10. **#241 — accessibility / age modes / Focus Mode**
11. **#242 — privacy / parental gates / App Store readiness**
12. **#243 — native CI / TestFlight / rollback-ready release process**

Parallel work is allowed only when contracts are stable enough to avoid duplication/rework.

---

# 55. MVP acceptance criteria

MVP is not “screens exist.” It requires the real daily loop.

A successful alpha means:

1. Parent pairs a real child profile.
2. Child opens ChoreChamps on iPhone or Watch.
3. Today loads from cache quickly and refreshes from Family Planner.
4. Child sees current routine and Next Up.
5. Child completes an eligible task.
6. Completion gives immediate local feedback.
7. If offline, the write queues and survives restart.
8. When connected, server accepts the mutation exactly once.
9. XP/stars update from authoritative state.
10. Approval-required task does not grant spendable points early.
11. Parent sees the same canonical result in Family Planner.
12. Watch and iPhone converge after reconciliation.
13. Cross-family access fails closed.
14. VoiceOver and Dynamic Type work for the critical path.
15. The build can be reproduced from source with documented toolchain.

---

# 56. QA matrix

## Devices / layouts

- small iPhone
- standard iPhone
- large iPhone
- iPad portrait
- iPad landscape
- small supported Watch
- large supported Watch

## Functional

- first pairing
- expired pairing code
- revoked device
- offline launch
- online refresh
- completion online
- completion offline
- duplicate taps
- app kill after local completion
- simultaneous iPhone/Watch completion
- approval-required task
- rejected/conflicting write
- reward request
- reward redemption
- insufficient points
- timezone change
- DST transition
- routine rollover across midnight
- empty day
- many tasks
- long task titles
- no rewards
- child with notifications disabled

## Accessibility

- VoiceOver
- Dynamic Type accessibility sizes
- Reduce Motion
- high contrast/colour independence
- keyboard/focus where applicable on iPad
- 44pt touch target checks

## Privacy/security

- family isolation
- child vs parent endpoint restrictions
- token revocation
- lock-screen privacy
- logs free of private content
- replay/idempotency tests

---

# 57. CI / release requirements

Native CI should eventually prove:

- clean checkout;
- dependency resolution;
- iOS build;
- watchOS build;
- unit tests;
- integration tests;
- UI smoke tests where infrastructure allows;
- formatting/linting if adopted;
- no committed secrets;
- version/build identity tied to commit;
- review environment configuration;
- artifact traceability.

GitHub-hosted macOS runner availability/cost may be a blocker; if so, document the blocker and use an approved alternative. Do not silently weaken required checks.

No production backend deployment, TestFlight distribution, or App Store submission without explicit approval.

---

# 58. Release stages

## Stage 0 — local prototype

Simulator only, mock/stub data allowed.

## Stage 1 — review backend

Real API against non-production environment.

## Stage 2 — internal device alpha

Physical iPhone + Watch, controlled family data.

## Stage 3 — TestFlight beta

Only after privacy/security/reliability gates pass.

## Stage 4 — App Store candidate

Only after explicit approval and final privacy/store review.

---

# 59. Rollback and recovery

The native client is mostly a read/cache/write-through client, but rollback still matters.

Requirements:

- preserve legacy web branch/tag;
- preserve known-good App Store/TestFlight build identity;
- backend API changes must be versioned/backwards-aware;
- migrations require explicit rollback/recovery thinking;
- queued local writes must not be lost silently across client upgrades;
- if a native release is bad, Family Planner canonical data remains authoritative;
- do not delete old API paths until the installed client population no longer needs them.

---

# 60. Commercial / monetization note

Legacy ChoreChamps documentation referenced a one-time purchase model. ChoreChamps 2.0 monetization is **not decided by this plan**.

Do not implement subscriptions, paywalls, purchases, advertising, or pricing changes unless a later explicit product decision approves them.

The native product should first prove usefulness and reliability for the family daily loop.

---

# 61. Explicit non-goals for initial native build

Do not spend early development time on:

- rebuilding parent Family Planner inside ChoreChamps;
- complex AI features;
- generic chat;
- GPS tracking;
- sibling leaderboards;
- paid avatar stores;
- social sharing;
- deep analytics dashboards for kids;
- Android parity before Apple MVP works;
- broad refactors unrelated to the active issue;
- legacy web polish that will not support migration/native transition.

---

# 62. Definition of done for each implementation PR

Every PR should include, where relevant:

- exact issue scope;
- what changed;
- why;
- screenshots or simulator evidence for UI changes;
- iPhone/iPad/Watch impact;
- accessibility notes;
- offline/sync impact;
- API/security impact;
- tests added/updated;
- environment assumptions;
- migration notes;
- rollback notes;
- known limitations;
- explicit statement that production was not changed unless separately approved.

A feature is not complete merely because it compiles.

---

# 63. AI implementation workflow

For each issue, an AI agent should:

1. Re-read this plan and the active issue.
2. Inspect current repository state and open PRs.
3. Inspect relevant Family Planner code/contracts.
4. Identify blockers/assumptions before coding.
5. Choose the smallest safe implementation slice.
6. Add/update tests with the implementation.
7. Run available validation locally/CI.
8. Perform representative simulator/device QA where available.
9. Review the diff for family isolation, idempotency, child privacy, and accidental production coupling.
10. Open a focused PR.
11. Do not merge/deploy/release unless that exact external action has been approved.

If the requested issue is too large for one safe PR, split it into clearly ordered child issues rather than delivering a giant speculative change.

---

# 64. Final product standard

ChoreChamps should feel like an Apple-native child companion that is fast enough for everyday use and simple enough that a child rarely needs help navigating it.

The strongest experience is not the size of the feature list. It is this:

- the child looks at the Watch;
- sees what is next;
- does it;
- taps done;
- gets calm positive feedback;
- the parent gets trustworthy state in Family Planner;
- points/rewards remain correct even if the network is flaky or the button is tapped twice.

That is the product to build.

---

# 65. Source-of-truth statement

This document is the canonical ChoreChamps 2.0 native product, UX, architecture, safety, and execution plan until explicitly superseded by a newer checked-in decision.

If GitHub issues, old README sections, legacy Capacitor code, or historical plans conflict with this document, treat those as legacy context unless a newer approved decision explicitly says otherwise.
