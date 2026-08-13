#!/usr/bin/env bash
# Create and verify a restricted PostgreSQL backup for Chore Champs.
set -euo pipefail

DB_CONTAINER="kids-chore-postgres"
DB_USER="chorechamps"
DB_NAME="chorechamps"
BACKUP_DIR="/var/backups/chore-champs"
RETENTION_DAYS="14"

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
filename="chore-champs-$timestamp.dump"
backup_path="$BACKUP_DIR/$filename"
temporary_path="$backup_path.tmp"

cleanup() {
  rm -f "$temporary_path"
}
trap cleanup EXIT

docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || {
  echo "database container $DB_CONTAINER is unavailable" >&2
  exit 1
}

docker exec "$DB_CONTAINER" pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --username "$DB_USER" \
  "$DB_NAME" > "$temporary_path"

[[ -s "$temporary_path" ]] || {
  echo "database backup is empty" >&2
  exit 1
}

# Read the archive catalog with the same PostgreSQL image used by the database.
# This catches truncated or otherwise unreadable dumps before they are retained.
db_image=$(docker inspect "$DB_CONTAINER" --format '{{.Config.Image}}')
docker run --rm \
  -v "$BACKUP_DIR:/backups:ro" \
  "$db_image" \
  pg_restore --list "/backups/$filename.tmp" >/dev/null

mv "$temporary_path" "$backup_path"
sha256sum "$backup_path" > "$backup_path.sha256"

find "$BACKUP_DIR" -maxdepth 1 -type f -name 'chore-champs-*.dump' \
  -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'chore-champs-*.dump.sha256' \
  -mtime "+$RETENTION_DAYS" -delete

echo "Chore Champs database backup OK: $backup_path"
