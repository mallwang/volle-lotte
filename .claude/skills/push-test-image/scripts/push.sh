#!/usr/bin/env bash
# Build and push a candidate image to walefish/volle-lotte with an immutable tag.
# Usage: push.sh [--tag <tag>] [--no-build]   (default tag: mobile-<short-sha>)
set -euo pipefail

CRED_FILE="${VOLLE_LOTTE_DOCKER_CREDENTIALS:-$HOME/.config/volle-lotte/docker}"
# Separate docker config so the work-profile login in Docker Desktop is never touched.
export DOCKER_CONFIG="${CRED_FILE}.d"
REPO="walefish/volle-lotte"

tag="" build=1
while [ $# -gt 0 ]; do
  case "$1" in
    --tag) tag="$2"; shift 2 ;;
    --no-build) build=0; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"
tag="${tag:-mobile-$(git rev-parse --short HEAD)}"

# Candidate images must never overwrite moving or release tags.
if [ "$tag" = latest ] || [[ "$tag" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  echo "refusing to push '$tag': use a unique candidate tag (e.g. mobile-<short-sha>)" >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is dirty; commit first so the tag matches the image content" >&2
  exit 1
fi

[ -r "$CRED_FILE" ] || { echo "missing credentials file: $CRED_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
source "$CRED_FILE"
: "${DOCKER_HUB_USERNAME:?not set in $CRED_FILE}" "${DOCKER_HUB_TOKEN:?not set in $CRED_FILE}"

mkdir -p "$DOCKER_CONFIG"; chmod 700 "$DOCKER_CONFIG"
printf '%s' "$DOCKER_HUB_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin >/dev/null

# Fail if the tag already exists remotely (immutable tags).
if docker manifest inspect "$REPO:$tag" >/dev/null 2>&1; then
  echo "tag $REPO:$tag already exists on Docker Hub; pick another" >&2
  exit 1
fi

[ "$build" = 1 ] && docker build -t "$REPO:$tag" .
docker push "$REPO:$tag"
docker logout >/dev/null
echo "pushed $REPO:$tag"
docker inspect --format '{{index .RepoDigests 0}}' "$REPO:$tag" 2>/dev/null || true
