---
name: push-test-image
description: Build the combined Docker image and push it to walefish/volle-lotte on Docker Hub with a unique candidate tag (mobile-<short-sha>) for manual deployment to the test Portainer stack.
argument-hint: '[--tag <tag>] [--no-build]'
---

Run `.claude/skills/push-test-image/scripts/push.sh $ARGUMENTS` from the repo root and report the pushed tag and digest.

- Credentials come from `~/.config/volle-lotte/docker` (`DOCKER_HUB_USERNAME`, `DOCKER_HUB_TOKEN`, chmod 600). Never print or read the token.
- The script logs in with its own `DOCKER_CONFIG` (`~/.config/volle-lotte/docker.d`), so the Docker Desktop work login is untouched.
- It refuses `latest`, semver tags, existing remote tags and a dirty working tree.
- Afterwards tell the user to set the tag in the test Portainer stack (`https://test.volle-lotte.allwang.family/m/`); never deploy to production.
