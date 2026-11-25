# Admin Blocks Export

**Date:** 2026-11-24
**Status:** pending
**Area:** admin
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md),
[sub-admin-table-cells](./2026-11-24-sub-admin-table-cells.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-24-sub-admin-blocks-export.md`

## TLDR

A host renders the plugin's documents table and forms on a page of its own, such as a product's
content (D35) on the product's page. The plugin's Admin pages are already drawn from blocks
([sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md), Phases 1 and 2); this sub-spec
exports them. It was Phase 3 of that sub-spec, moved here when it closed (user, 2026-11-24). Only its
goal is set; it is detailed when it is next.

## Problem

A host that wants CMS content drawn otherwise than the plugin's pages draw it - a product's content on
the product's page, a table in a widget - rebuilds the table, the drawer and the save from nothing, as
none of the plugin's Admin parts is exported. `./workflows` already exports the writes for a host's
server code; the Admin has no counterpart. The plugin's own pages cannot be replaced (D41), so a page of
the host's own is the only way, and it needs the blocks.

## Current State and Evidence

- `src/admin/cms/document-list-table/document-list-table.tsx`, `singleton-page/singleton-section-card.tsx`,
  `document-create-form/document-create-form.tsx`, `document-drawer-form/document-drawer-form.tsx` - the
  blocks the plugin's pages draw. The form cores read no route: each takes the `Frame` wrapping its
  `<form>` and `onSaved` from a shell (`document-create-route-form.tsx`, `document-drawer-route-form.tsx`).
- `src/admin-extensions/registry.ts` - a host's Admin code is stored by name on `globalThis`, so the
  plugin's and the host's copies of the module share it.
- [a-host-vite-serves-its-own-stale-copy-of-admin-extensions](../../lessons/a-host-vite-serves-its-own-stale-copy-of-admin-extensions.md)
  - a host imports `./admin-extensions` from the compiled package and Vite pre-bundles it apart from the
  plugin's Admin.

## Target Behavior

- A host draws `CmsDocumentTable`, `CmsSectionCard`, `CmsDocumentCreateForm` and
  `CmsDocumentDrawerForm` on a page or in a widget of its own, opened by state rather than a route.
- A save through an exported block goes through the plugin's routes and workflows, and refreshes the
  plugin's own tables, and the other way round.
- The plugin's own pages stay the plugin's: an export replaces nothing on them (D41).

## Proposed Solution

The blocks are named once, by the names they are exported under, with the `Cms` prefix of the host's API
today (`defineCmsFieldComponent`, `CmsSingletonWidgetData`): `CmsDocumentTable`, `CmsSectionCard`,
`CmsDocumentCreateForm` and `CmsDocumentDrawerForm` (user, 2026-11-23). They keep their files and names
until this sub-spec exports them; the renames, each committed before its content changes (AGENTS.md),
come with the export, and `PageEntry` moves beside the blocks then.

A spike first: does a block imported by a host share the dashboard's `QueryClient`, the plugin's query
keys (so a save in one copy refreshes a table in the other) and the plugin's translations, given the
second copy the lesson above describes? The registry already solves it for its maps and contexts through
`globalThis`. Then the entry (`./admin-extensions` or a new one), the read hooks, `CmsDocumentTable`,
`CmsSectionCard` and the cores in state-opened shells.

- **Reads first:** `useCmsCollection`, `useCmsDocuments`, `useCmsDocument`, and the form cores, whose
  save is the plugin's. Bare mutation hooks wait for a case that needs them. A host's component inside a
  form gets a field's `value` and `onChange`, as a component node does today, and saves nothing itself.
- **A block takes a collection and what the page decides:** actions, links, a filter. It does not read
  the route. The plugin's pages pass paths; a host's widget passes callbacks.
- **The exported table filters without a structure entry**, through the Admin list's `filters`, which
  take every `select`, `relationship` and `boolean` field of a collection for that reason (2d of
  `sub-admin-building-blocks`).
- **A widget reads CMS data through `sdk.client.fetch("/admin/cms/...")` until then**, and through the
  plugin's hooks after.

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A second copy of the exported blocks in a host's Vite | high | The export | The spike first; the registry's `globalThis` pattern | Decided by the spike |
| The exported blocks become a public contract too early | medium | The export | Reads and cores only; the spike before any export | - |

**Rollout and rollback:** detailed with the phases.

## Acceptance Criteria

- [ ] A host renders the plugin's table and a form core on a page of its own, and a save there refreshes
  the plugin's tables.

## Phasing

Detailed when it is next, starting with the spike.

## Short Tracker

- `pending` - the spike, when the sub-spec is next.
