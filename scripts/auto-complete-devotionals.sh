#!/bin/bash
# Keep retrying failed devotional generations until all 365 are present

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

SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL:-https://eeofuuepqvysakqonaxj.supabase.co}"

MAX=365

while true; do
  # Count current devotionals
  count=$(curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/devotionals?select=id" | jq length)
  echo "Current devotional count: $count"
  if [ "$count" -ge "$MAX" ]; then
    echo "All $MAX devotionals generated!"
    break
  fi

  # Retry failed days if any
  if [ -f failed-days.log ]; then
    ./scripts/retry-failed-devotionals.sh
  else
    echo "No failed-days.log found. Running main batch script."
    ./scripts/batch-generate-devotionals-http.sh
  fi

  echo "Waiting 30 seconds before next check..."
  sleep 30
done
