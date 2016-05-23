#!/bin/bash

versionString=$(cat VERSION)
version=(${versionString//./ })

if [ $((${version[2]} & 1)) -eq 1 ]; then
  # odd DEV version number
  echo "This version has an odd DEV version part and will not be released"
  export DEPLOY=no
  exit 0
fi
export DEPLOY=yes

git config --global user.email "buildbot@travis-ci.org"
git config --global user.name "Travis CI"
export RELEASE_VERSION="$versionString-$TRAVIS_BUILD_NUMBER"
echo Version $RELEASE_VERSION
git tag -fa -m $RELEASE_VERSION $RELEASE_VERSION
git push -qf --tags https://$GITHUB_USER:$GITHUB_API_KEY@github.com/$GITHUB_USER/$GITHUB_REPO master
