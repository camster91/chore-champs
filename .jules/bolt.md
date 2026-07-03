## 2024-05-18 - Fix N+1 queries by replacing iterative loop queries with Promise.all
**Learning:** Resolving N+1 query bottlenecks in a database call logic by fetching larger chunks of data simultaneously and grouping it using an in-memory function is more performant than executing single database calls sequentially in a loop.
**Action:** Replace looped sequential `.count()` database queries with `Promise.all` `findMany` queries for the entire required scope before processing data and doing filtering/reductions in memory.
