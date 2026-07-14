## 2024-07-14 - [N+1 query problem on getWeeklySummary]
**Learning:** Found a loop (7 iterations) making 3 individual count DB calls on `src/actions/weeklySummary.ts`, totaling 21 requests just to fetch weekly chores and habits logs.
**Action:** Replaced loop queries by querying the data ahead of the loop in just 2 queries (`allChoreAssignments` and `allHabitLogs`), filtering later in memory.
