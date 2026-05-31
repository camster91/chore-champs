## 2024-05-29 - Fixed Over-Fetching in Prisma

**Learning:** Prisma queries using `include` to fetch large nested relationships (like `choreAssignments` and `habitLogs` for a `Kid`) can cause significant memory and CPU spikes. If the fetched relational data isn't even used and gets mapped out, you should always replace `include` with a `select` statement that exactly specifies the primitive properties needed. This improves DB execution plans and minimizes payload transfers.

**Action:** Before writing or optimizing a Prisma fetch, check if the included relational properties are actually read from the result. Use `select` to specify the exact fields needed.
