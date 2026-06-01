#!/usr/bin/env bash
# scripts/enable_github_pages_api.sh
# Enables GitHub Pages for the current repo using the GitHub REST API.
# Usage: GITHUB_TOKEN=ghp_xxx bash scripts/enable_github_pages_api.sh

set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Error: GITHUB_TOKEN environment variable is not set. Create a token with 'repo' scope and export it:"
  echo "  export GITHUB_TOKEN=ghp_xxx"
  exit 1
fi

# Determine repo owner/name from git remote
REMOTE_URL=$(git config --get remote.origin.url || true)
if [ -z "$REMOTE_URL" ]; then
  echo "Could not determine git remote URL. Set REPO manually like 'owner/repo' as first arg."
  exit 1
fi

# Normalize remote URL formats
if echo "$REMOTE_URL" | grep -q "git@"; then
  # git@github.com:owner/repo.git
  REPO=$(echo "$REMOTE_URL" | sed -E 's#git@[^:]+:([^/]+/[^.]+)(\.git)?#\1#')
else
  # https://github.com/owner/repo.git or https://github.com/owner/repo
  REPO=$(echo "$REMOTE_URL" | sed -E 's#https?://[^/]+/([^/]+/[^.]+)(\.git)?#\1#')
fi

BRANCH=${1:-main}
PATH_TO_PUBLISH=${2:-/docs}

echo "Enabling GitHub Pages for repo: $REPO (branch=$BRANCH, path=$PATH_TO_PUBLISH)"

API_URL="https://api.github.com/repos/$REPO/pages"

BODY=$(jq -n --arg b "$BRANCH" --arg p "$PATH_TO_PUBLISH" '{source: {branch: $b, path: $p}}')

echo "Request body: $BODY"

HTTP_STATUS=$(curl -s -o /tmp/pages_resp.json -w "%{http_code}" -X PUT "$API_URL" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d "$BODY")

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
  echo "Pages enabled/updated successfully."
  jq -r '.html_url // .url' /tmp/pages_resp.json || true
  jq -r '.status' /tmp/pages_resp.json || true
else
  echo "GitHub API returned HTTP $HTTP_STATUS. Response:" >&2
  cat /tmp/pages_resp.json >&2
  exit 1
fi

echo "Done. If this is a new Pages site, it may take a minute to become available." 
