#!/bin/sh
# Publishes dist/ (built for HEAD's sha, plus anything in videos/publish/) to the gh-pages branch. The commit must be clean.
set -e
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "commit first"; exit 1; }
SHA=$(git rev-parse HEAD)
ORIGIN=$(git remote get-url origin)
node scripts/build.mjs --sha "$SHA"
touch dist/.nojekyll
[ -d videos/publish ] && cp videos/publish/* dist/ || true
T=$(mktemp -d)
cp -R dist/. "$T"
cd "$T"
git init -q -b gh-pages
git add -A
git -c user.name=Agatella -c user.email=Agatella@users.noreply.github.com commit -qm "deploy $SHA"
git push -qf "$ORIGIN" gh-pages
echo "deployed $SHA"
