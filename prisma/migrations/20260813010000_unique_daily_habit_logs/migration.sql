-- Prevent duplicate habit logs when concurrent requests race on the same day.
ALTER TABLE "HabitLog" ADD COLUMN "loggedDate" DATE;

UPDATE "HabitLog"
SET "loggedDate" = ("loggedAt" AT TIME ZONE 'UTC')::date;

ALTER TABLE "HabitLog" ALTER COLUMN "loggedDate" SET NOT NULL;

CREATE UNIQUE INDEX "HabitLog_habitId_kidId_loggedDate_key"
ON "HabitLog"("habitId", "kidId", "loggedDate");
