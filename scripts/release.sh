#!/usr/bin/env bash
# Set the lockstep release version, then commit and tag it. Pushing the tag
# runs .github/workflows/release.yml, which publishes the CLI and the Lab.
set -euo pipefail

version="${1:?usage: scripts/release.sh <version>}"
version="${version#v}"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "release: version must look like 1.2.3" >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "release: commit or stash changes first" >&2
  exit 1
fi

VERSION="$version" bun -e '
const version = process.env.VERSION
const edit = async (path, change) => {
  const pkg = await Bun.file(path).json()
  change(pkg)
  await Bun.write(path, JSON.stringify(pkg, null, 2) + "\n")
}
await edit("package.json", (pkg) => { pkg.version = version })
await edit("packages/lab/package.json", (pkg) => { pkg.version = version })
await edit("starter/apps/lab/package.json", (pkg) => {
  pkg.dependencies["@launch-vector/lab"] = `^${version}`
})
'
bun install
go test ./...

git add package.json packages/lab/package.json starter/apps/lab/package.json bun.lock
git commit -m "chore: release v$version"
git tag "v$version"
echo "Tagged v$version. Publish with: git push origin HEAD v$version"
