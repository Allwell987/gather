#!/usr/bin/env bash
# scripts/enable_github_pages.sh
# Usage: bash scripts/enable_github_pages.sh
# Enables GitHub Pages for the repo using the GitHub CLI (`gh`).
# Requires: gh CLI installed and authenticated (run `gh auth login`).

set -euo pipefail

REPO="Allwell987/gather"
BRANCH="main"
FOLDER="/docs"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install it: https://cli.github.com/"
  exit 1
fi

echo "Enabling GitHub Pages for $REPO (branch=$BRANCH, folder=$FOLDER)..."

# Create or update the pages configuration
response=$(gh api --silent -X POST /repos/${REPO}/pages -f source.branch=${BRANCH} -f source.path=${FOLDER} 2>&1) || true

if echo "$response" | grep -q 'already_exists' || echo "$response" | grep -q '422'; then
  echo "Pages API returned a non-fatal response; attempting to update configuration instead..."
  gh api --silent -X PUT /repos/${REPO}/pages -f source.branch=${BRANCH} -f source.path=${FOLDER}
fi

# Query status
status=$(gh api repos/${REPO}/pages --jq '.status' || true)
url=$(gh api repos/${REPO}/pages --jq '.html_url' || true)

echo "Pages status: ${status}"
if [ -n "$url" ]; then
  echo "Your site should be available at: ${url}"
else
  echo "Could not retrieve Pages URL from API response. Check the repository's Pages settings in GitHub UI: https://github.com/${REPO}/settings/pages"
fi

echo "Done. If this is a new Pages site, DNS/propagation and GitHub processing can take a minute." 
