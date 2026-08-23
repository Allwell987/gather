#!/bin/bash
# Retry failed devotional generations using failed-days.log

# Load environment variables from .env in repo root (never commit secrets to source)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env"
  set +a
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env file or export it."
  exit 1
fi

SUPABASE_FUNCTION_URL="${EXPO_PUBLIC_SUPABASE_URL:-https://eeofuuepqvysakqonaxj.supabase.co}/functions/v1/generate-365-devotionals"

if [ ! -f failed-days.log ]; then
  echo "No failed-days.log found. Nothing to retry."
  exit 0
fi

grep -oE 'day [0-9]+' failed-days.log | awk '{print $2}' | sort -n | uniq | while read i; do
  echo "Retrying day $i..."
  response=$(curl -s -w "%{http_code}" -o response.json -X POST "$SUPABASE_FUNCTION_URL" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"day\": $i}")
  http_code=${response: -3}
  if [ "$http_code" != "200" ]; then
    echo "Still failed for day $i (HTTP $http_code)" | tee -a failed-days-retry.log
    cat response.json
  else
    echo "Success for day $i"
  fi
  sleep 2
done
rm -f response.json
