# Singletons and Nested Collections

**Date:** 2026-11-18
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-18-sub-singletons.md`

## TLDR

A collection may declare `singleton: true`, with `drafts: false`: it holds at most one document, which cannot be deleted, and
the Admin shows it as a page of independent cards - one per form section, each with its own **Edit**
drawer - instead of a table, with a widget zone a host fills with its own cards. A collection may also
declare `admin.parent`: it leaves the **Content** list and shows under its parent - as a button in the
header of a list collection's table, or as a table section on a singleton's page. Both are generic: the
plugin knows no settings and no homepage. A singleton is otherwise an ordinary collection - the same
model rules, fields, validation, workflows, routes and store API - so the first host's page settings are
two plain collections: `page_settings`, a singleton under `page`, and `page_settings_segment` under it.

## Problem

The first host project needs one place that says which page is the homepage, by default and per segment
(user, 2026-11-18). The exclusive flag that was to do it on the page itself is withdrawn (main spec D21):
it moved the homepage at a publish, by rules an editor could not see. Every collection today is a list of
documents: nothing keeps one to a single document, and every collection is a separate row of the
**Content** list, so settings and their mapping rows would be two unrelated entries beside the pages they
configure.

## Current State and Evidence

- `src/lib/config/types.ts` - `CollectionConfig` has `store`, `admin` (`useAsTitle`, `defaultColumns`,
  `description`, `sections`) and `areas`; no `singleton`, no `parent`, no `drafts` yet (5b).
- `src/lib/collection/types.ts` - `RegistryCollection` and `ClientCollection`, the projection the Admin
  reads from `GET /admin/cms/collections`; it carries `admin` whole, so a key added there reaches the Admin.
- `src/workflows/cms/workflows/create-cms-document.ts`, `delete-cms-document.ts` - the only writes that
  change how many documents a collection has.
- `src/workflows/cms/workflows/update-cms-document.ts` - a body "leaves out the fields it does not
  change"; the server checks the whole document over what is stored, so a save of one section's fields is
  already a valid write.
- `src/admin/routes/cms/page.tsx` - the **Content** list of every collection.
- `src/admin/routes/cms/[collection]/page.tsx` - a collection's table (`DocumentListTable`), with the create
  modal (`@create`, a `RouteFocusModal`) over it; `[collection]/[id]/page.tsx` the document page.
- `src/admin/cms/document-list-table/document-list-table.tsx` - the dashboard's `DataTable` with one
  `action` (create); `DataTableProps` also takes `actions?: DataTableActionProps[]`
  (`@medusajs/dashboard` 2.22.7, `dist/components.d.ts`).
- `src/admin/cms/document-edit-form/document-edit-form.tsx` - lays the document page out with
  `LayoutComposer` (`widgetsZonePrefix="cms.document.details"`, `disableWidgets`).
- `@medusajs/dashboard` 2.22.7 exports `LayoutComposer`, `RouteDrawer`, `RouteFocusModal`, `ActionMenu` and
  `SectionRow`; its Store settings page (`routes/store/store-detail`) is a page of sections, each read-only
  with an **Edit** drawer, and tables of related items with add and remove.
- `src/admin-extensions/` - `defineCmsFieldComponent` and `defineCmsOptionsHook`: a host draws fields and
  feeds options from any source; a save still checks each value by its field's type.

## Target Behavior

- A singleton collection holds zero or one live document. A create while one exists answers 400; a delete
  answers 400. Updates work as for any document.
- A singleton has no areas and no drafts: the registry refuses at startup a singleton with areas (areas
  are for content, main spec D4) or without `drafts: false` (user, 2026-11-18). Its page has no status,
  publish or history; a save is live at once and writes no `cms_version` row.
- The Admin opens a singleton at `/app/cms/:collection` as a page of cards, one per `admin.sections` entry,
  in its column; each shows its fields read-only and has **Edit**, a drawer with that section's fields
  only, saved on its own. The page looks the same before the document exists: the cards show each
  field's empty value (an empty text as a dash, `false` as no), and the first card saved creates the
  document; the Admin offers no create or delete for a singleton (user, 2026-11-19).
- A host adds its own cards to a singleton's page through the widget zone `cms.singleton.details` (and
  `.side`), receiving the collection and the document; editors reorder cards in the dashboard's Editor
  view.
- A collection with `admin.parent` is not a row of the **Content** list. Under a list collection it is a
  button in the header of the parent's table, before **Create**, labelled with its `labels.singular` for a
  singleton and `labels.plural` otherwise. Under a singleton it is a table section on the singleton's
  page, with its `defaultColumns`, **Add** (the create modal), and per row **Edit** (a drawer) and
  **Delete** (a confirmation).
- Breadcrumbs follow the parent chain: `Content › Pages › Settings`.
- The store API is unchanged: a storefront reads a singleton with `GET /store/cms/:collection?limit=1`.

## Proposed Solution

### Singleton

`singleton: true` on a `CollectionConfig`. The registry copies it to `RegistryCollection.singleton` and
the projection. It refuses at startup a singleton with `areas`, and one without `drafts: false`
(user, 2026-11-18): with drafts, its page would need a status, a publish and a history, which a settings
page does not have; this can be relaxed when a case comes. `admin.useAsTitle` and `admin.defaultColumns` are not read for a singleton's own page.

The writes: one decision step, `validate-cms-singleton`, reads the collection's `singleton` and label
from the registry, as `validate-cms-drafts` does, and takes the operation (`create` or `delete`) and, for
a create, the count of live documents; it throws `NOT_ALLOWED`:
`"Page settings" holds one document, which already exists. Edit it instead.` /
`"Page settings" holds one document, which cannot be deleted. Edit it instead.` For a create, `list-cms-documents` reads first, from the
database (its default) with `limit: 1`, as a step reads, decides or writes; the read runs at every create,
a list collection's too, as a workflow cannot read the registry to skip it, and costs one indexed row.
Updates need nothing new.

### Nesting: `admin.parent`

`admin: { parent: "<collection slug>" }` on a `CollectionConfig`; Admin placement only, no relation in the
data. The registry refuses at startup an unknown parent, the collection itself, a cycle, and a singleton
under a singleton, which neither rendering below can show, and a child of a singleton with drafts or
areas, as its rows are edited in a drawer saved live (user, 2026-11-19); blocks have no `parent`. The projection carries it inside `admin`, as it carries the rest of `admin`.

Rendering, decided by what the parent is:

| Parent | The child appears |
|---|---|
| A list collection | as a button in the header of the parent's table, one of its default actions (below) |
| A singleton | as a table section on the singleton's page, after its cards |

A child is never shown on a single document of a list collection: that would filter it by the document,
which is a data relation, not placement.

### Header actions: `admin.actions`

The buttons in a list collection's table header are its actions (user, 2026-11-20): placement and
actions are two things, so a parent's buttons come by default from its children, and a config may change
them. An action is data, as the config reaches the Admin through the projection:

```ts
type CollectionAction =
  | { type: "create" } // the dashboard's own "Create"
  | { type: "collection"; collection: string } // a collection's page, by its page label
  | { type: "link"; label: string; to: string } // any Admin path
```

- **Defaults.** A list collection: a `collection` action per child, in config order, then `create`. A
  singleton: none; its children are sections of its page.
- **`admin.actions?: CollectionAction[] | ((defaults) => CollectionAction[])`.** A list replaces the
  defaults; a function takes them and returns the actions to show: it may keep, reorder, remove or add.
  Both forms follow a `richtext` field's `features` (user, 2026-11-20). The registry resolves them once
  at startup, as it prepares the collection, and keeps the result; the projection carries
  `admin.actions` as that list.
- **Checked at startup:** the result an array of known types; a `collection` naming a registered
  collection; a `link` with a label and a `to` starting with `/`; one `create` at most; a function that
  throws, named with its collection. A singleton takes no `admin.actions`, as its page has no header.
- **Labels.** `create` is translated by the Admin, `collection` takes the target's page label, and a
  `link`'s label follows the config's other texts
  ([sub-admin-text-translations](./2026-11-20-sub-admin-text-translations.md)). A later need for an
  action that runs code in the Admin - a modal, a request - is a registration in the host's Admin, as
  `defineCmsOptionsHook`, under a name the config gives; it adds a type to the union and changes no
  other.

### The singleton page

`/app/cms/:collection` renders `SingletonPage` for a singleton, `DocumentListTable` otherwise. The page is
a `LayoutComposer` with `widgetsZonePrefix="cms.singleton.details"`, widgets enabled, `data` holding the
collection and the document.

- **Cards.** One `Container` per section: its label and description, an `ActionMenu` with **Edit**, and a
  `SectionRow` per field with its value displayed by kind - text as it is, an option by its label (a
  hook's through the hook, as the form's combobox finds a stored value), a boolean as yes/no, a date
  formatted, media as a thumbnail, rich text as an excerpt through `toPlainText`, a URL as text, a text
  list joined, a relation by its title (`sub-relations`' Phase 2), an empty value as `-`.
- **Edit.** `RouteDrawer` at `/app/cms/:collection/sections/:section/edit`: the section's fields through
  the form toolkit (`ManagerFormFields`, as the document form draws them), **Save** sending only them to
  the update route, or to the create route while the document does not exist, server errors shown at
  their fields.
- **Before the first save.** No document: the same cards over each field's empty value, as the form's
  inputs start from it; no empty state, no create modal.
- **Children.** A child's section: `DataTable` over the child's documents route, **Add** a
  `RouteFocusModal` at `/app/cms/:collection/children/:child/create`, **Edit** a `RouteDrawer` at
  `/app/cms/:collection/children/:child/:id/edit` with the child's whole form, **Delete** through the
  existing delete route after a prompt. The static segments `sections` and `children` sit beside the
  dynamic `[id]`, which they outrank; a document id always carries its model's prefix.

### Alternatives Considered

- **Globals: a separate config path for singletons.** Rejected: two code paths for one concept, which
  an established CMS is unwinding.
- **`settings` inside a collection's config.** Rejected for `singleton` plus `admin.parent`: a singleton
  that belongs to no collection - a footer - needs no owner, and a list collection may be a child too
  (a blog's categories under its posts).
- **Mapping rows as blocks in an area, or as a JSON column.** Rejected: areas are for content (main spec
  D4); generic JSON columns are not editable content (main spec D3). A mapping row is a document of a
  child collection.
- **The singleton's whole form on the page with one Save,** as the document page. Rejected for Medusa's
  settings pattern (user, 2026-11-18): independent cards, each with its own drawer, and room for a host's
  own cards.
- **One widget zone per collection.** Rejected: zone names must be static for `InjectionZoneRegistry`;
  one zone with the collection in `data` serves every singleton.

## Data Model and Persistence

The plugin adds no table. A singleton is a host model like any collection's, with the CMS columns of
main spec D7. Nothing in the database holds the one-document rule; see Risks. The test module gets a
singleton model and a child model, by the user's migration.

## Contracts

All additive; the plugin is not published yet, so no version is owed to them (user, 2026-11-18).

- **Config** (`src/lib/config/types.ts`): `CollectionConfig.singleton?: true`;
  `CollectionConfig.admin.parent?: string`; `CollectionConfig.admin.actions?: CollectionAction[] |
  ((defaults: CollectionAction[]) => CollectionAction[])`, `CollectionAction` exported from the package
  root.
- **Projection** (`GET /admin/cms/collections`): `singleton: boolean` on each collection; `admin.parent`
  when set; `admin.actions`, the resolved list, always.
- **Workflows**: `create-cms-document` and `delete-cms-document` answer `NOT_ALLOWED` (400) for a singleton
  as above; their inputs and outputs are unchanged. `validate-cms-singleton` is exported from
  `./workflows` with the other steps.
- **Admin widget zone**: `cms.singleton.details` and `cms.singleton.details.side`, registered in the
  plugin's `InjectionZoneRegistry` augmentation; `data: { collection, document }`, `document` `null`
  before the first save.
- **Events** (main spec D38): the first save emits `cms.document.created` with `status: "published"`, a card's
  later save `cms.document.updated` with `action: "publish"`, as in any collection without drafts; a singleton
  is never deleted, so emits no `deleted`. A child's **Add**, **Edit** and **Delete** emit as its own
  collection does.
- **Store API**: unchanged.

## UI/UX

```
Content › Pages                                       [Settings] [Create]
  (the pages' table)

Content › Pages › Settings
┌ General ──────────────────────────────────────────────── ⋯ ┐
│ Default homepage        Home (/home)                       │
└────────────────────────────────────────────────────────────┘
┌ Homepages per segment ────────────────────────────── [Add] ┐
│ Segment        Homepage                         ⋯          │
│ DE             Home DE (/home-de)               ⋯          │
└────────────────────────────────────────────────────────────┘
```

- A drawer's **Save** shows a hint that a save is live at once, as the singleton has no drafts; the copy
  follows `codee-ui-copy`.
- A failed save keeps the drawer open with the errors at their fields; a first save refused because the
  document exists (two editors saving their first card at once) shows the error and reloads the page.
- A required field fails a save from any card while it is empty, as the server checks the whole
  document; on a singleton whose sections hold required fields, the first save must come from the card
  that holds them, or the error names the field of another card.
- Loading shows a spinner; an unknown collection reaches the error boundary, as
  the document page does.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A second document created in a singleton | 400, nothing written | workflow and HTTP tests |
| A singleton's document deleted | 400, nothing written | workflow and HTTP tests |
| Two creates of a singleton at once | both may pass the check; two documents until one is deleted by a project script | Risks |
| A singleton configured with `areas` | startup refused, naming the collection | registry unit test |
| `admin.parent` naming no collection, itself, or a cycle, or a singleton under a singleton | startup refused, naming the chain | registry unit tests |
| A section's save that breaks a rule over fields of another section | 400 with the paths; the drawer shows the error as the model's own | HTTP test; Admin walkthrough |
| A child's row edited from the singleton page | the child's whole form in the drawer; the row refreshes after save | Admin walkthrough |
| A singleton read by the store before its first save | `documents: []`, `count: 0` | HTTP test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Two concurrent creates leave a singleton with two documents. | low | content | The workflow check; one editor sets a singleton up once. A project that needs certainty adds a unique index on a constant column of its model. | The store's `limit=1` read answers the newest; a project script deletes the other. |
| A host widget in `cms.singleton.details` assumes a collection and breaks on another's page. | low | admin | The zone's `data` names the collection; the README shows the check. | A host's own bug. |
| The singleton page duplicates what the document form does. | medium | maintenance | The drawer and the child forms use the same toolkit and fields as the document form; only the card display is new. | One more page to keep in step. |

**Rollout:** additive config and projection keys; a host opts in per collection.

**Rollback:** remove `singleton` and `admin.parent` from the host's config; its collections become plain
lists again, with their data untouched.

## Dependencies

- 5b of [sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md), `drafts: false`,
  before Phase 1, brought forward there (user, 2026-11-18). Drafts today are always on: the row's `status`
  and `cms_version` rows for every collection; `drafts: false` turns both off for one collection.
- Phase 1 of [sub-relations](../2026-11-22-sub-relations.md) - a `belongsTo` to another collection, the
  check that an id is a live document of the target, and the read of what references a document,
  `list-cms-references` - before Phase 3 (user, 2026-11-18; moved there 2026-11-22). Phase 3 draws the
  relations with the host's `pages` hook; the plugin's picker is `sub-relations`' Phase 2.
- [sub-workflow-hooks](../2026-11-22-sub-workflow-hooks.md) before Phase 3: the host refuses an unpublish
  or a delete of a homepage page in its `validate` handler, as the plugin leaves that policy to the host
  (user, 2026-11-22).
- `defineCmsOptionsHook` and `defineCmsFieldComponent` (built) for the host's segment source.

## Acceptance Criteria

- [ ] A singleton holds one document: a second create and a delete answer 400 with nothing written.
- [ ] A singleton with areas or without `drafts: false`, and a parent that is unknown, itself or in a cycle, stop the start with a
      message naming them.
- [ ] A singleton's page shows one card per section, each saved on its own from its drawer, the same
      cards over empty values before the first save creates the document, and a host widget in
      `cms.singleton.details`.
- [ ] A child of a list collection is a header button of the parent's table; a child of a singleton is a
      table section on its page with **Add**, **Edit** and **Delete**; neither is a row of **Content**.
- [ ] The first host sets its default homepage and a homepage per segment on one page, and a storefront
      reads both through the store API.

## Phasing

### Phase 1 - Singletons

**Goal:** a singleton is set up and edited in the Admin, one card at a time.

**Prerequisites:** 5b of `sub-collections-and-documents`.

| Sub-phase | Goal |
|---|---|
| **1a The rule** | `singleton: true` in the config, the registry and the projection; areas refused; a second create and a delete refused |
| **1b The page** | Cards per section with values by kind, **Edit** drawers that create the document at the first save, the widget zone |

**Exit gate:** unit, HTTP, typecheck, admin typecheck, lint and format checks pass; the user's walkthrough
on the test app's singleton.

### Phase 2 - Nesting

**Goal:** a collection shows under its parent.

**Prerequisites:** Phase 1.

| Sub-phase | Goal |
|---|---|
| **2a Placement** | `admin.parent` in the config, the registry and the projection; children left out of **Content**; header buttons on a list parent; breadcrumbs along the chain; the header's buttons as actions a config's function changes |
| **2b Child sections** | A child's table on a singleton's page, with **Add**, **Edit** and **Delete** |

**Exit gate:** as Phase 1, the walkthrough on a child of a list collection and a child of the singleton.

### Phase 3 - Proof in the host

**Goal:** the first host's page settings.

**Prerequisites:** Phase 2; P1b.2 of `sub-relations` done; `sub-workflow-hooks`. Its walkthrough closes
`sub-relations`' Phase 1 too.

The host's `content_page_settings` (`singleton: true`, `drafts: false`, `admin.parent: "page"`,
`homepage_default_id` a relation to `page`) and `content_page_settings_segment` (`drafts: false`,
`admin.parent: "page_settings"`, `segment_id` unique, a select over the active markets, `homepage_id` a
relation to `page`), built as text columns in 2b, become `belongsTo`s on the same columns, with their
`hasMany` on the page model; the user's migration adds the foreign keys, so every stored id must name an
existing page, and none be `""`, first. The host registers the `validate` hooks of the unpublish and
delete workflows and refuses a page the `list-cms-references` workflow finds in its settings. Then the walkthrough. Specified in the host's `sub-collections-and-documents`.

**Exit gate:** the walkthrough: the default homepage and two segments set; a homepage page refused
unpublish and delete by the host's hook; the store reads the singleton and the mapping rows.

## Implementation Plan

### Phase 1

#### Sub-phase 1a - The rule

1. **P1a.1 - `singleton` in the config, the registry and the projection**
   - **Outcome:** `singleton: true` with `drafts: false` passes the registry and reaches
     `GET /admin/cms/collections`; a singleton with `areas` or without `drafts: false` stops the start with
     a message naming the collection.
   - **Areas:** `src/lib/config/types.ts` (`CollectionConfig`), `src/lib/collection/prepare-collection.ts`,
     `src/lib/collection/types.ts` (`RegistryCollection`, `ClientCollection`),
     `src/workflows/cms/steps/list-cms-collections.ts`.
   - **Changes:** the key, `singleton: boolean` on the registry's collection (`false` when left out) and in
     the projection; both refusals through `buildConfigError`.
   - **Verification:** `prepare-registry` unit tests - a singleton prepared, one with areas and one with
     drafts refused; a
     `list-cms-collections` test of the key. `yarn test:unit`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`.

2. **P1a.2 - The test module's singleton** (the user's migration)
   - **Areas:** `integration-tests/modules/test-content/models/` - `TestSettings` (`title`, `featured_note`,
     the CMS columns), the test config with `singleton: true` and `drafts: false`.
   - **Verification:** the user's `yarn test:db:generate`; `yarn test:integration:http` passes unchanged.

3. **P1a.3 - A second create and a delete refused**
   - **Outcome:** a create in a singleton holding a live document, and any delete in a singleton, answer
     400 with nothing written; a list collection is unchanged.
   - **Areas:** `src/workflows/cms/steps/validate-cms-singleton.ts` (new), `create-cms-document.ts`,
     `delete-cms-document.ts`, `src/workflows/index.ts`.
   - **Changes:** the step reads `singleton` and the label from the registry and decides from them, the
     operation and the count of live documents; the create workflow reads through `list-cms-documents` with `limit: 1`
     before it, from the database; the delete workflow runs it after `get-cms-document`.
   - **Verification:** a step unit test per case (list collection, first create, second create, delete);
     a workflow test, `integration-tests/http/cms/workflows/singleton.spec.ts`, running
     `createCmsDocumentWorkflow` twice and `deleteCmsDocumentWorkflow` on the test singleton with nothing
     written by the refused runs; HTTP tests of the 400s and of a first create and an update passing. `yarn test:unit`,
     `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

**Exit gate of 1a:** P1a.1 to P1a.3 done and their checks passing.

#### Sub-phase 1b - The page

Evidence for the steps: `LayoutComposer` keys its saved layout by `widgetsZonePrefix`
(`useLayoutPreference(widgetsZonePrefix)`, `@medusajs/dashboard` 2.22.7 `dist/components.js`), so every
singleton page shares one saved order, and `LayoutComposer.Entry` pins an entry's id in it. A widget zone
outside `INJECTION_ZONES` passes `isValidInjectionZone` with a console warning
(`@medusajs/admin-shared` `dist/index.js`); its type comes from augmenting `InjectionZoneRegistry`.

A card is one `admin.sections` entry, keyed in the URL by its index there; the fields in no section form
a first card under the collection's `labels.singular`, keyed `general`.

1. **P1b.1 - The page, read-only**
   - **Outcome:** `/app/cms/:collection` of a singleton shows one card per section with its fields'
     values as text, each field's empty value before the document exists; a list collection's page is
     unchanged.
   - **Areas:** `src/admin/routes/cms/[collection]/page.tsx`, `src/admin/cms/singleton-page/` (new: the
     page, the card), `src/admin/cms/common/utils/format-field-value.ts` (new, the value as text by kind,
     which `document-list-table/columns.tsx` uses for its cells too).
   - **Changes:** the page reads the document's id through `useDocuments` with `limit: 1`, then the
     document through `useDocument`, which answers media as records; `LayoutComposer` with
     `cms.singleton.details`, widgets still off, each card a `LayoutComposer.Entry`; a card is a
     `Container` with its label, description and a `SectionRow` per field; text, slug and URL as they are,
     a number through `String`, a boolean yes/no, a date through `useDate`, a text list joined, empty a
     dash; without a document the values are `buildFieldDefaults` over the fields. Loading a spinner, an
     unknown collection the error boundary.
   - **Verification:** `format-field-value` unit tests per kind; `yarn test:unit`, `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`; the user's walkthrough: the cards before and after a document exists.

2. **P1b.2 - Edit, one card at a time**
   - **Outcome:** **Edit** in a card's `ActionMenu` opens a drawer with that section's fields only;
     **Save** sends them alone - to the create route while the document does not exist, to the update
     route after - shows the live-at-save note, keeps the drawer open with the server's errors at their
     fields and the rest in a toast, and refreshes the cards after a save.
   - **Areas:** `src/admin/routes/cms/[collection]/@sections/[section]/edit/page.tsx` (new,
     a `RouteDrawer` in the page's outlet), `src/admin/cms/singleton-section-form/` (new).
   - **Changes:** the drawer reads the document as the page does, through the same queries; without one
     its form starts from `buildFieldDefaults` and **Save** runs `useCreateDocument` with the section's
     values, a create refused as taken reloading the page. The form composes what the document form
     uses - `buildEditDefaults`, `buildEditSchema`
     (`shape`, partial), `buildUpdatePayload` with `base_version: null`, `useDocumentFormMedia`,
     `useDocumentFormChecks`, `setServerErrors` over the section's names, `DocumentFormProvider`,
     `MediaFieldsProvider`, `DocumentFormLayout` with the section's layout - and changes none of them.
     An unknown section key reaches the error boundary.
   - **Verification:** `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the
     user's walkthrough: a save of each card, a refused save with its error at the field.

3. **P1b.3 - Values by kind**
   - **Outcome:** a card shows a select's and a combobox's value by its option's label, a hook's through
     the hook, media as a thumbnail, and rich text as an excerpt.
   - **Areas:** `src/admin/cms/common/document-fields/document-field-value.tsx` (new), `format-field-value.ts`.
   - **Changes:** a static option's label from the field; a hook's through `defineCmsOptionsHook` as the
     combobox finds a stored value (`with-stored-options.ts`); `MediaThumbnail` over the read's record;
     `toPlainText` from `src/shared/` cut to one line.
   - **Verification:** unit tests of the option label and the excerpt; `yarn test:unit`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the user's walkthrough on fields of each
     kind.

4. **P1b.4 - The widget zone**
   - **Outcome:** a host's widget in `cms.singleton.details` or `.side` shows on every singleton's page
     with `{ collection, document }`, `document` `null` before the first save, and the Editor view reorders it
     among the cards.
   - **Areas:** the singleton page (widgets on, `data`), an `InjectionZoneRegistry` augmentation shipped
     with the plugin's types, `README.md`.
   - **Changes:** the augmentation declares both zones; the README shows a widget that checks
     `data.collection.slug` first.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the host's typecheck of a
     widget in the zone; the user's walkthrough: the widget shows and moves.

**Exit gate of 1b:** P1b.1 to P1b.4 done, their checks passing, and the phase's walkthrough.

### Phase 2

#### Sub-phase 2a - Placement

Evidence for the steps: no route of the plugin exports a `handle` today, so `/cms/:collection` has no
breadcrumb of its own; a page file may export `handle` with `breadcrumb` (`@medusajs/admin-sdk`
`AGENTS.md`). `DataTable` takes `actions` beside `action` (`@medusajs/dashboard` 2.22.7).

1. **P2a.1 - `admin.parent` in the config, the registry and the projection**
   - **Outcome:** `admin.parent` reaches `GET /admin/cms/collections` inside `admin`; an unknown parent,
     the collection itself, a cycle, and a singleton under a singleton stop the start with a message
     naming the chain.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/collection/types.ts` (`RegistryCollection.admin`),
     `src/lib/collection/prepare-collection.ts`, `src/lib/registry/validate-collection-parents.ts` (new,
     run by `prepare-registry.ts` once every collection is prepared, as a parent is another collection).
   - **Verification:** `prepare-registry` unit tests per refusal and a valid chain;
     `list-cms-collections` test of the key. `yarn test:unit`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`.

2. **P2a.2 - Children out of Content, buttons on a list parent**
   - **Outcome:** a collection with `admin.parent` is not a row of **Content**; the table of a list
     collection shows a button per child before **Create**, labelled with a singleton's
     `labels.singular` and another child's `labels.plural`, opening `/cms/:child`.
   - **Areas:** `src/admin/cms/collection-list-table/`, `src/admin/cms/document-list-table/`, a
     `listChildCollections` util with its unit test.
   - **Verification:** the util's unit test; `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`,
     `yarn format:check`; the user's walkthrough.

3. **P2a.3 - Breadcrumbs along the chain**
   - **Outcome:** a collection's page and a document's page show `Content › <parent> › <collection>`, each
     parent linking to its page.
   - **Areas:** `handle.breadcrumb` in `src/admin/routes/cms/[collection]/page.tsx` and
     `[collection]/[id]/page.tsx`, a breadcrumb component reading the collection list.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the user's walkthrough.

4. **P2a.4 - The host's page settings under the pages**
   - **Outcome:** the host's `page_settings` is a button on the pages' table, not a row of **Content**.
   - **Areas:** the host's `apps/backend/src/cms/config.ts` (`admin.parent: "page"`), its spec row.
   - **Verification:** the host's typecheck; the user's walkthrough.

5. **P2a.5 - Header actions from the config** (after P1.3 of `sub-admin-text-translations`)
   - **Outcome:** a list collection's header shows its resolved `admin.actions`: by default its children
     and **Create**, as P2a.2 shows them; a config's function changes them; a wrong result stops the
     start, naming the collection.
   - **Areas:** `src/lib/config/types.ts` (`CollectionAction`, `admin.actions`),
     `src/lib/collection/types.ts` (`RegistryCollection.admin.actions`), `prepare-collection.ts`, which
     resolves `admin.actions` and takes every collection's config for it,
     `src/lib/collection/prepare-collection-actions.ts` (new: the defaults, the list or the function, the
     checks), `src/admin/cms/common/utils/build-header-actions.ts` (new: the resolved actions as the
     `DataTable`'s `{ label, to }`), `src/admin/routes/cms/[collection]/page.tsx` (in place of
     `listChildCollections`, which the child sections of P2b.2 keep),
     `src/admin/utils/translate-collection-list.ts` (a `link`'s label), `README.md`.
   - **Verification:** `prepare-registry` unit tests - the defaults of a parent, of a collection without
     children and of a singleton, a function that reorders, removes and adds, and each refusal;
     `build-header-actions` unit tests per type; the walk's test of a `link`'s label. `yarn test:unit`,
     `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the user's
     walkthrough: the pages' header unchanged by default, then with a link added in the host.

**Exit gate of 2a:** P2a.1 to P2a.5 done, their checks passing, and the walkthrough.

#### Sub-phase 2b - Child sections

A child of a singleton has no drafts and no areas (user, 2026-11-19): its rows are added in the create
modal and edited in a drawer, both live at once. Its section is a table under the cards, one per child
in config order, each a `LayoutComposer.Entry` with the id `cms.child.<slug>`.

1. **P2b.1 - The rule, and the test module's child** (the user's migration)
   - **Outcome:** a child of a singleton with drafts or areas stops the start, naming it; the test
     module's `settings_link` (`TestSettingsLink`: `label`, `url`, `drafts: false`) sits under
     `settings`.
   - **Areas:** `src/lib/registry/validate-collection-parents.ts`,
     `integration-tests/modules/test-content/` (model, service, config).
   - **Verification:** `prepare-registry` unit tests of both refusals and the test config; the user's
     `yarn test:db:generate`; `yarn test:integration:http` passes.

2. **P2b.2 - The child's table, Add and Delete**
   - **Outcome:** a singleton's page shows each child's table after its cards, with the child's columns,
     **Add** opening the create modal that comes back to the singleton's page, and **Delete** per row
     after a prompt.
   - **Areas:** `src/admin/cms/singleton-page/` (the child section), the dashboard's `DataTable` with
     the child's slug as `prefix`, `useDocumentColumns`, `src/admin/routes/cms/[collection]/@children/
     [child]/create/page.tsx`, `DocumentCreateForm` taking where to go after a create.
   - **Verification:** `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the
     user's walkthrough.

3. **P2b.3 - Edit a row in a drawer**
   - **Outcome:** **Edit** on a row opens a drawer with the child's whole form, its sections under their
     headings, saved live; the row refreshes after a save.
   - **Areas:** `singleton-section-form/` renamed to `document-drawer-form/` in a commit of its own, then
     generalised to take the fields and their sections: the section drawer passes one, the row's drawer
     every section; `@children/[child]/[id]/edit/page.tsx`.
   - **Verification:** `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the
     user's walkthrough.

4. **P2b.4 - The host's segment rows** (interim, the user's migration)
   - **Outcome:** the host's `page_settings_segment` (`segment_id` unique, a `select` over
     the host's active markets; `homepage_id`, a page's id from the `pages` hook) is a table on the
     page settings, until Phase 1 of `sub-relations` turns `homepage_id` into a relation.
   - **Areas:** the host's content module (model, service), `apps/backend/src/cms/config.ts`, its spec
     row.
   - **Verification:** the host's typecheck; the user's `db:generate` and `db:migrate --skip-scripts`;
     the walkthrough.

**Exit gate of 2b:** P2b.1 to P2b.4 done, their checks passing, and the walkthrough.

## Short Tracker

- `done` - 1a (2026-11-19): `singleton` on the config, the registry and the projection, a singleton with
  areas or drafts refused at startup; `TestSettings` and the `settings` collection with the user's
  migration; `validate-cms-singleton` refusing a second create and any delete, reading the registry as
  `validate-cms-drafts` does instead of `get-cms-collection` answering `singleton`. 833 unit tests,
  185 HTTP tests, typecheck, admin typecheck, lint and format check pass. Committed in `f8399ba`.
- `done` - 1b, steps written 2026-11-19. P1b.1 built (2026-11-19), reworked the same day: no
  **Set up** and no empty state, the cards show each field's empty value until the first save (user);
  `formatFieldValue` shared with the table's cells; `listSingletonCards` keys a card by its section's
  index. P1b.2 built (2026-11-19): **Edit** on each card, the drawer at `@sections/[section]/edit`,
  `SingletonSectionForm` creating the document at the first save and updating it after,
  `useSingletonDocument` shared by the page and the drawer, `useDocument` taking `enabled`; the form
  checks with the `shape` schema, as the document form does. 843 unit tests, typecheck, admin typecheck,
  lint and format check pass; the user saved the host's `page_settings` twice, one row published and no
  version in the database, read by the store. P1b.3 built (2026-11-19):
  `DocumentFieldValue` in `common/document-fields/`, beside `DocumentField`, as any read-only view of a
  document's field will need it, choosing the view of the field's kind from a map as `ManagerFormField`
  chooses its input (`values/`: text, select, combobox - a hook or listed options, as `ComboboxField` -
  media) - options by label (`labelOptionValues`), a hook's through
  `HookOptionLabels` in an `ExtensionErrorBoundary`, media as `MediaThumbnail`s; rich text as its first
  line in `formatFieldValue`. It stays in the CMS layer: the form toolkit is for forms only (main spec
  D31, user 2026-11-19). 850 unit tests, typecheck, admin typecheck, lint and format check pass. Waits for
  the user's walkthrough. P1b.4 built (2026-11-19): widgets on, `data` typed by `CmsSingletonWidgetData` in `./admin-extensions`;
  the zones augment `InjectionZoneRegistry` in a hand-written root `index.d.ts`, as Medusa's docs
  prescribe (user): `exports["."].types` points at it, `files` lists it, it re-exports the built `lib`
  types, and both tsconfigs exclude it, as the build emits into the folder it imports from; the host's
  `src/admin/tsconfig.json` includes its generated `augmentation-refs.d.ts`. A scratch widget in the host
  typechecked against both zones and was refused an unknown one; the host's server typecheck passes but
  for two errors in `product-variants.spec.ts` that predate this work. README section "Singletons".
  Plugin typecheck, admin typecheck, lint, format check and 850 unit tests pass. The user's walkthrough
  in the host's Admin passed (2026-11-19): the cards, **Edit**, the first save and later ones; no widget
  in the zone was tried there. Committed (`f8399ba`, `88d6a05`).
- `done` - 2a, steps written 2026-11-19. P2a.1 built: `admin.parent` on the config, the registry
  and the projection (inside `admin`), `validate-collection-parents.ts` refusing an unknown parent, a
  cycle (the collection itself included) and a singleton under a singleton; registry tests only, as the
  projection passes `admin` whole. P2a.2 built: **Content** leaves out a collection with a parent; a list
  collection's table shows a button per child before **Create** (`listChildCollections`,
  `collectionPageLabel`). P2a.3 built: a `handle.breadcrumb` on `/cms` and `/cms/:collection`;
  `CollectionBreadcrumb` lists the chain (`listCollectionChain`) with the dashboard's separator, the
  parents linked only when it is the last breadcrumb, as the dashboard links every other one whole.
  P2a.4 built: the host's `page_settings` under `page`. 860 unit tests, typecheck, admin typecheck,
  lint and format check pass; the host's typecheck passes but for the two errors that predate this
  work. The user's walkthrough passed (2026-11-19): page settings out of **Content**, the button on the
  pages' table, the breadcrumbs with **Pages** linked. Committed (`a757738`; the host's `da67e6a1`).
- `done` - P2a.5, written and built 2026-11-20 (user): `CollectionAction` and `admin.actions`, a list
  or a function of the defaults, as `features` takes them; `prepareCollectionActions` resolves and checks
  them as the collection is prepared, from every collection's config, so no later pass is needed; the
  route shows them through `buildHeaderActions`, and `translateCollectionList` translates a link's
  label. `listChildCollections` stays for the child sections of P2b.2. README section "A collection
  under another, and the table's buttons". 890 unit tests, typecheck, admin typecheck, lint and format
  check pass; the user's walkthrough passed (2026-11-20): the pages' header
  unchanged by default, then with the host's link to **Navigation** before **Create**, added by a
  function. An HTTP assertion of the projection's actions waits for the user's
  `yarn test:integration:http`. Committed in `1bc281e`.
- `done` - 2b, steps written 2026-11-19. Before P2b.1 (user): `DocumentListTable` takes its header
  `actions` from the page that shows it; the collection's route builds the child buttons and **Create**,
  so the child sections of P2b.2 can pass their own. P2b.1 built: a child of a singleton with drafts or
  areas refused in `validate-collection-parents.ts`; `TestSettingsLink` and `settings_link` under
  `settings`; 863 unit tests, typecheck, admin typecheck, lint and format check pass; the user's
  migration of `test_settings_link` and `yarn test:integration:http` passed (2026-11-20). Committed
  (`a6cd1fe`, `d1d6b0f`); the migration in `cee98c0`. P2b.2 built (2026-11-21): `SingletonLayout` adds
  a `ChildCollectionSection` per child after the main cards (`cms.child.<slug>`), a `DataTable` with
  the child's slug as `prefix` (`useChildTableQuery`, 10 rows a page), the child's columns and a row
  action **Delete** behind a prompt (`useDeleteDocument` now takes the id at the mutation, so one hook
  serves every row; `DocumentActionMenu` passes it, user); **Add** opens
  `@children/[child]/create`, whose `DocumentCreateForm` comes back to the singleton's page through
  `successPath`. No row link until P2b.3. 1011 unit tests, typecheck, admin typecheck, lint and format
  check pass. Committed in `1b06bee`. P2b.3 built (2026-11-22): `singleton-section-form/` moved to
  `document-drawer-form/` in two rename-only commits (`84e67dc`, `fa4d428`), then `DocumentDrawerForm`
  takes `sections` - a section drawer passes its card, a row's drawer every card of
  `listSingletonCards` over the child, headings shown only for more than one - and the `successPath`
  it closes to; **Edit** in a row's menu and a click on the row open
  `@children/[child]/[id]/edit` (`buildChildEditPath`); `documents.edit.title` in both languages.
  1012 unit tests, typecheck, admin typecheck, lint and format check pass. P2b.4 built in the host
  (2026-11-22): `ContentPageSettingsSegment` (`cntpsseg`; `segment_id` and `homepage_id` required,
  `segment_id` unique among live rows) and `page_settings_segment` under `page_settings`, the market a
  `select` over the host's active markets by name, the homepage from the `pages` hook; the
  host's typecheck passes but for the two errors that predate this work. The host's fields carry
  `serverValidation: z.string()`, as a required column asks. The user's migration and walkthrough of
  P2b.2 to P2b.4 passed (2026-11-22).
- `done` - Phase 3 (2026-11-22): the host's `homepage_default` and `homepage` became `belongsTo`s to the
  page on their columns, with their `hasMany` on it, the fields `relationship`s drawn by the `pages`
  hook, and the user's `Migration20261122144827`, foreign keys and indexes only; the host's `validate`
  handler refuses an unpublish and a delete of a page the settings use, through `list-cms-references`.
  The user's walkthrough passed (2026-11-22): the default homepage and the market rows saved, a deleted
  page refused at a save, a homepage page refused unpublish and delete, another page passing. Every
  phase is done; the sub-spec waits for its closing.
