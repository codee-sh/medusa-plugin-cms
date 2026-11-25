# CMS Lib Cleanup

**Date:** 2026-11-10
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-10-sub-lib-cleanup.md`

## TLDR

`src/lib` grew with 1c: blocks and the area model joined the registry next to collections, and each
builder copied the checks it needed instead of sharing them. The same rule now sits in several files,
error messages name their source in four ways, the config mixes two casings, and the package root
exports internals as public contract. This sub-spec splits `src/lib` into a `registry/` and a `document/`
folder, narrows the package root, moves the config to camelCase, moves the taken-value suggestion out of
its route, and then gives each rule one place and each pair of functions one verb. It stays with plain
functions, one subject per file; a class was weighed and rejected. Phases 1 to 3 are built. Phase 4,
analysed after them, regroups `src/lib/` by the domain a function serves - config, model, field, area,
block, collection, registry, document - and names each function by the verbs the steps already use.

## Decisions

- **D1** - The contract changes ship in this sub-spec, before the internal cleanup, so the internal
  renames that follow no longer touch an exported name (user, 2026-11-10).
- **D2** - The package root exports what a host project uses, not every file (see [Contracts](#contracts)).
  The Admin keeps importing by path. `src/lib/` is split into `registry/` and `document/` (see
  [Folders](#folders)) (user, 2026-11-10).
- **D3** - Config keys are camelCase (user, 2026-11-10). The config is TypeScript a developer writes, like
  Medusa's own `medusa-config.ts` (`projectConfig.databaseUrl`), `defineRouteConfig` and query configs
  (`isList`, `defaultLimit`), and like the common CMS config shape, which this one follows
  (`useAsTitle`, `minRows`, `maxDepth`).
  snake_case stays where Medusa uses it: column names, HTTP query parameters and API bodies. Column names
  inside the config are values, so `useAsTitle: "published_at"` is unchanged.
- **D4** - A json column other than `metadata` still needs `hidden: true` (user, 2026-11-10). The rule
  exists because an editor edits no JSON but `metadata` (sub-collections-and-documents, "Every value an
  editor fills is a column"): a developer who adds `settings: model.json()` expecting a field gets a start
  error instead of a field that silently never shows. The check moves into `buildCmsFields`, next to the
  skip, and its message says the column is not editable.
- **D5** - The block gaps stay in 1c: a block's slug fields are not checked, and its fields' `validation`
  and `transform` are not recorded. This sub-spec adds them to 1c in
  `sub-collections-and-documents` once its renames are in (user, 2026-11-10).
- **D6** - The taken-value suggestion moves from the route into a workflow, and `nextFreeCmsValue` moves
  to `workflows/cms/utils/` as `findFreeCmsValue` (user, 2026-11-10).
- **D7** - It starts once the 1c registry changes in `src/lib/` are committed (user, 2026-11-10).
- **D8** - Nothing is on npm and every changeset is a pending `minor`, so no released contract breaks:
  the contract changes amend the pending changesets that name a renamed key or export instead of adding
  a `major` (user, 2026-11-10).
- **D9** - A function is named after what it does, not `to<Result>`: `build-` for what is built anew,
  `format-`, `read-` and `parse-` as in the error helpers, `normalize-` for a value brought to its
  canonical form; the slug is `normalizeCmsSlug`. `toLabel` and the Admin's `toColumnLabel`, the same
  body twice, become one `formatColumnLabel` (user, 2026-11-10).
- **D10** - Phase 4 regroups `src/lib/` by domain with the verbs of [Verbs](#verbs) (user, 2026-11-10).
- **D11** - A host project checks its config with `validateCmsConfig(config): void`, which throws the
  registry's error; `buildCmsRegistry` and `CmsRegistry` leave the package root, and the registry stays
  internal (user, 2026-11-10).
- **D12** - Each domain folder has a `types.ts` with its shapes, apart from the functions (user,
  2026-11-10).
- **D13** - The config types move to `src/lib/config/types.ts`, and the "Plugin Contract" of `AGENTS.md`
  names that path (user, 2026-11-10).
- **D14** - File names and symbols drop `cms` / `Cms`: the package and its folders already say it. Where a
  bare name would say too little, the domain noun takes its place: `formatCmsErrors` becomes
  `formatDocumentErrors`, `CmsEvents` `DocumentEvents`. It covers `src/lib/`, `src/workflows/cms/utils/`,
  `src/api/middlewares/` and `src/admin/` (user, 2026-11-10).
- **D15** - The package root's exports drop `Cms` too; a host project that meets a name it already has,
  such as Medusa's `defineConfig`, renames it in its import (user, 2026-11-10).
- **D16** - `cms` stays in every name that is a string shared with the rest of the host application:
  workflow and step ids, and so the workflows' and steps' files and symbols, which their ids name; event
  names; the module key; the HTTP paths; the Admin's React Query keys and i18n keys. Medusa keeps
  workflows in one static `WorkflowManager.workflows` for the whole application and refuses a second
  workflow under an id another holds (`@medusajs/orchestration` `dist/workflow/workflow-manager.js`), the
  event bus carries every module's and plugin's events, and the dashboard shares its query cache and its
  translations with every plugin.

## Problem

Findings of the review of `src/lib/` on 2026-11-10.

**One rule in several places**

- The id prefix is checked in `build-cms-area-model.ts`, `build-cms-block.ts` and
  `check-cms-write-columns.ts`; its uniqueness separately in `checkCmsIdPrefixes`, whose JSDoc has to
  point at the other three.
- "needs a `<name>` `<type>` column" is written three times, with the same message: the loop over
  `CMS_DOCUMENT_COLUMN_TYPES`, `rank` in `buildCmsBlock`, `name` in `buildCmsAreaModel`.
- The json-column rule lives in `check-cms-write-columns.ts`, the skip of json columns in
  `build-cms-fields.ts`.
- `SLUG_FORMAT` lives in `build-cms-document-schema.ts`, the function that must produce it in
  `normalize-cms-slug.ts`; `LETTER_REPLACEMENTS` and the regex beside it list the same letters twice.
- `CmsShapeOptions` repeats the options of `buildCmsDocumentSchema`, with their defaults and their
  description.

**Swollen or misplaced functions**

- `buildCmsRegistry` maps collections and blocks into an owner list only to call `checkCmsIdPrefixes`.
- `buildCmsAreaModel` returns a `CmsModelDescription`, not the `CmsRegistryAreaModel` its file declares;
  the registry rebuilds it with two non-null assertions.
- `assertCmsDocumentShape` has one consumer, `verify-cms-document-body.ts`; its file also holds
  `listCmsDocumentErrors`.
- `checkCmsTableColumns` builds an array of `{ key, name }` only to loop over it.
- `CMS_LOG_PREFIX` lives in `get-cms-registry.ts`; `CmsDmlEntity`, a type of the public config, in
  `introspect-cms-model.ts`.
- The taken-values route computes `taken` and `suggestion` in its handler.

**Names**

- Error messages name their source as `page:`, `collection "page":`, `block "hero":` or `area:`.
- `buildCmsAreaLink` and `findCmsBlockRelation` do the same job under different verbs.
- `listCmsDocumentErrors` uses a read-step prefix for a pure function.
- `transform` is a map of functions on `CmsRegistryCollection` and `"default" | "custom"` on `CmsField`.
- `formatCmsStaleVersion` pairs with `isCmsStaleVersionMessage`; `define.ts` holds `defineCmsConfig`;
  `nextFreeCmsValue` has no verb.
- `checkCmsIdPrefixes(owners)` calls a duplicate `owner`, a word the areas use for `ownerColumn`;
  `buildCmsFieldGroups` names its sets `grouped` and `groupedAreas`; `CmsModelRelation.type` is a
  `string`.

**Contract**

- `src/lib/index.ts` is the package root (`"."` in `package.json`), and its `export *` publishes
  internals; `cms-client-collection` is exported twice.
- Config keys mix camelCase (`useAsTitle`, `defaultColumns`, `lockOnEdit`) and snake_case (`min_rows`,
  `max_rows`, `max_depth`, `max_per_document`, `label_field`, `thumbnail_field`, `allowed_fields`).

## Current State and Evidence

- `package.json` - `"."` resolves to `src/lib/index.js`, `"./workflows"` to `src/workflows/index.js`;
  `AGENTS.md`, "Plugin Contract", makes both the public contract.
- `apps/backend/src/cms/config.ts` and the registry test of the first host import
  only `defineCmsConfig` and `buildCmsRegistry`; the config uses `min_rows`, `label_field`,
  `allowed_fields`.
- `src/admin/**` imports `src/lib` by file path, 28 imports, never through `index.ts`. Its value imports
  are `build-cms-document-schema`, `normalize-cms-slug`, `format-cms-errors` and `cms-stale-version`; none
  imports a server module.
- `src/workflows/cms/workflows/list-cms-taken-values.ts` - run only by
  `api/admin/cms/collections/[collection]/taken-values/route.ts`; the create, update, publish and validate
  workflows use `listCmsTakenValuesStep` directly. The route is covered by
  `integration-tests/http/cms/admin-cms-documents.spec.ts`.
- `src/workflows/cms/steps/prepare-cms-old-versions.ts` - the only runtime reader of a snake_case key
  (`versions.max_per_document`).
- `src/lib/__tests__/fixtures.ts` - shared by the tests of both future folders.
- `npm view @codee-sh/medusa-plugin-content-cms` - not published; `.changeset/*.md` all `minor`.

## Proposed Solution

### Folders

The layout of Phase 1; Phase 4 regrouped it by domain, as [Layout](#layout) shows, which is the layout
the code has at closure.

| Path | Holds |
|---|---|
| `lib/index.ts`, `lib/types.ts` | package root and config types |
| `lib/define-cms-config.ts` | from `define.ts` |
| `lib/cms-events.ts`, `lib/cms-log-prefix.ts` | events; the log prefix, from `get-cms-registry.ts` |
| `lib/registry/` | `build-cms-registry`, `build-cms-collection`, `build-cms-collection-areas`, `build-cms-area-model`, `build-cms-block`, `build-cms-fields`, `build-cms-field-groups`, `check-cms-write-columns`, `check-cms-field-validation`, `introspect-cms-model`, `cms-client-collection`, `get-cms-registry`, `get-cms-collection` |
| `lib/document/` | `build-cms-document-schema`, `cms-errors` (from `format-cms-errors`), `cms-stale-version`, `normalize-cms-slug`, `find-cms-document-errors` (from `assert-cms-document-shape`) |
| `workflows/cms/utils/find-free-cms-value.ts` | from `lib/next-free-cms-value.ts` |

Files the other active specs plan in `src/lib/` follow the same split: `read-cms-areas`,
`prepare-cms-write`, `restore-cms-rows`, `build-cms-store-query` and `cms-preview-token` go to
`document/`, `resolve-cms-field-options` to `registry/`.

Tests move into `__tests__/` beside their files; `fixtures.ts` stays in `lib/__tests__/`. No folder gets
its own `index.ts`: the Admin imports by path and the package root is the only barrel.

A file the Admin imports still imports nothing from the server; the rule stays a comment in each such
file, not a folder, because `find-cms-document-errors` sits beside them with the backend's Zod.

### One rule in one place

- **Id prefix.** `checkCmsIdPrefixes(area, collections, blocks, errors)` reports a missing prefix and a
  repeated one; the three other checks go. A builder still records a missing prefix as `""`, which the
  check reads as missing.
- **Columns the plugin writes.** `check-cms-write-columns.ts` holds `CMS_DOCUMENT_COLUMN_TYPES`,
  `CMS_BLOCK_COLUMN_TYPES` (`{ rank: "number" }`), `CMS_AREA_COLUMN_TYPES` (`{ name: "text" }`) and one
  `checkCmsColumnTypes(model, types, path, errors)`. The `status` choices and the nullable `parent_id`
  stay as their own checks, with their messages. `checkSlugFields` stays here until D5 moves it.
- **json columns.** `buildCmsFields` refuses a json column without `hidden: true` where it skips it (D4);
  `checkCmsJsonColumns` and its export go.
- **Area model.** `buildCmsAreaModel` returns `{ description, area }`, the description for the relation
  checks and the `CmsRegistryAreaModel` for the registry, or `undefined`; the non-null assertions go.
- **Slug.** `SLUG_FORMAT` moves to `normalize-cms-slug.ts` and is exported as `CMS_SLUG_FORMAT`; the letter regex is built from
  `LETTER_REPLACEMENTS`.
- **Document errors.** `findCmsDocumentErrors` takes `CmsDocumentSchemaOptions`, exported by
  `build-cms-document-schema.ts` without `validation`; `assertCmsDocumentShape` moves into
  `verify-cms-document-body.ts`.
- **Taken value.** `check-cms-taken-value` workflow: `listCmsTakenValuesStep` for the one column, then a
  `transform()` that answers `{ taken, suggestion? }` through `findFreeCmsValue`. The route runs it and
  returns its result; `listCmsTakenValuesWorkflow` goes.

### Names

| Now | After |
|---|---|
| error prefix `page:` / `area:` | `collection "page":`, `block "hero":`, `area:` - the config key that holds the problem |
| `buildCmsAreaLink`, `findCmsBlockRelation` | `resolveCmsAreaLink`, `resolveCmsBlockRelation` |
| `listCmsDocumentErrors` | `findCmsDocumentErrors` |
| `CmsRegistryCollection.transform` | `slugTransforms` |
| `formatCmsStaleVersion` | `formatCmsStaleVersionMessage` |
| `nextFreeCmsValue` | `findFreeCmsValue` |
| `owners` / `owner` in `checkCmsIdPrefixes` | gone with its new signature |
| `grouped` in `buildCmsFieldGroups` | `groupedFields` |
| `CmsModelRelation.type: string` | `CmsRelationType`: `"hasOne" \| "hasOneWithFK" \| "hasMany" \| "belongsTo" \| "manyToMany"` |
| `checkCmsTableColumns` entries array | one check for `useAsTitle`, one loop over `defaultColumns` |
| `toCmsSlug` (package root) | `normalizeCmsSlug`, in `normalize-cms-slug.ts` (D9) |
| `toCmsErrors`, `toCmsField`, `toCmsFieldConfigs` | `buildCmsErrors`, `buildCmsField`, `buildCmsFieldConfigs` (D9) |
| `toCmsAdminListedDocument`, `toCmsAdminDocumentRead` | `buildCmsAdminListedDocument`, `buildCmsAdminDocumentRead`, in `build-cms-admin-document.ts` (D9) |
| `toJsonType`, `toStored` | `readJsonSchemaType`, `normalizeStoredValue` (D9) |
| `toLabel`, `toColumnLabel` | one `formatColumnLabel`, in `lib/document/format-column-label.ts` (D9) |

`CmsDmlEntity` moves to `types.ts`.

### Alternatives Considered

- **A class, as in `medusa-plugin-automations`.** There, `BaseActionService`, `EmailActionService` and
  `SlackActionService` implement one contract, sit in a `Map` and are called through `executeAction`:
  the class is the extension point. The registry is one pass from config to a frozen object with no
  second implementation. A `CmsRegistryBuilder` would turn `path, errors` into `this` state without
  removing a duplicated rule, and breaks the rule of one exported builder per file. Rejected.
- **A reporter instead of `path, errors`.** Shorter signatures, but the relation checks report on two
  models, the content type and the area model, so they would need two reporters. Rejected; the paths
  are unified instead.
- **Everything in `index.ts`.** Every helper would be contract, so the renames of this sub-spec and of
  every later one would be breaking. Rejected (D2).
- **A shared skeleton for every content type** (`isDmlEntity`, introspect, fields, groups). List rows
  (1d) will be its third user; until then the fixes above remove the copied checks. Deferred to 1d.

## Phase 4 - Lib by Domain

Analysis of the layout Phases 1 to 3 left (user, 2026-11-10).

### Findings

- **`registry/` holds two subjects.** The registry itself - its type, `getCmsRegistry`, `getCmsCollection`,
  read by 15 steps and middlewares at run time - and the code that turns the config and the models into
  it once at start: thirteen files of checks and shaping for fields, groups, areas, blocks and
  collections. A reader looking for "what is a field" or "how is a block checked" opens `registry/` and
  finds both mixed.
- **Files are grouped by kind of work, not by what they are about.** `build-cms-fields.ts`,
  `build-cms-field-groups.ts`, `check-cms-field-validation.ts`, `format-column-label.ts` and
  `normalize-cms-slug.ts` all concern fields, and sit in two folders. `build-cms-collection-areas.ts` and
  `build-cms-area-model.ts` concern areas; the first is named after collections, though 1e gives blocks
  and list rows areas too.
- **`build-` names two different jobs.** `buildCmsDocumentSchema` and `buildCmsAdminDocumentRead` build an
  object anew; `buildCmsCollection`, `buildCmsBlock` and `buildCmsFields` check a config against a model
  and shape the registry entry the steps read - the job a step prefix calls `prepare-`, with `validate-`
  for the checks. The steps already speak that vocabulary: `prepare-cms-write`, `prepare-cms-publish`,
  `validate-cms-document`.
- **A builder does several jobs in one body.** `buildCmsBlock` checks that the model is DML, describes it,
  checks its columns, prepares its fields, resolves its relation and prepares its groups. `AGENTS.md`
  splits a function that finds, checks and builds into named helpers; the builders delegate most of it,
  but the DML check and the relation checks sit inline.
- **Registry types live in builder files.** `CmsRegistryCollection` is declared in
  `build-cms-collection.ts`, `CmsField` in `build-cms-fields.ts`; the Admin imports them from files that
  also import the backend's Zod (type-only today, so nothing reaches the bundle, but nothing stops the
  next import).

### `check-cms-write-columns.ts`

It holds three tables of the columns the plugin writes (document, block, area), the generic
`checkCmsColumnTypes`, the document's own check with its `status` choices, and `checkSlugFields`. That is
four subjects, held together only by "a check". In the domain layout it dissolves:

| Part | Goes to |
|---|---|
| `checkCmsColumnTypes` | `model/validate-cms-column-types.ts`, the one generic check |
| `CMS_DOCUMENT_COLUMN_TYPES`, the `status` choices | `collection/validate-cms-document-columns.ts` |
| `CMS_BLOCK_COLUMN_TYPES` | `block/prepare-cms-block.ts`, its only reader |
| `CMS_AREA_COLUMN_TYPES`, the nullable `parent_id` | `area/prepare-cms-area-model.ts`, its only reader |
| `checkSlugFields` | `field/validate-cms-slug-fields.ts`; still called for collections only until D5 in 1c |

Needed in this form: no. Needed as rules: yes, each next to the model kind it is about.

### `introspect-cms-model.ts`

Medusa's `DmlEntity.parse()` is typed for `name`, `tableName`, `schema`, `cascades`, `indexes` and
`checks` (`@medusajs/utils` `dist/dml/entity.d.ts`), but each property of `schema` answers its own
untyped `parse(name)`, and a relation's target is reached through `entity().parse()`. The file is the one
place that knows those shapes, so every other function reads a typed `CmsModelDescription`. The other
route, `toMikroORMEntity` and MikroORM metadata, needs an ORM to boot and carries far more than the
registry reads. Needed: yes - as the single adapter onto Medusa's DML internals.

What changes: the name - it describes a model, and returns a `CmsModelDescription`, so
`describeCmsModel`; its folder, `model/`; and the casts of `indexes`, `checks` and `cascades`, which
`parse()` already types, go where the typecheck allows. Every field it returns is read somewhere;
`tableName` only by error messages.

### Verbs

| Verb | For | Examples |
|---|---|---|
| `get-` | one thing from the running app, or throws | `getCmsRegistry`, `getCmsCollection` |
| `describe-` | a definition read as it is, judged by nothing | `describeCmsModel` |
| `validate-` | checks against rules, reports each problem, returns nothing else | `validateCmsColumnTypes`, `validateCmsIdPrefixes` |
| `prepare-` | a checked config and a model description shaped into the entry the steps read | `prepareCmsFields`, `prepareCmsBlock`, `prepareCmsCollection` |
| `build-` | an object built anew from a description | `buildCmsDocumentSchema`, `buildCmsErrors`, `buildCmsAdminDocumentRead` |
| `format-` / `parse-` | text, both ways | `formatCmsErrors`, `parseCmsErrors`, `formatColumnLabel` |
| `normalize-` | a value brought to its canonical form | `normalizeCmsSlug`, `normalizeStoredValue` |
| `find-` | a search that may come back empty | `findCmsDocumentErrors`, `findFreeCmsValue` |
| `resolve-` | goes: a relation check is a `validate-` that also returns what it matched | `resolveCmsAreaLink` becomes `validateCmsAreaLink` |

A `prepare-` function runs the `validate-` helpers of its domain and shapes the entry; it holds no check
inline.

### Layout

```
src/lib/
  index.ts  cms-events.ts  cms-log-prefix.ts
  config/      types.ts (the public config types), define-cms-config.ts
  model/       types.ts (CmsModelDescription, CmsModelColumn, CmsModelRelation, CmsRelationType),
               describe-cms-model.ts, validate-cms-dml-model.ts, validate-cms-column-types.ts
  field/       types.ts (CmsField, CmsFieldKind, CmsRegistryFieldGroup), prepare-cms-fields.ts,
               validate-cms-field-schema.ts, validate-cms-slug-fields.ts, prepare-cms-field-groups.ts,
               normalize-cms-slug.ts, format-column-label.ts
  area/        types.ts (CmsRegistryArea, CmsRegistryAreaLink, CmsRegistryAreaModel),
               prepare-cms-area-model.ts, prepare-cms-areas.ts, validate-cms-area-link.ts
  block/       types.ts (CmsRegistryBlock, CmsClientBlock), prepare-cms-block.ts,
               validate-cms-block-relation.ts
  collection/  types.ts (CmsRegistryCollection, CmsClientCollection), prepare-cms-collection.ts,
               validate-cms-document-columns.ts, validate-cms-table-columns.ts
  registry/    types.ts (CmsRegistry), prepare-cms-registry.ts, validate-cms-id-prefixes.ts,
               validate-cms-config.ts, get-cms-registry.ts, get-cms-collection.ts
  document/    build-cms-document-schema.ts, find-cms-document-errors.ts, cms-errors.ts,
               cms-stale-version.ts
```

Each domain reads only the domains above it in this list: `field/` reads `model/`, `collection/` reads
`field/` and `area/`, `registry/` reads every domain it assembles, and `document/` reads `field/` and
`collection/`. A file the Admin imports still imports nothing from the server.

Planned files follow the layout and the verbs: `buildDocumentAreas` (was `readCmsAreas`),
`prepareDocumentWrite` (`prepareCmsWrite`), `restoreRows` (`restoreCmsRows`) and `buildStoreQuery`
(`buildCmsStoreQuery`) in `document/`, `prepareFieldOptions` (`resolveCmsFieldOptions`) in `field/`,
`preview-token.ts` (`cms-preview-token.ts`) in `document/`; the planned config types drop `Cms` as well
(`Option`, `OptionsInput`, `OptionsLoader`, `ReferenceTarget`).

### Alternatives Considered

- **Folders by kind (`checks/`, `builders/`).** What Phases 1 to 3 left, in effect: a reader still needs
  to know which kind of work answers the question. Rejected.
- **Keep `build-` for the registry.** Allowed for plain functions by `codee-medusa-backend-conventions`,
  but it would name two jobs, and the steps say `prepare-` for the second. Rejected.
- **Split every `prepare-` into a `validate-` and a `prepare-` that each describe the model.** Two passes
  over the same description for each content type, for a split the helpers already give. Rejected.

## Contracts

**Package root at closure, after Phase 4 (D11, D15):**

```ts
export * from "./events"                   // DocumentEvents
export * from "./config/define-config"     // defineConfig
export { normalizeSlug } from "./field/normalize-slug" // for a project's own transform
export { validateConfig } from "./registry/validate-config"
export type { Field, FieldKind } from "./field/types"
export type { ClientBlock } from "./block/types"
export type { ClientCollection } from "./collection/types"
export type * from "./config/types"        // Config and the other config types, DmlModel included
```

`buildCmsRegistry` and `CmsRegistry` are gone; a host checks its config with `validateConfig`. The block
below is the intermediate root of Phase 2, kept as the step that narrowed it.

**Package root after Phase 2:**

```ts
export type * from "./types"                  // config types, CmsDmlEntity included
export * from "./define-cms-config"           // defineCmsConfig
export { buildCmsRegistry, type CmsRegistry } from "./registry/build-cms-registry"
export * from "./cms-events"                  // CmsEvents
export { normalizeCmsSlug } from "./document/normalize-cms-slug" // for a project's own transform
export type { CmsClientBlock, CmsClientCollection } from "./registry/cms-client-collection"
export type { CmsField, CmsFieldKind } from "./registry/build-cms-fields"
```

The client types stay, as they describe the response of `GET /admin/cms/collections`, which is
contract. Removed from the root: `introspectCmsModel` and its types, `getCmsRegistry`, `CMS_LOG_PREFIX`,
`buildCmsDocumentSchema`, `buildCmsErrors`, `formatCmsErrors`, `parseCmsErrors`, the stale-version helpers,
`CmsRegistryCollection`, `CmsRegistryBlock`.

**Config keys after Phase 2:** `minRows`, `maxRows`, `maxDepth`, `versions.maxPerDocument`,
`media.labelField`, `media.thumbnailField`, `media.allowedFields`. The collection projection carries the
area keys as they are, so `GET /admin/cms/collections` answers `minRows` and `maxRows`.

**`./workflows`:** `listCmsTakenValuesWorkflow` is replaced by `checkCmsTakenValueWorkflow`, input
`{ collection, column, value, id? }`, output `{ taken: boolean, suggestion?: string }`.
`GET /admin/cms/collections/:collection/taken-values` keeps its query and its response.

**Config errors:** the messages keep their wording; their prefix changes (see [Names](#names)).

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A host config still uses `min_rows` | Typecheck fails on the unknown key; at runtime the key is ignored and the default applies | host project typecheck after the yalc push |
| A json column without `hidden: true` | Start error naming the column and saying it is not editable | registry unit test |
| A model without an id prefix | One error per model, from `checkCmsIdPrefixes` | registry unit test |
| The taken value is free | `{ taken: false }`, no suggestion | HTTP test |
| A host test asserts a config error message | Fails on the new prefix | host project tests after the yalc push |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A file move is recorded as delete plus add and loses its history | medium | repository | Phase 1 is renames with path fixes only; `git status --short` shows `R` before the commit | none |
| A renamed config key is missed and silently falls back to a default | medium | config | Typecheck catches typed configs; P2.2 greps every snake_case key in `src`, `integration-tests` and the active specs | an untyped host config |
| The Admin loses an import the root used to give | low | admin | The Admin imports by path today; `typecheck:admin` | none |

**Rollout:** one commit per step, Phase 1 first. The host project takes Phase 2 through
`yalc publish --push --no-scripts` and updates `apps/backend/src/cms/config.ts` to camelCase in the same
session.

**Rollback:** each step is its own commit and reverts alone; Phase 2 reverts together with the host
project's config change. No data or migration is involved.

## Dependencies

- The 1c registry changes in `src/lib/` committed (D7).
- `sub-collections-and-documents` stays the source of truth for the registry; this sub-spec updates its
  paths and names and adds D5 to 1c.

## Acceptance Criteria

- [x] `src/lib/` has the folders of [Layout](#layout), and every moved file keeps its history: each move
  went in a rename-only commit recorded as `R`.
- [x] The package root exports only what [Contracts](#contracts) lists at closure.
- [x] No snake_case key remains in the config types, the code, the tests or the active specs (`grep`).
- [x] The taken-values route runs `check-cms-taken-value` and answers as before (HTTP tests, 74 passed).
- [x] Each rule of [One rule in one place](#one-rule-in-one-place) is written once.
- [x] Every config error starts with `collection "<slug>":`, `block "<slug>":` or `area:` (registry unit
  tests).
- [x] `sub-collections-and-documents` names the new paths and functions, and its 1c lists the block gaps
  of D5.

## Phasing

### Phase 1 - Folders and file names

**Goal:** `src/lib/` split into `registry/` and `document/`, with the file names of the target, and no
content change.

**Prerequisites:** D7.

**Exit gate:** `git status --short` shows only `R` for the moves; `yarn lint`, `yarn format:check`,
`yarn typecheck`, `yarn typecheck:admin` and `yarn test:unit` pass.

### Phase 2 - Public contract

**Goal:** the narrowed package root, camelCase config keys and the taken-value workflow, with the host
project updated.

**Prerequisites:** Phase 1.

**Exit gate:** the Phase 1 checks, `yarn test:integration:http`, and the host project's typecheck and
registry test after the yalc push.

### Phase 3 - One rule in one place, and names

**Goal:** the internal fixes of [One rule in one place](#one-rule-in-one-place) and [Names](#names),
with no behavior change beyond the error prefixes.

**Prerequisites:** Phase 2.

**Exit gate:** the Phase 1 checks; the registry unit tests assert the new prefixes and one error per
missing or repeated id prefix.

### Phase 4 - Lib by domain

**Goal:** `src/lib/` in the layout of [Phase 4 - Lib by Domain](#phase-4---lib-by-domain), each function
named by [Verbs](#verbs).

**Prerequisites:** Phase 3; D10 to D13.

**Exit gate:** the Phase 1 checks; `yarn test:integration:http`; the moves recorded as `R`; the active
specs and `AGENTS.md` name the new paths and functions.

## Implementation Plan

### Phase 1

1. **P1.1 - Move the files**
   - **Outcome:** the layout of [Folders](#folders), tests beside their files.
   - **Areas:** `src/lib/**`, `src/workflows/cms/utils/`, every importer in `src/admin`, `src/api`,
     `src/workflows`, `src/modules`, `integration-tests`.
   - **Changes:** `git mv` per file, then the import paths only; no symbol is renamed.
   - **Verification:** `git status --short` shows `R`; the checks of the Phase 1 exit gate.

2. **P1.2 - Paths in the active specs**
   - **Outcome:** the active specs name the new paths.
   - **Areas:** `.ai/specs/cms/*.md` outside `ended/`.
   - **Changes:** replace each `src/lib/<file>` path; `ended/` is not touched.
   - **Verification:** `grep -rn "src/lib/" .ai/specs/cms/*.md` names only existing files.

### Phase 2

1. **P2.1 - Narrow the package root**
   - **Outcome:** `index.ts` as in [Contracts](#contracts); `CmsDmlEntity` in `types.ts`.
   - **Areas:** `src/lib/index.ts`, `src/lib/types.ts`, `src/lib/registry/introspect-cms-model.ts`.
   - **Changes:** explicit exports instead of `export *`.
   - **Verification:** `yarn typecheck`, `yarn typecheck:admin`; the host project's typecheck after the
     yalc push.

2. **P2.2 - camelCase config keys**
   - **Outcome:** the keys of [Contracts](#contracts).
   - **Areas:** `src/lib/types.ts`, `prepare-cms-old-versions.ts` and its test,
     `integration-tests/modules/test-content/cms-config.ts`, the active specs, the pending changesets.
   - **Changes:** rename each key; grep for every old key afterwards.
   - **Verification:** the grep finds none; `yarn test:unit`; `prepare-cms-old-versions` test reads
     `maxPerDocument`.

3. **P2.3 - Taken-value workflow**
   - **Outcome:** `check-cms-taken-value` replaces `list-cms-taken-values`; `findFreeCmsValue` named.
   - **Areas:** `src/workflows/cms/workflows/`, `src/workflows/index.ts`,
     `src/workflows/cms/utils/find-free-cms-value.ts`, `prepare-cms-document-input.ts`, the route.
   - **Changes:** as in [One rule in one place](#one-rule-in-one-place); the route returns the result.
   - **Verification:** `yarn test:integration:http` (`admin-cms-documents.spec.ts` covers the route);
     `find-free-cms-value` unit test.

4. **P2.4 - Host project**
   - **Outcome:** the first host on the new keys.
   - **Areas:** `apps/backend/src/cms/config.ts` in the host project.
   - **Changes:** `yalc publish --push --no-scripts`, then the key renames.
   - **Verification:** the host project's typecheck and registry test.

### Phase 3

1. **P3.1 - Id prefixes and plugin columns**
   - **Outcome:** `checkCmsIdPrefixes` and `checkCmsColumnTypes` as designed; `buildCmsAreaModel` returns
     `{ description, area }`.
   - **Areas:** `src/lib/registry/`.
   - **Verification:** registry unit tests: one error for a missing prefix, one for a repeated one, the
     column messages unchanged.

2. **P3.2 - json columns in `buildCmsFields`**
   - **Outcome:** D4.
   - **Areas:** `build-cms-fields.ts`, `check-cms-write-columns.ts`.
   - **Verification:** registry unit test for a json column with and without `hidden: true`.

3. **P3.3 - Slug and document errors**
   - **Outcome:** `SLUG_FORMAT` in `normalize-cms-slug.ts`; `findCmsDocumentErrors` with the shared options type;
     `assertCmsDocumentShape` in the middleware.
   - **Areas:** `src/lib/document/`, `src/api/middlewares/verify-cms-document-body.ts`,
     `validate-cms-document.ts`.
   - **Verification:** `normalize-cms-slug` and `build-cms-document-schema` unit tests;
     `yarn test:integration:http` for the 400 answers.

4. **P3.4 - Names and error prefixes**
   - **Outcome:** the table of [Names](#names).
   - **Areas:** `src/lib/**`, their consumers and tests.
   - **Verification:** registry unit tests assert the prefixes; the Phase 1 checks.

5. **P3.5 - Sync `sub-collections-and-documents`**
   - **Outcome:** its function and file names match the code; its 1c lists D5: slug checks on blocks, and
     `validation` and `transform` built in `buildCmsFields` for collections and blocks alike.
   - **Areas:** `.ai/specs/cms/2026-11-04-sub-collections-and-documents.md`, main spec "Active
     Sub-specs".
   - **Verification:** every function the spec names exists in the code.

### Phase 4

1. **P4.1 - Move the files into their domains**
   - **Outcome:** each file at the path of the domain it serves, under the name its main function takes
     in P4.4; no content change.
   - **Areas:** `src/lib/**`, every importer in `src/`, `integration-tests/`.
   - **Changes:** `git mv` per file, then the import paths only:

     | From | To |
     |---|---|
     | `types.ts`, `define-cms-config.ts` | `config/types.ts`, `config/define-config.ts` |
     | `cms-events.ts`, `cms-log-prefix.ts` | `events.ts`, `log-prefix.ts` |
     | `registry/introspect-cms-model.ts` | `model/describe-model.ts` |
     | `registry/build-cms-fields.ts` | `field/prepare-fields.ts` |
     | `registry/check-cms-field-validation.ts` | `field/validate-field-schema.ts` |
     | `registry/build-cms-field-groups.ts` | `field/prepare-field-groups.ts` |
     | `document/normalize-cms-slug.ts`, `document/format-column-label.ts` | `field/normalize-slug.ts`, `field/format-column-label.ts` |
     | `registry/build-cms-area-model.ts` | `area/prepare-area-model.ts` |
     | `registry/build-cms-collection-areas.ts` | `area/prepare-areas.ts` |
     | `registry/build-cms-block.ts` | `block/prepare-block.ts` |
     | `registry/build-cms-collection.ts` | `collection/prepare-collection.ts` |
     | `registry/check-cms-write-columns.ts` | `collection/validate-document-columns.ts` |
     | `registry/cms-client-collection.ts` | `collection/types.ts` |
     | `registry/build-cms-registry.ts` | `registry/prepare-registry.ts` |
     | `registry/get-cms-registry.ts`, `registry/get-cms-collection.ts` | `registry/get-registry.ts`, `registry/get-collection.ts` |
     | `document/build-cms-document-schema.ts` | `document/build-document-schema.ts` |
     | `document/cms-errors.ts`, `document/cms-stale-version.ts` | `document/document-errors.ts`, `document/stale-version.ts` |
     | `document/find-cms-document-errors.ts` | `document/find-document-errors.ts` |
     | `workflows/cms/utils/build-cms-admin-document.ts`, `find-free-cms-value.ts` | `build-admin-document.ts`, `find-free-value.ts` |
     | `api/middlewares/ensure-cms-collection.ts`, `verify-cms-document-body.ts` | `ensure-collection.ts`, `verify-document-body.ts` |

     The files P4.3 creates take names without `cms` too: `validate-dml-model`, `validate-column-types`,
     `validate-slug-fields`, `validate-table-columns`, `validate-id-prefixes`, `validate-area-link`,
     `validate-block-relation`, `validate-config`.
     Tests move beside their files under the same names; `fixtures.ts` stays in `lib/__tests__/`.
   - **Verification:** `git status --short` shows `R`; the Phase 1 checks.

2. **P4.2 - Types apart from functions**
   - **Outcome:** D12: `model/`, `field/`, `area/`, `block/`, `collection/` and `registry/` each hold
     their shapes in `types.ts`, as [Layout](#layout) lists them; the functions import them from there,
     and the Admin imports only `types.ts` files and the files that import nothing.
   - **Areas:** `src/lib/**`, `src/admin/**`, `src/workflows/**`.
   - **Verification:** `grep` finds no `export type` of a registry shape outside a `types.ts`; the Phase 1
     checks.

3. **P4.3 - One subject per file**
   - **Outcome:** `check-cms-write-columns.ts` dissolved as the table in
     [`check-cms-write-columns.ts`](#check-cms-write-columnsts) says; the inline checks of each builder in
     their own `validate-` files: the DML check (`model/validate-cms-dml-model.ts`, a type guard), the
     table columns (`collection/validate-cms-table-columns.ts`), the id prefixes
     (`registry/validate-cms-id-prefixes.ts`), the area link (`area/validate-cms-area-link.ts`) and the
     block relation (`block/validate-cms-block-relation.ts`).
   - **Areas:** `src/lib/**`.
   - **Verification:** the registry unit tests pass unchanged, every message the same; the Phase 1 checks.

4. **P4.4 - Verbs**
   - **Outcome:** the functions renamed by [Verbs](#verbs): `introspectCmsModel` to `describeCmsModel`;
     `buildCmsFields`, `buildCmsFieldGroups`, `buildCmsAreaModel`, `buildCmsCollectionAreas`,
     `buildCmsBlock`, `buildCmsCollection` and `buildCmsRegistry` to `prepareCmsFields`,
     `prepareCmsFieldGroups`, `prepareCmsAreaModel`, `prepareCmsAreas`, `prepareCmsBlock`,
     `prepareCmsCollection` and `prepareCmsRegistry`; every `check-` function to `validate-`
     (`checkCmsFieldValidation` to `validateCmsFieldSchema`, `checkCmsWriteColumns` to
     `validateCmsDocumentColumns`); `resolveCmsAreaLink` and `resolveCmsBlockRelation` to
     `validateCmsAreaLink` and `validateCmsBlockRelation`. The casts of `indexes`, `checks` and
     `cascades` in `describeCmsModel` go where `parse()` already types them.
   - **Areas:** `src/lib/**`, `src/workflows/**`, tests.
     Every internal symbol drops `Cms` with them (D14): `describeModel`, `prepareFields`,
     `prepareRegistry`, `getRegistry`, `getCollection`, `LOG_PREFIX`, `RegistryCollection`,
     `ModelDescription`, `buildDocumentSchema`, `findDocumentErrors`, `DocumentError`,
     `formatDocumentErrors`, `parseDocumentErrors`, `formatStaleVersionMessage`, `isStaleVersionMessage`,
     `findFreeValue`, `buildAdminDocumentRead`, `ensureCollection`, `verifyDocumentBody`.
   - **Verification:** `grep` finds no `build`, `check` or `resolve` function of the registry, and no `Cms`
     in a symbol of `src/lib/`, `src/workflows/cms/utils/` or `src/api/middlewares/` but the strings of
     D16; the Phase 1 checks.

5. **P4.5 - `validateCmsConfig`**
   - **Outcome:** D11 and D15: `registry/validate-config.ts` exports `validateConfig(config): void`, which
     runs `prepareRegistry` and throws its error; the package root exports it instead of
     `buildCmsRegistry` and `CmsRegistry`, and every other export without `Cms`: `defineConfig`,
     `DocumentEvents`, `normalizeSlug`, `Config` and the other config types, `Field`, `FieldKind`,
     `ClientCollection`, `ClientBlock`. The pending changesets that name an export follow (D8).
   - **Areas:** `src/lib/registry/`, `src/lib/index.ts`, `.changeset/`.
   - **Verification:** unit test: a valid config passes, a broken one throws the registry's message; the
     Phase 1 checks.

6. **P4.6 - Sync**
   - **Outcome:** `AGENTS.md` names `src/lib/config/types.ts` (D13) and `LOG_PREFIX`; the active specs
     name the new paths and functions; the host project imports `defineConfig as defineCmsConfig` in
     `apps/backend/src/cms/config.ts`, and its `cms-config.unit.spec.ts` calls `validateConfig`, once the
     user's `yarn dev` and yalc push carry the plugin over.
   - **Areas:** `AGENTS.md`, `.ai/specs/cms/*.md` outside `ended/`, the host project's test.
   - **Verification:** every `src/lib/` path in the active specs exists or is a planned file; the HTTP
     tests; the host project's typecheck and test after the push.

7. **P4.7 - Admin files without `cms`**
   - **Outcome:** D14 in `src/admin/`: each folder and file under `src/admin/cms/` and
     `src/admin/hooks/api/` drops `cms-`, as `cms/cms-document-edit-form/cms-document-edit-form.tsx` to
     `cms/document-edit-form/document-edit-form.tsx` and `hooks/api/cms-documents/` to
     `hooks/api/documents/`; `src/admin/cms/` and `src/admin/routes/cms/`, which name the feature and its
     URL, stay. No content change.
   - **Areas:** `src/admin/**`.
   - **Verification:** `git status --short` shows `R`; `yarn typecheck:admin`, the Phase 1 checks.

8. **P4.8 - Admin symbols without `Cms`**
   - **Outcome:** components and hooks drop `Cms`: `CmsDocumentEditForm` to `DocumentEditForm`,
     `useCmsDocuments` to `useDocuments`, `useCreateCmsDocument` to `useCreateDocument`; the query keys
     (`cms_documents`, `cms_collections`, ...) and the `cms.*` i18n keys stay (D16).
   - **Areas:** `src/admin/**`.
   - **Verification:** `grep` finds no `Cms` in an Admin symbol; `yarn typecheck:admin`, the Phase 1
     checks; the user's walkthrough of **Content** in the host project.

## Short Tracker

- `done` - Phase 1: files moved (P1.1, a rename-only commit), active spec paths updated (P1.2).
- `done` - Phase 2, P2.1 to P2.3: the package root narrowed, camelCase config keys, the
  `check-cms-taken-value` workflow. Gate passes; `admin-cms-documents` HTTP test passed (70 tests).
- `done` - Phase 3, P3.1 to P3.5: one place per rule, the names of [Names](#names), the blocks spec
  synced and its P1c.4 given the block gaps of D5. Gate passes.
- `done` - D9: the `to-` functions renamed, their files moved in a rename-only commit first. Gate passes;
  `yarn test:integration:http` passed (74 tests).
- `done` - Phase 4, P4.1 to P4.8 (2026-11-10), P4.7 and P4.8 before P4.6 so the sync covers the Admin
  too. P4.7 moved the folders and then the files inside them in two rename-only commits, because a
  one-line `index.ts` whose path changes is no longer detected as a rename. Gate passes.
- `done` - P2.4 and P4.6 in the host project (2026-11-10): `apps/backend/src/cms/config.ts` imports
  `defineConfig as defineCmsConfig` with the camelCase keys, and `cms-config.unit.spec.ts` calls
  `validateConfig`; pushed through yalc, its test passes and the user confirmed the project runs.
  Committed in the host repository on `feat/cms` (`09f9e3f9`).
- `done` - Closed 2026-11-10 after the `codee-spec-writing` review and a Medusa compliance pass, run in
  the same session rather than by an independent reviewer: two Medium findings (the closing contract and
  the closing layout) and two Low ones (the tracker, the acceptance criteria) were fixed before closure.
