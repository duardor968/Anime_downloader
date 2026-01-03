#!/usr/bin/env bash
# AnimeHub SEA build script (Linux/macOS)
# - Reads version from package.json
# - Bundles with ncc
# - Generates SEA blob and injects into node binary

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_VERSION="$(node -p "require('./package.json').version")"
echo "=== AnimeHub SEA build - version ${APP_VERSION} ==="

echo "[1/7] Cleaning output folders..."
rm -rf dist release sea-prep.blob
mkdir -p release

echo "[2/7] Generating asset manifest..."
npm run --silent generate:assets

echo "[3/7] Bundling with ncc..."
npx --yes @vercel/ncc build server.js -o dist --quiet

echo "[4/7] Generating SEA blob..."
node scripts/build-sea-config.js
node --experimental-sea-config sea-config.generated.json

echo "[5/7] Copying Node binary..."
NODE_BIN="${NODE_BIN:-$(node -p "process.execPath")}"
if [ ! -f "$NODE_BIN" ]; then
  echo "Node binary not found. Set NODE_BIN or install Node.js." >&2
  exit 1
fi
cp "$NODE_BIN" "release/AnimeHub-v${APP_VERSION}-linux"

echo "[6/7] Injecting SEA blob..."
npx --yes postject "release/AnimeHub-v${APP_VERSION}-linux" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite

echo "[7/7] Cleaning temporary files..."
rm -f sea-prep.blob
rm -f sea-config.generated.json

echo "Done. Executable: release/AnimeHub-v${APP_VERSION}-linux"
