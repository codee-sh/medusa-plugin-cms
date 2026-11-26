# Package Name, README and Listing

**Date:** 2026-11-24
**Status:** review
**Area:** tooling
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-collections-and-documents](./2026-11-04-sub-collections-and-documents.md) (1i, the README's content)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-24-sub-package-name-and-readme.md`

## TLDR

Before the first release to npm the plugin takes its final name, `@codee-sh/medusa-plugin-cms`
(user, 2026-11-24): "content-cms" says "content" twice, and the other Codee plugins are named
`medusa-plugin-<domain>`. The README goes to the shape of the notification-emails plugin, the most
recent among the Codee plugins: a short README that installs and registers the plugin and links to one
`docs/*.md` file per topic, instead of the 712 lines it has now. `package.json` gets the keywords Medusa
scrapes npm by and the ones a developer types into npm's search, and a description that npm, Medusa's
directory and the GitHub repository share. Nothing in the plugin's behaviour changes.

## Decisions

- **The folder too** (user, 2026-11-24; how, 2026-11-25). The folder, the package and the GitHub
  repository share the name `medusa-plugin-cms`. The folder is not moved: the public repository starts
  in a new folder `medusa-plugin-cms` beside this one, and this folder stays as the private archive
  ([sub-release-process](./2026-11-24-sub-release-process.md), Phase 1). Phase 1 here runs in the new
  folder.
- **Listed as an integration anyway** (user, 2026-11-24). Medusa's directory "primarily" features
  plugins that integrate a third-party service, and the plugin is a CMS of its own; it still carries
  `medusa-plugin-integration` and `medusa-plugin-cms`, so Medusa scrapes it and its reviewers decide.
- **A skill of its own for what a plugin says publicly** (user, 2026-11-24). README, `docs/`, keywords,
  description and GitHub texts go to a new skill in the codee-skills repository, with references, not
  into `codee-medusa-plugin-delivery`, which sets up the process once. A follow-up outside this
  repository, written from what this sub-spec settles.
- **The public repository starts without this repository's history** (user, 2026-11-24; one commit,
  2026-11-25): one clean commit, and one changeset for the first release in place of the pending ones.
  Both belong to [sub-release-process](./2026-11-24-sub-release-process.md); this sub-spec only keeps
  the pending changesets valid under the new name.

- **Mostra, `@mostrajs/cms`** (user, 2026-11-26; replaces the name of 2026-11-24). The plugin grows
  into a product of its own, "Mostra for Medusa.js", the first of a family of tools inside Medusa Admin,
  so it takes a brand instead of a descriptive name, as Payload names its CMS. The package is
  `@mostrajs/cms` under the npm scope and GitHub organisation `mostrajs`, the repository `mostrajs/cms`
  (moved there by the user from `codee-sh/medusa-plugin-cms`, which redirects). It starts at `0.1.0`
  (user, over `0.2.0`), through the same placeholder `0.0.1` and trusted publisher as the first name;
  the tags `v0.1.0` and `v0.1.1` of the first name become `medusa-plugin-cms-v0.1.0` and
  `medusa-plugin-cms-v0.1.1`, so `v<version>` belongs to the new package. `@codee-sh/medusa-plugin-cms`
  is deprecated with a pointer to `@mostrajs/cms`. Kept: the keyword `medusa-plugin-cms` (Medusa's
  category), the Admin text namespace `medusa-plugin-cms`, the module key `cms`, the routes and the
  test container's name - none of them is the package's name. The codee-skills naming rule
  (`@codee-sh/medusa-plugin-<domain>`, no brand names) needs an exception for Mostra, in codee-skills.

## Problem

- The name `@codee-sh/medusa-plugin-content-cms` repeats itself and departs from the other plugins'
  `medusa-plugin-<domain>`. Once published, a new name is a new package and the old one is abandoned, so
  it changes now or never (version `0.0.1`, never published).
- The README is a 712-line reference of the config with no installation, no registration in
  `medusa-config.ts`, no compatibility and no list of entry points - what someone reading the package on
  npm needs first.
- `keywords` lack `medusa-plugin-integration`, which Medusa's scrape needs, and carry
  `medusa-plugin-other`, the category for "other third-party integrations (Sentry)".
- `package.json` has no `repository`, `homepage` or `bugs`, so npm links nowhere.

## Current State and Evidence

- `package.json` - `name` `@codee-sh/medusa-plugin-content-cms`, version `0.0.1`; `keywords`
  `medusa, plugin, medusa-plugin-other, medusa-plugin, medusa-v2, cms`; no `repository`, `homepage`,
  `bugs`; `peerDependencies` pin `@medusajs/*` to `2.22.7`; `engines.node` `>=22.22.0`.
- The current name outside `.ai/specs/cms/ended/` (frozen, not touched):
  - `README.md` (14), `AGENTS.md` (1), `docker-compose.test.yml` (container and volume names, 3),
    `yarn.lock` (the workspace's own entry, 2);
  - `.changeset/*.md` - 17 pending changesets, each with `"@codee-sh/medusa-plugin-content-cms": minor`
    in its front matter, which `changeset version` matches against the package's name;
  - `src/shared/admin-i18n-ns.ts` - `CMS_I18N_NS = "medusa-plugin-content-cms"`, the namespace of the
    plugin's Admin texts, which a host overrides by this key (README, "The plugin's own texts");
    `src/admin/routes/cms/page.tsx` repeats it as a literal, and
    `src/lib/registry/__tests__/prepare-registry.unit.spec.ts` and the JSDoc in
    `src/lib/config/types.ts` name it;
  - `src/admin-extensions/registry.ts` - the `globalThis` key the plugin's and a host's copies of
    `./admin-extensions` share;
  - `src/admin/components/manager-form-fields/fields/richtext-field/editor/extensions/` - the names of
    two Lexical extensions;
  - active specs: the main spec (3), `sub-collections-and-documents` (4), `sub-workflow-hooks` (2);
    lessons: `a-host-vite-serves-its-own-stale-copy-of-admin-extensions` (3),
    `yalc-publish-pushes-the-build-yarn-dev-last-compiled` (1).
- Not affected: the module key `cms` (`src/modules/cms/index.ts`), the table names, `LOG_PREFIX`
  `[cms]`, the routes `/admin/cms/*` and `/store/cms/*`. No migration.
- The first host - 13 files: the dependency through yalc in `apps/backend/package.json` and
  `apps/backend/yalc.lock`, `resolve` in `apps/backend/medusa-config.ts`, and imports of the root,
  `./workflows` and `./admin-extensions` in `apps/backend/src/cms/` and `apps/backend/src/admin/cms/`.
  It does not override the plugin's i18n namespace.
- The notification-emails plugin's `README.md` (120 lines, last changed 2026-10-16) - title and two
  lines on what it is, Features, Compatibility, Installation, Basic setup, Documentation (links to
  `docs/`), Exports, License, Author; its `docs/` holds `configuration.md`, `admin.md`, `templates.md`,
  `blocks.md`, `translations.md`, `tests.md` and `contributing/`. The automations plugin has the same
  shape, older.
- [Medusa, Create a Plugin, "Package Keywords"](https://docs.medusajs.com/learn/fundamentals/plugins/create)
  - "Medusa scrapes NPM for a list of plugins that integrate third-party services ... add the
  `medusa-v2` and `medusa-plugin-integration` keywords", plus one type keyword, among them
  `medusa-plugin-cms` ("CMS service integration") and `medusa-plugin-other`.
- [Medusa, Announcing the integrations directory](https://medusajs.com/blog/announcing-integrations-directory/)
  - to be featured: a clear description, relevant keywords, the Medusa versions it works with, public on
  npm; "our team will review your integration", and the directory "primarily" features third-party
  integrations. No form to submit.
- npm, checked 2026-11-24: `@codee-sh/medusa-plugin-cms`, `medusa-plugin-cms` and `medusa-cms` do not
  exist; `medusa-plugin-content` (0.2.6) belongs to someone else.
- The repository has no remote yet (`git remote -v` is empty); the GitHub repository is created by the
  user ([AGENTS.md](../../../AGENTS.md), "Ask First").
- `codee-medusa-plugin-delivery` (codee-skills, added 2026-11-09 in `bc6b0aa`) - its `package.json`
  section sets `publishConfig` and the scripts only. It was written from this plugin's own setup
  (`SDLC.md` and the agent rules 2026-11-08, the scripts and CI 2026-11-09), whose `create-pr.sh` and
  `prepare-release.sh` grew from the notification-emails and automations plugins' scripts of
  December 2025.

## Target Behavior

- The package is `@codee-sh/medusa-plugin-cms`; every import, `resolve` and changeset uses it, and
  nothing outside `.ai/specs/cms/ended/` names the old one.
- The plugin's Admin text namespace is `medusa-plugin-cms`.
- `README.md` follows the notification-emails plugin's sections, and every guide now in it lives in one
  file of `docs/`, linked from the README, without a word of its content lost.
- `keywords`, `description`, `repository`, `homepage` and `bugs` are set as in "Contracts".
- The GitHub repository's description and topics are written down here for the user to set when
  creating it.

## Proposed Solution

Three slices, each one commit or a few: the rename, the README and its `docs/`, the package's metadata.
The rename goes first and alone, as AGENTS.md asks of a rename; the README is split next, before
`sub-collections-and-documents` 1i writes its proof and its store guide, so 1i writes into `docs/`.

**Rename.** One search and replace of `medusa-plugin-content-cms` to `medusa-plugin-cms` across the
files listed under "Current State", the frozen `ended/` specs excluded, and `content_cms` to `cms` in
the test database's volume name. The literal in `src/admin/routes/cms/page.tsx` imports
`CMS_I18N_NS` instead, so the namespace has one source. The pending changesets only take the new name
in their front matter and text; no changeset is added, as the package was never published under the
old name, and the first release replaces them with one of its own (Decisions). The user then refreshes `yarn.lock` with `yarn install`, recreates
the test database (the new volume starts empty), and swaps the yalc link in the first host.

**README and docs.** The README keeps only what someone deciding to install needs, in the
notification-emails plugin's order. The guides move unchanged into topic files:

| README section now | Goes to |
|---|---|
| A field's config, Fields that pick from options, Options from a hook, Text, links and safe output | `docs/fields.md` |
| Field components, Reading the document | `docs/field-components.md` |
| Rules over a model's fields, Your own rules at a write | `docs/validation.md` |
| A collection's form sections, The Admin's routes and the table's buttons, A collection's table, and how its rows are edited | `docs/admin.md` |
| Drafts and versions, Singletons | `docs/collections.md` |
| Translating the config's texts, The plugin's own texts | `docs/translations.md` |
| Local development | `docs/development.md`, linked from `CONTRIBUTING.md` |

Moving a section is a cut and paste, committed apart from any edit of its text, so the diff of the
move shows no rewording. Links between sections are rewritten to the new files in the same commit.

**Metadata.** `package.json` is the single source of the description; the GitHub description is a
copy of it, set once at creation.

### Alternatives Considered

- **Keep everything in the README.** One file to search, but npm shows the README as the package's
  page, and 700 lines of config reference hide how to install it. The other Codee plugins already split.
- **A brand name (Folio, Tessera).** Considered and set aside by the user (2026-11-24): the plugin is
  one of a family of descriptive names, and "medusa cms" is what a developer searches for. A brand can
  still headline the README later without renaming the package.
- **A changeset for the rename.** Nothing published carries the old name, so it would only add a line
  to the first changelog that no reader can act on.
- **README and listing guidance in `codee-medusa-plugin-delivery`.** That skill is loaded once, to set
  a repository up; a README or a `docs/` file is written with every feature, so its guidance is a skill
  of its own (Decisions). A changeset's text stays with the release, in `codee-medusa-plugin-delivery`
  ([sub-release-process](./2026-11-24-sub-release-process.md), Decisions).

## Contracts

The package name, the entry points under it and the Admin text namespace are public contract
(AGENTS.md, "Plugin Contract"); until the first release they change without a major version or a
breaking note.

`package.json`:

```json
{
  "name": "@codee-sh/medusa-plugin-cms",
  "description": "CMS for Medusa v2: model content as Medusa data models, edit it in Medusa Admin with drafts, versions and blocks, and serve it through the store API.",
  "keywords": [
    "medusa",
    "medusajs",
    "medusa-v2",
    "medusa-plugin",
    "medusa-plugin-integration",
    "medusa-plugin-cms",
    "cms",
    "headless-cms",
    "content-management",
    "ecommerce"
  ],
  "repository": { "type": "git", "url": "https://github.com/codee-sh/medusa-plugin-cms.git" },
  "homepage": "https://github.com/codee-sh/medusa-plugin-cms#readme",
  "bugs": { "url": "https://github.com/codee-sh/medusa-plugin-cms/issues" }
}
```

`medusa-plugin-other` and `plugin` are removed: Medusa takes one type keyword, and `plugin` alone finds
every plugin of every tool. `medusa-plugin-integration` and `medusa-plugin-cms` stay although the plugin integrates no third
party (Decisions). The
GitHub organisation `codee-sh` is the one the other plugins' `repository` fields name.

GitHub repository, set by the user at creation:

- **Name:** `medusa-plugin-cms`, as the folder (Decisions).
- **Description:** the `description` above, word for word.
- **Website:** the npm page, once published.
- **Topics:** `medusa`, `medusajs`, `medusa-v2`, `medusa-plugin`, `cms`, `headless-cms`, `typescript`.

README sections, in order: title `Medusa CMS` with the package name under it; two sentences on what it
is; Features (what is built, nothing planned); Compatibility (Medusa `2.22.7`, Node.js `>=22.22.0`,
from `peerDependencies` and `engines`); Installation; Basic setup (`resolve` and `options: { config }`
in `medusa-config.ts`, after a module with one model and the config; the example is checked against
the config types and `validateConfig`); Documentation (the `docs/` files); Exports (the root,
`./workflows`, `./admin-extensions`, `./shared` - the entry points a host imports; `./admin` is the
bundle Medusa loads, `./modules/*` the plugin's own module, and `./providers/*` names no folder, a
question for Phase 3); a status line saying it is a pre-release; License; Author.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A changeset still names the old package | `changeset version` fails on an unknown package | A search for `content-cms` outside `ended/` finds nothing; `yarn changeset status` passes |
| `yarn.lock` keeps the old workspace name | CI's immutable install fails | The user's `yarn install` rewrites it; `git diff yarn.lock` shows the name only |
| The first host keeps the old yalc link | Its backend fails to resolve `@codee-sh/medusa-plugin-cms` | The user swaps the link; the host's backend starts and its CMS config unit test passes |
| A host overrode texts under the old namespace | Its override stops applying, English shows | The first host has none (checked 2026-11-24); a pre-release, so no bridge |
| The Vite cache of the first host keeps the old `admin-extensions` copy | The host's Admin breaks on a missing module | The user clears `node_modules/.vite`, per the lesson on the stale copy |
| A link inside a moved section points at a README anchor | The link breaks | Each relative link and anchor in `README.md` and `docs/` resolves (checked by a script over the files) |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A content line is lost while moving README sections | medium | docs | Move without rewording, in its own commit; compare the line count of the sections before and after | none once compared |
| Medusa's reviewers do not list the plugin, as it integrates no third party | low | listing | The keywords still place it in npm's search and Medusa's CMS category | Not featured in the directory |
| The first host is left between names | medium | host | The host's changes are one step, done with the user's yalc swap | A short window on a developer machine |

**Rollout:** the rename, then the README, then the metadata; the first host follows the rename at once.

**Rollback:** each slice is a commit of its own and reverts alone; nothing is published until the user
decides, so no npm state needs undoing.

## Dependencies

- `sub-release-process` Phase 1 - the new folder `medusa-plugin-cms` that Phase 1 here runs in.
- `sub-collections-and-documents` 1i writes the README's proof and store guide after
  Phase 2 here, into the `docs/` files this creates.

## Acceptance Criteria

- [ ] A search for `content-cms` and `content_cms` outside `.ai/specs/cms/ended/` finds nothing, in the
  plugin and in the first host.
- [ ] The gate passes, and the first host's backend starts and shows the Content screens.
- [ ] The README has the sections under "Contracts", and every section it holds today is in a `docs/`
  file, its text unchanged.
- [ ] Every relative link and anchor in `README.md`, `CONTRIBUTING.md` and `docs/` resolves.
- [ ] `npm pack --dry-run` shows the new name, the description and the keywords.

## Phasing

### Phase 1 - The new name

**Goal:** the plugin is `@codee-sh/medusa-plugin-cms` in the new folder and in the first host, and
works there as before.

**Prerequisites:** `sub-release-process` Phase 1, the new folder.

**Exit gate:** no old name outside `ended/`; the gate; the user's `yarn install`, the yalc swap and a
walk through the Content screens in the first host.

### Phase 2 - README and docs

**Goal:** a README in the notification-emails plugin's shape, the guides in `docs/`.

**Prerequisites:** Phase 1.

**Exit gate:** the link check; the user reads the README on its own.

### Phase 3 - Listing metadata

**Goal:** `package.json` carries the keywords, description and links; the GitHub texts are ready.

**Prerequisites:** Phase 1.

**Exit gate:** `npm pack --dry-run`; the user creates the GitHub repository with the texts above.

### Phase 4 - Mostra

**Goal:** the plugin is published as `@mostrajs/cms` `0.1.0`, and `@codee-sh/medusa-plugin-cms` points
to it.

**Prerequisites:** Phase 3; the repository at `mostrajs/cms`.

**Exit gate:** `@mostrajs/cms@0.1.0` on npm with provenance, tagged `v0.1.0`; the old package
deprecated; the first host on the new name.

## Implementation Plan

### Phase 1

1. **P1.1 - The new name in the plugin**
   - **Outcome:** the plugin names itself `@codee-sh/medusa-plugin-cms` everywhere it is tracked, the
     frozen specs and `yarn.lock` aside.
   - **Areas:** `package.json` `name`; `src/shared/admin-i18n-ns.ts`, `src/admin/routes/cms/page.tsx`
     (a literal, as Medusa reads it from the source), `src/admin-extensions/registry.ts`, the two Lexical extensions,
     `src/lib/config/types.ts` (JSDoc), `src/lib/registry/__tests__/prepare-registry.unit.spec.ts`;
     `docker-compose.test.yml` (container `medusa-plugin-cms-test-db`, volume
     `medusa_plugin_cms_test_db`); `.changeset/*.md`; `README.md`, `AGENTS.md`; the main spec,
     `sub-collections-and-documents`, `sub-workflow-hooks`; the two lessons.
   - **Changes:** `medusa-plugin-content-cms` to `medusa-plugin-cms`, `medusa_plugin_content_cms` to
     `medusa_plugin_cms`; nothing else in those files.
   - **Verification:** a search for `content-cms` and `content_cms` outside `.ai/specs/cms/ended/` and
     `yarn.lock` finds nothing; the gate (`yarn lint`, `yarn typecheck`, `yarn typecheck:admin`,
     `yarn format:check`, `yarn test:unit`).

2. **P1.2 - The user's refresh**
   - **Outcome:** the lockfile, the test database and the yalc store know the new name.
   - **Areas:** `yarn.lock`, the Docker volume, the local yalc store.
   - **Changes:** the user stops `yarn dev`, runs `yarn install`, `yarn test:db:down` and removes the old
     volume if they want the space back, then `yarn dev`, which publishes the new name to yalc.
   - **Verification:** `git diff yarn.lock` shows the workspace's name only; `yarn changeset status`
     lists the pending changesets under the new name; `yarn test:db:up` starts the new container.

3. **P1.3 - The first host on the new name**
   - **Outcome:** the first host's backend resolves and imports `@codee-sh/medusa-plugin-cms`.
   - **Areas:** in the first host, `apps/backend/package.json`, `apps/backend/medusa-config.ts`, the
     imports in `apps/backend/src/cms/`, `apps/backend/src/admin/cms/` and
     `apps/backend/src/workflows/hooks/`.
   - **Changes:** the agent replaces the name in those files; the user swaps the link
     (`yalc remove @codee-sh/medusa-plugin-content-cms`, `yalc add @codee-sh/medusa-plugin-cms`, the
     host's install), and clears `apps/backend/node_modules/.vite`.
   - **Verification:** a search of the host finds no old name outside `.yalc/` and `node_modules/`; the
     host's CMS config unit test passes; the user walks through the Content screens.

### Phase 4

1. **P4.1 - The new name in the plugin**
   - **Outcome:** the package, its links, its docs and its release note name `@mostrajs/cms`.
   - **Areas:** `package.json` (`name`, `version` back to `0.0.1`, `repository`, `homepage`, `bugs`);
     `.changeset/config.json` (`repo`); a minor changeset, the `0.1.0` release note with how to move
     from the first name; `CHANGELOG.md` (the first name's entries under a section of their own, their
     links on `mostrajs/cms` and the renamed tags); `README.md` (title **Mostra**, a section on moving
     from the first name), `docs/`, `AGENTS.md`, `SDLC.md`; `src/admin-extensions/registry.ts` (the
     store key), the two Lexical extensions' names, a JSDoc in `src/lib/config/types.ts`; the examples
     in the main spec, `sub-collections-and-documents` and `sub-workflow-hooks`.
   - **Changes:** `@codee-sh/medusa-plugin-cms` to `@mostrajs/cms`, `codee-sh/medusa-plugin-cms` to
     `mostrajs/cms`; what Decisions keeps stays.
   - **Verification:** a search for `@codee-sh/medusa-plugin-cms` outside `CHANGELOG.md`, the README's
     moving section, the changeset, `SDLC.md`, the lessons, `yarn.lock` and the specs' history finds
     nothing; the gate.

2. **P4.2 - The user's release**
   - **Outcome:** `@mostrajs/cms@0.1.0` on npm, the old package deprecated.
   - **Changes:** the user runs `yarn install` (the workspace's name in `yarn.lock`), points `origin` at
     `mostrajs/cms`, renames the tags and releases `v0.1.0` and `v0.1.1` to `medusa-plugin-cms-v*`,
     publishes the placeholder `@mostrajs/cms@0.0.1` by hand and deprecates it, sets the trusted
     publisher (`mostrajs`, `cms`, `release.yml`), merges this branch and then the release PR, and
     deprecates `@codee-sh/medusa-plugin-cms`.
   - **Verification:** `npm view @mostrajs/cms version` answers `0.1.0`; the release `v0.1.0` carries
     the changeset's text.

3. **P4.3 - The first host on the new name**
   - **Outcome:** the first host's backend resolves and imports `@mostrajs/cms`.
   - **Areas:** as P1.3.
   - **Verification:** as P1.3.

## Short Tracker

- `done` - P1.1 (2026-11-25, in the new folder): the name replaced in 16 files; `page.tsx` keeps a
  literal, as Medusa reads it from the source; the lint, both typechecks, the format check and 1116 unit
  tests pass through `npx`, since Yarn refuses scripts until `yarn.lock` knows the new name.
- `done` - P1.2 (2026-11-25): the user's `yarn install`, the old test container and volume removed,
  `yarn dev`.
- `done` - P1.3 (2026-11-25): the name replaced in 12 backend files and the first host's spec and
  lesson; `yalc add @codee-sh/medusa-plugin-cms`, the user's `pnpm install` and cleared `.vite`; the
  link's `srcDir` points at the new folder; the host's lint and CMS unit tests (20) pass, its typecheck
  fails only on `integration-tests/http/catalogue/product-variants.spec.ts`, untouched here; the user
  walked the Content screens. Phase 1 done.
- `done` - the GitHub description and topics, set by the user (2026-11-25); the description chosen
  from three drafts, copied into `package.json` and "Contracts".
- `done` - Phase 2 (2026-11-25): the guides moved word for word into seven `docs/` pages (`77005bd`,
  no line lost or added); then each page got its title and one sentence, the README its new shape
  (153 lines), `CONTRIBUTING.md` the contributor pages, `AGENTS.md` the "models its content" wording.
  The README's setup example passed the typecheck and `validateConfig` in a throwaway test. Every
  relative link and anchor resolves. The user reads the README.
- `done` - Phase 2 rewrite (user chose it, 2026-11-25): `docs/` in reading order - models, collections,
  blocks, fields, media, validation, admin (with widgets), field components, translations, store API,
  workflows and events, development, tests; five pages new, every page without hard wraps, each claim
  read in the code and each example through `validateConfig` and `tsc` in throwaway checks outside
  `src`. The README lists them and links models from its setup. Links resolve; no spec, decision id,
  client or other product named. Found in the code against the specs, to correct in them: `manyToMany`
  relationships and Admin editing of `metadata` are not built; a relationship comes back from the store
  as its id; a block's sections cannot hold areas; the widget zones are the four of `index.d.ts`
  (`cms.document.list`, `cms.singleton.details` do not exist); the events are `created`, `updated` and
  `deleted`; `required` gave way to the Zod schemas; FileMediaProvider reads answer `{ id, url }`.
- `done` - Phase 3 (2026-11-25): `keywords`, `repository`, `homepage`, `bugs` as in "Contracts";
  the Medusa `peerDependencies` widened to `^2.22.7` (user chose it over the exact version), the README's
  Compatibility and the "Medusa packages" rule in `AGENTS.md` with them; `./providers/*` kept, as
  Medusa's plugin template has it. `npm pack --dry-run` shows the name, the README and the licence. The
  user runs `yarn install` for `yarn.lock`. The same rule in `codee-medusa-plugin-delivery`,
  `references/agents-rules.md`, follows in `sub-release-process` Phase 4.
- `done` - P4.1 (2026-11-26, branch `chore/rename-mostra`): the name replaced as P4.1 lists; the
  Admin text namespace, the keyword and the test container kept (Decisions).
- `pending` - P4.2, P4.3.
