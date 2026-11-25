# Store Public Fields

**Date:** 2026-11-20
**Status:** done
**Area:** backend
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-20-sub-store-public-fields.md`

## TLDR

What the store may answer of a document is decided in two places that each keep their own copy of the
rule: `prepareStoreQuery` builds `allowed`, what a client may select, and `buildStoreSelection` turns the
selected fields into what the store reads and answers. Both list the document's columns and both define
`listPublicFields`, and the copies already differ: one adds `metadata` only when the model has the
column, the other always. This sub-spec gives the rule one source that both read: `listPublicFields` and
`listStoreColumns`, each in a file of its own in `src/lib/collection/`, and the document's store columns
worked out once, when the registry prepares the collection, and kept on it as `storeColumns`. No route,
request or response shape changes.

## Settled

User, 2026-11-20, after a review of `src/lib`:

- **One source for the store's public fields:** yes, in `src/lib/collection/`, read by both sides.
- **Scope:** this sub-spec covers the store's public fields only. The review's other findings go to
  [sub-lib-review-fixes](../2026-11-20-sub-lib-review-fixes.md), not to a working note. `accept` on a
  media field goes to [sub-media-mime-types](../2026-11-20-sub-media-mime-types.md).
- **No exception in AGENTS.md** for the media providers that call the File Module from `src/lib/`; not
  now.

## Problem

A store read passes two gates. Medusa checks the request's `fields` against `allowed`, built at startup by
`prepareStoreQuery`; then `buildStoreSelection` reads the resolved fields again to decide which columns,
areas, block types and block fields the read returns. Each gate defines "public" itself. A new rule - a
column added to the answer, a new `store` flag beside `hidden` - written into one copy lets a field pass
the first gate and be dropped silently by the second, or reach the second without the first having
allowed it. That is the area CODE_REVIEW.md marks a blocker: a public store field outside an allowed
list.

## Current State and Evidence

- `src/lib/collection/prepare-store-query.ts:21` - `DOCUMENT_STORE_COLUMNS = ["id", "published_at",
  "updated_at"]`; `:211-215` builds `columns` from them, `metadata` when `input.hasMetadata`, and the
  public fields, and uses `columns` for `allowed` and for both routes' `defaults`.
- `src/lib/collection/prepare-store-query.ts:42` - `listPublicFields(fields: RegistryField[])`, also
  used for block fields in `listAreaPaths` (`:76`).
- `src/lib/document/build-store-selection.ts:26` - `DOCUMENT_COLUMNS = ["id", "published_at",
  "updated_at", "metadata"]`, `metadata` always.
- `src/lib/document/build-store-selection.ts:34` - `listPublicFields(holder: Pick<RegistryBlock,
  "fields">)`, the same filter on another parameter shape, used for the collection (`:203`) and for block
  types (`:110`, `:175`).
- `src/lib/collection/prepare-collection.ts:141-151` - the only caller of `prepareStoreQuery`; it works
  out `hasMetadata` from the model's columns and keeps the result as `RegistryCollection.storeQuery`.
- `src/lib/collection/types.ts:73` - `StoreQuery` is `{ list, retrieve }`, and its keys are the store
  routes: `src/api/middlewares/verify-store-query.ts:22` and
  `src/workflows/cms/steps/prepare-cms-store-documents.ts:28` take `route: keyof StoreQuery` and read
  `storeQuery[route].config`. A key that is not a route breaks both.
- `src/lib/index.ts` - neither `StoreQuery` nor `RegistryCollection` is exported from the package root,
  so neither is part of the public contract.
- `src/workflows/cms/steps/get-cms-document.ts:109`, `list-cms-documents.ts:80`,
  `prepare-cms-store-documents.ts:47` - the callers of `buildStoreSelection`; each passes the registry
  collection from `getCollection`.
- `src/lib/document/__tests__/build-store-selection.unit.spec.ts` - builds its collection with
  `prepareRegistry(buildTestConfig())`. The test config's `tag` collection (`TestTag`) has no `metadata`
  column; `recipe` (`TestRecipe`) has one.
- `src/lib/collection/__tests__/prepare-store-query.unit.spec.ts:33` - its `INPUT` passes
  `hasMetadata: true`.
- **Inference:** the `metadata` difference is latent today. Medusa refuses a `metadata` the model lacks
  before `buildStoreSelection` runs, unless a project's `allowFields` names it; then the selection asks
  for a column the model does not have.

## Target Behavior

- One function, `listPublicFields`, decides which fields of a collection or a block type the store may
  answer; `prepareStoreQuery`, `listStoreColumns` and `buildStoreSelection` call it.
- One function, `listStoreColumns`, decides the document's columns the store answers - `id`,
  `published_at`, `updated_at`, `metadata` when the model has it, and the public fields. It runs once per
  collection at startup; `allowed`, the routes' `defaults` and the selection all start from its result.
- A collection without a `metadata` column has no `metadata` column in its selection either.
- Every store read returns what it returns today.

## Proposed Solution

- **`src/lib/collection/list-public-fields.ts`** - exports `listPublicFields(fields: RegistryField[]):
  string[]`, the names of the fields without `store: { hidden: true }`. It takes the fields, not a
  holder, so a collection's and a block type's are passed alike. Both local copies go.
- **`src/lib/collection/list-store-columns.ts`** - exports `listStoreColumns(fields: RegistryField[],
  hasMetadata: boolean): string[]`, with `DOCUMENT_STORE_COLUMNS` moved into it from
  `prepare-store-query.ts`. One subject per file (AGENTS.md), so it does not share a file with
  `listPublicFields`.
- **`RegistryCollection.storeColumns`** - `prepareCollection` calls `listStoreColumns` once with the
  collection's fields and whether its model has `metadata`, keeps the result as `storeColumns`, and
  hands it to `prepareStoreQuery`.
- **`prepareStoreQuery`** takes the columns instead of working them out: `StoreQueryInput.hasMetadata`
  becomes `columns: string[]`, used for `allowed` and both routes' `defaults` as today. `fields` stays in
  the input for the filterable fields' check.
- **`buildStoreSelection`** starts from `collection.storeColumns` instead of `DOCUMENT_COLUMNS` plus the
  collection's public fields. Its `collection` parameter widens from `Pick<RegistryCollection, "fields"
  | "areas">` to `Pick<RegistryCollection, "fields" | "areas" | "storeColumns">`; every caller already
  passes the whole registry collection. For block types it calls the shared `listPublicFields` with
  `block.fields`.
- `listAreaPaths` and `selectAreaPath` stay as they are: one lists every path, the other reads the paths
  requested, and both now get a block's public fields from the same function.

### Alternatives Considered

- **`columns` on `StoreQuery`, beside `list` and `retrieve`:** `keyof StoreQuery` names the store routes
  in `verify-store-query.ts` and `prepare-cms-store-documents.ts`; a third key that is no route breaks
  both, and fixing them means a route type in `src/api/` and `src/workflows/` for a change that belongs
  to `src/lib/`.
- **Share the column constant only, and keep `hasMetadata` on the registry collection for
  `buildStoreSelection` to repeat the `metadata` rule:** the rule would still be written twice.
- **Read the columns back out of `storeQuery.list.config.defaults`:** a project's `store.list.defaults`
  replaces them, so they are not the columns the store may answer.
- **Read them out of `allowed`, keeping the entries without a dot:** `allowed` mixes columns with area
  names; telling them apart re-derives what `listStoreColumns` returns.

## Data Model and Persistence

None. No model, column or migration changes.

## Contracts

- No route, request, response or config changes. The store answers what it answers today.
- `RegistryCollection` gains `storeColumns: string[]`; `StoreQueryInput` swaps `hasMetadata` for
  `columns`. Both are internal to the plugin (not exported from the package root), and the plugin is
  unreleased, so no compatibility bridge is needed.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A collection with a `metadata` column, `fields=metadata` | `metadata` is a selected column, as today | unit test of `buildStoreSelection` on `recipe` (existing case) |
| A collection without a `metadata` column, the selection handed `metadata` (only through a project's `allowFields`) | `metadata` is not among its columns; it is handed on under `paths`, as any other path a project opened, and the project answers for it | unit test of `buildStoreSelection` on `tag` |
| A field with `store: { hidden: true }` | in neither `allowed` nor any selection's columns, on a collection or a block type | unit tests of `listPublicFields`, `listStoreColumns`, `prepareStoreQuery` and `buildStoreSelection` (existing hidden-field cases kept) |
| A model without `metadata` | `storeColumns` lacks it; `allowed` and `defaults` match `storeColumns` | unit tests of `listStoreColumns` and of the registry's `tag` collection |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A store read returns a different set of fields after the change | medium | store list and retrieve | the unit tests of `buildStoreSelection`, `buildStoreDocument`, `buildStoreReadFields` and `prepareStoreQuery` keep their expectations; only `prepareStoreQuery`'s `INPUT` changes shape | none known |

**Rollout:** a refactor of `src/lib` with no data or contract change; it ships in one commit.

**Rollback:** revert the commit.

## Dependencies

- None. `sub-collections-and-documents` owns the store reads (D20); this sub-spec changes no behavior it
  specifies.

## Acceptance Criteria

- [x] `listPublicFields` is defined once, in `src/lib/collection/list-public-fields.ts`, and every caller
  imports it.
- [x] The document's store columns are listed once, in `src/lib/collection/list-store-columns.ts`;
  `DOCUMENT_COLUMNS` and `DOCUMENT_STORE_COLUMNS` are gone from the builders.
- [x] `buildStoreSelection` on a collection without a `metadata` column selects no `metadata` column.
- [x] The existing unit tests of `src/lib/collection` and `src/lib/document` keep their expectations;
  only `prepareStoreQuery`'s input changes shape.

## Phasing

### Phase 1 - One source for the store's public fields

**Goal:** `allowed` and the store's selection read the same functions and the same column list.

**Prerequisites:** None.

**Exit gate:** the steps' unit tests pass; `yarn lint`, `yarn typecheck`, `yarn format:check` and
`yarn test:unit` pass. The store HTTP tests in `integration-tests/http/` are not required, as no route
changes; run them manually if wanted.

## Implementation Plan

### Phase 1

1. **P1.1 - `listPublicFields` in a file of its own**
   - **Outcome:** one `listPublicFields`, used by both builders.
   - **Areas:** `src/lib/collection/list-public-fields.ts` (new),
     `src/lib/collection/prepare-store-query.ts`, `src/lib/document/build-store-selection.ts`.
   - **Changes:** add `listPublicFields(fields: RegistryField[]): string[]` with its JSDoc; delete both
     local copies; `buildStoreSelection` passes `collection.fields` and `block.fields`.
   - **Verification:** new `src/lib/collection/__tests__/list-public-fields.unit.spec.ts` - keeps a field
     without `store`, keeps one with `store: { filterable: true }`, drops one with `store: { hidden: true
     }`, keeps the fields' order. Existing unit tests of both builders pass unchanged.

2. **P1.2 - The document's store columns worked out once**
   - **Outcome:** `prepareStoreQuery` and `buildStoreSelection` read the columns `listStoreColumns`
     worked out for the collection.
   - **Areas:** `src/lib/collection/list-store-columns.ts` (new), `src/lib/collection/types.ts`
     (`RegistryCollection`), `src/lib/collection/prepare-collection.ts`,
     `src/lib/collection/prepare-store-query.ts`, `src/lib/document/build-store-selection.ts`.
   - **Changes:** add `listStoreColumns(fields, hasMetadata)` with `DOCUMENT_STORE_COLUMNS` and its JSDoc;
     `RegistryCollection` gets `storeColumns: string[]`, documented as the document's columns the store
     answers; `prepareCollection` sets it and passes it to `prepareStoreQuery`, whose
     `StoreQueryInput.hasMetadata` becomes `columns`; `buildStoreSelection` takes `Pick<RegistryCollection,
     "fields" | "areas" | "storeColumns">`, starts from `collection.storeColumns`, and drops
     `DOCUMENT_COLUMNS`. Its JSDoc says where the columns come from.
   - **Verification:** new `src/lib/collection/__tests__/list-store-columns.unit.spec.ts` - `id`,
     `published_at`, `updated_at` and the public fields, `metadata` only with `hasMetadata`, a hidden field
     left out. `prepare-store-query.unit.spec.ts` - `INPUT` passes `columns: listStoreColumns(fields,
     true)` from its own fields, not a hand-written list, so its "without a hidden field" cases still run
     the real rule; the expectations stay.
     `build-store-selection.unit.spec.ts` - on the `tag` collection, `metadata` among the fields is not a
     selected column and is under `paths`. Then the Phase 1 exit gate.

## Short Tracker

- `done` - Phase 1, P1.1 and P1.2 (2026-11-20): `yarn lint`, `yarn typecheck`, `yarn typecheck:admin`,
  `yarn format:check` and `yarn test:unit` pass. The store HTTP tests were not run.
- `done` - closed 2026-11-20 (user), moved to `ended/`.
