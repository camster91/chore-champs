-- Cast enum columns to plain text to match the Prisma schema (String type).
-- This fixes PrismaClientKnownRequestError P2032 ("Error converting field 'difficulty'
-- of expected non-nullable type 'String', found incompatible value of 'EASY'") which
-- broke chore create + list + the dashboard chore count.
--
-- The original migrations created the columns as Postgres ENUM types, but the Prisma
-- schema declares them as String. The two are now in sync.

-- AlterTable
ALTER TABLE "AvatarItem" ALTER COLUMN "themeMode" TYPE TEXT;
ALTER TABLE "Chore" ALTER COLUMN "difficulty" TYPE TEXT;
ALTER TABLE "Chore" ALTER COLUMN "recurring" TYPE TEXT;
ALTER TABLE "Chore" ALTER COLUMN "timeOfDay" TYPE TEXT;
ALTER TABLE "ChoreAssignment" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "Habit" ALTER COLUMN "timeOfDay" TYPE TEXT;
ALTER TABLE "Kid" ALTER COLUMN "themeMode" TYPE TEXT;
