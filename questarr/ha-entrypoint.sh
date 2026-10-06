#!/bin/sh
set -eu

PUID=${PUID:-1000}
PGID=${PGID:-1000}
UMASK=${UMASK:-022}
CURRENT_UID=$(id -u)
CURRENT_GID=$(id -g)

if [ "$CURRENT_UID" != "$PUID" ] || [ "$CURRENT_GID" != "$PGID" ]; then
  echo "ERROR: the add-on is running as ${CURRENT_UID}:${CURRENT_GID}, but PUID/PGID are ${PUID}:${PGID}."
  exit 1
fi

umask "$UMASK"
export PUID PGID UMASK

# The helper has only CAP_CHOWN and always operates beneath /data. The app and
# this entrypoint stay unprivileged while the Supervisor volume is prepared.
/usr/local/bin/questarr-fix-data-owner "$PUID" "$PGID"

if [ -z "${SQLITE_DB_PATH:-}" ]; then
  export SQLITE_DB_PATH=/app/data/sqlite.db
fi

if [ ! -d /app/data ] || [ ! -w /app/data ]; then
  echo "ERROR: the add-on user cannot write to the Supervisor /data volume."
  exit 1
fi

if [ -f "$SQLITE_DB_PATH" ] && [ ! -w "$SQLITE_DB_PATH" ]; then
  echo "ERROR: the add-on user cannot write to the existing database ${SQLITE_DB_PATH}."
  exit 1
fi

exec "$@"
