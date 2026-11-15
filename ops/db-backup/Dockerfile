# Weekly database dump, run as the Cloud Run Job `loc-db-backup`.
# pg_dump must be at least the server's major version: bump this tag if
# Supabase upgrades the project's Postgres.
FROM postgres:17-alpine

RUN apk add --no-cache curl

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

USER postgres
ENTRYPOINT ["/usr/local/bin/backup.sh"]
