#!/bin/bash
# Batch generate 365 devotionals using direct HTTP POST to Supabase Edge Function

SUPABASE_FUNCTION_URL="https://eeofuuepqvysakqonaxj.functions.supabase.co/generate-365-devotionals"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb2Z1dWVwcXZ5c2FrcW9uYXhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQzODI2NiwiZXhwIjoyMDkwMDE0MjY2fQ.Srwk5AD-hGSU__UKasEpRvBZn_7ZoyHHIIa6Q8weFDw"

for i in {1..365}
do
  response=$(curl -s -w "%{http_code}" -o response.json -X POST "$SUPABASE_FUNCTION_URL" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"day\": $i}")
  http_code=${response: -3}
  if [ "$http_code" != "200" ]; then
    echo "Failed for day $i (HTTP $http_code)" | tee -a failed-days.log
    cat response.json
  else
    echo "Success for day $i"
  fi
  sleep 2
done
rm -f response.json
