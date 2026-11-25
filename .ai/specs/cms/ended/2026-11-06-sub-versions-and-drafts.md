# CMS Versions and Drafts

**Date:** 2026-11-06
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-06-sub-versions-and-drafts.md`

## TLDR

Version 0.0.2 of the plugin (main spec D22), built as sub-phase 1b of `sub-collections-and-documents`:
right after its pages (1a) and before its blocks (1c), so blocks enter versions from the start (user,
2026-11-09). Every save records a version of the document in one plugin
table, `cms_version`, and saving a published document stops changing live content: the change waits in
the latest draft version until **Publish** applies it through the write path 0.0.1 already has. Editors
get a history - who saved each version, when, and which fields it changed - with restore, and **Discard
changes**. The store API does not change.

**Paths.** As in `sub-collections-and-documents`: `src/` is this repository, and a host project's paths
are named as such.

## Problem

- Until now saving a published document changes live content at once (main spec D8), so a half-finished
  edit or a mistake is public the moment it is saved.
- Nothing records what a document looked like before a save, and a removed block cannot be brought back.
- A draft read (`sub-draft-read`) needs a draft to exist apart from the published state.

## Current State and Evidence

- Main spec D8, D13, and `sub-collections-and-documents`: the published state lives on the row.
  `update-cms-document` (P1a.5) reads the stored document, takes a partial body - a key left out stays
  as stored - checks the stored editable values with the body over them, and writes through
  `prepare-cms-write`, which takes the stored document, and one write step per kind of call:
  `create-cms-document-content`, `update-cms-document-content` and, from 1c,
  `delete-cms-document-content`. `publish-cms-document` and `unpublish-cms-document` (P1a.6) write the
  status through `update-cms-document-content`.
- The Admin's document page (P1a.5) sends every field it shows, an emptied one as `null`, and leaves
  out hidden fields and, until 1f, media; its fields are laid out by `admin.groups`, and a slug is locked
  until unlocked.
- A version row holds the full document; the main row keeps the published state and the draft lives
  in the version table, so a public read never needs to know about drafts; a restore appends a new
  version. The `latest` flag is not kept with a racy follow-up update, and cap errors are not swallowed.
- The plugin's `cms` module has no models yet (main spec D16). A plugin's migrations come from
  `medusa plugin:db:generate` (`@medusajs/medusa` 2.21.2 `dist/commands/plugin/db/generate.js`).
- `cms_version` and the project's `content` module are two modules, and a content save is several
  generated calls, so no single database transaction covers a save (main spec D23).
- Medusa's error handler replaces the message of a `CONFLICT` error with a text about `Idempotency-Key`
  (`@medusajs/framework` 2.21.2 `dist/http/middlewares/error-handler.js`), so a stale save is refused with
  `NOT_ALLOWED`, which keeps its message.
- An established CMS stops two editors with a lock: a hidden collection, 300 s, renewed by the form.
  Medusa's orders number their versions
  (`@medusajs/order` `dist/models/order.js:34`).
- A generated `update` only persists, and the transaction's one flush writes inserts before updates, so
  taking `latest` from one version and inserting the next one as latest needs a flush between them
  ([lesson](../../../lessons/mikro-orm-writes-inserts-before-updates-in-one-flush.md)); moving the flag
  between two rows is two calls for the same reason.
- `plugin:db:generate` connects to Postgres before it diffs (`@medusajs/medusa` 2.21.2
  `dist/commands/plugin/db/generate.js:70-92`), so it runs with `DATABASE_URL`, or `DB_HOST`,
  `DB_USERNAME` and `DB_PASSWORD`, set.
- A model's key in a service has to match its DML name
  ([lesson](../../../lessons/a-model-key-in-medusaservice-must-match-its-dml-name.md)), so the key is
  `CmsVersion`.

## Target Behavior

- A save never changes what the store API serves for a published document. Only **Publish** does.
- A document in `draft` status keeps its row as the working copy, so lists and search show it, and every
  save also records a version.
- A published document with unsaved-to-live changes shows them in Admin, and the store API keeps serving
  the published state.
- Saving validates the shape; required fields are checked at **Publish**, also for a document already
  published. This replaces 0.0.1's rule that saving a published document validates as if publishing.
- **Publish** applies the latest draft version to the rows through 0.0.1's write step, and records a
  published version with the real block ids.
- **Discard changes** returns a published document to its published state.
- A restore creates a new draft version from an old one. Nothing is overwritten or lost.
- Each version of a document has a number, 1 and up, shown in the history.
- A save or publish based on a version that is no longer the latest is refused, so an editor never
  overwrites a colleague's work without seeing it.
- A document has at most `max_per_document` versions, 50 by default; the latest and the latest published
  are never removed.
- A collection with `drafts: false` has no versions and behaves as in 0.0.1.
- A document saved before 0.0.2 has no versions: its row is the truth and its first save starts the
  history. No backfill.

## Proposed Solution

### The rule

| Document | Save | Publish |
|---|---|---|
| `draft` status | writes the row as in 0.0.1, then records a draft version | as in 0.0.1, then records a published version |
| `published` status | records a draft version only; the row is untouched | applies the latest draft version to the rows, then records a published version |

The latest version is what Admin edits, in either status. With no version, Admin edits the row.

### The snapshot

A snapshot is the document as a write body: columns, relation ids and areas, without system and CMS
columns. As a body may leave keys out, the snapshot is the whole document as the save leaves it: the
stored editable values, or the previous version's snapshot, with the body over them. It is history, not live content, so JSON here does not contradict main spec D3 (D13).
Because it has the shape of a body, **Publish** runs it through the existing `prepare-cms-document-input`,
`validate-cms-document`, `validate-cms-exclusive-flags`, `prepare-cms-write` and the write steps.
There is no second write path.

A block added in a draft has no row yet, so it has no `id` in the snapshot, and `prepareCmsWrite` creates
it at publish, as it does any unknown block. The published version is then built from a read of the
rows, so it carries the real ids and later drafts keep them.

Uniqueness and exclusive flags are checked at publish, against the rows. A draft may hold a slug another
document uses, or set `is_homepage`, without effect until then.

### The model

`src/modules/cms/models/cms-version.ts`:

```ts
export const CmsVersion = model
  .define("cms_version", {
    id: model.id({ prefix: "cmsver" }).primaryKey(),
    collection: model.text(),
    document_id: model.text(),
    version: model.number(),
    snapshot: model.json(),
    status: model.enum(["draft", "published"]),
    latest: model.boolean().default(false),
    changed_fields: model.array(),
    change_type: model.text(), // CmsVersionChangeType: "save" | "publish" | "unpublish" | "restore"
    restored_from: model.number().nullable(),
    created_by: model.text().nullable(),
  })
  .indexes([
    { name: "IDX_cms_version_document", on: ["collection", "document_id", "created_at"], where: { deleted_at: null } },
    { name: "IDX_cms_version_latest", on: ["collection", "document_id"], unique: true, where: "latest = true AND deleted_at IS NULL" },
    { name: "IDX_cms_version_number", on: ["collection", "document_id", "version"], unique: true, where: { deleted_at: null } },
  ])
```

The `cms` module's service becomes `MedusaService({ CmsVersion })` and keeps returning the config. Its
`change_type` tells the history what made a version - a save, a publish, an unpublish or a restore - and
`restored_from` holds the number of the version a restore brought back, so an unpublish does not read as
a save without changes (user, 2026-11-09, after `status` alone could not tell them apart). As in
Medusa's `OrderChange.change_type` (`@medusajs/order` 2.21.2 `dist/models/order-change.js`), it is a
text column typed in TypeScript (`CmsVersionChangeType`), so a new type needs no migration.

`changed_fields` holds the names of the fields and, from 1c, the areas whose value differs from the
previous version's snapshot, so the history tells what each save changed without reading snapshots
(user, 2026-11-09). `prepare-cms-version-snapshot` compares the two; a first version, and a document's
first version after 0.0.1, compares with the row as read. Values are not kept apart from the
snapshots: a field-by-field diff can be built on them later.

`createCmsVersion(input)`, with `@InjectTransactionManager`, clears `latest` on the document's current
version and inserts the new one, numbered the document's highest `version` plus one, in one transaction
of the `cms` module, so `latest` cannot be left on two rows; the unique indexes refuse a concurrent
second one. The highest, not the latest: a discard moves `latest` back, and a number is never reused.

### Stale edits

The Admin document carries `version`, the number of the version it shows, or `null` with no versions.
Every save and publish sends it back as `base_version`. `validate-cms-base-version` compares it with the
latest version and refuses a mismatch with `NOT_ALLOWED`, naming the version that won and who saved it.
The check runs before any write, and the unique indexes catch two saves that pass it at once. A
`drafts: false` collection has no versions and keeps last write wins.

### Config

`CmsConfig` gains `versions?: { max_per_document?: number }`, default 50. It is the only addition.

### Workflows

New steps in `src/workflows/cms/steps/`:

| Step | Does |
|---|---|
| `validate-cms-base-version` | refuses a `base_version` that is not the latest (Stale edits) |
| `list-cms-versions` | a document's versions newest first: a page without snapshots for the history, all of them for the limit, or the latest with its snapshot (`latest: true`, none for a document without versions) - a `get-` step would throw where having no version is normal (`codee-medusa-backend-conventions`, 2026-11-09) |
| `get-cms-version` | one version with its snapshot |
| `prepare-cms-version-snapshot` | the snapshot from a body over the stored document, or from a read of the rows; a restored one filtered through the current registry; and `changed_fields` against the previous snapshot |
| `create-cms-version` | `createCmsVersion`; compensation removes the new version and gives `latest` back |
| `update-cms-latest-version` | moves `latest` to a given version; compensation moves it back |
| `prepare-cms-old-versions` | from all of a document's versions, the ids over `max_per_document`, never the latest nor the latest published |
| `delete-cms-versions` | soft-deletes the given versions, over the limit or of a deleted document; compensation restores those ids. After `prepare-cms-old-versions` it runs with `continueOnPermanentFailure`, so a failure is logged by Medusa and the save stands |

The limit is three steps - `list-cms-versions`, `prepare-cms-old-versions`, `delete-cms-versions` - as
a step reads, decides or writes (`codee-medusa-backend-conventions`, 2026-11-09), in place of one
`delete-cms-old-versions` doing all three.

| Workflow | Change |
|---|---|
| `get-cms-document`, `list-cms-documents` (Admin) | the document carries `has_unpublished_changes`; the single read returns the latest version's content and `version_id`; the list reads one row per page of documents for the flag |
| `update-cms-document` | `list-cms-versions` (latest) -> `validate-cms-base-version` first. `draft` status: as in 0.0.1, then `prepare-cms-version-snapshot` -> `create-cms-version` -> the limit. `published` status, in a named `when()`: `prepare-cms-document-input` -> shape check -> `prepare-cms-version-snapshot` -> `create-cms-version` -> the limit, with no write to the rows |
| `create-cms-document` | as in 0.0.1, then records the first draft version, except in `drafts: false` |
| `publish-cms-document` | `list-cms-versions` (latest) -> `validate-cms-base-version` first, the snapshot as the body of the existing steps; after the write steps, a read of the rows -> `prepare-cms-version-snapshot` -> `create-cms-version` (published) -> the limit |
| `unpublish-cms-document` | as in 0.0.1, then `prepare-cms-version-snapshot` -> `create-cms-version` (draft, `change_type: unpublish`) -> the limit; the version takes the latest version's snapshot, or the rows' when there is none, so a pending draft stays what the Admin edits, and the history shows who unpublished and when (user, 2026-11-09) |
| `delete-cms-document` | adds `list-cms-versions` -> `delete-cms-versions` after `delete-cms-documents` |
| `list-cms-document-versions`, `get-cms-document-version` | new, reads for the history |
| `restore-cms-document-version` | new: `get-cms-version` -> `prepare-cms-version-snapshot` (restored) -> `update-cms-document` as a step, with the snapshot as its body, `change_type: restore` and `restored_from` |
| `discard-cms-document-draft` | new: `list-cms-versions` (latest) -> `validate-cms-base-version` -> `list-cms-versions` (published) -> `prepare-cms-discard` (the newest published one, or `NOT_ALLOWED` when the document has none or no draft waits) -> `update-cms-latest-version` |

The content write and the version write are in two modules. The order is content first, version second; if the version write fails, the compensations of
the write steps undo the content, through `restoreCmsRows` for any restored row.

### Alternatives Considered

- **One version table per collection.** A migration per collection for JSON either way.
  Rejected (main spec D13).
- **Draft columns on the rows, or a duplicate row.** Would touch every model the project writes and every
  store query. Rejected: the store API stays unaware of drafts.
- **Writing drafts of a never-published document only to versions.** Lists and search would show a stale
  or empty row. Rejected: a draft's row is not public, so writing it is harmless.
- **Medusa's order changes** (`order_change_action`, rows per version). An action per block operation
  and a replay of them, where a form saves the whole document; and a `version` column on every project
  model and query, against main spec D2. Rejected for snapshots.
- **A document lock.** Warns before editing, but needs its own table, a heartbeat and a way to
  take a lock over from a closed tab. Deferred: `base_version` is one column, and a lock can be added on
  top of it.
- **A field-by-field diff in the history.** Rejected for this version by the user; a list and restore
  cover the need, and a diff can come later over the same snapshots.
- **A separate publish path that writes the snapshot directly.** Duplicates validation and the change
  set. Rejected for reusing the write steps.

## Data Model and Persistence

- One new table, `cms_version`, in the plugin's `cms` module. Its migration is generated with
  `npx medusa plugin:db:generate` in the plugin repository and applied with `npx medusa db:migrate` in
  a host project. Both are the user's to run (`AGENTS.md`, Never).
- Snapshots hold admin-entered content and `created_by` an admin user id; no customer data.
- No change to the project's models and no backfill.
- A snapshot can outlive a column or block type: the restore filters it through the current registry
  (Edge Cases).

## Contracts

### Admin API

New, under the same `ensure-cms-collection`, 404 for an unknown document, and no `policies` (main spec
D12). A collection with `drafts: false` answers 400.

| Method and path | Body / query | Answer |
|---|---|---|
| `GET /admin/cms/collections/:collection/documents/:id/versions` | `limit` (default 20), `offset` | `{ versions: [{ id, version, status, change_type, restored_from, latest, changed_fields, created_by, created_at }], count, limit, offset }`, newest first |
| `GET /admin/cms/collections/:collection/documents/:id/versions/:version_id` | - | `{ version }` with its `snapshot` |
| `POST /admin/cms/collections/:collection/documents/:id/versions/:version_id/restore` | `{ base_version }` | `{ document, latest_version }` - the version's snapshot, filtered through the config, saved as a `restore` with `restored_from`: a draft's row is written, a published document gets a draft version |
| `POST /admin/cms/collections/:collection/documents/:id/discard` | `{ base_version }` | `{ document, latest_version }` - `latest` moves to the newest published version; the discarded drafts stay in the history; 400 for a document never published |

Changed:

- `document` on Admin routes is the row, as the store reads it, and adds `has_unpublished_changes`.
  A single read and every write answer `{ document, latest_version }`: `latest_version` is
  `{ id, version, status, snapshot }`, or `null` for a document without versions, kept apart from the
  row rather than laid over it, so the answer says what is live and what is a draft (user, 2026-11-09).
  The Admin's form takes its fields from `latest_version.snapshot`, or from the row without versions,
  and sends `latest_version.version` back as `base_version`.
- `POST .../documents/:id` keeps its body and errors, and its body gains `base_version` (a number, or
  `null` with no versions), required where versions exist. On a published document it answers with the
  draft and does not run the `publish` schema; that moves to `publish`.
- `POST .../publish` takes `{ base_version }`; on a published document without a newer draft it
  answers 400, `NOT_ALLOWED`, as in 0.0.1, and the Admin's button is disabled then (user, 2026-11-09).
- A stale `base_version` answers 400, `NOT_ALLOWED`, on both, with a message without a path. `CONFLICT`
  is not used: Medusa replaces its message.

### Store API and events

No change. The workflows still emit `cms.document.published`, `unpublished` and `deleted`.

## UI/UX

Plugin Admin, copy per `codee-ui-copy`.

- The status badge gains **Published with changes**, in the list and on the document.
- On a published document **Save** reads **Save draft**, and "Changes go live when you save." is replaced
  by "Changes go live when you publish."
- **Publish** reads **Publish changes** when there are changes; **Discard changes** sits in the action
  menu, with a confirmation.
- The side column gets a **History** section under the status, listing the versions newest first, a
  page at a time: each version's number, what made it, its author, date and changed fields, by their
  labels in the config ("Title, SEO description"; a field no longer in the config by its column name),
  and the latest marked "Current" (user, 2026-11-09, in place of a drawer). Picking a version shows its
  content in the main column, read-only, field by field, under "Viewing version <n>", with **Restore
  this version** and **Back to latest**; restoring, behind a confirmation, makes it the draft to review,
  and nothing goes live until it is published.
- The created and updated section reads "Updated" from the latest version - its author and date - and
  shows "Published" from `published_at`, so a draft saved on a published document is seen (user,
  2026-11-09). The single read's `latest_version` carries `created_by` and `created_at` for it.
- The history shows each version's number and what made it: "Saved" with the changed fields,
  "Published", "Unpublished", "Restored from v<n>". A published version usually changes no field over
  the draft before it, so its row shows its change type alone (user, 2026-11-09). A stale save or publish shows the server's message above the
  form, with **Reload**; the form keeps the editor's text until then.
- Publish errors map onto fields as in 0.0.1. A draft holding a slug in use is reported at publish.

## Performance and Cache

- Up to 50 snapshots per document; a snapshot is one document with ~20 blocks. `~1000` documents gives at
  most ~50,000 rows, read one document at a time through `IDX_cms_version_document`.
- Admin lists read the flag for one page of documents, one query. Versions are never cached.
- Store reads are untouched. A save of a published document clears nothing, because no row changed;
  publish clears the cache as in 0.0.1.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| Save on a published document | a draft version; a store read returns the old content | workflow test, HTTP test |
| Publish with a missing required field in the draft | 400 with paths; rows and versions unchanged | workflow test |
| Publish with a slug another document took | 422; the draft stays | workflow test |
| Publish a draft holding a new block | the block gets a row; the published version carries its id; a later save keeps it | workflow test |
| The version write fails after the content write | the content is rolled back | step test (invoke and compensate) |
| Two concurrent saves | the unique index refuses one; the save fails and is retried by the editor | module integration test |
| A save with a stale `base_version` | 400 naming the newer version; nothing written | workflow test |
| A publish from a stale tab | 400; a colleague's newer draft is not published | workflow test |
| A save after a discard | numbered above every earlier version | module integration test |
| Discard on a document never published | 400 | HTTP test |
| Restore a version naming a dropped column or a removed block type | the key or block is left out, logged once at `warn`; the rest becomes a draft | unit test of `prepare-cms-version-snapshot` |
| A document with no versions (saved before 0.0.2) | Admin edits the row; the first save creates the first version | workflow test |
| The cap is reached | the oldest removed; the latest and the latest published kept | step test |
| The cap step fails | logged with the document id; the save succeeds | step test |
| Document deleted, then a compensation | versions restored by id with the document | step test |
| `is_homepage` set in a draft of a published page | no holder changes until publish | workflow test |
| Versions routes on `blog_category` | 400 | HTTP test |
| A save that changes two fields, then a save that changes none | `changed_fields` names the two, then is empty | step test of `prepare-cms-version-snapshot` |
| A partial body | the snapshot holds the whole document, the keys left out as stored | step test of `prepare-cms-version-snapshot` |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Editors expect **Save** to go live, as in 0.0.1, and changes stay unpublished. | medium | content | The button reads **Save draft**, the badge shows **Published with changes**; the guide page is updated. | Habit. |
| Content and version writes are two transactions and a compensation fails. | medium | data | Content first, compensation restores it; the row stays the truth for a published document. | A manual repair in a rare double failure. |
| Snapshots drift from the models. | medium | content | A restore filters through the registry and logs what it left out. | A restored draft can miss a dropped field, by design. |
| The table grows without the cap working. | low | database | Cap failures are logged at `error`. | Rows until the log is read. |

**Rollout:** additive for data: the user runs the `cms` migration, and documents gain versions as they
are saved. The behaviour of **Save** on published documents changes at once, so the guide page ships
with it.

**Rollback:** a return to 0.0.1 makes the row the truth again; unpublished draft versions are ignored and
stay in the table. `cms_version` can be dropped with the module's migration down.

## Dependencies

- `sub-collections-and-documents` sub-phase 1a (pages, P1a.1 to P1a.7), complete; its later sub-phases
  extend the snapshot as they extend the body (user, 2026-11-09). `drafts: false` arrives with its
  phase 5: until then every collection has versions.
- No Medusa upgrade.

## Acceptance Criteria

- [x] A save of a published document does not change the row the store reads (HTTP test); the store
      API's own answer is checked when it ships, in sub-phase 1h of `sub-collections-and-documents`.
      (P2.2, P2.5)
- [x] **Publish** applies the latest draft through the write step (HTTP test); block ids across later
      saves are checked with blocks, in sub-phase 1c. (P2.2)
- [x] A failed version write leaves the content unchanged: each write step's compensation is tested.
      (P2.1)
- [x] `latest` is on one version of a document and numbers are never reused (module test); the test's
      two calls at once ran one after the other on the test database, so the refusal by the unique
      indexes was not exercised. (P1.2)
- [x] A save or publish based on an old version is refused and writes nothing (HTTP test). (P2.1, P2.2)
- [x] A restore creates a new draft and survives a dropped column (HTTP and step tests); a dropped block
      type is checked with blocks, in 1c. (P2.1, P2.3)
- [x] **Discard changes** returns a published document to its published state (HTTP test). (P2.3)
- [x] A document has at most `max_per_document` versions, and keeps its latest and latest published
      (step test). (P2.1)
- [ ] `drafts: false` collections have no versions: the option comes with sub-phase 5b of
      `sub-collections-and-documents`, which checks it. (P2.5)
- [x] A document saved before 0.0.2 needs no backfill (HTTP tests on rows without versions; the user's
      walkthrough). (P2.2)
- [x] An editor sees **Published with changes**, the history, restore and discard (the user's
      walkthrough, 2026-11-09). (P3.1, P3.2)

## Phasing

### Phase 1 - The version table

**Goal:** `cms_version` exists and `latest` is safe.

**Prerequisites:** sub-phase 1a of `sub-collections-and-documents` complete.

**Exit gate:** the module test passes in a manual run; lint, typecheck and format pass; the user has
generated and run the `cms` migration.

### Phase 2 - Drafts in the workflows

**Goal:** saves stop going live, publish applies the draft, history and restore work through the API.

**Prerequisites:** Phase 1.

**Exit gate:** step unit tests pass; workflow and HTTP integration tests pass in a manual run.

### Phase 3 - Admin

**Goal:** an editor works with drafts and history.

**Prerequisites:** Phase 2.

**Exit gate:** walkthrough of the Admin acceptance criterion on a local backend; the plugin `build`
passes; the guide page and README are updated.

## Implementation Plan

### Phase 1

1. **P1.1 - The model and config**
   - **Outcome:** `CmsVersion`, the `cms` service on `MedusaService({ CmsVersion })`, and
     `versions.max_per_document` in the config types.
   - **Areas:** `src/modules/cms/`, `src/lib/types.ts`
   - **Changes:** per The model and Config. **Stop: ask the user to run `npx medusa plugin:db:generate`
     in the plugin repository and `npx medusa db:migrate` in the host project.**
   - **Verification:** typecheck, lint; the backend starts and the table exists.

2. **P1.2 - `createCmsVersion`**
   - **Outcome:** the service method with one transaction.
   - **Areas:** `src/modules/cms/service.ts`
   - **Changes:** per The model.
   - **Verification:** module integration test (manual run): two versions leave one `latest` and
     numbers 1 and 2; two calls at once leave one `latest` and distinct numbers, the second refused
     when the two overlap in the database; a version after `latest` moved back, or after a deleted one,
     takes the next free number.

### Phase 2

1. **P2.1 - Steps**
   - **Outcome:** the steps of Workflows.
   - **Areas:** `src/workflows/cms/steps/`
   - **Changes:** per Workflows; JSDoc per conventions.
   - **Verification:** step unit tests with the `createStep` harness: invoke and compensate for
     `create-cms-version`, `update-cms-latest-version`, `delete-cms-versions`; the cap, its logged
     failure; `validate-cms-base-version` with the latest, a stale and a `null` version; the snapshot of
     a body, of rows, and a restored one with a dropped column and block type.

2. **P2.2 - Save and publish**
   - **Outcome:** `create-`, `update-`, `publish-`, `get-` and `list-cms-document(s)` per Workflows.
   - **Areas:** `src/workflows/cms/workflows/`
   - **Changes:** named `when()` for the status branch.
   - **Verification:** a workflow integration test in the plugin, on its test module (manual run): save published, store unchanged, publish applied; a new block keeps its id; publish with a
     missing field and a taken slug; a document with no versions; `is_homepage` in a draft; a stale save
     and a stale publish.

3. **P2.3 - History, restore and discard**
   - **Outcome:** `list-cms-document-versions`, `get-cms-document-version`,
     `restore-cms-document-version`, `discard-cms-document-draft`.
   - **Areas:** `src/workflows/cms/workflows/`
   - **Changes:** per Workflows.
   - **Verification:** the same spec file: restore and discard, on published and draft documents.

4. **P2.4 - Routes**
   - **Outcome:** the routes of Admin API, the `document` additions.
   - **Areas:** `src/api/admin/cms/**`
   - **Changes:** handlers run workflows only.
   - **Verification:** P2.5.

5. **P2.5 - HTTP tests**
   - **Outcome:** an HTTP integration test in the plugin, on its test module (manual run).
   - **Changes:** each route; 401, 404; 400 for `drafts: false`, a discard without a published version
     and a stale `base_version`, with its message; a store read before and after publish.
   - **Verification:** manual `test:integration:http` run; lint, typecheck, format.

### Phase 3

1. **P3.1 - Status and actions**
   - **Outcome:** the badge, **Save draft**, **Publish changes**, **Discard changes**, `base_version`
     on every save and publish, and the stale message with **Reload**.
   - **Areas:** `src/admin/routes/cms/`, `src/admin/hooks/`
   - **Changes:** per UI/UX; mutations invalidate the document, its list and its versions.
   - **Verification:** walkthrough on `page`, including a publish error.

2. **P3.2 - History**
   - **Outcome:** the **History** drawer with restore.
   - **Areas:** `src/admin/routes/cms/[collection]/[id]/`
   - **Changes:** per UI/UX.
   - **Verification:** walkthrough: restore, review, publish. The plugin's `build`.

3. **P3.3 - README**
   - **Outcome:** the README describes drafts, history, restore and discard.
   - **Areas:** `README.md`
   - **Verification:** the user reads the section.

## Short Tracker

- `done` - Phase 1 / P1.1 on `feat/versions` (approved by the user, 2026-11-09): `CmsVersion` in
  `src/modules/cms/models/`, the `cms` service on `MedusaService({ CmsVersion })` with `getConfig` kept
  synchronous, and `versions.max_per_document` in the config types; lint, typecheck, unit and HTTP
  tests pass. The user generated the migration in the plugin, with `DATABASE_URL` set, as
  `plugin:db:generate` connects to Postgres, and ran it in the host project, where `cms_version` and its
  indexes exist (2026-11-09).
- `done` - Phase 1 / P1.2: `createCmsVersion`, a public `@InjectManager()` method over a protected
  `@InjectTransactionManager()` one, as Medusa's lint asks; it reads the highest number with deleted
  versions, takes `latest` from the current one and flushes before it inserts. The module integration
  test passed in a manual run (2026-11-09): numbers from 1 per document, one latest, a number after a
  moved `latest` and after a deleted version. Its two calls at once ran one after the other on the test
  database, so the refusal by the unique indexes was not exercised; the test checks the result either
  way.
- `done` - Phase 1 exit gate: lint, typecheck and format pass; the module test passed; the user ran the
  `cms` migration (2026-11-09).
- `done` - Phase 1 / P1.3 (user, 2026-11-09): `change_type` and `restored_from` on `CmsVersion` and in
  `createCmsVersion`'s input; the user generated the second `cms` migration and ran it in the host
  project, where both columns exist; the module test passed again.
- `done` - Phase 2 / P2.1: `list-cms-versions`, `get-cms-version`, `validate-cms-base-version`,
  `prepare-cms-version-snapshot`, `prepare-cms-old-versions`, `create-cms-version`,
  `update-cms-latest-version` and `delete-cms-versions`, each with a step test, invoke and compensate for
  the writes. No workflow uses them yet.
- `done` - Phase 2 / P2.2 together with Phase 3 / P3.1 (user, 2026-11-09, so no Admin save is refused
  for a missing `base_version` in between): `create-cms-document-version`, run as a step by create,
  update, publish and unpublish; update in two named `when()` branches, the row written for a draft and
  a draft version only for a published document; publish applying the latest snapshot to the row after
  the `publish` schema and the unique values; unpublish recording an `unpublish` version from the latest
  snapshot; delete removing the versions; get and list answering `{ document, latest_version }` and
  `has_unpublished_changes`; `base_version` on the save and publish routes; in the Admin, the form
  editing the latest version, **Save draft**, **Publish changes**, "Published with changes" in the
  status section and the table, and the stale message with **Reload**. A save of a published document
  is checked for its shape only, which drops P1a.6's `publish` check on such a save. Plugin checks pass;
  the HTTP tests passed in a manual run (2026-11-09). Awaits the user's walkthrough.
- `done` - Phase 2 / P2.3 with Phase 3 / P3.2 (user, 2026-11-09, asked to build it at once): the
  `list-cms-document-versions`, `get-cms-document-version`, `restore-cms-document-version` (the snapshot
  filtered through the config, then `update-cms-document` as a step with `change_type: restore`) and
  `discard-cms-document-draft` (`prepare-cms-discard`, then `update-cms-latest-version`) workflows and
  routes, `base_version` on restore and discard; in the Admin, the history in the side column, a
  picked version read-only in the main column with **Restore this version** and **Back to latest**,
  **Discard changes** in the action menu, and "Updated" from the latest version with "Published" in
  the created and updated section. Plugin checks pass; the HTTP tests passed in a manual run
  (2026-11-09). The user checked the drafts and the history in the Admin (2026-11-09).
- `dropped` - Phase 3 / P3.3: the README section on drafts, history, restore and discard moves to
  sub-phase 1i of `sub-collections-and-documents`, which writes the plugin's README (user, 2026-11-09).
- `done` - Phase 3 exit gate: the plugin `build` passed in the user's run (2026-11-09). The sub-spec is
  closed; what it could not check yet - the store API's answer, block ids, dropped block types and
  `drafts: false` - moves to sub-phases 1c, 1h and 5b of `sub-collections-and-documents`.
