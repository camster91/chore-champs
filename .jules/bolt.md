## 2023-10-27 - [N+1 Bottleneck in Date Range Loops]
**Learning:** Performing sequential `.count()` queries inside a date loop (e.g., iterating over days of the week) creates severe N+1 bottlenecks. In `getWeeklySummary`, iterating 7 days with 3 queries per day resulted in 21 roundtrips.
**Action:** Extract queries outside of date range loops using broad `.findMany()` queries spanning the entire time range (via `Promise.all`), selecting only necessary fields, and perform day-by-day aggregations in-memory.
