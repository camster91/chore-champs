## 2025-02-18 - [Parallelize N+1 Prisma Queries]
**Learning:** Found sequential independent Prisma queries being executed in loops, causing severe performance degradation and latency.
**Action:** When performing multiple independent counts or data aggregations inside a loop, group them and resolve using `Promise.all()` to achieve concurrent execution and cut down response latency dramatically.
