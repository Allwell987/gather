#!/bin/bash
# Batch generate 365 devotionals using Supabase CLI (with --file)

for i in {1..365}
do
  echo "{\"day\": $i}" > body.json
  supabase functions invoke generate-365-devotionals --file body.json
  echo "Invoked for day $i"
done

rm body.json
