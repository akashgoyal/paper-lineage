#!/bin/sh
# Downloads the Knowledge Base papers (data/kb-core.json) from arXiv, 3 s apart as arXiv asks.
set -e
cd "$(dirname "$0")/.."
for id in $(node -e "console.log(require('./data/kb-core.json').join(' '))"); do
  out="data/kb/papers/$id.pdf"
  [ -s "$out" ] && continue
  curl -sfL "https://arxiv.org/pdf/$id" -o "$out" && echo "ok $id $(du -h "$out" | cut -f1)" || echo "FAIL $id"
  sleep 3
done
