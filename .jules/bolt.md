## 2024-05-14 - Prevent O(N) memory leak in habit logs
 **Learning:** In Prisma queries, avoid including entire relation arrays (`logs: true`) if the UI only needs a tiny subset (like "was it done today?"). As the database grows, this pulls massive amounts of unused data into memory and crashes the server.
 **Action:** Apply a `where` clause directly on the `include` relation to bound the query (e.g. `where: { loggedAt: { gte: twoDaysAgo } }`) when full history isn't needed by the client.
