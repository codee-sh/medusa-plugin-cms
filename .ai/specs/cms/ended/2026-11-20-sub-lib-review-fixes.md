# Lib Review Fixes

**Date:** 2026-11-20
**Status:** done
**Area:** backend
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md),
[sub-store-public-fields](./2026-11-20-sub-store-public-fields.md),
[sub-media-mime-types](../2026-11-20-sub-media-mime-types.md),
[sub-rich-text-features](../2026-11-20-sub-rich-text-features.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-20-sub-lib-review-fixes.md`

## TLDR

A review of `src/lib` (2026-11-20) found one gap that loses data and a set of smaller defects and
convention breaches. The gap: a save body may carry one block id twice, or a block inside its own
repeater, and nothing refuses it - two blocks become one, or a subtree drops out of every read while it
stays in the database. Phase 1 makes a save refuse a block id the body holds more than once, which
covers both. Phase 2 fixes the smaller defects: a schema check that misreads a transform, a missing
`labels` that throws a `TypeError`, a provider check that fails when the plugin is linked, an import from
inside Medusa's build, and three JSDoc blocks that promise what the code does not do. Phase 3 brings the
files to AGENTS.md's one-subject rule, moving files with a rename commit first, before
`sub-rich-text-features` changes them. The store's public fields and `accept` have sub-specs of their
own.

## Settled

User, 2026-11-20:

- The review's findings other than the store's public fields and `accept` go to this sub-spec, not to a
  working note.
- **The store's `allowed` paths are left as they are.** `listAreaPaths` grows with the product of the
  levels; the arithmetic is kept under Risks, and it is revisited when a real config comes near.
- **The convention findings are this sub-spec's last phase,** after the behavior fixes. The package root
  keeps exporting `normalizeSlug`, from its new place. `sub-rich-text-features` waits for this phase, as
  it changes files the phase moves.

## Problem

`prepare-document-write` turns a save body into create, update and delete rows, trusting that each block
id appears once and that no block holds itself. The schema and the stale check do not enforce either.
Beside that, the review found errors that report the wrong cause, a provider check that breaks when the
plugin is linked, and files that break AGENTS.md's one-subject rule.

## Current State and Evidence

Data loss on save:

- `src/lib/document/prepare-document-write.ts:175-216` - `prepareBlockRow` updates a stored block by its
  id; `:249-271` adds a row per submitted block. The same stored id twice gives two `update` rows with one
  id; the last one's values and rank win.
- The same file - a block sent inside one of its own repeaters gets an `area_id` pointing at the repeater
  row whose `parent_id` is the block itself, a cycle; `buildDocumentAreas` never reaches it. The block's
  id then appears twice in the body: once where it sits, once inside itself.
- `src/workflows/cms/steps/validate-cms-document.ts:62-86` - `findStaleBlockErrors`, the step's own check
  of the body's blocks, walks them with `listDocumentBlocks` (`src/lib/document/list-document-blocks.ts`),
  which lists every block at any depth with its path; `:155-186` runs it once the shape fits. Nothing
  checks repeated ids. In `report` mode, which the Admin's `validate` route uses while the editor types,
  the step returns its errors instead of throwing.

Defects:

- `src/lib/field/validate-field-schema.ts:45-61` and `src/lib/field/validate-model-schema.ts:18` -
  `z.toJSONSchema(schema)` throws "Transforms cannot be represented in JSON Schema" for
  `z.string().transform(...)`, and the `catch` turns it into "must describe a string". Checked in node
  with `@medusajs/framework/zod`: `z.toJSONSchema(schema, { io: "input" })` answers `{ type: "string" }`
  for the same schema, and still throws for `z.date()` and `z.custom()`, which no field takes as written.
  The plugin hands a schema its input, so the input type is the one to check.
- `src/lib/config/prepare-labels.ts:12-27` - reads `labels.singular` with no guard; a JS config without
  `labels` throws `TypeError: Cannot read properties of undefined`. Called by `prepareCollection` (`:108`)
  and `prepareBlock` (`:61`). Other places guard a JS config the same way
  (`layout/check-field-sections.ts:60`, `:90`).
- `src/lib/media/providers/file-media-provider.ts:72` - `error instanceof MedusaError` is false for an
  error from another copy of `@medusajs/utils` (a linked plugin), so a missing file fails the whole read
  instead of being skipped. `MedusaError.isMedusaError` (`@medusajs/utils/dist/common/errors.d.ts:78`)
  checks a flag the error carries instead.
- `src/lib/collection/prepare-store-query.ts:1` - `booleanString` imported from
  `@medusajs/medusa/api/utils/common-validators/common`, a path inside Medusa's build. `@medusajs/utils`
  exports the same validator as `productValidators.booleanString` (`dist/product/index.d.ts:6`,
  `dist/product/validators.d.ts`), through `@medusajs/framework/utils`, on the same Zod
  (`@medusajs/deps/zod`, which `@medusajs/framework/zod` re-exports).
- `src/lib/registry/prepare-registry.ts:163` - `Object.freeze` is shallow, while the JSDoc (`:82`)
  promises a frozen registry, which `get-registry.ts` keeps for the process.
- `src/lib/document/prepare-document-write.ts:207-208` - a block whose type the area no longer allows is
  written as `{ id, rank }` without `area_id`, safe only because the stale check forbids moving it; the
  JSDoc does not say so.
- `src/lib/media/place-media-records.ts:8-9`, `:25-35` - the JSDoc says "An empty field stays as it is";
  a single media field holding `""` answers `null`, as no record matches it.

Conventions (AGENTS.md, `codee-ts-code-conventions`):

- One subject per file: `src/lib/field/prepare-fields.ts` (562 lines, about eight checks;
  `findFieldColumn` finds and checks), `document/document-errors.ts` (three exports),
  `document/stale-version.ts` (two), `layout/check-component-node.ts` (two), `listHeldValues` in
  `media/list-media-slots.ts` with a second consumer.
- `src/shared/` for helpers outside the server: `field/normalize-slug.ts` and
  `field/format-column-label.ts` are imported by the Admin and keep free of imports by a comment only.
- Named functions without JSDoc: `whenObject`, `isField`, `plural` in `document/build-document-schema.ts`;
  `isText` in `field/validate-slug-fields.ts`.
- Names: `ctx` beside `context` in `build-document-schema.ts`; `listAreaBlocks` and `BlockRow` each name
  different things in two files.
- Types in another domain: `ReadPlacement` and `MediaShapeBlock` in `media/types.ts` carry rich text too.
- Stale comments: plan references in `config/types.ts` ("Phase 2b", "main spec D10"); JSDoc of
  `area/validate-area-link.ts` and `layout/check-component-node.ts` that does not match the code;
  non-ASCII in the JSDoc of `field/normalize-slug.ts`.
- Exports used in their own file only: `STORE_PAGE_SIZE`, `STORE_PAGE_SIZE_MAX`.

Tests: `getCollection`, `formatColumnLabel`, and the transform case of `validateFieldSchema` have no
test; most `validate-` and `prepare-` functions of the registry are tested only through
`registry/__tests__/prepare-registry.unit.spec.ts`.

## Target Behavior

- A save, an autosave and a `report` validation refuse a body that holds one block id more than once, at
  any depth, at the path of each repeat: `sections.1: This block is sent more than once`. Nothing is
  written. A block inside its own repeater is such a repeat.
- A field's or a model's `serverValidation` with a transform over the right type starts; a schema of the
  wrong type still fails at start with today's message.
- A JS config without `labels` on a collection or a block type fails at start with a config error naming
  its place.
- A missing file from a provider whose File Module error comes from another copy of `@medusajs/utils` is
  skipped, as one from the same copy is.
- Everything else behaves as today; Phase 3 changes no behavior.

## Proposed Solution

### Phase 1 - a block id the body holds once

`validate-cms-document` gets a second private helper beside `findStaleBlockErrors`:
`findRepeatedBlockErrors(shape, document)`, which walks `listDocumentBlocks` and returns one error per
block whose `id` an earlier block in the walk already had, at that block's path. A new block, sent
without an `id`, is never a repeat. The step runs it where it runs the stale check, once the shape fits,
and also in `report` mode, as it needs no stored document; its errors join the `INVALID_DATA` lines.

It stays in the step rather than `src/lib/`, as the stale check does: it has one consumer, and
`codee-medusa-testing` tests a step's logic through the step. The Admin sees the error through the
`validate` route's `report` mode (AGENTS.md: a rule the editor's schema cannot hold reaches the editor
through `validate`); the Admin itself never sends an id twice, so no client copy is needed.

### Phase 2 - the smaller defects

- **Schema type check:** `z.toJSONSchema(schema, { io: "input" })` in `validateFieldSchema` and
  `validateModelSchema`. The `catch` stays for the schemas that still cannot be described.
- **`labels`:** `prepareLabels` refuses a `labels` that is not an object with a config error,
  `"labels" needs a singular and a plural`, before reading it.
- **Provider error:** `MedusaError.isMedusaError(error) && error.type === MedusaError.Types.NOT_FOUND`.
- **`booleanString`:** `productValidators.booleanString` from `@medusajs/framework/utils`.
- **JSDoc:** `prepareRegistry` says the registry is frozen at its top level; the stale block row states
  the invariant it relies on; `placeMediaRecords` states that an empty text answers `null`.

### Phase 3 - one subject per file

A moved file is its own commit, a pure rename with the mechanical import fixes only, before the commit
that edits it (AGENTS.md). A function taken out of a file into a new one is no rename and needs none.

- **`normalizeSlug` to `src/shared/slug/`,** with `SLUG_FORMAT` and its test. A host imports it from the
  package root, and a storefront may build a slug the same way, which is what `src/shared/` is for
  (AGENTS.md); there its freedom from imports is held by `eslint.config.ts` instead of a comment. The
  package root keeps exporting it, and the `./shared` entry exports it too.
- **`formatColumnLabel` stays in `src/lib/field/`:** only the plugin's own Admin imports it, and
  `src/shared/` is for code outside the plugin.
- **`prepare-fields.ts` split:** `FIELD_TYPES` and each check get a file of their own named after their
  export; `findFieldColumn` keeps the find, and a new `validateFieldColumn` holds the checks;
  `checkMetadataColumn` becomes `validateMetadataColumn`, the verb the field checks use. `prepareField`
  moves to its own file with `prepareFieldOptions` and the media default, which only it uses.
  `prepareFields` keeps the walk over the config.
- **`buildDocumentErrors` to a file of its own.** `formatDocumentErrors` and `parseDocumentErrors` stay
  together in `document-errors.ts`, and so do the two functions of `stale-version.ts`: each pair writes
  and reads one format, which a private constant holds, so the pair is one subject.
- **`checkComponentField` to a file of its own,** and `listHeldValues` likewise; both have consumers in
  other files.
- **`ReadPlacement` and `MediaShapeBlock` to `document/types.ts`,** as a read's shape covers rich text
  too.
- **Names and comments:** JSDoc for `whenObject`, `isField`, `plural` and `isText`; `ctx` renamed
  `context`; in `build-document-areas.ts`, `BlockRow` becomes `StoredBlockRow` and `listAreaBlocks`
  becomes `listAreaRowBlocks`, and in `prepare-document-write.ts`, `BlockRow` becomes `BlockRowWrite`;
  the plan references in `config/types.ts` dropped; the JSDoc of `validateAreaLink`, `checkComponentField`
  and `checkFieldSections` matched to their code; `STORE_PAGE_SIZE` and `STORE_PAGE_SIZE_MAX` made local.
- **Tests:** unit tests for `getCollection` and `formatColumnLabel`. The checks split out of
  `prepare-fields.ts` keep their coverage in `prepare-registry.unit.spec.ts`, which tests them by their
  messages; a file of their own does not change what they do.

### Alternatives Considered

- **Refuse a repeated id in `buildDocumentSchema`, shared with the Admin:** the schema checks each value
  where it sits and has no walk across areas and repeaters; adding one to a 580-line builder for a case
  the Admin cannot produce costs more than the `report` route already gives.
- **Refuse a cycle only, and let `prepare-document-write` drop a repeated sibling:** a silent drop of a
  block the client sent is the defect itself.
- **Catch the transform separately and skip the type check for it:** a transform over the wrong type
  would then start; `io: "input"` checks the type the plugin actually hands the schema.
- **A local `booleanString`:** AGENTS.md prefers what Medusa provides; the utils export is the same code,
  public.
- **A deep freeze of the registry:** it holds Zod schemas and DML entities that must stay usable; the
  JSDoc is what was wrong.

## Data Model and Persistence

None. No model, column or migration changes. Phase 1 refuses a write before it happens; data already
written with a repeated id stays as it is (see Risks).

## Contracts

- A save, an autosave and the `validate` route answer `400` with one more kind of line,
  `<path>: This block is sent more than once`. No shape changes; the plugin is unreleased.
- A config that starts today starts after Phase 2, except one without `labels`, which fails today too,
  with a `TypeError`.
- Phase 3 moves internal files; the package root and `./shared` keep exporting what they export.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| Two blocks with one stored id in one area | refused at the second's path; nothing written | step unit test of `validate-cms-document` |
| A block sent inside its own repeater | refused at the inner block's path | step unit test |
| One id in two different areas | refused at the later one's path | step unit test |
| Several new blocks without an `id` | passes | step unit test |
| A repeated id in `report` mode | returned among the errors, not thrown | step unit test |
| `serverValidation: z.string().transform(...)` on a text field | starts | unit test of `prepareRegistry` |
| `serverValidation: z.number().transform(...)` on a text field | fails with today's message | unit test of `prepareRegistry` |
| A collection or a block type without `labels` in a JS config | config error at its path | unit test of `prepareRegistry` |
| A NOT_FOUND error carrying Medusa's flag but from another copy | the file is skipped | unit test of `FileMediaProvider` |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A stored document already holds the effects of a repeated id - a block merged, a subtree in a cycle | medium | stored content | none in this sub-spec: the next save of such a document sends the tree as the Admin reads it, which no longer holds the cycle's blocks | rows of a cycle stay in the database, unread; finding them needs a one-off script, not planned |
| A client that sends the same new block twice with a made-up id is now refused | low | Admin, host code | the Admin sends no id for a new block; a host's code that does gets a 400 naming the path | none known |
| The store's `allowed` paths: ten block types that allow each other in their repeaters, eight fields each, at `maxDepth` 4, make about 100,000 paths per area, turned into a `Set` on every store request | low | store reads | left as is (user, 2026-11-20); a config of one container block grows linearly | revisited when a real config comes near |
| A Phase 3 move loses its history | low | git history | a rename commit first, `git status --short` showing `R` and not `RM` | none |

**Rollout:** each phase ships on its own, behind no flag; Phase 3 as a series of rename and content
commits.

**Rollback:** revert the phase's commits. Phase 1 only refuses writes, so reverting it changes no data.

## Dependencies

- None to start. `sub-rich-text-features` depends on Phase 3 (user, 2026-11-20).

## Acceptance Criteria

- [x] A body holding one block id twice, at any depth, is refused at the repeat's path, in a save and in
  `report` mode.
- [x] A transform over the field's type passes the schema check at start; a wrong type still fails.
- [x] A missing `labels` fails at start with a config error naming its place.
- [x] The File Module provider skips a NOT_FOUND error told by `isMedusaError`.
- [x] Nothing in `src/` imports from `@medusajs/medusa/api/utils/common-validators`.
- [x] Phase 3: every file under `src/lib/` holds one subject, and the moves show as renames in history.

## Phasing

### Phase 1 - A save refuses a block id sent twice

**Goal:** no save writes a body that holds a block id more than once.

**Prerequisites:** None.

**Exit gate:** the step's unit tests pass; `yarn lint`, `yarn typecheck`, `yarn format:check` and
`yarn test:unit` pass. The HTTP tests are not required, as no route changes; run manually if wanted.

### Phase 2 - The smaller defects

**Goal:** startup errors name their real cause, a linked plugin skips a missing file, and no import
reaches inside Medusa's build.

**Prerequisites:** None; after Phase 1 in order only.

**Exit gate:** as Phase 1.

### Phase 3 - One subject per file

**Goal:** `src/lib` follows AGENTS.md's one-subject rule, so `sub-rich-text-features` starts from the
final file layout.

**Prerequisites:** Phase 2; the user's approval of each rename commit.

**Exit gate:** as Phase 1, plus `yarn typecheck:admin`, as the Admin imports moved files.

## Implementation Plan

### Phase 1

1. **P1.1 - Refuse a repeated block id**
   - **Outcome:** `validate-cms-document` refuses, or reports, each repeat of a block id at its path.
   - **Areas:** `src/workflows/cms/steps/validate-cms-document.ts`.
   - **Changes:** add `findRepeatedBlockErrors(shape, document)` beside `findStaleBlockErrors`, with its
     JSDoc; run it once the shape fits, in `report` mode and otherwise, and add its errors to the
     `INVALID_DATA` lines and to the report; state the rule in the step's JSDoc.
   - **Verification:** `src/workflows/cms/steps/__tests__/validate-cms-document.unit.spec.ts`, under
     `areas` - two blocks with one id in `sections` refused at `sections.1`; a step holding itself in its
     `tips` refused at the inner path; two new blocks without ids pass; the repeat returned in `report`
     mode. Then the Phase 1 exit gate.

### Phase 2

1. **P2.1 - Check a schema's input type**
   - **Outcome:** a transform over the right type starts.
   - **Areas:** `src/lib/field/validate-field-schema.ts`, `src/lib/field/validate-model-schema.ts`.
   - **Changes:** `z.toJSONSchema(schema, { io: "input" })`; the JSDoc says the input type is read.
   - **Verification:** `src/lib/registry/__tests__/prepare-registry.unit.spec.ts` - a text field's
     `serverValidation: z.string().transform(...)` starts; `z.number().transform(...)` fails with "must
     describe a string"; a collection's model schema with a transform starts.

2. **P2.2 - A config error for a missing `labels`**
   - **Outcome:** a config error names the collection or block type.
   - **Areas:** `src/lib/config/prepare-labels.ts`.
   - **Changes:** refuse a `labels` that is not an object with `buildConfigError`, the guard commented as
     for a JS config.
   - **Verification:** `prepare-registry.unit.spec.ts` - a collection and a block type without `labels`
     each fail with `<path>: "labels" needs a singular and a plural`.

3. **P2.3 - Tell a NOT_FOUND by Medusa's flag**
   - **Outcome:** the provider skips a missing file whichever copy of `@medusajs/utils` threw.
   - **Areas:** `src/lib/media/providers/file-media-provider.ts`.
   - **Changes:** `MedusaError.isMedusaError(error) && error.type === MedusaError.Types.NOT_FOUND`.
   - **Verification:** `src/lib/media/providers/__tests__/file-media-provider.unit.spec.ts` - a plain
     object error with `__isMedusaError: true` and `type: "not_found"` is skipped; any other error still
     throws.

4. **P2.4 - `booleanString` from a public export**
   - **Outcome:** no import reaches inside Medusa's build.
   - **Areas:** `src/lib/collection/prepare-store-query.ts`.
   - **Changes:** `productValidators.booleanString` from `@medusajs/framework/utils`.
   - **Verification:** `prepare-store-query.unit.spec.ts` - the filterable boolean case passes unchanged;
     `grep -rn "common-validators" src` finds nothing.

5. **P2.5 - JSDoc that says what the code does**
   - **Outcome:** three comments match the code.
   - **Areas:** `src/lib/registry/prepare-registry.ts`, `src/lib/document/prepare-document-write.ts`,
     `src/lib/media/place-media-records.ts`.
   - **Changes:** the registry frozen at its top level; the stale block row written without `area_id`
     because the stale check keeps it in its area; an empty text answering `null`.
   - **Verification:** inspection; then the Phase 2 exit gate.

### Phase 3

1. **P3.1 - `normalizeSlug` in `src/shared/`**
   - **Outcome:** `normalizeSlug` and `SLUG_FORMAT` live in `src/shared/slug/normalize-slug.ts`.
   - **Areas:** `src/lib/field/normalize-slug.ts` and its test, `src/shared/index.ts`, `src/lib/index.ts`,
     their importers (`build-document-schema.ts`, `prepare-fields.ts`, `use-slug-fill.ts`,
     `prepare-registry.unit.spec.ts`).
   - **Changes:** commit 1, `git mv` of the file and its test, with the import paths fixed; commit 2, the
     `./shared` entry exports `normalizeSlug`, the import comment goes, and the JSDoc example is ASCII.
   - **Verification:** `git status --short` shows `R` before commit 1; the moved test passes; `yarn lint`
     holds the shared rule.

2. **P3.2 - `prepare-fields.ts` split**
   - **Outcome:** each check and `prepareField` in a file of its own under `src/lib/field/`.
   - **Areas:** `src/lib/field/prepare-fields.ts`, new `field-types.ts`, `validate-metadata-column.ts`,
     `validate-options-hook.ts`, `validate-listed-options.ts`, `validate-field-options.ts`,
     `validate-multiple-values.ts`, `validate-media-field.ts`, `find-field-column.ts`,
     `validate-field-column.ts`, `prepare-field.ts`.
   - **Changes:** move each function with its JSDoc; `findFieldColumn` finds or throws, and
     `validateFieldColumn` runs the checks it ran; no message changes.
   - **Verification:** `prepare-registry.unit.spec.ts` passes unchanged.

3. **P3.3 - One export per file elsewhere**
   - **Outcome:** `buildDocumentErrors`, `checkComponentField` and `listHeldValues` in files of their
     own; `ReadPlacement` and `MediaShapeBlock` in `document/types.ts`.
   - **Areas:** `src/lib/document/document-errors.ts`, new `build-document-errors.ts`;
     `src/lib/layout/check-component-node.ts`, new `check-component-field.ts`;
     `src/lib/media/list-media-slots.ts`, new `list-held-values.ts`; `src/lib/media/types.ts`,
     `src/lib/document/types.ts`; their importers.
   - **Changes:** move each with its JSDoc; the `buildDocumentErrors` cases of
     `document-errors.unit.spec.ts` move to `build-document-errors.unit.spec.ts`.
   - **Verification:** the moved and existing tests pass; `yarn typecheck:admin`, as the Admin imports
     `document-errors.ts`.

4. **P3.4 - Names, comments and unused exports**
   - **Outcome:** the names and comments the Current State lists.
   - **Areas:** `build-document-schema.ts`, `validate-slug-fields.ts`, `build-document-areas.ts`,
     `prepare-document-write.ts`, `config/types.ts`, `validate-area-link.ts`, `check-component-field.ts`,
     `check-field-sections.ts`, `prepare-store-query.ts`.
   - **Changes:** as listed under Proposed Solution, Phase 3, "Names and comments".
   - **Verification:** inspection; `yarn lint`.

5. **P3.5 - The missing tests**
   - **Outcome:** `getCollection` and `formatColumnLabel` have unit tests.
   - **Areas:** new `src/lib/registry/__tests__/get-collection.unit.spec.ts`,
     `src/lib/field/__tests__/format-column-label.unit.spec.ts`.
   - **Changes:** `getCollection` - finds a collection with the registry, throws `NOT_FOUND` naming an
     unknown slug; `formatColumnLabel` - the cases its JSDoc names.
   - **Verification:** the new tests pass; then the Phase 3 exit gate.

## Short Tracker

- `done` - Phases 1 and 2 (2026-11-20): `yarn lint`, `yarn typecheck`, `yarn format:check` and
  `yarn test:unit` pass. The HTTP tests were not run.
- `done` - Phase 3 (2026-11-20): every step committed. `yarn lint`, `yarn typecheck`,
  `yarn typecheck:admin`, `yarn format:check` and `yarn test:unit` pass.
- `done` - closed 2026-11-20 (user), moved to `ended/`.
