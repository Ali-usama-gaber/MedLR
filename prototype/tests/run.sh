#!/bin/sh
# Browser regression suites (Playwright). Build first: python3 ../build.py
cd "$(dirname "$0")"
for t in e2e perms life media.test ann.test ann2.test fileview.test forms.test acceptance.test smoke2; do
  printf '%-16s ' "$t"; NODE_PATH=$(npm root -g) node "$t.js" 2>&1 | grep -E "ALL PASSED|FAILED|NO PAGE ERRORS|Error" | head -1
done
