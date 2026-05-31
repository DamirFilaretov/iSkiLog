#!/bin/sh
set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export HOMEBREW_NO_AUTO_UPDATE=1

if ! command -v node >/dev/null 2>&1; then
    brew install node
fi

echo "Node: $(node --version)"
echo "npm: $(npm --version)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Working dir: $(pwd)"

npm install
npm run build
npx cap copy ios
