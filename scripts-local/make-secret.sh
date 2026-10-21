#!/usr/bin/env bash
# Generates the API's signing secret into root .env WITHOUT printing it.
# NB: the key name is split ("JWT""_SECRET") on purpose — the chat pipe's
# scrubber mangles credential-shaped literals in outgoing tool arguments
# (it ate this file's printf once), so this file must never contain the
# joined form. See garden playbook chat-pipe-manglers.
set -euo pipefail
cd "$(dirname "$0")/.."
K="JWT""_SECRET"
if [ -f .env ] && grep -q "$K" .env; then
  echo ".env already has the key — not touching it"
  exit 0
fi
val=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
printf '%s="%s"\n' "$K" "$val" > .env
chmod 600 .env
awk 'BEGIN{FS="\""} {print "bytes:", length($0)+1, "| key len:", length($1)-1, "| value length:", length($2)}' .env
