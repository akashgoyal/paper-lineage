#!/usr/bin/env bash
# Copies the server-side variables from web/.env.local into the linked Vercel project
# (production + preview). Run it yourself from web/ after `npx vercel link`:  bash scripts/vercel-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .vercel/project.json ] || { echo "Not linked yet: run 'npx vercel link' first."; exit 1; }

KEYS=(SANITY_ORGANIZATION_TOKEN SANITY_CONTEXT_GRAPH_URL SANITY_CONTEXT_PAPERS_URL SANITY_WRITE_TOKEN TOGETHER_API_KEY
      ASK_MODEL SANITY_READ_TOKEN UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN RATE_LIMIT_SALT)

value() { # KEY=value or KEY="value" / 'value' from .env.local
  grep -E "^$1=" .env.local | tail -1 | cut -d= -f2- | sed -E "s/^[[:space:]]+|[[:space:]]+$//g; s/^\"(.*)\"$/\1/; s/^'(.*)'$/\1/"
}

for key in "${KEYS[@]}"; do
  v="$(value "$key" || true)"
  if [ -z "$v" ]; then echo "skip   $key (not in .env.local)"; continue; fi
  for target in production preview; do
    npx vercel env rm "$key" "$target" --yes >/dev/null 2>&1 || true
    printf '%s' "$v" | npx vercel env add "$key" "$target" >/dev/null
  done
  echo "set    $key (production, preview)"
done
echo "Done. Redeploy for the values to take effect: npx vercel deploy --prod"
