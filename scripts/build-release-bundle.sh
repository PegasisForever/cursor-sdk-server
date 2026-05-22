#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(bun -e "console.log(JSON.parse(await Bun.file('$ROOT/package.json').text()).version)")"
STAGING="$ROOT/.release/staging"
OUT_DIR="$ROOT/.release"
OUT="$OUT_DIR/cursor-sdk-server-linux-x64-${VERSION}.tar.gz"

rm -rf "$STAGING" "$OUT"
mkdir -p "$STAGING" "$OUT_DIR"

cd "$ROOT"
bun run build

bun -e "
const pkg = JSON.parse(await Bun.file('$ROOT/package.json').text());
delete pkg.scripts.prepare;
delete pkg.scripts.build;
delete pkg.scripts['build:types'];
delete pkg.scripts['build:bundle'];
delete pkg.scripts.compile;
delete pkg.scripts.test;
delete pkg.devDependencies;
pkg.scripts = { start: 'bun dist/cli.js' };
await Bun.write('$STAGING/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

cp -r dist README.md SPEC.md "$STAGING/"

tar -czf "$OUT" -C "$STAGING" .
echo "Created $OUT"
