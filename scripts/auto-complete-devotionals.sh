#!/bin/bash
# Keep retrying failed devotional generations until all 365 are present

SUPABASE_FUNCTION_URL="https://eeofuuepqvysakqonaxj.functions.supabase.co/generate-365-devotionals"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb2Z1dWVwcXZ5c2FrcW9uYXhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQzODI2NiwiZXhwIjoyMDkwMDE0MjY2fQ.Srwk5AD-hGSU__UKasEpRvBZn_7ZoyHHIIa6Q8weFDw"

MAX=365

while true; do
  # Count current devotionals
  count=$(curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "https://eeofuuepqvysakqonaxj.supabase.co/rest/v1/devotionals?select=id" | jq length)
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
