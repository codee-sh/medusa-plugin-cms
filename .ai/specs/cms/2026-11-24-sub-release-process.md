# Release Process and First Public Release

**Date:** 2026-11-24
**Status:** review
**Area:** tooling
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-package-name-and-readme](./2026-11-24-sub-package-name-and-readme.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-24-sub-release-process.md`

## TLDR

The release tooling this plugin shares with the other Codee plugins has defects that show in every
release: PRs get no labels, two files define the release-note categories, the tag is made by hand and
by a workflow, the first release would end in "No merged pull requests found", and publication runs
from a laptop with a token in `.env`. This sub-spec replaces it with Medusa's way of releasing: a
release PR that `changesets/action` keeps on `develop` while changesets are pending, whose merge
publishes to npm through trusted publishing and creates the tag and the GitHub release. It then makes
the first public release from a new folder and a new public repository: one clean base commit, the
whole plugin in PR #1 with one changeset written as the release's story, the release PR it opens, and
`0.1.0` on npm with a full release note.

The order is the user's (2026-11-24): this plugin first, through its first release; then the
`codee-medusa-plugin-delivery` skill in codee-skills, from what worked here; then the
notification-emails plugin, only after this plugin's release. Every Codee plugin ends with the same
process.

## Decisions

- **Release flow: Medusa's** (user, 2026-11-25). `changesets/action` versions on `develop` in a release
  PR, and its merge publishes to npm through trusted publishing (OIDC). No release branch, no `main`, no
  `prepare-release` or `publish-package`. Chosen for this plugin; notification-emails follows in Phase 4.
- **The release PR stays open while changesets are pending** (user, 2026-11-25). The action's default:
  every push to `develop` with a changeset opens or rewrites the one release PR, which previews the next
  version; the maintainer merges it when the release is wanted. No manual trigger.
- **`.ai/` in the public repository: specs and lessons, not notes** (user, 2026-11-25). Specs,
  `lessons/`, `lessons.md` and the configuration go public; `.ai/notes/` is untracked, gitignored and
  stays local. Six active and four ended specs, `AGENTS.md` and `CODE_REVIEW.md` link lessons, and
  `ended/` cannot be edited, so lessons cannot stay behind.
- **Changelog with PR links** (user, 2026-11-25): `@changesets/changelog-github`, as Medusa uses, from
  the first release on.
- **Changesets belong to the release, not the docs** (user, 2026-11-25). `codee-medusa-plugin-docs` covers
  the README, `docs/` and the listing; the text of a changeset and merging changesets for a release move
  to `codee-medusa-plugin-delivery`, `references/changesets.md` (P2.4), before Phase 3 writes the release
  changeset.
- **A new folder and one clean commit, no rebuilt history** (user, 2026-11-25). The public repository
  starts in a new folder `medusa-plugin-cms` beside this one, from a copy of the working files without
  `.git`, `.ai/notes/` or the pending changesets; this folder stays as the private archive. The number
  of commits does not matter; what matters is a real PR and a full release note. So `develop` starts
  with one base commit, and the plugin arrives through PR #1, whose changeset becomes the `0.1.0`
  release note.
- **No other CMS or commerce product named in the public repository** (user, 2026-11-25). The
  analyses move to `.ai/specs/references/local/`, gitignored; `.ai/specs/references/` stays tracked for
  references that may be public. The `AGENTS.md` rule asks for the common CMS shape and points at the
  local folder; code comments, active specs and, as a one-time exception approved by the user, the
  specs in `ended/` say the plugin's own reason without a product's name. The originals stay in the
  private archive folder.
- **The first version is `0.1.0`** (user, 2026-11-25): the contract still moves, and 0.x says so. Until
  1.0 a breaking change is a minor, which "Plugin Contract" in AGENTS.md states.
- **The release note is the version's CHANGELOG section** (agent, from the flow above). The action
  creates the GitHub release with it; the changeset is written for the reader (the changeset rules of
  `codee-medusa-plugin-delivery`), and changelog-github links each entry's PR, commit and author. Labels
  sort PRs on GitHub; they no longer build release notes, so `.github/release.yml` goes.

## Problem

Evidence from this repository and from notification-emails, whose `.github/` files are identical:

- `.github/labeler.yml` matches on `title:` and `head:`; `actions/labeler@v5` reads `head-branch`,
  `base-branch` and `changed-files`. notification-emails PRs #24 and #25 carry no label, and release
  v1.1.0 lists its PR under "Other Changes".
- `.github/release.yml` defines the categories for GitHub's generated notes, which nothing uses;
  `release-on-merge.yml` categorises PRs again in its own script.
- `SDLC.md` step 2 and `scripts/prepare-release.sh` tell the maintainer to tag `main`; the workflow
  tags it too.
- With no earlier tag the workflow compares against `HEAD~50`; in a repository of a few commits the
  comparison fails and the notes end in "No merged pull requests found for this release."
- `scripts/create-pr.sh` titles a PR with the branch name when `PR_TITLE` is unset
  (notification-emails #20, `feat/normalize-extend-config`).
- The release workflow runs Node 20 (`engines` asks `>=22.22.0`, CI runs 22), installs dependencies it
  does not use, and keeps a commented-out `npm publish --access restricted`.
- `.changeset/config.json` has `baseBranch: "main"`; changesets are written on `develop`.
- Publication needs `NPM_TOKEN` in `.env` on the maintainer's machine and a stopped `yarn dev`.
- This repository's history names the first host in the diffs of 10 commits; the current tree is clean.
  It cannot be pushed to a public repository as it is.

## Current State and Evidence

- `SDLC.md`, "Release" - `yarn prepare-release` versions on `develop`, branches `release/v<version>`,
  PR into `main`, tag, merge back, `yarn publish-package` by hand.
- `.github/workflows/release-on-merge.yml` - on a merged `release:` PR into `main`: tag, then a GitHub
  release whose body is the version's `CHANGELOG.md` section plus PRs sorted by label.
- `.github/workflows/ci.yml` - the gate on PRs into `develop` and `main`. `pr-labeler.yml` runs
  `actions/labeler@v5` with `sync-labels`; `labeler.yml`, `release.yml`, `PULL_REQUEST_TEMPLATE.md` as
  described under "Problem".
- `scripts/publish-package.sh` - checks `main`, a clean tree and the tag, reads `NPM_TOKEN`, runs
  `npm publish --access public`; `.npmrc` holds only `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`.
- `package.json` - version `0.0.1`; scripts `prepare-release`, `publish-package`, `pr:create`;
  `prepublishOnly` runs `medusa plugin:build`; `@changesets/cli` ^2.29.8 (2.31.1 installed).
- `.changeset/` - 17 pending changesets, one per feature step, written before any release.
- `.ai/agentic.config.json` - `baseBranch: "main"`. `.ai/notes/` - one tracked topic.
- `AGENTS.md`, "Plugin Contract" - an additive change is a minor, anything else a major.
- `git log` - `develop` 345 commits, `main` 11 and stale since 2026-11-09; no tag; no remote.
- `codee-medusa-plugin-delivery`, `references/github.md` and `references/release-tooling.md` - the
  source these files were written from, defects included.
- notification-emails - Yarn 3.2.3, no CI workflow, no `SDLC.md`, `.changeset/config.json`
  `"access": "restricted"`, `publish-package` as `dotenv npm publish`; released v1.0.0 to v1.1.0.

How Medusa releases (medusajs/medusa, checked 2026-11-24 and 2026-11-25 with read-only `gh` and
`npm view`):

- `.changeset/config.json` - `@changesets/changelog-github`, `baseBranch: "develop"`. Changesets are
  mostly one line, the PR's conventional-commit title; a breaking one adds the migration.
- `.github/workflows/trigger-release.yml` - on every push to `develop`, `changesets/action@v1` with
  `title`/`commit` "Chore: Release" keeps the release PR open; its merge runs `changeset publish`.
  `id-token: write`; `.github/actions/setup-release` sets up Node 22 and installs npm 11.5.1 "for OIDC".
  No `NPM_TOKEN`; `npm view @medusajs/medusa@2.23.0 dist.attestations` shows SLSA provenance. It turns
  `createGithubReleases` off and drafts the notes in a separate workflow.
- `.github/labeler.yml` - `actions/labeler@v5` mapping branch prefixes to `type: feature`, `type: bug`,
  `type: chore`, `type: docs`.
- Release notes - title `vX.Y.Z: Highlight, Highlight`; Highlights, then sections by label; written by
  a model in CI.
- `.github/pull_request_template.md` - What, Why, How, Testing, and a changeset checkbox.

The tools (read 2026-11-25):

- `@changesets/changelog-github` 1.0.1 (`npm pack`) - throws without a `repo` option (or
  `GITHUB_REPOSITORY`); takes `GITHUB_TOKEN` from the environment or from `.env`, and throws without one.
  It looks each changeset's commit up on GitHub for the commit, PR and author links. An entry reads
  ``- [#12](…/pull/12) [`a1b2c3d`](…/commit/…) Thanks [@login](…)! - <summary>``.
- `changesets/action` v2 (v2.1.2) and [changesets.dev/guide/automating](https://changesets.dev/guide/automating)
  - for trusted publishing the guide's workflow splits four jobs: `select-mode` (`version`, `publish` or
  `none`), `version` (`contents` and `pull-requests: write`), `pack` (build, read-only) and `publish`
  (`contents: write`, `id-token: write`), with `permissions: {}` at the top, `concurrency`, and
  `persist-credentials: false`. `version` takes `pr-title` and `commit-message`; `publish` creates tags
  and GitHub releases by default. The repository setting "Allow GitHub Actions to create and approve
  pull requests" must be on. PRs the action opens do not trigger other workflows.
- `@changesets/cli` 2.31.1 - `changeset publish` runs `npm publish` for any package manager but pnpm; a
  single-package repository gets the tag `v<version>`.
- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers) - npm 11.5.1 or later and Node
  22.14.0 or later; provenance is automatic from a public repository; the publisher is configured on
  the package's settings page with owner, repository and the workflow's exact filename, and
  `repository.url` in `package.json` must match; "A newly created trusted publisher configuration must
  complete its first successful publish within 2 days." The first version cannot be published through
  OIDC: the settings page needs an existing package
  ([npm/cli#8544](https://github.com/npm/cli/issues/8544), "not to have 'first publish' available").

## Target Behavior

- A PR's title is a conventional commit, never a branch name; its label comes from its branch prefix.
- While `develop` has changesets, one open PR "chore: release" shows the next version, the
  `CHANGELOG.md` section and the consumed changesets. Its merge publishes the version to npm with
  provenance, tags `v<version>` and creates the GitHub release `v<version>` whose body is that section.
- Nobody tags, versions or publishes by hand, beyond the placeholder `0.0.1`, and no npm token exists.
- The public repository holds no commit of this history and nothing naming a client. Its `develop`
  starts with a base commit; PR #1 brings the plugin, labelled `type: feature`, with a full
  description and CI; its merge opens the release PR for `0.1.0`, and the release `v0.1.0` reads as the
  plugin's introduction, linking PR #1.
- The same files and steps go into `codee-medusa-plugin-delivery`, then into notification-emails.

## Proposed Solution

### Release workflow

`.github/workflows/release.yml`, on push to `develop`, three jobs (the guide's four, `pack` folded into
`publish` after the first run: Changesets publishes a Yarn project with `yarn npm publish`, which takes
no packed tarball; Yarn 4 exchanges the OIDC token with npm itself and signs provenance from
`publishConfig.provenance`, so npm needs no upgrade):

- every job: Node 24 (user, 2026-11-25: the version the maintainer develops on), `corepack enable`, `yarn install --immutable`, `persist-credentials: false`;
  `permissions: {}` at the top and `concurrency` on the workflow and ref.
- `select-mode` - `changesets/action/select-mode@v2`.
- `version` - when the mode is `version`: `changesets/action/version@v2` with `pr-title` and
  `commit-message` "chore: release", and `GITHUB_TOKEN` from `secrets.GITHUB_TOKEN` in the step's env
  for changelog-github.
- `publish` - when the mode is `publish`: `yarn build`, then `changesets/action/publish@v2`, which
  publishes with `yarn npm publish`, tags and creates the GitHub release.

The filename `release.yml` is what the npm trusted publisher names; renaming the workflow breaks
publication.

### Changesets

`.changeset/config.json`: `"changelog": ["@changesets/changelog-github", { "repo":
"codee-sh/medusa-plugin-cms" }]`, `"baseBranch": "develop"`; `@changesets/changelog-github` in
`devDependencies`. A maintainer who runs `changeset version` locally needs `GITHUB_TOKEN`; the flow
never asks for it.

### PRs

- `labeler.yml` on `head-branch`: `^feat` → `type: feature`, `^fix` → `type: bug`, `^refactor`,
  `^chore`, `^deps`, `^changeset-release` → `type: chore`, `^docs` → `type: docs`, `^breaking` →
  `type: breaking`. The step name in `pr-labeler.yml` says "branch", not "title".
- `yarn pr:create` takes the branch's first commit subject as the title when `PR_TITLE` is unset.
- PR template: What, Why, How, Testing; checkboxes for a changeset (or why none) and the gate.
- `ci.yml` on PRs into `develop` only, on Node 22 and 24 (user, 2026-11-25): 22 the lowest `engines`
  allows, 24 the current LTS; `fail-fast: false`, so a failure on one still reports the other.

### Removed

`scripts/prepare-release.sh`, `scripts/publish-package.sh`, `.npmrc`, `.github/workflows/release-on-merge.yml`,
`.github/release.yml`, and the `prepare-release` and `publish-package` scripts. `prepublishOnly` stays,
so a hand publish still builds.

### Documents

- `SDLC.md` - branches: `develop` and topic branches; the release: the release PR, its merge, and what
  the maintainer checks in it; the first-release exception below.
- `AGENTS.md` - "Plugin Contract": below 1.0 a breaking change is a minor and its changeset says so; the
  rules on who publishes; the Skill Router's "changeset text" moves from the `codee-medusa-plugin-docs`
  row to the `codee-medusa-plugin-delivery` row. `CONTRIBUTING.md` where it names the old steps.
- `.ai/agentic.config.json` - `baseBranch: "develop"`.

### The new folder

`../medusa-plugin-cms`, beside this folder:

- the files `git ls-files -co --exclude-standard` lists here - tracked and untracked, without what
  `.gitignore` excludes - so uncommitted work comes along as it is; without `.ai/notes/` and the 17
  pending `.changeset/*.md` (`config.json` and `README.md` stay);
- local only, copied beside them: `.env`, `.ai/notes/` (added to `.gitignore`), the installed skills
  (`.agents/` and the `.claude/skills` links, or a reinstall from `skills-lock.json`);
- `git init -b develop`; no remote until the push. Local commits there are the user's choice; none of
  them reaches GitHub, as the push sends the two branches built below.

This folder stays as it is: the private archive with the whole history. Work moves to the new folder
once the user runs `yarn dev` there; the pending changesets are read from here when the release
changeset is written.

### The first release

**The repository.** The user creates `codee-sh/medusa-plugin-cms` (public, empty), sets `develop` as
the default branch, turns on "Allow GitHub Actions to create and approve pull requests", and sets the
description and topics from `sub-package-name-and-readme`.

**The base commit.** `develop` starts with one commit, "chore: initial commit": `.gitignore`, `LICENSE`
and a `README.md` holding the package's name and one-line description. It holds no workflow, so its
push runs nothing.

**PR #1.** A branch `feat/initial-release` from the base, one commit with the whole tree of the new
folder (`git commit-tree` of the folder's tree on the base), so local commits never leave the machine.
It carries the release changeset. Before the push the tree is searched for the first host's names, and
the user reads the result. The push sends `develop` and `feat/initial-release` only. The PR is opened
with a description from `codee-generate-pr-description` (What, Why, How, Testing), gets
`type: feature` from the labeler and runs CI. The user merges it.

**The release changeset.** One `minor` changeset in place of the 17, so `0.0.1` becomes `0.1.0`,
written as the plugin's introduction: a summary line, then lines indented under it -
`@changesets/changelog-github` keeps them in the entry - with what the plugin does, its features
grouped as nested bullets, how to install and configure it, and links to the README and `docs/`.
Its rules: `codee-medusa-plugin-delivery`, `references/changesets.md` (P2.4).

**The first version on npm, by hand** (user, 2026-11-25). npm cannot publish a package's first
version through OIDC, and a trusted publisher can be set only on a package that exists. The user
published `0.0.1` from the new folder with `npm publish --access public`, and deprecates it as a
placeholder. A version published by hand gets no tag and no GitHub release, so it is `0.0.1` and not
`0.1.0`: `changeset publish` would skip a `0.1.0` already on npm and leave the release note behind. The
workflow publishes through OIDC only; no npm token is stored anywhere.

**The release PR.** The merge of PR #1 opens "chore: release" with `0.1.0` and the CHANGELOG entry
linking PR #1, its commit and author. Right before its merge - npm expects a first publish within 2
days of configuring - the user adds the trusted publisher: `codee-sh`, `medusa-plugin-cms`,
`release.yml`. The merge publishes `0.1.0` with provenance, tags `v0.1.0` and creates the release
`v0.1.0` whose body is the entry.

### Alternatives Considered

- **Our release branch and `main`, published by the workflow on merge** - more scripts of our own; the
  version would run on a laptop with a GitHub token for changelog-github.
- **Publishing by hand** - keeps the token on a laptop and the tag in two places.
- **Release PR only on a manual trigger** - the user prefers the PR as a running preview.
- **Release notes sorted by label, or titled with highlights as Medusa's** - needs our own notes step
  next to the action; the CHANGELOG entry carries the story, written in its changeset.
- **Preview builds on npm** (Medusa's `snapshot`/`preview` tags) - yalc already serves the first host.
- **A GitHub App token so the release PR triggers CI** - one more secret for a PR that changes only the
  version, the changelog and the changesets.
- **Pushing the whole history** - names the first host in 10 commits. **A few rebuilt commits**, each a
  tree of this history - the user does not need them (2026-11-25). **The plugin in the base commit** -
  no PR, so the release note links no PR and nothing shows the change as reviewed.
- **Moving this folder** - the archive and the public repository would share one `.git`; one wrong push
  would publish the old history.

## Edge Cases and Failure Scenarios

- A push to `develop` without changesets: `select-mode` returns `publish` and `changeset publish` finds
  the version already on npm, or `none`; nothing is published.
- The release PR runs no CI, since the action opened it. When branch protection requires CI, the
  maintainer closes and reopens the PR, which runs it under their name.
- A changeset committed in a PR merged later: the action rewrites the release PR on that push.
- The trusted publisher's fields differ from the workflow, or `repository.url` from the repository: the
  publish fails with an authentication error and nothing is published; fix the field and re-run the job.
- The 2-day window lapses before the second release: the configuration is removed and added again.
- The trusted publisher is missing when the release PR is merged: the publish fails on authentication
  and nothing is published; the user adds it and re-runs the job.
- Something ignored by `.gitignore` is needed in the new folder: it was never in the repository, so it
  is copied by hand or regenerated (`yarn install`, `yarn build`).

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| The tree of PR #1 names the first host | high | public repo | Search the tree before its commit; push only after the user reads the result | none once searched |
| An old commit reaches GitHub | high | public repo | The new folder has its own `.git` without this history; the push names its two branches | none |
| The placeholder `0.0.1` is installed | low | npm | Deprecated with a message pointing to `0.1.0`, the version after it within hours | none once `0.1.0` is out |
| The workflow fails on its first real run | medium | release | The release PR is reviewed before the merge; a failed `publish` job is re-run, since `changeset publish` skips versions already on npm | a re-run |
| The release PR merges without CI | low | `develop` | It changes only the version, the changelog and changesets; close and reopen when CI is required | none |

**Rollout:** Phase 1 copies files; Phase 2 changes them; Phase 3 is the first push and release;
Phases 4 and 5 copy what worked.

**Rollback:** until the push everything is local; the old folder is untouched throughout. After the
first publish, a broken version is deprecated with `npm deprecate` and a patch released; npm does not
take a version back after 72 hours.

## Dependencies

- `sub-package-name-and-readme` - its Phase 1 runs in the new folder after Phase 1 here; the package's
  final name, `repository.url` and README before Phase 3.
- The user: `yarn install` and `yarn dev` in the new folder; creating the GitHub repository and its
  settings, the hand-published `0.0.1` and the trusted publisher; the merges.

## Acceptance Criteria

- [ ] The new folder holds this folder's working files without `.git`, `.ai/notes/` in the index or the
  17 changesets; the gate passes there and the first host works from it.
- [ ] A PR from a `feat/` branch gets `type: feature`; its title is its first commit's subject.
- [ ] The public repository's `develop` holds the base commit and the merge of PR #1; no commit names a
  client; PR #1 has its description, its label and a CI run.
- [ ] The merge of PR #1 opens one "chore: release" PR with `0.1.0`, the CHANGELOG entry and the removed
  changeset; a later push with a changeset rewrites it.
- [ ] The merge publishes `@codee-sh/medusa-plugin-cms@0.1.0`, tags `v0.1.0` and creates the release
  `v0.1.0`, whose body is the plugin's introduction linking PR #1.
- [ ] No npm token exists in the repository or its secrets; `0.1.0` is published through OIDC with
  provenance.
- [ ] The changeset rules live in `codee-medusa-plugin-delivery`; `codee-medusa-plugin-docs` no longer
  mentions changesets.
- [ ] `codee-medusa-plugin-delivery` produces the same files as this repository.
- [ ] notification-emails releases through the same process.

## Phasing

### Phase 1 - The new folder

**Goal:** `medusa-plugin-cms` beside this folder, with its own `.git`, where the work continues.

**Prerequisites:** none.

**Exit gate:** the file lists compared; the gate in the new folder; the first host's Admin served from
it.

### Phase 2 - The tooling

**Goal:** in the new folder, the release PR flow, the PR tooling and the documents; the changeset rules
in the delivery skill. `sub-package-name-and-readme` Phase 1 may run before or after it.

**Prerequisites:** Phase 1.

**Exit gate:** a YAML parse of every workflow and `labeler.yml`, `bash -n` on `create-pr.sh`, a search
that finds no `prepare-release`, `publish-package`, `release-on-merge` or `NPM_TOKEN` outside the frozen
archive and the token lines of "The first release", `yarn lessons:check`; the user reads `SDLC.md`.

### Phase 3 - The public repository and the first release

**Goal:** the base commit, `0.0.1` by hand, PR #1, the release PR and `0.1.0` on npm through OIDC with
its release note. Steps written when Phase 2 and `sub-package-name-and-readme` are done.

**Prerequisites:** Phase 2, `sub-package-name-and-readme`.

### Phase 4 - The delivery skill

**Goal:** `codee-medusa-plugin-delivery` writes what this repository ended with.

**Prerequisites:** Phase 3.

### Phase 5 - notification-emails

**Goal:** notification-emails aligned with the skill, Yarn 4 and CI included, and released through it.

**Prerequisites:** Phase 4.

## Implementation Plan

### Phase 1

- **P1.1 Copy.** Create `../medusa-plugin-cms`; copy the files of `git ls-files -co --exclude-standard`
  without `.ai/notes/` and `.changeset/*.md` other than `README.md`; copy `.env`, `.ai/notes/` and the
  installed skills; add `.ai/notes/` to `.gitignore`; `git init -b develop`. This folder is not touched.
  Verify: the new folder's `git ls-files -co --exclude-standard` equals this folder's list minus the
  excluded paths; `git status` there shows no `.ai/notes/` and no `.env`.
- **P1.2 Switch.** The user stops `yarn dev` here, runs `yarn install` and `yarn dev` in the new folder,
  and opens it as the editor's workspace. Verify: the gate passes in the new folder; a change saved
  there reaches the first host's Admin.

### Phase 2

- **P2.1 Changesets.** `.changeset/config.json` (changelog-github with the repo, `baseBranch:
  "develop"`), `@changesets/changelog-github@^1.0.1` in `devDependencies`; the user runs `yarn install`.
  Verify: the JSON parses; `yarn changeset status` runs.
- **P2.2 Release workflow.** Add `.github/workflows/release.yml` per "Release workflow", with the token
  lines of "The first release"; remove `release-on-merge.yml`, `.github/release.yml`,
  `scripts/prepare-release.sh`, `scripts/publish-package.sh`, `.npmrc`, and the two `package.json`
  scripts. Verify: YAML parse; the jobs' `if`, `needs` and outputs read against the guide's example; the
  search of the exit gate.
- **P2.3 PRs.** `labeler.yml` on `head-branch`, the step name in `pr-labeler.yml`, the PR template,
  `scripts/create-pr.sh`, `ci.yml` on `develop` with Node 22. Verify: YAML parse, `bash -n`, and the
  script's title expression run on a topic branch prints its first commit's subject (the script opens a
  real PR, so it is not run whole).
- **P2.4 Changeset rules into the delivery skill** (codee-skills). A pure `git mv` of
  `frameworks/medusa/codee-medusa-plugin-docs/references/changesets.md` to
  `codee-medusa-plugin-delivery/references/`, committed alone; then the edits: the docs skill's
  description, "When to use", reference table, steps and output lose changesets; the delivery skill's
  description gains "write the changeset" and its table the reference, and its pointer to the docs skill
  no longer names changesets; the catalog rows in `README.md` and the row in
  `agents-templates/medusa-plugin.md`; in the reference, how `@changesets/changelog-github` renders an
  entry (the summary line, the indented lines under it, nested bullets rather than headings) and the
  release changeset that introduces a plugin. The user reinstalls both skills in the new folder.
  Verify: a search of the docs skill for `changeset` finds nothing; each link in both `SKILL.md` files
  resolves.
- **P2.5 Documents.** `SDLC.md`, `AGENTS.md` ("Plugin Contract", who publishes, the Skill Router row),
  `CONTRIBUTING.md`, `.ai/agentic.config.json`. Verify: `yarn lessons:check`; the user reads `SDLC.md`.

## Short Tracker

- `done` - P1.1 (2026-11-25): 809 files copied, the lists compared equal; `.env`, `.ai/notes/` and the
  skills copied as local files; `git init -b develop`, no commit.
- `done` - P1.2 (2026-11-25): `yarn install` and `yarn dev` here, the gate passes, the first host is
  linked to this folder and works. Phase 1 done.
- `done` - P2.1, P2.2, P2.3, P2.5 (2026-11-25): changelog-github and `baseBranch: "develop"`;
  `release.yml` with the four jobs and the first-release token lines; the old scripts, `.npmrc`,
  `release-on-merge.yml` and `.github/release.yml` removed; labeler v7 on `head-branch`, the PR
  template, `create-pr.sh` titled from the first commit subject, CI on `develop` with checkout and
  setup-node v7; `SDLC.md`, `AGENTS.md` ("Plugin Contract" below 1.0, who publishes) and
  `agentic.config.json`. Every workflow parses, `bash -n` passes, `yarn lessons:check` passes; the
  `origin` remote points at `codee-sh/medusa-plugin-cms`, nothing pushed.
- `done` - P2.4 (2026-11-25): codee-skills `51a1d9e` moves `changesets.md` to the delivery skill
  alone, `1c07705` edits both skills, the catalog and the template for the release PR flow, pushed;
  both skills reinstalled here at `1c07705`, identical to codee-skills; the Skill Router row moved. The
  user's `yarn install` done. Phase 2 done.
- `in_progress` - Phase 3 (2026-11-25): PR #1 merged; the release run failed on `changesets/action` v2
  needing Changesets CLI v3 (PR #2, the CLI moved to v3); the release PR #3 merged; the publish failed as
  Yarn takes no packed tarball (PR #4, `pack` folded into `publish`, provenance through
  `publishConfig`); `0.1.0` then published with provenance, tagged and released - but without its build:
  Yarn reads `files: [".medusa/server"]` as 6 declaration files where npm takes the folder. PR #5:
  `".medusa/server/**"`, a pack check before publishing, and a patch changeset for `0.1.1`. Next: its
  release PR, then the user deprecates `0.1.0`. For Phase 4, the delivery skill: CLI v3, one publish
  job with Yarn, the `files` glob, the pack check.
- `done` - `0.1.1` (2026-11-25): the release PR #6 merged, `0.1.1` published with its build, tagged and
  released. The package then moves to `@mostrajs/cms` and the repository to `mostrajs/cms`
  ([sub-package-name-and-readme](./2026-11-24-sub-package-name-and-readme.md), Phase 4): the same
  placeholder and trusted publisher steps, for the new name.
