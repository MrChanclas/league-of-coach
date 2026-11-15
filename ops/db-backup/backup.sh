#!/bin/sh
# Dumps the database and uploads it to gs://$BACKUP_BUCKET/db/.
#
# Env (set by the Cloud Run Job, see deploy.yml):
#   DATABASE_URL     Supabase session pooler URL (port 5432)
#   DATABASE_SSL_CA  Supabase root certificate (PEM)
#   BACKUP_BUCKET    destination bucket name
#
# Restore with:
#   pg_restore --no-owner --no-acl --clean --if-exists -d "<url>" loc-<stamp>.dump
set -eu

: "${DATABASE_URL:?missing}" "${BACKUP_BUCKET:?missing}"

STAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
FILE="/tmp/loc-${STAMP}.dump"

# With the CA, verify the server certificate against it (libpq's verify-ca);
# any sslmode already in the URL is replaced.
URL="$DATABASE_URL"
if [ -n "${DATABASE_SSL_CA:-}" ]; then
  printf '%s\n' "$DATABASE_SSL_CA" > /tmp/db-ca.crt
  URL=$(printf '%s' "$URL" | sed -E 's/\?sslmode=[^&]*&?/?/; s/&sslmode=[^&]*//; s/\?$//')
  case "$URL" in
    *\?*) URL="${URL}&sslmode=verify-ca&sslrootcert=/tmp/db-ca.crt" ;;
    *) URL="${URL}?sslmode=verify-ca&sslrootcert=/tmp/db-ca.crt" ;;
  esac
fi

# Custom format is already compressed and is what pg_restore expects.
pg_dump --format=custom --no-owner --no-acl --dbname="$URL" --file="$FILE"
echo "dump ok: $(du -h "$FILE" | cut -f1)"

# Cloud Run exposes the job's service account token on the metadata server.
TOKEN=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
  | sed -E 's/.*"access_token":"([^"]+)".*/\1/')

curl -sf -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$FILE" \
  "https://storage.googleapis.com/upload/storage/v1/b/${BACKUP_BUCKET}/o?uploadType=media&name=db/loc-${STAMP}.dump" \
  > /dev/null

echo "uploaded gs://${BACKUP_BUCKET}/db/loc-${STAMP}.dump"
