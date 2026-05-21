#!/bin/bash
# Build trigger script - creates a release tag to start the build

VERSION=${1:-v1.0.0}

echo "🚀 Creating release tag: $VERSION"
git tag -a "$VERSION" -m "Release build $VERSION"
git push origin "$VERSION"

echo "✅ Build triggered! Check Actions tab in GitHub"
echo "📱 APK + IPA will be available in Releases in ~15-20 minutes"
