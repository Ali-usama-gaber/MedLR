#!/bin/sh
# Browser regression suites (Playwright). Build first: python3 ../build.py
cd "$(dirname "$0")"
for t in e2e perms life media.test ann.test ann2.test fileview.test forms.test acceptance.test smoke2 notif.test rail.test nav.test home.test formstate.test v2.test qa-perm.test qa-popup.test qa-crawl.test qa-data.test qa-forms.test; do
  out=$(NODE_PATH=$(npm root -g) node "$t.js" 2>&1); code=$?
  fails=$(printf '%s\n' "$out" | grep -c '^FAIL')
  printf '%-16s exit=%s  pass=%s  fail=%s  %s\n' "$t" "$code" "$(printf '%s\n' "$out" | grep -c '^PASS')" "$fails" "$(printf '%s\n' "$out" | grep -E 'ALL PASSED|FAILED|NO PAGE ERRORS|Error' | head -1)"
done
