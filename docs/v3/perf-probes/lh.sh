#!/bin/bash
# Interleaved Lighthouse runs: lh.sh <label:url> <label:url> ... ; env RUNS (mobile), DRUNS (desktop), PATHS
S="${LH_OUT:-.lighthouse}"
mkdir -p "$S"
export CHROME_PATH="$LOCALAPPDATA/ms-playwright/chromium-1248/chrome-win64/chrome.exe"
RUNS=${RUNS:-5}; DRUNS=${DRUNS:-3}; PATHS=${PATHS:-"/ /services /portfolio"}
for p in $PATHS; do
  for i in $(seq 1 $RUNS); do
    for t in "$@"; do
      label=${t%%:*}; url=${t#*:}
      out="$S/${label}-m-$(echo $p | tr / _)-$i.json"
      npx --no-install lighthouse "$url$p" --only-categories=performance --throttling-method=devtools --output=json --output-path="$out" --quiet --chrome-flags="--headless=new" >/dev/null 2>&1
    done
  done
  for i in $(seq 1 $DRUNS); do
    for t in "$@"; do
      label=${t%%:*}; url=${t#*:}
      out="$S/${label}-d-$(echo $p | tr / _)-$i.json"
      npx --no-install lighthouse "$url$p" --only-categories=performance --throttling-method=devtools --preset=desktop --output=json --output-path="$out" --quiet --chrome-flags="--headless=new" >/dev/null 2>&1
    done
  done
done
node - "$S" <<'EOF'
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
const rows = {};
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const [label, form, page] = f.replace(/-\d+\.json$/, "").split("-");
  const j = JSON.parse(fs.readFileSync(path.join(dir, f)));
  const k = `${label} ${form === "m" ? "mobile" : "desktop"} ${page.replace(/_/g, "/")}`;
  (rows[k] ??= []).push({ score: Math.round(j.categories.performance.score * 100), lcp: Math.round(j.audits["largest-contentful-paint"].numericValue), tbt: Math.round(j.audits["total-blocking-time"].numericValue), fcp: Math.round(j.audits["first-contentful-paint"].numericValue) });
}
const med = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
for (const [k, v] of Object.entries(rows).sort()) console.log(k.padEnd(28), `n=${v.length}`, `score ${med(v.map((x) => x.score))}`, `FCP ${med(v.map((x) => x.fcp))}`, `LCP ${med(v.map((x) => x.lcp))}`, `TBT ${med(v.map((x) => x.tbt))}`, " all:", v.map((x) => x.score).join(","));
EOF
