# Releasing

Releases publish from GitHub Actions when a version tag is pushed. Nobody publishes from a laptop.

1. Open a PR that bumps the version: `npm version <patch|minor|major> --no-git-tag-version`, which changes `package.json` and `package-lock.json`. Bump `SDK_VERSION` in `src/version.ts` to match (a test fails if you don't). Merge it.
2. Tag the merge commit on `main` and push the tag:

   ```sh
   git checkout main && git pull --ff-only
   git tag v$(node -p "require('./package.json').version")
   git push origin --tags
   ```

3. The `Publish` workflow checks that the tag matches `package.json` and is on `main`, builds, typechecks, runs the tests and publishes. Each version gets npm provenance linking it to that commit and workflow run.

A tag that doesn't match `package.json`, or points at a commit that isn't on `main`, fails before anything is built.

## One-time setup

Publishing uses npm trusted publishing, so there is no token to store or rotate. On npmjs.com, in the `@restlessai/cli-sdk` package settings, add a trusted publisher for GitHub Actions with organization `restlesshq`, repository `cli-sdk` and workflow `publish.yml`. Once a release has gone through it, you can also set publishing access to require two-factor authentication and disallow tokens, which leaves this workflow as the only way to publish.

## Developing

Install with npm 11 (`npx npm@11 ci`): npm 10 crashes on `@oclif/core` being both a dev dependency and an optional peer.
