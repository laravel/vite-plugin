#!/bin/bash
set -euo pipefail

REPO="laravel/vite-plugin"
BRANCH="3.x"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "Error: must be on $BRANCH branch (current: $CURRENT_BRANCH)" >&2
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "Error: working tree is not clean. Commit or stash changes before releasing." >&2
    git status --porcelain
    exit 1
fi

git pull

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "Current version: $CURRENT_VERSION"
echo ""

echo "Select version bump type:"
echo "1) patch (bug fixes)"
echo "2) minor (new features)"
echo "3) major (breaking changes)"
echo

read -p "Enter your choice (1-3): " choice

case $choice in
    1) RELEASE_TYPE="patch" ;;
    2) RELEASE_TYPE="minor" ;;
    3) RELEASE_TYPE="major" ;;
    *)
        echo "Invalid choice. Exiting." >&2
        exit 1
        ;;
esac

npm version "$RELEASE_TYPE" --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
TAG="v$NEW_VERSION"

rm -rf package-lock.json
echo "Updating lock file..."
npm install
echo ""

echo "Verifying build..."
npm run build
echo ""

git add package.json
git commit -m "$TAG"
git tag -a "$TAG" -m "$TAG"
git push
git push --tags

gh release create "$TAG" --generate-notes

echo ""
echo "Release $TAG completed successfully, publishing kicked off in CI."
echo "https://github.com/$REPO/releases/tag/$TAG"
