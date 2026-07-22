-- Add currentStreak + longestStreak to replace the single streakDays field.
-- The single field couldn't model "longest streak ever" — gamification needs both.
-- Also adds lastCompletedAt so calculateStreak() can compare against the prior
-- completion date for consecutive-day detection.
--
-- Data preservation: existing streakDays rows are copied into currentStreak
-- (the live count) and longestStreak (the historical max). After deploy,
-- streakDays can be dropped in a follow-up cleanup migration once confirmed.

-- AddColumn
ALTER TABLE "Kid" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Kid" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Kid" ADD COLUMN "lastCompletedAt" TIMESTAMP(3);

-- Backfill: copy streakDays into the new pair so existing kids keep their streak
UPDATE "Kid" SET "currentStreak" = "streakDays", "longestStreak" = "streakDays";

-- DropColumn
ALTER TABLE "Kid" DROP COLUMN "streakDays";