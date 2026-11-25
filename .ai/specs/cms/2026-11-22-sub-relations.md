# Relations Between Collections

**Date:** 2026-11-22
**Status:** active
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md) (D9, D21),
[sub-collections-and-documents](./2026-11-04-sub-collections-and-documents.md) (its Phase 5),
[sub-singletons](./ended/2026-11-18-sub-singletons.md) (its Phase 3),
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-22-sub-relations.md`

## TLDR

A collection's field may point at a document of another registered collection: a `relationship` field
on a `belongsTo`'s foreign key, `{ type: "relationship", relationTo: "page", label }`. The server checks
at every write that the id names a live document of the target, and answers which documents point at a
given one. What to do about them at an unpublish or a delete is the host's: it blocks through a
`validate` hook of [sub-workflow-hooks](./2026-11-22-sub-workflow-hooks.md) (user, 2026-11-22). The
first host's homepage settings are its proof: its hook keeps a page in use as a homepage from
vanishing. The server comes first; the plugin's own picker and titles wait for
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md), and meanwhile a
host's options hook draws the field. `manyToMany`, which a blog's tags need, and the store's populated
relations follow in later phases, on the same contract. Takes over 5a, 5c and 5d of
`sub-collections-and-documents` (user, 2026-11-22).

## Open Questions

Phase 1 is done; this one holds Phase 2.

- Q1. **The control a relation is drawn with** (before Phase 2). A select or radios for a `belongsTo`, a
  multiselect or checkboxes for a `manyToMany` (Phase 3): a key of the field, which the plugin's picker
  draws as a field type, or a host's component node, as today? It is a field's question, not a page's,
  so it moved here from `sub-admin-building-blocks` (2026-11-23).

## Problem

The first host stores its homepages as page ids in text columns, picked through its own `pages` options
hook (`apps/backend/src/admin/cms/use-page-options.ts`): nothing checks that an id names a page, and an
editor can unpublish or delete a page in use as a homepage, leaving the storefront a dead id. A blog's
categories and tags (main spec D9) need the same relation, which the plugin does not have, and nothing
can tell what points at a document.

## Current State and Evidence

- No relation is a field. `describeModel` keeps a relation's name, type, target and `nullable`
  (`src/lib/model/describe-model.ts:54-64`), not its foreign key. The key is no column of the DML schema:
  Medusa adds it when it builds the entity, named `options.foreignKeyName` or `camelToSnakeCase` of
  `<name>Id` (`@medusajs/utils` `dist/dml/helpers/entity-builder/relationship-helpers.js:8-11`). A config
  naming `homepage_id` fails at start: "is not a column" (`src/lib/field/find-field-column.ts:20-24`).
- The write path takes a `belongsTo`'s key as a plain value, as the area rows' `area_id` shows
  (`src/lib/document/prepare-document-write.ts:216,228`); `prepareDocumentRow` writes any column key of
  the values (`:131-144`).
- A version keeps the collection's fields (`src/workflows/cms/steps/prepare-cms-version-snapshot.ts:140-150`),
  and a restore runs the update workflow (`restore-cms-document-version.ts:56`), so a relation that is a
  field round-trips and a restored id is checked again.
- Checks against stored data run in `validate-cms-document` from what earlier read steps gave it:
  `list-cms-taken-values` through the service's `list<Plural>`, which leaves soft-deleted rows out, and
  `list-cms-document-media`, refused through `findMissingMedia` (`src/lib/document/find-missing-media.ts`).
- `collection.columns`, which `admin.defaultColumns`, `admin.useAsTitle` and `order` must name, is the
  model's scalar columns (`src/lib/collection/prepare-collection.ts:63-65`, `validate-table-columns.ts:22-25`).
- A combobox with `options: { hook }` is drawn by the host's hook (`build-field-config.ts:51-54`) and its
  value checked as single-line text (`build-document-schema.ts:95-100`).
- The Admin's documents route takes no id filter (`documents/validators.ts:4-10`); nothing in the plugin
  resolves a document id to its title.
- No test model holds a `belongsTo` to another registered collection
  (`integration-tests/modules/test-content/models/`).

## Target Behavior

- A `relationship` field on a `belongsTo`'s key reaches the Admin with its `relationTo`; a write holds the
  id, or `null` when the relation is nullable; an empty text is refused at the field's path, as the
  Admin sends an emptied field as `null` and the foreign key takes no `""`.
- A create, an update, a publish, a restore and the `validate` route refuse an id that names no live
  document of the target, at the field's path. A draft of the target is a live document.
- `GET /admin/cms/collections/:collection/documents/:id/references` answers the live rows that point at
  the document, of any collection, the document itself left out, as `{ collection, field, id }`; the
  workflow behind it and its read step are exported for a host's own code.
- The plugin refuses no unpublish or delete for a reference: a host's `validate` hook does, running the
  `list-cms-references` workflow from its handler - a handler is a step's function, which runs a
  workflow but composes no step; the step serves a host's own workflows.
- Until the plugin's picker, a `relationship` field with `options: { hook }` is drawn as that hook's
  combobox and checked as a relation all the same.
- The store answers the id until Phase 4.

## Proposed Solution

Decided (user, 2026-11-22):

- **The field:** `<key>: { type: "relationship", relationTo: "<collection slug>", label }`, its key the
  `belongsTo`'s foreign key. `type` and `relationTo` follow the common CMS shape; the registry checks that `relationTo`
  names the collection whose model the `belongsTo` targets. The key stays the id column, as D9 names it,
  not a name after the relation: the Admin and a write body hold the id, under the
  name the row has.
- **A draft may be referenced:** a relation takes any live (not deleted) document of its target; the
  store answers a relation's document only once it is published (Phase 4).
- **The plugin reads references; the host decides** (user, 2026-11-22). An unpublish or a delete is not
  refused by the plugin for a reference: a host that must keep a document - a page in use as a homepage,
  which D21 leaves to the settings - registers a `validate` hook of `sub-workflow-hooks` and refuses
  there, running the `list-cms-references` workflow; it may check references the config does not know, a
  menu's, in the same handler. The plugin leaves the key as it is, not set to `NULL`, as a soft delete does not
  trip it.
- **References are rows:** `list-cms-references` reads the live rows, which are what the store serves. An
  id held only in a draft version is not among them; publishing that draft once its target is gone is
  refused by the write check. Before Phase 4 the store answers a draft page's id too, and a storefront
  treats a page it cannot read as missing.
- **A reference from the same collection counts,** except a document's reference to itself, which is
  left out of the answer.
- **The key is a column of the collection:** `admin.defaultColumns`, `admin.useAsTitle` and `order` may
  name it, and a list ordered by it orders by the id.
- **No relationship field on a block** for now: refused at start, as `list-cms-references` reads
  collections only.
- **The route answers slugs and field names,** never labels: a label may be a key of the Admin's
  translations, as `validate-cms-singleton` notes; the Admin names them from the projection. Showing the
  references - "Used in", "Related", a page of a document's relations - is
  `sub-admin-building-blocks`' (user, 2026-11-22).
- **The server first:** Phase 1 now; the plugin's picker (Phase 2) waits for
  `sub-admin-building-blocks` to decide how the Admin draws its fields. Until then a `relationship` field
  takes `options: { hook }` - a relation with options, which keeps its relation behaviour (D9) - and the
  Admin draws it as the hook's combobox, as the host's `pages` hook does today.
- **Shaped for `manyToMany`** (Phase 3), which a blog's tags need: the field's config is the same, the
  model telling the kind; `list-cms-related-documents` reads a list of ids as it reads one, and
  `list-cms-references` answers the same shape once it reads through a pivot.

### Alternatives Considered

- **Medusa's module links** (`defineLink`). Rejected: links join models of different modules; inside one
  module a DML relation is Medusa's way, a link adds a pivot table even for one id, is written outside
  the module service the plugin writes through, and cannot be filtered by `query.graph` without the Index
  Module.
- **`relationTo` left out,** the target read from the model alone. Rejected for an explicit shape, as an
  established CMS has it (user, 2026-11-22); the registry checks the two agree.
- **`ON DELETE SET NULL`.** Rejected: a homepage the settings hold (D21) would vanish at a
  delete.
- **The plugin refusing an unpublish or a delete of a referenced document** (written and reviewed first,
  2026-11-22). Rejected for the host's hook (user, 2026-11-22): the policy is the project's, a host may
  need references the config does not know, and one relation may want a refusal where another does not.
- **A relation limited to published targets, by config.** Left for Phase 2, with the picker: the first host takes only a published page as a homepage through its
  `pages` hook, which lists published pages, and its `validate` handler on create and update
  (`src/cms/validate-homepage-published.ts`, 2026-11-22), as a draft homepage is one the storefront
  cannot show.
- **`onDelete: "restrict"` on a field,** a refusal by config. Left for later: a host writes its rule in
  the hook today, and the key can come additively.
- **A text column with a hook,** as the host has it. Kept only as the Admin's drawing until Phase 2: it
  checks nothing on the server.

## Data Model and Persistence

The plugin adds no table. A relation is the host's DML on its own models:

- A `belongsTo` adds its foreign key column and an index `WHERE deleted_at IS NULL`
  (`@medusajs/utils` `dist/dml/helpers/entity-builder/define-relationship.js:286-291`), and DML requires
  the other side, a `hasMany` on the target (`:349`).
- The foreign key of a nullable `belongsTo` is `on delete set null`, as the test module's
  `Migration20261122143614` shows, a required one's has no delete rule, so a hard `DELETE` of its target
  fails (the host's `Migration20261122144827`), and `cascade` when the parent cascades
  (`:190, 276-278`); each rule acts at a hard `DELETE` only, so the plugin's soft delete never trips it, and only a host's `validate`
  hook guards the target.
- `mappedBy` is set on both sides: DML defaults it to the snake-case entity name (`:164, 181`), and a
  model with two relations to one target, or one to itself, needs each named.
- The `hasMany` of a relation stays out of the target's `.cascades()`: a cascade would soft-delete the
  referencing rows with the target and set the key's delete rule to `cascade`.
- A self-relation is Medusa's own pattern: `parent_category` and `category_children` of
  `@medusajs/product`'s `ProductCategory`.
- Migrations are the user's: the test module's in P1a.3, the host's in `sub-singletons`' Phase 3, where
  every stored id must name an existing page, and none be `""`, before the key is added.

## Contracts

All additive; the plugin is not published yet (AGENTS.md, Plugin Contract).

- **Config:** `RelationshipField` in `FieldConfig`: `type: "relationship"`, `relationTo`, `label`,
  optional `options: { hook }`, `serverValidation`, `admin`.
- **Projection** (`GET /admin/cms/collections`): the field's kind `relationship` and `relationTo`.
- **Writes:** a body holds the id or `null`; an id naming no live document of the target answers 400
  `INVALID_DATA` at the field's path.
- **`GET /admin/cms/collections/:collection/documents/:id/references`:** `{ references: { collection,
  field, id }[] }`, 404 for a document that is not live.
- **Workflows:** the steps `list-cms-related-documents` and `list-cms-references`, and the workflow
  `list-cms-references`, exported from `./workflows` with the others; unpublish and delete unchanged.
- **Store API:** unchanged; a relationship field is a public column.
- **Cost:** a write reads once per target its relationship fields name; a read of references once per
  relationship field that targets the collection, on the foreign key's index.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| An id names no live document of the target (unknown, deleted, of another collection) | 400 at the field's path, nothing written | HTTP test (P1b.1) |
| An id names a draft of the target | accepted; the store answers the id | HTTP test (P1b.1) |
| The references of a document live rows point at, of its own collection and of others | each row once per field, the document itself left out | workflow and HTTP tests (P1b.2) |
| The references of a document nothing points at, or of a collection no relationship targets | `[]`; no query when no field targets the collection | step unit tests (P1b.2) |
| An unpublish or a delete of a referenced document, without a host's hook | passes, as today; the referencing row keeps the id | workflow test (P1b.2) |
| A draft version holds the only reference to a deleted document | the delete passes; the draft's publish answers 400 at the field | HTTP test (P1b.1) |
| A restore of a version whose related document is gone | 400 at the field, nothing written; a required relation's version cannot be restored until it is changed | HTTP test (P1b.1) |
| A document's relation set to its own id | accepted; left out of its own references | HTTP and workflow tests (P1b.1, P1b.2) |
| A `relationTo` that is not the model's target, a relationship on a block, a key that is no `belongsTo`'s | the start is refused, naming the collection and the field | registry unit tests (P1a.2) |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A page in use is unpublished or deleted where no host's hook refuses it. | medium | content | `sub-workflow-hooks` before `sub-singletons`' Phase 3; the first host's hook refuses it for its homepages. | A host without a hook, by its own choice. |
| A save checks an id while another editor deletes its target, and both pass. | low | content | Accepted: the check and a host's refusal run in their own workflows, and a soft delete does not trip the foreign key. | A row pointing at a deleted document; the store answers its id, and the next save refuses it. |
| A host's migration to `belongsTo` adds a foreign key over existing ids. | medium | data | The host's spec says every stored id must name an existing page, and none be `""`, first; the user reviews the migration. | A failed migration until the ids are fixed. |

**Rollout:** additive; a host opts in per field.

**Rollback:** the host's field goes back to `type: "combobox"` and its model to a text column; the
foreign key goes with the user's migration.

## Dependencies

- `drafts: false` (5b of `sub-collections-and-documents`), done.
- Phase 2 waits for 2a of `sub-admin-building-blocks` (the Admin list's `id`, a relation drawn by its
  title) and for Q1.
- `sub-singletons`' Phase 3 waits for Phase 1 and for `sub-workflow-hooks`, whose `validate` hook its
  host registers.

## Acceptance Criteria

- [ ] A `relationship` field on a `belongsTo`'s key passes the registry; a wrong `relationTo`, a field on a
      block and a key that is no `belongsTo`'s stop the start.
- [ ] A write with an id that names no live document of the target answers 400 with nothing written.
- [ ] The references route answers the rows that point at a document, itself left out.
- [ ] The first host's homepage fields are relations, drawn by its `pages` hook, and its `validate` hook
      refuses an unpublish and a delete of a homepage page - one walkthrough with `sub-singletons`'
      Phase 3.

## Phasing

| Phase | Goal | Prerequisites |
|---|---|---|
| **1 Relations on the server** | `belongsTo` fields: the registry, the write check, the read of references and its route | 5b |
| **2 The plugin's picker** | A combobox over the target's documents with `q` and `useAsTitle`, its stored value labelled through the Admin list's `id`; the `id` and a relation shown by its title on cards and cells come from 2a of `sub-admin-building-blocks` | 2a of `sub-admin-building-blocks`; Q1 |
| **3 `manyToMany`** | A list of ids (`<singular>_ids`), the write's relation property, references through the pivot; the test module's tags on recipes | Phase 1 |
| **4 Store reads** | A relation's published document under the relation's name, relation filters with a correct `count` and pagination (5d) | Phase 1 |

**Exit gate of Phase 1:** P1a.1 to P1b.2 done; plugin unit tests, HTTP tests, typecheck, admin
typecheck, lint and format check pass; then one walkthrough in the host closes both this phase and
`sub-singletons`' Phase 3, which starts once P1b.2 and `sub-workflow-hooks` are done: the homepage fields
`relationship`s drawn by the `pages` hook, a homepage page refused by the host's hook.

## Implementation Plan

### Phase 1

#### Sub-phase 1a - The field

1. **P1a.1 - A `belongsTo`'s foreign key in the model's description**
   - **Outcome:** `ModelRelation` of a `belongsTo` carries `foreignKey`: `options.foreignKeyName`, or
     `camelToSnakeCase` of `<name>Id`, through Medusa's own `getForeignKey` (`@medusajs/framework/utils`).
   - **Areas:** `src/lib/model/types.ts`, `src/lib/model/describe-model.ts`,
     `src/lib/area/validate-area-link.ts` (reads `foreignKey` in place of `` `${owner.name}_id` ``).
   - **Verification:** `describe-model` unit tests - the default key, a camelCase relation name, a
     `foreignKeyName`, and the key absent from `columns`. `yarn test:unit`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`.

2. **P1a.2 - `relationship` in the config, the registry and the projection**
   - **Outcome:** a `relationship` field on a `belongsTo`'s key reaches `GET /admin/cms/collections` with
     its kind and `relationTo`; a write's shape takes one non-empty single-line id or `null`; the key joins
     `collection.columns`. Refused at start, naming the collection and the field: a key that is no
     `belongsTo`'s, a `relationTo` that is no registered collection or not the relation's target, a target
     that is a block, a relationship field on a block, and a field of another type on a `belongsTo`'s key.
     A non-nullable `belongsTo` needs its field, as `validateRequiredColumns` asks of a column, and a
     `serverValidation` refusing `null`. The field takes `options: { hook }`, checked as a combobox's hook
     name is; the Admin draws a field with a hook as the hook's combobox and one without as a text input,
     and shows its value as the combobox's or as text, so the Admin typechecks at every step.
   - **Areas:** `src/lib/config/types.ts` (`RelationshipField` in `FieldConfig`), `src/lib/field/field-types.ts`,
     `src/lib/field/types.ts` (`FieldKind`, `RegistryField.relationTo`), `find-field-column.ts` (a
     `belongsTo`'s key as the field's column, nullable as the relation), `validate-required-columns.ts`,
     `src/lib/collection/prepare-collection.ts` and `validate-table-columns.ts` (the key among `columns`),
     `src/lib/block/prepare-block.ts` (the refusal on a block), `src/lib/field/prepare-field.ts`
     (`relationTo` and the hook projected), `src/lib/field/validate-field-column.ts` and
     `src/lib/field/validate-options-hook.ts` (the hook checked for a relationship too, its messages naming
     the field's type), `src/lib/field/validate-field-schema.ts` (the kind in its exhaustive `switch`),
     `src/lib/collection/validate-relationship-targets.ts` (new, run by `prepare-collection.ts`, which
     has every collection's config, as `prepare-collection-actions` reads it; it also asks a required
     `belongsTo` for its field), `src/lib/block/validate-block-fields.ts` (new: the refusal on a block),
     `src/lib/model/describe-model.ts` (`foreignKeyColumns`, each key as a text column), `src/lib/document/build-document-schema.ts`
     (`buildValueSchema`, shared with the Admin), `src/lib/collection/types.ts`,
     `src/admin/cms/common/utils/build-field-config.ts` and `document-fields/document-field-value.tsx`
     (the kind in their maps).
   - **Verification:** `prepare-registry` unit tests per refusal, a valid relation, and the key in
     `columns`, `defaultColumns` and `useAsTitle`; a `build-document-schema` test of the value; a
     `list-cms-collections` test of `relationTo` and the hook. `yarn test:unit`, `yarn typecheck`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

3. **P1a.3 - The test module's relation** (the user's migration)
   - **Areas:** `integration-tests/modules/test-content/models/` - `TestSettings.featured_recipe`, a nullable
     `belongsTo` to `TestRecipe`, and `TestRecipe.featured_in`, its `hasMany`; `TestRecipe.related_recipe`,
     a nullable `belongsTo` to `TestRecipe` itself, and `TestRecipe.related_by`, its `hasMany`; the test
     config's `featured_recipe_id: { type: "relationship", relationTo: "recipe", label: "Featured recipe" }`
     on `settings` and `related_recipe_id` on `recipe`, the same way. A singleton's reference and a
     collection's own give the references read two sources; a collection with drafts covers a draft
     version, a restore and a reference to itself. The relation is generic, so these prove it for every pair.
   - **Verification:** `yarn typecheck`, `yarn lint`, `yarn format:check`; the user's
     `yarn test:db:generate` and migration; `yarn test:integration:http` passes.

**Exit gate of 1a:** P1a.1 to P1a.3 done and their checks passing.

#### Sub-phase 1b - The checks

1. **P1b.1 - A relation's id is a live document of its target**
   - **Outcome:** a create, an update, a publish and the `validate` route refuse an id that is no live
     document of the target, at the field's path; `null` passes when the field allows it; the Admin's
     read answers the key.
   - **Areas:** `src/workflows/cms/steps/list-cms-related-documents.ts` (new: for each relationship field
     holding a value, the live ids among the submitted ones, one `list<Plural>` per target, as
     `list-cms-taken-values` reads, without its `id: { $ne }` exclusion, so a document may point at
     itself), `validate-cms-document.ts` (a `related` input, `findMissingRelations`
     in `src/lib/document/`, as `findMissingMedia` is), `create-cms-document.ts`, `update-cms-document.ts`
     (both branches), `publish-cms-document.ts`, `validate-cms-document.ts` (the workflow), each
     workflow's JSDoc of its steps, `src/workflows/index.ts`.
   - **Verification:** unit tests of the step, of `findMissingRelations` and of `validate-cms-document`'s
     new error; HTTP tests - `featured_recipe_id` in the Admin's read, a deleted recipe's id and `""`
     refused on `settings`, a draft recipe's id accepted, the `validate` route reporting it; on `recipe`,
     a recipe pointing at itself accepted, a published recipe's draft pointing at a recipe deleted since
     refused at its publish, and a restore of a version whose related recipe is gone refused. `yarn test:unit`, `yarn test:integration:http`, `yarn typecheck`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

2. **P1b.2 - The references of a document**
   - **Outcome:** `GET /admin/cms/collections/:collection/documents/:id/references` answers
     `{ references: { collection, field, id }[] }`: the live rows pointing at the document, of any
     collection, one per field, the document itself left out; 404 for a document that is not live.
     Unpublish and delete are unchanged.
   - **Areas:** `src/workflows/cms/steps/list-cms-references.ts` (new: given a collection and an id, every
     relationship field whose `relationTo` is the collection, read from the registry, one `query.graph`
     per field filtered by its key, none when no field targets the collection; its input type declared
     here only, as both are re-exported through `export *`), `src/workflows/cms/workflows/list-cms-references.ts`
     (new: `getCmsDocumentStep` with `with_areas: false`, as `unpublish-cms-document.ts` reads, then the
     step, as `list-cms-documents` has a step and a workflow), `route.ts` in
     `src/api/admin/cms/collections/[collection]/documents/[id]/references/`, its matcher (GET,
     `ensureCollection`) in `[id]/middlewares.ts` beside `/versions` and `/unpublish`,
     `src/workflows/index.ts`.
   - **Verification:** step unit tests (no relation to the collection, no reference, references from
     two fields and from the collection itself, a reference to itself left out); a workflow test,
     `integration-tests/http/cms/workflows/references.spec.ts`, the references of a recipe the settings
     and another recipe point at, and a delete of it passing as today; an HTTP test of the route and its
     404. `yarn test:unit`, `yarn test:integration:http`, `yarn typecheck`, `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`.

**Exit gate of 1b:** P1b.1 and P1b.2 done and their checks passing; with `sub-workflow-hooks`,
`sub-singletons`' Phase 3 may start, and its walkthrough closes Phase 1.

### Phases 2 to 4

Written when each is next, by its goal above.

## Short Tracker

- `done` - the spec. Moved from the relation slice of
  `sub-collections-and-documents` (5a, 5c) on 2026-11-22, with the user's decisions of the same day;
  reviewed there twice (a single reviewer): three high and six medium findings, then one high and two
  medium, applied; the sub-spec reviewed on its own the same day, four medium findings applied, approved
  by the user without a further review. The plugin's refusal of P1b.2 replaced by the read of references
  and its route, the refusal the host's through `sub-workflow-hooks` (user, 2026-11-22); reviewed after
  the change, one high and three medium findings applied.
- `done` - Phase 1 (2026-11-22). 1a: P1a.1 built: `foreignKey` through `getForeignKey`. P1a.2 built:
  `type: "relationship"`, the key a column of the collection from `foreignKeyColumns`, the checks of
  `validate-relationship-field` (field) and `validate-relationship-targets` (collection, with the
  required `belongsTo`), the refusal on a block, `""` refused, and in the Admin a hook's combobox or a
  text input. P1a.3: `TestSettings.featured_recipe` and `TestRecipe.related_recipe` with their
  `hasMany`, and both fields in the test config; the user's `Migration20261122143614`. 1028 unit tests,
  188 HTTP tests, typecheck, admin typecheck, lint and format check pass. 1a done. P1b.1 built
  (2026-11-22): `list-cms-related-documents` before `validate-cms-document` in create, both branches of
  update, publish and the `validate` workflow, `findMissingRelations` refusing an id with no live
  document; HTTP tests in `integration-tests/http/cms/relationships.spec.ts`. 1037 unit tests, 197 HTTP
  tests, typecheck, admin typecheck, lint and format check pass. P1b.2 built (2026-11-22): the step and
  the workflow `list-cms-references`, `GET .../documents/:id/references` with its matcher in
  `[id]/middlewares.ts`; 1041 unit tests, typecheck, admin typecheck, lint and format check pass; the
  HTTP tests - `integration-tests/http/cms/relationships.spec.ts` and
  `integration-tests/http/cms/workflows/references.spec.ts` - passed in the user's run (2026-11-22). The
  user's walkthrough in the host passed (2026-11-22), with `sub-singletons`' Phase 3: the homepage fields
  relations drawn by the `pages` hook, a save naming a deleted page refused at its field, and the host's
  `validate` handler (`src/workflows/hooks/validate-cms-documents.ts`) refusing an unpublish and a delete of a
  homepage page while another page passes. Committed (`8888f31`, `80aca67`, `3393f0d`).
- `pending` - **next**: Phase 2, the plugin's picker, after 2a of `sub-admin-building-blocks` and Q1;
  Phases 3 and 4 by their goals.
- `pending` - Phase 2's picker also draws a table's relationship filter an editor picks, which 2d of
  [sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md) leaves to it (2026-11-24).
