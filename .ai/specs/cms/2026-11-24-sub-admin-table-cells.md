# Admin Table Cells and Columns

**Date:** 2026-11-24
**Status:** pending
**Area:** admin
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md),
[sub-admin-blocks-export](./2026-11-24-sub-admin-blocks-export.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-24-sub-admin-table-cells.md`

## TLDR

A host draws a table's column, or one field's value in the plugin's tables and cards, with a component
of its own: a column's `cell`, a column of no field and a field's `Cell`, under one registration. An
editor shows and hides a table's columns where the store turns on `view_configurations`, `admin.table`'s
the default set. A media field shows as a thumbnail in a table. It was Phase 4 of
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md), moved here when it closed (user,
2026-11-24), with that sub-spec's deferred media thumbnail. Only its goal is set; it is detailed when it
is next.

## Problem

A table's columns are exactly `admin.table`'s, each a field drawn by its type or a system column. A host
cannot draw a column of its own - a preview link, a computed status - nor draw one field's value
otherwise, and an editor cannot pick the columns. A media field shows its stored value, not the image.

## Current State and Evidence

- `src/admin/cms/document-list-table/columns.tsx` and `src/admin/cms/common/document-fields/` - a
  column draws a field's value through `DocumentFieldValue`, by its type, the values of a page read once
  per page and source.
- `@medusajs/types` 2.22.7, `dist/http/view-configuration/admin/` and
  `@medusajs/medusa/dist/feature-flags/view-configurations.js` - Medusa's saved table views, behind the
  `view_configurations` flag, `default_val: false`, "[WIP] Enable view configurations for data tables";
  the dashboard's lists read them through `useFeatureFlag("view_configurations")`. The dashboard exports
  the table that reads them, `ConfigurableDataTable`, with `createTableAdapter` and `defineCellRenderer`,
  a cell drawn by a render mode registered by name (`dist/components.d.ts`, `dist/lib.d.ts`). Its columns
  come from `GET /admin/views/:entity/columns`, generated from the entity's GraphQL schema, and the
  settings module finds its entities in every module's joiner config, links aside
  (`@medusajs/settings`, `dist/utils/entity-discovery.js`). **Inference:** a CMS collection's model, an
  ordinary model of a host's module, is one of them; not run. The plain `DataTable`'s column menu,
  `enableColumnVisibility`, takes effect only with the flag on (`dist/chunk-VRKZYAEV.mjs`).
- Media in a table: the media of a page read by id, which no route takes yet (deferred from P2a.3 of
  `sub-admin-building-blocks`); the read is the user's decision.

## Target Behavior

- A table shows a host's column drawn by its `cell`, and a field's value drawn by its `Cell` in tables
  and cards alike; a column's `cell` overrides a field's `Cell` in that table.
- A `cell` with no registration in the host's Admin shows an unavailable cell in that column; the rest
  of the table renders.
- Where the store turns on `view_configurations`, an editor shows and hides a table's columns,
  `admin.table`'s the default set; elsewhere the table shows exactly `admin.table`.
- A media field shows as a thumbnail.

## Proposed Solution

A widget is a card on a page and cannot sit in a table's cell. Medusa's own tables take no column of a
host's, drop none and redraw none, a limit its dashboard puts on a host (user, 2026-11-22); only its
configurable tables, still WIP, take a host's cell renderer by name (`defineCellRenderer`). The CMS's
tables take their columns from the config (`admin.table`, an entry's `table`); a field's `Cell` adds how
one field's value is drawn everywhere it shows (user, 2026-11-22):

```ts
homepage_id: {
  type: "relationship",
  relationTo: "page",
  admin: { components: { Cell: "page-status-cell" } },
}
```

The key follows the common CMS shape, `admin.components.Cell` on the field. The component is registered by name in the
host's Admin, as a field component is, and it draws the value in the plugin's tables and its read-only
cards alike. It is not the form's: an input stays the field's type or a `{ type: "component" }` node in
the sections. The table, its order, pages, actions and saves stay the plugin's, so its control holds.

```ts
type CmsTableColumn<TText = CmsText> =
  /** A field's value, drawn by its type, or by `cell`, a host's component registered by name. */
  | { field: string; label?: TText; cell?: string; sortable?: boolean; width?: number }
  /** A column of no field: a host's component, given the row's document. */
  | { key: string; label: TText; cell: string; width?: number }
  /** A column of the plugin's own. */
  | { system: "id" | "status" | "published_version" | "created_at" | "updated_at"; label?: TText }
```

A column's `cell` and a column of no field come with the field's `Cell`, under one registration. A host
registers a cell with `defineCmsCell(name, Component)` from `./admin-extensions`, beside
`defineCmsFieldComponent`, and the component gets `{ value, document, collection, field }`, without
`value` and `field` in a column of no field. The CMS names them as its field components (`value`) and
Medusa's cell renderers (`value`, `row`) do. A column of no field is kept apart from the fields because
it stores nothing.

**Columns an editor shows and hides** (user, 2026-11-23): the dashboard's column menu, with
`admin.table`'s columns the default set. The dashboard draws it only where the store turns on
`view_configurations`, Medusa's flag, "[WIP]" and off by default. A choice is kept in Medusa's saved
views of the collection's model, through `DataTable`'s `entity`; that the settings module takes a CMS
model is the inference above, checked when this sub-spec is detailed, as are the columns the menu offers
beyond `admin.table`'s.

## Contracts

- **Config:** a column's `cell` and `width`, a column of no field, and `admin.components.Cell` on a
  field.
- **Start checks:** a table's column keys are unique and are no field's name; a `cell` names a component
  the host registers, which is known only in the Admin, so a name with no registration shows an
  unavailable cell there, as a field component does.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A column's `cell` with no registration in the host's Admin | An unavailable cell in that column; the rest of the table renders | Admin check |
| The store has `view_configurations` off | No column menu; the table shows exactly `admin.table` | Admin check |

## Acceptance Criteria

- [ ] A host's cell draws its column, and a field's `Cell` its value in tables and cards.
- [ ] Where the store turns on `view_configurations`, an editor shows and hides a table's columns,
  `admin.table`'s the default set; elsewhere the table shows exactly `admin.table`.
- [ ] A media field shows as a thumbnail in a table.

## Phasing

Detailed when it is next, starting with the user's decision on the media read by id.

## Short Tracker

- `pending` - the media read by id, the user's decision; then the phases.
