#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/package.json').version")"
STAGING="$ROOT/.release/staging"
OUT_DIR="$ROOT/.release"
OUT="$OUT_DIR/cursor-sdk-server-linux-x64-${VERSION}.tar.gz"

rm -rf "$STAGING" "$OUT"
mkdir -p "$STAGING" "$OUT_DIR"

cd "$ROOT"
npm run build

node <<EOF
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("${ROOT}/package.json", "utf8"));
delete pkg.scripts.prepare;
delete pkg.scripts.build;
delete pkg.scripts["build:bundle"];
delete pkg.scripts.test;
delete pkg.devDependencies;
pkg.scripts = { start: "node dist/cli.js" };
fs.writeFileSync("${STAGING}/package.json", JSON.stringify(pkg, null, 2) + "\n");
EOF

cp -r dist README.md SPEC.md "$STAGING/"
if [ -f package-lock.json ]; then
  cp package-lock.json "$STAGING/"
fi

tar -czf "$OUT" -C "$STAGING" .
echo "Created $OUT"
