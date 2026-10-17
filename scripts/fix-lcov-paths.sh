#!/usr/bin/env bash
# Jest writes lcov paths relative to the project (`SF:src/...`); Sonar resolves them from the repo
# root, so prefix each Jest project's report with its directory.
for f in apps/*/test-output/jest/coverage/lcov.info libs/*/test-output/jest/coverage/lcov.info; do
  [ -f "$f" ] || continue
  sed -i -E "s#^SF:src/#SF:${f%%/test-output/*}/src/#" "$f"
done
