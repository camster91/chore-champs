#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${CHORE_CHAMPS_BASE_URL:-https://chores.ashbi.ca}"
TMP_MANIFEST=$(mktemp)
trap 'rm -f "$TMP_MANIFEST"' EXIT

check_url() {
  local path="$1"
  local code
  code=$(curl --fail --silent --show-error --location --max-time 20 \
    --output /dev/null --write-out '%{http_code}' "$BASE_URL$path")
  [[ "$code" == "200" ]] || { echo "$path returned HTTP $code" >&2; exit 1; }
}

curl --fail --silent --show-error --location --max-time 20 \
  "$BASE_URL/api/health" | grep -q '"db":"connected"'

for path in / /login /signup /privacy-policy /robots.txt /sitemap.xml; do
  check_url "$path"
done

curl --fail --silent --show-error --location --max-time 20 \
  --output "$TMP_MANIFEST" "$BASE_URL/manifest.json"

python3 - "$TMP_MANIFEST" "$BASE_URL" <<'PY'
import json
import sys
from urllib.request import urlopen

manifest_path, base_url = sys.argv[1:]
with open(manifest_path, encoding='utf-8') as handle:
    manifest = json.load(handle)
assert manifest.get('name') == 'ChoreChamps'
icons = manifest.get('icons') or []
assert icons, 'manifest has no icons'
for icon in icons:
    path = icon['src']
    assert path.startswith('/icons/'), path
    with urlopen(f'{base_url}{path}', timeout=20) as response:
        assert response.status == 200, (path, response.status)
PY

echo "Chore Champs production health OK"
