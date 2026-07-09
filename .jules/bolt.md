## 2025-02-26 - Prevent O(N) Memory Scaling in Habit Logs
**Learning:** Returning unbounded relations like `logs: true` in Prisma causes O(N) memory scaling as the dataset grows over time, leading to silent performance degradation when the client only needs recent records (e.g. checking if a habit was completed today).
**Action:** Always apply date or limit filters (e.g., `where: { loggedAt: { gte: twoDaysAgo } }` to account for timezones safely) directly inside Prisma `include` clauses for time-series relations when historical data isn't consumed by the UI.
