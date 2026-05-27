#!/bin/bash

INPUT=$(cat)

if printf '%s\n' "$INPUT" | grep -Eq "(^|[[:space:]\"])(sudo[[:space:]]+rm|rm[[:space:]]+-[A-Za-z]*r[A-Za-z]*f|rm[[:space:]]+-[A-Za-z]*f[A-Za-z]*r)"; then
  echo "Dangerous command detected: refusing to run recursive force delete." >&2
  exit 2
fi
