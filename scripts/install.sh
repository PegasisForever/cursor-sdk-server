#!/usr/bin/env bash
set -euo pipefail

REPO="${CURSOR_SDK_SERVER_REPO:-PegasisForever/cursor-sdk-server}"
INSTALL_DIR="${CURSOR_SDK_SERVER_HOME:-$HOME/.local/share/cursor-sdk-server}"
BIN_DIR="${HOME}/.local/bin"
LAUNCHER="${BIN_DIR}/cursor-sdk-server"
VERSION="${1:-latest}"
BUN_VERSION="${CURSOR_SDK_SERVER_BUN_VERSION:-1.3.14}"
PORTABLE_BUN="${INSTALL_DIR}/bun/bin/bun"

for cmd in curl unzip; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: ${cmd} is required" >&2
    exit 1
  fi
done

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$(dirname "$PORTABLE_BUN")"

cleanup() {
  if [ -n "${TMP_BUNDLE:-}" ] && [ -f "$TMP_BUNDLE" ]; then
    rm -f "$TMP_BUNDLE"
  fi
  if [ -n "${TMP_EXTRACT:-}" ] && [ -d "$TMP_EXTRACT" ]; then
    rm -rf "$TMP_EXTRACT"
  fi
  if [ -n "${TMP_BUN_ZIP:-}" ] && [ -f "$TMP_BUN_ZIP" ]; then
    rm -f "$TMP_BUN_ZIP"
  fi
  if [ -n "${TMP_BUN_EXTRACT:-}" ] && [ -d "$TMP_BUN_EXTRACT" ]; then
    rm -rf "$TMP_BUN_EXTRACT"
  fi
}
trap cleanup EXIT

install_portable_bun() {
  local url="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip"
  TMP_BUN_ZIP="$(mktemp)"
  TMP_BUN_EXTRACT="$(mktemp -d)"

  echo "Downloading portable Bun v${BUN_VERSION} ..."
  curl -fsSL "$url" -o "$TMP_BUN_ZIP"
  unzip -qo "$TMP_BUN_ZIP" -d "$TMP_BUN_EXTRACT"
  install -m 755 "${TMP_BUN_EXTRACT}/bun-linux-x64/bun" "$PORTABLE_BUN"
  ln -sf bun "$(dirname "$PORTABLE_BUN")/node"

  if ! "$PORTABLE_BUN" --version >/dev/null 2>&1; then
    echo "error: portable Bun failed to run" >&2
    exit 1
  fi
}

if [ -n "${CURSOR_SDK_SERVER_BUNDLE:-}" ]; then
  BUNDLE="$CURSOR_SDK_SERVER_BUNDLE"
else
  if [ "$VERSION" = "latest" ]; then
    URL="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
      | grep -o '"browser_download_url": "[^"]*cursor-sdk-server-linux-x64-[^"]*\.tar\.gz"' \
      | head -1 \
      | cut -d'"' -f4)"
    if [ -z "$URL" ]; then
      echo "error: could not find release bundle URL for ${REPO}" >&2
      exit 1
    fi
  else
    VERSION="${VERSION#v}"
    URL="https://github.com/${REPO}/releases/download/v${VERSION}/cursor-sdk-server-linux-x64-${VERSION}.tar.gz"
  fi

  TMP_BUNDLE="$(mktemp)"
  echo "Downloading ${URL} ..."
  curl -fsSL "$URL" -o "$TMP_BUNDLE"
  BUNDLE="$TMP_BUNDLE"
fi

install_portable_bun

TMP_EXTRACT="$(mktemp -d)"
tar -xzf "$BUNDLE" -C "$TMP_EXTRACT"

rm -rf "${INSTALL_DIR}/dist" "${INSTALL_DIR}/node_modules" "${INSTALL_DIR}/package.json" \
  "${INSTALL_DIR}/README.md" "${INSTALL_DIR}/SPEC.md"
cp -a "$TMP_EXTRACT"/* "$INSTALL_DIR/"

echo "Installing dependencies in ${INSTALL_DIR} ..."
(
  cd "$INSTALL_DIR"
  PATH="$(dirname "$PORTABLE_BUN"):${PATH:-/usr/bin:/bin}"
  "$PORTABLE_BUN" install --production
)

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec "${PORTABLE_BUN}" "${INSTALL_DIR}/dist/cli.js" "\$@"
EOF
chmod +x "$LAUNCHER"

echo ""
echo "Installed cursor-sdk-server"
echo "  App dir:      ${INSTALL_DIR}"
echo "  Portable Bun: ${PORTABLE_BUN}"
echo "  Launcher:     ${LAUNCHER}"
echo ""
echo "Ensure ${BIN_DIR} is in your PATH, then run:"
echo "  export CURSOR_API_KEY=\"cursor_...\""
echo "  cursor-sdk-server"
