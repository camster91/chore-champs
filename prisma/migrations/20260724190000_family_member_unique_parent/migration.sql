-- Deduplicate any accidental multi-family memberships (keep oldest row).
DELETE FROM "FamilyMember" a
USING "FamilyMember" b
WHERE a."parentId" = b."parentId"
  AND a."createdAt" > b."createdAt";

-- Drop non-unique index if present, then enforce one membership per parent.
DROP INDEX IF EXISTS "FamilyMember_parentId_idx";
CREATE UNIQUE INDEX "FamilyMember_parentId_key" ON "FamilyMember"("parentId");
