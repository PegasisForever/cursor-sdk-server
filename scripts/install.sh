#!/usr/bin/env bash
set -euo pipefail

REPO="${CURSOR_SDK_SERVER_REPO:-PegasisForever/cursor-sdk-server}"
INSTALL_DIR="${CURSOR_SDK_SERVER_HOME:-$HOME/.local/share/cursor-sdk-server}"
BIN_DIR="${HOME}/.local/bin"
LAUNCHER="${BIN_DIR}/cursor-sdk-server"
VERSION="${1:-latest}"
NODE_VERSION="${CURSOR_SDK_SERVER_NODE_VERSION:-24.14.0}"
PORTABLE_NODE="${INSTALL_DIR}/node/bin/node"
PORTABLE_NPM="${INSTALL_DIR}/node/bin/npm"

for cmd in curl tar; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: ${cmd} is required" >&2
    exit 1
  fi
done

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$(dirname "$PORTABLE_NODE")"

cleanup() {
  if [ -n "${TMP_BUNDLE:-}" ] && [ -f "$TMP_BUNDLE" ]; then
    rm -f "$TMP_BUNDLE"
  fi
  if [ -n "${TMP_EXTRACT:-}" ] && [ -d "$TMP_EXTRACT" ]; then
    rm -rf "$TMP_EXTRACT"
  fi
  if [ -n "${TMP_NODE_ARCHIVE:-}" ] && [ -f "$TMP_NODE_ARCHIVE" ]; then
    rm -f "$TMP_NODE_ARCHIVE"
  fi
  if [ -n "${TMP_NODE_EXTRACT:-}" ] && [ -d "$TMP_NODE_EXTRACT" ]; then
    rm -rf "$TMP_NODE_EXTRACT"
  fi
}
trap cleanup EXIT

install_portable_node() {
  local url="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  TMP_NODE_ARCHIVE="$(mktemp)"
  TMP_NODE_EXTRACT="$(mktemp -d)"

  echo "Downloading portable Node.js v${NODE_VERSION} ..."
  curl -fsSL "$url" -o "$TMP_NODE_ARCHIVE"
  tar -xJf "$TMP_NODE_ARCHIVE" -C "$TMP_NODE_EXTRACT"

  rm -rf "${INSTALL_DIR}/node"
  mv "${TMP_NODE_EXTRACT}/node-v${NODE_VERSION}-linux-x64" "${INSTALL_DIR}/node"

  if ! "$PORTABLE_NODE" --version >/dev/null 2>&1; then
    echo "error: portable Node.js failed to run" >&2
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

install_portable_node

TMP_EXTRACT="$(mktemp -d)"
tar -xzf "$BUNDLE" -C "$TMP_EXTRACT"

rm -rf "${INSTALL_DIR}/dist" "${INSTALL_DIR}/node_modules" "${INSTALL_DIR}/package.json" \
  "${INSTALL_DIR}/README.md" "${INSTALL_DIR}/SPEC.md"
cp -a "$TMP_EXTRACT"/* "$INSTALL_DIR/"

echo "Installing dependencies in ${INSTALL_DIR} ..."
(
  cd "$INSTALL_DIR"
  PATH="${INSTALL_DIR}/node/bin:${PATH:-/usr/bin:/bin}"
  "$PORTABLE_NPM" install --omit=dev
)

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec "${PORTABLE_NODE}" "${INSTALL_DIR}/dist/cli.js" "\$@"
EOF
chmod +x "$LAUNCHER"

echo ""
echo "Installed cursor-sdk-server"
echo "  App dir:        ${INSTALL_DIR}"
echo "  Portable Node:  ${PORTABLE_NODE}"
echo "  Launcher:       ${LAUNCHER}"
echo ""
echo "Ensure ${BIN_DIR} is in your PATH, then run:"
echo "  export CURSOR_API_KEY=\"cursor_...\""
echo "  cursor-sdk-server"
