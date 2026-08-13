-- Prevent duplicate assignments when concurrent retries race.
CREATE UNIQUE INDEX "ChoreAssignment_choreId_kidId_dueDate_key"
ON "ChoreAssignment"("choreId", "kidId", "dueDate");
