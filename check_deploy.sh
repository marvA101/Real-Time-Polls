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
