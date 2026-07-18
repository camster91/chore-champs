## 2023-10-27 - [Weekly Summary N+1 Query Resolution]
**Learning:** Sequential Prisma queries within a daily loop for aggregated views (like weekly summaries) generate extreme N+1 queries. Specifically, 3 queries per day over a week translates to 21 sequential queries, introducing latency bottlenecks and blocking NextJS server actions.
**Action:** When aggregating date-based metrics for multiple days (like a week), always fetch the full date range upfront using concurrent queries (e.g., `Promise.all([findMany, findMany])`) and perform the daily grouping in-memory using local date boundaries like `.getTime()`.

## 2025-02-12 - [Prisma Relation Over-Fetching]
**Learning:** Returning deep relational objects via `include` in Prisma (like nested `kid` or `chore` relations) that are silently discarded by the client causes unnecessary database parsing and O(N) memory scaling issues as the application grows, especially on list queries.
**Action:** Always verify if nested relational data queried via Prisma is actually utilized by the client component. Remove unused `include` statements to reduce memory overhead and response payload sizes, particularly for one-to-many or many-to-one relations in large collections.
