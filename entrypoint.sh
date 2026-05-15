#!/bin/bash
set -euo pipefail

PORT="${PORT:-5055}"
WORKERS="${GUNICORN_WORKERS:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-180}"

echo "======================================================="
echo "  TradeDoc AI - starting Gunicorn"
echo "  Port: ${PORT}"
echo "  Workers: ${WORKERS}"
echo "======================================================="

exec gunicorn \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WORKERS}" \
  --threads "${GUNICORN_THREADS:-4}" \
  --timeout "${TIMEOUT}" \
  --access-logfile "-" \
  --error-logfile "-" \
  "server:app"
