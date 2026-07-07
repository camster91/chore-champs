## 2026-07-07 - Optimizing N+1 DB Calls
**Learning:** Found a severe N+1 problem in `src/actions/weeklySummary.ts`. The code executed 21 sequential `.count()` queries inside a 7-day loop (3 per day).
**Action:** Always check loops that query the database in actions/components and replace sequential queries with broad, parallelized queries for the whole time range using `Promise.all()`, followed by in-memory grouping.
