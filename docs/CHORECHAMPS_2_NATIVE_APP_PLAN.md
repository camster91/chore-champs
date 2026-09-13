# ChoreChamps 2.0 — Native iPhone + Apple Watch Plan

**Status:** Approved direction  
**Primary platforms:** iPhone, iPad, Apple Watch  
**Native stack:** Swift, SwiftUI, SwiftData, WidgetKit, App Intents, UserNotifications  
**Backend direction:** Family Planner is the canonical family/household backend and source of truth.

## Vision

ChoreChamps becomes the child-facing native companion to Family Planner: a calm, playful daily routine app that helps kids understand what they need to do, complete it with minimal friction, see meaningful progress, and earn parent-controlled rewards.

Core loop:

`see what is next -> do it -> tap complete -> receive feedback -> build progress -> unlock reward`

North-star experience:

> A child should be able to complete a normal day using only the Today screen and their Apple Watch.

On Watch:

> what's next -> do it -> tap done -> feel progress

## Product boundaries

### ChoreChamps owns

- child-facing daily routine experience;
- chores and habits;
- task completion;
- XP/stars, levels, streaks and badges;
- reward browsing and requests;
- native notifications;
- iPhone/iPad widgets;
- Apple Watch app, complications and Smart Stack;
- offline completion and later reconciliation;
- child profile personalization;
- age-appropriate accessibility modes.

### Family Planner owns

- family creation and membership;
- parent/admin controls;
- chore and habit authoring;
- schedules and recurrence;
- reward catalogue management;
- parent approvals;
- family-wide analytics;
- calendar/household context;
- account lifecycle, export and deletion;
- canonical database records and authorization.

ChoreChamps should not create a second family identity system, second canonical chore database, parent administration surface, sibling-ranking product, location tracker, ad platform, or medical/treatment product.

## Legacy repository transition

The existing Next.js/React/Prisma/Capacitor app contains useful domain logic, security work and UI references.

Before destructive restructuring:

1. Preserve the current `master` as legacy web reference.
2. Create `legacy/web-v1` and a `legacy-web-v1` tag if available.
3. Preserve migration history until import/reconciliation paths are documented.
4. Carry forward security lessons and tests.
5. Treat the PWA/Capacitor UI as reference code, not the native UI architecture.
6. Do not delete legacy data or code until the native product is proven.

## Architecture

```text
                       FAMILY PLANNER
                  canonical family backend
                          + API
                            |
              +-------------+-------------+
              |                           |
      Family Planner UI               ChoreChamps
       parent/family                   native Apple
                                          |
                             +------------+------------+
                             |                         |
                        iPhone/iPad               Apple Watch
                          SwiftUI                    SwiftUI
                             |                         |
                    Widgets / Intents       Complications / Smart Stack
                             |                         |
                             +------ shared models ---+
```

### Native stack

- SwiftUI for iPhone, iPad and watchOS;
- SwiftData for local cache and offline state;
- URLSession with async/await;
- Keychain for credentials;
- WidgetKit for widgets, complications and Smart Stack;
- App Intents for Siri/system actions;
- UserNotifications + APNs;
- WatchConnectivity only where useful; Watch core daily operation should not require the phone;
- Swift Testing/XCTest and XCUITest;
- `xcodebuild` CI.

### Backend rules

- Family Planner API is authoritative.
- Clients never calculate authoritative XP.
- Clients never decide family authorization.
- Completion writes are idempotent.
- Reward spending is atomic.
- Server validates current task state before accepting writes.
- Retrying a write cannot duplicate points or redemptions.

## iPhone information architecture

1. **Today** — primary daily journey
2. **Quests** — chores, habits and special challenges
3. **Rewards** — catalogue and current goal
4. **Progress** — streaks, levels, badges and weekly summary
5. **Me** — avatar, appearance and child-safe preferences

The parent should not need a duplicate admin app. Complex configuration stays in Family Planner.

## Today experience

The child should immediately understand:

1. What do I need to do?
2. What do I get for doing it?
3. How am I progressing?

Routine sections:

- Morning
- Before School
- After School
- Evening
- Bedtime
- Weekend
- Custom

Example:

```text
Good morning, Adelaide

🔥 6 day streak              ⭐ 340

TODAY
████████████░░░  8 / 11

Morning                        2 / 3
✓ Brush teeth                   +5
✓ Make bed                     +10
○ Pack backpack                +10

After School                   0 / 3
○ Homework                     +15
○ Read for 20 minutes          +10
○ Tidy room                    +10

Saving for
🎬 Movie Night
340 / 400 ⭐
```

### Smart ordering

Order by:

1. due now;
2. current routine;
3. overdue but actionable;
4. upcoming today;
5. optional tasks.

Past completed routines collapse automatically.

### Done-for-now state

```text
Morning complete
You earned 30 ⭐
Next up: After School at 3:45 PM
```

## Domain concepts

### Routine
A time/context grouping such as Morning or Bedtime.

### Habit
A repeated personal behaviour such as brushing teeth, reading or practice.

### Chore
A household responsibility such as dishes, laundry or cleaning a room.

### Quest
A child-facing presentation that may represent a chore, habit or challenge.

Example:

Backend: `Clean bedroom — chore — weekly — approval required — 25 XP`

Child UI: `Room Rescue — Clean your bedroom — +25 ⭐`

## Task detail UX

Optional fields:

- icon/illustration;
- short instructions;
- estimated duration;
- points;
- due time;
- approval requirement;
- photo requirement;
- timer;
- sub-checklist;
- short parent note.

Avoid exposing technical states like Pending/In Progress/Verified to younger kids.

## Completion modes

### Automatic
Child taps done; server validates; XP awarded once.

### Parent check
Child completes; state becomes awaiting approval; XP awarded after approval.

### Photo check
Child submits required/optional proof; parent reviews.

### Checklist confirmation
Required steps are checked before completion.

Friendly pending copy:

`A parent is checking this one. Your stars will arrive after approval.`

## Next Up

Persistent card:

```text
Next up
Pack your backpack
Before 8:15 AM
+10 ⭐
```

On Watch this may be the default state.

## Visual timers

Optional for bounded tasks:

- brush teeth — 2 minutes;
- tidy toys — 5 minutes;
- reading — 20 minutes;
- instrument practice — 15 minutes.

Timers guide; they are not races.

## Apple Watch V1

The Watch should optimize for glanceability and one-tap completion.

Main view:

```text
TODAY
🔥 6      ⭐ 340

Morning
✓ Brush teeth
○ Make bed
○ Vitamins

2 left
```

Task view:

```text
Make Bed
+10 ⭐
[ Complete ]
```

After completion:

```text
Done!
+10 ⭐
350 total
50 until Movie Night
```

Required Watch features:

- independent-capable daily read experience;
- task completion;
- offline queue;
- haptics;
- streak and point summary;
- next reward progress;
- actionable notifications;
- complications;
- Smart Stack.

### Complication options

- Remaining: `3 left`
- Progress: `3/5`
- Streak: `🔥 7`
- Stars: `⭐ 425`
- Next task: `Teeth 8:00`

## Widgets and App Intents

iPhone widgets:

- small: points + streak;
- medium: progress + next tasks;
- large: active routine + reward goal.

Lock-screen privacy is parent configurable.

Target intents:

- “What chores do I have?”
- “What’s next in ChoreChamps?”
- “How many stars do I have?”
- “Mark my bed as made.”

Writes must resolve one exact authorized task and clearly confirm the action.

## Notifications

Supportive and sparse:

Prefer: `Morning mission waiting — Brush teeth • +5 ⭐`

Avoid: `Task overdue: Brush teeth`

Default maximum: one friendly reminder plus one optional follow-up, then stop. Parents control cadence and quiet periods.

## Offline and sync

Offline is first-class, especially on Watch.

```text
Complete
   |
SwiftData pendingSync
   |
   +-- online --> send
   +-- offline --> queue --> reconnect --> server idempotency check
                                      |
                               accepted / conflict
```

Rules:

- stable idempotency key per queued mutation;
- retry cannot duplicate XP;
- server may reject stale state;
- conflict refreshes authoritative state;
- UI never reports synced when it is not;
- pending writes survive restart.

Copy: `You're offline. We'll save this and sync it when you're connected.`

## Rewards

Child can see parent-approved reward name, cost, availability and progress.

Favourite reward:

```text
Saving for Movie Night
425 / 500 ⭐
75 more!
```

Kids may suggest rewards. Parents approve, rename, price or reject them in Family Planner before they become redeemable.

Later, a parent may explicitly map points to an allowance bonus, but points must never automatically become money.

## Gamification principles

### V1

- XP/stars;
- levels;
- streaks;
- badges;
- personal goals;
- rewards.

### Later

- weekly missions;
- cooperative family goals;
- avatar/customization unlocks;
- collectible badge sets;
- optional mascot/companion.

Avoid loot boxes, random paid rewards, ads, infinite feeds, punitive streak loss, and sibling rankings as the primary motivation.

## Streak design

Avoid: `YOU LOST YOUR 14 DAY STREAK`

Prefer: `Your best streak is 14 days. Start another one today.`

Paused, sick, vacation and unscheduled days should not silently count as failures.

## Weekly missions

Examples:

- complete bedtime routine 5 times;
- complete 10 chores;
- read on 5 days;
- finish every morning routine;
- help another family member;
- complete 3 responsibilities before reminders.

Parents choose/approve active missions.

## Cooperative family goals

Prefer cooperation to sibling competition.

Example: `Earn 800 ⭐ together this week to unlock Movie Night.`

## Badges

Suggested groups:

- Consistency: First Step, Week Warrior, Routine Master
- Responsibility: Room Ranger, Laundry Helper, Kitchen Helper, Pet Pal
- Growth: Early Starter, Independent, No Reminder Needed, Comeback Kid
- Special: Family Helper, Super Reader

Badge awards must be deterministic and idempotent.

## Age-adaptive UI

### Young child
Large icons, fewer words, more visual routines.

### School age
Standard quests, points, rewards, streaks and badges.

### Teen
Cleaner styling, less cartoon language, optional “Responsibilities” terminology.

Same data; different presentation.

## Focus Mode

Optional one-task-at-a-time UI:

```text
One thing at a time
Put clothes in hamper
[ Done ]
```

Hide unrelated rewards/progress while active.

## Context modes

Avoid GPS for initial product. Support parent-defined contexts such as Home, Weekend, Grandma's and Vacation.

Family Planner sick-day or vacation context may pause streak penalties and hide optional chores. ChoreChamps must not diagnose conditions or make treatment decisions.

## Accessibility

Required from the start:

- VoiceOver;
- Dynamic Type;
- strong contrast;
- 44pt+ targets where appropriate;
- Reduce Motion;
- clear focus order;
- icon + text/accessibility label, never colour alone;
- simple age-appropriate language;
- representative one-task-at-a-time/cognitive-load testing.

## Privacy and child safety

- no ads;
- no behavioural advertising;
- no data sale;
- no unnecessary third-party analytics SDKs;
- avoid requiring child email;
- parent-controlled child profiles;
- minimal lock-screen content;
- no continuous location tracking;
- parent-controlled export/deletion;
- parental gates where needed;
- privacy manifest and App Store disclosures must match runtime behaviour;
- diagnostics must not contain task photos, private notes or child names unless strictly necessary.

## Security rules

Carry forward lessons from the web app:

- never trust client-supplied points;
- never trust client-supplied family IDs for authorization;
- never allow completion replay to double-award;
- never let concurrent reward spending create negative balances;
- role authorization on every API route;
- sanitized child-facing errors;
- revocable device credentials;
- Keychain token storage;
- rate-limited mutations;
- family-isolation tests.

## Parent approval inbox target

Family Planner should eventually show a compact review list by child and support safe batch approval while preserving per-item audit history.

## MVP scope

Required:

- native SwiftUI iPhone app;
- native independent-capable Watch app;
- parent-assisted child pairing/sign-in;
- Today screen and routine groups;
- chores and habits;
- task completion and approval state;
- XP/stars and streaks;
- reward catalogue and favourite reward;
- SwiftData offline cache and queued writes;
- reminders;
- Watch complication and Smart Stack;
- accessibility baseline;
- privacy-safe diagnostics;
- TestFlight-ready pipeline.

Later:

- mascot;
- deep avatar economy;
- weekly missions;
- family goals;
- reward suggestions;
- allowance conversion;
- richer Siri writes;
- contextual automation;
- Android rewrite.

## Implementation epics

1. P0 — Native ChoreChamps 2.0 foundation
2. P0 — Family Planner API contract for child clients
3. P0 — Native authentication and device pairing
4. P0 — Kid Today and routines experience
5. P0 — Reliable offline and sync engine
6. P1 — Rewards and progression
7. P1 — Apple Watch daily experience
8. P1 — Widgets, complications and App Intents
9. P1 — Notifications and reminder policy
10. P1 — Accessibility and age-adaptive UX
11. P1 — Privacy and App Store readiness
12. P1 — TestFlight and release engineering
13. P2 — Gamification expansion
14. P2 — Family context integrations

Each epic should be split into small one-PR child issues with explicit acceptance criteria and QA evidence.

## QA matrix

Test representative small/standard/large iPhones, iPad portrait/landscape, supported Watch sizes, Dynamic Type, VoiceOver, Reduce Motion, offline mode, app termination during pending sync, background/foreground transitions, timezone/DST transitions, duplicate taps and delayed responses.

Security/role QA must prove:

- one family cannot access another;
- child cannot alter XP values;
- child cannot bypass approval requirements;
- replayed completion does not duplicate XP;
- replayed redemption does not duplicate spend;
- expired/revoked device credentials fail safely.

## MVP acceptance criteria

Internal TestFlight is ready when:

- parent can pair a child profile;
- the child can use iPhone and Watch;
- Today shows the correct routine and next task;
- chores/habits complete correctly;
- approval-required tasks remain pending until approved;
- XP is awarded exactly once;
- streaks handle local dates/pauses correctly;
- reward balance cannot go negative;
- offline completion survives restart and syncs later;
- Watch/iPhone/Family Planner reconcile correctly;
- child-facing errors are understandable;
- VoiceOver, Dynamic Type and Reduce Motion pass critical flows;
- family isolation passes;
- release has documented rollback/recovery.

## Release strategy

1. **Internal alpha:** owner family, physical iPhone + Watch, correctness/sync first.
2. **Design-partner beta:** small TestFlight group; measure comprehension, parent friction, Watch usefulness and reminder burden.
3. **Public release:** privacy review, Kids Category decision, parental-gate review, regression pass, reliability baseline, rollback proof, App Store metadata and explicit production approval.

## Success measures

Optimize for usefulness, not screen time:

- time to understand the next action;
- daily routine completion;
- completion correction rate;
- Watch completion success;
- failed/duplicate sync rate;
- parent approval backlog;
- reminders needed before completion;
- weekly family retention;
- child usability feedback;
- zero cross-family exposure.

## First milestone

> A real child can put on their Apple Watch in the morning, see their routine, complete tasks, earn points exactly once, and have the result appear correctly in Family Planner.
