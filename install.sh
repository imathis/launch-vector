#!/bin/sh
# Install the latest vector CLI from GitHub Releases.
#
#   curl -fsSL https://raw.githubusercontent.com/imathis/launch-vector/master/install.sh | sh
#
# VECTOR_INSTALL_DIR overrides the destination (default: ~/.local/bin).
# GITHUB_TOKEN or a `gh auth login` session is used for private releases.
set -eu

repo="imathis/launch-vector"
dir="${VECTOR_INSTALL_DIR:-$HOME/.local/bin}"

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) echo "vector: unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=amd64 ;;
  *) echo "vector: unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac
asset="vector_${os}_${arch}.tar.gz"

token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [ -z "$token" ] && command -v gh >/dev/null 2>&1; then
  token="$(gh auth token 2>/dev/null || true)"
fi

api() {
  if [ -n "$token" ]; then
    curl -fsSL -H "Authorization: Bearer $token" "$@"
  else
    curl -fsSL "$@"
  fi
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

api -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$repo/releases/latest" >"$work/release.json"

# Print the API download URL for a named release asset.
asset_url() {
  tr ',' '\n' <"$work/release.json" |
    grep -E '"(url|name)"' |
    grep -B1 "\"name\": *\"$1\"" |
    sed -n 's/.*"url": *"\([^"]*\)".*/\1/p' |
    head -n 1
}

for name in "$asset" checksums.txt; do
  url="$(asset_url "$name")"
  if [ -z "$url" ]; then
    echo "vector: the latest release has no $name" >&2
    exit 1
  fi
  api -H "Accept: application/octet-stream" -o "$work/$name" "$url"
done

expected="$(grep " $asset\$" "$work/checksums.txt" | cut -d' ' -f1)"
if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$work/$asset" | cut -d' ' -f1)"
else
  actual="$(shasum -a 256 "$work/$asset" | cut -d' ' -f1)"
fi
if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
  echo "vector: checksum mismatch for $asset" >&2
  exit 1
fi

tar -xzf "$work/$asset" -C "$work" vector
mkdir -p "$dir"
mv "$work/vector" "$dir/vector"
chmod 755 "$dir/vector"

echo "Installed $("$dir/vector" version) to $dir/vector"
case ":$PATH:" in
  *":$dir:"*) ;;
  *) echo "Add $dir to your PATH, for example: echo 'export PATH=\"$dir:\$PATH\"' >> ~/.zshrc" ;;
esac
echo "Next: vector new my-apps && cd my-apps && vector setup && vector up"
