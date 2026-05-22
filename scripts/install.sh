#!/usr/bin/env bash
set -euo pipefail

REPO="${CURSOR_SDK_SERVER_REPO:-PegasisForever/cursor-sdk-server}"
INSTALL_DIR="${CURSOR_SDK_SERVER_HOME:-$HOME/.local/share/cursor-sdk-server}"
BIN_DIR="${HOME}/.local/bin"
LAUNCHER="${BIN_DIR}/cursor-sdk-server"
VERSION="${1:-latest}"

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required. Install from https://bun.sh" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$BIN_DIR"

cleanup() {
  if [ -n "${TMP_BUNDLE:-}" ] && [ -f "$TMP_BUNDLE" ]; then
    rm -f "$TMP_BUNDLE"
  fi
  if [ -n "${TMP_EXTRACT:-}" ] && [ -d "$TMP_EXTRACT" ]; then
    rm -rf "$TMP_EXTRACT"
  fi
}
trap cleanup EXIT

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

TMP_EXTRACT="$(mktemp -d)"
tar -xzf "$BUNDLE" -C "$TMP_EXTRACT"

rm -rf "${INSTALL_DIR:?}"/*
cp -a "$TMP_EXTRACT"/* "$INSTALL_DIR/"

echo "Installing dependencies in ${INSTALL_DIR} ..."
(cd "$INSTALL_DIR" && bun install --production)

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec bun "${INSTALL_DIR}/dist/cli.js" "\$@"
EOF
chmod +x "$LAUNCHER"

echo ""
echo "Installed cursor-sdk-server"
echo "  App dir:  ${INSTALL_DIR}"
echo "  Launcher: ${LAUNCHER}"
echo ""
echo "Ensure ${BIN_DIR} is in your PATH, then run:"
echo "  export CURSOR_API_KEY=\"cursor_...\""
echo "  cursor-sdk-server"
