# Admin Building Blocks

**Date:** 2026-11-22
**Status:** active
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md), [sub-singletons](./ended/2026-11-18-sub-singletons.md),
[sub-relations](./2026-11-22-sub-relations.md), [sub-block-areas](./2026-11-23-sub-block-areas.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-22-sub-admin-building-blocks.md`

## TLDR

The CMS keeps generating every Admin screen from the config. That is what makes it a replacement for
a standalone CMS inside Medusa (user, 2026-11-22). What changes is that a generated screen stops being a
dead end. The work splits into three layers, as an established CMS splits it:

1. **The documents.** A collection's `fields`, `admin.sections` and relations describe a document, its
   form, its table's columns and how it is saved. This layer does not change.
2. **The routes.** One `admin.routes` at the config's root describes the whole Admin, apart from the
   schema: the tree of pages, each with its address and the collections it shows, a list as its
   table and a singleton as its sections, which may hold tables of other collections. Without it every
   collection is a page of its own, as the Admin was. It replaced `admin.parent` (2b, then
   `admin.structure`) and grew into routes in 2f and 2g ("The routes").
3. **The additions.** A host adds cards to the CMS's pages with Medusa's own widgets, in a widget zone
   on every CMS page. It never removes or replaces the plugin's blocks there. What it wants drawn
   differently, it draws on a page of its own from the plugin's exported blocks.

The plugin controls its views, as Medusa controls its dashboard: what is fixed, what the config fills and
what a host adds is [D41](./2026-11-04-main-spec.md) of the main spec.

Inside the plugin, each screen becomes a loop over the resolved structure that renders a small set of
building blocks: a table, a section card, a document form. The same blocks are what a host gets later.
A page draws them in a layout of the plugin's own, made with Medusa's `defineLayoutConfig`, so Customize
Layout arranges a host's widgets and nothing of the CMS (D41).
Writes stay the plugin's: the server checks every save, and the form's state, checks and save belong to
the plugin's form whatever draws around it. Versions, history, autosave, rich text, media, field
components, options hooks and the pickers built on them are carried by the blocks, not rebuilt (user,
2026-11-22).

## Problem

The pages under `/app/cms` are drawn from the config by the plugin alone, and `admin.parent` decides both
where a collection is listed and what its parent's page shows (D37). Every new arrangement needs code in
the plugin:

- a second table of the same collection;
- a card that is not a collection;
- something added inside a child's table;
- a singleton under a singleton;
- a table on a product's page.

The first host met it on its homepage settings: the **Settings** page is a card of `page_settings`
followed by the table of `page_settings_segment`, and nothing else can be added to it or arranged on it.

A host's widget can add a card only to a singleton's page; the list and the document pages have no
zone. Even there it rebuilds the table, the drawer and the save from nothing, as none of the plugin's
parts is exported. The first host built its menus by hand for the same reason. `./workflows` already
exports the writes for a host's server code; the Admin has no counterpart.

## Current State and Evidence

- `src/admin/routes/cms/[collection]/page.tsx` - a collection's page is `SingletonPage` or
  `DocumentListTable`, chosen by `singleton`, with no `LayoutComposer` and so no widget zone for a list.
  The routes are thin: 339 lines across every `page.tsx`.
- `src/admin/cms/singleton-page/singleton-layout.tsx` - a singleton's page in `LayoutComposer`
  (`cms.singleton.details` zone, `core:two-column`, data `CmsSingletonWidgetData`): the cards of
  `listSingletonCards` in `main` and `side`, then a `ChildCollectionSection` per child from
  `listChildCollections`, in config order. Entry ids are `cms.section.<key>` and `cms.child.<slug>`,
  which the dashboard's Editor view saves.
- `src/admin/cms/document-edit-form/document-edit-form.tsx` - the document page's form is not bound to
  a route. It holds the status section, the history, the version view and the stale-version alert in its
  own `LayoutComposer` (`cms.document.details`) with `disableWidgets`. Its `main` and `side` are
  fragments, which `LayoutComposer` takes apart: the alert, the version view, the form, the status card,
  the side sections, the history and the details are each an entry that Customize Layout moves and
  hides, in one zone for every collection.
- `src/admin/cms/singleton-page/utils/list-singleton-cards.ts` - a card's key is `general` for the
  fields in no section, else the section's index found by its label; sections have no key of their own.
  `src/lib/config/types.ts` lets a collection leave fields out of every section ("a field in none of them
  stays in the first section"), and the document page puts those fields under its header with **Save**
  (`document-edit-form.tsx`): three renderers each carry a path for fields in no section.
- `src/admin/cms/document-list-table/document-list-table.tsx` and
  `src/admin/cms/singleton-page/child-collection-section.tsx` - two tables over the same `DataTable`,
  `useDocuments` and `useDocumentColumns`. They differ in page size, URL prefix (the child's slug),
  status filter, header actions and row links. `child-document-columns.tsx` adds **Edit** and **Delete**
  through `useNavigate` and a path built by `buildChildEditPath`.
- `src/admin/cms/document-drawer-form/document-drawer-form.tsx` - the form core (schema, defaults,
  `DocumentFormProvider`, `MediaFieldsProvider`, `useDocumentFormChecks`, `useDocumentFormMedia`, server
  errors on fields, upload before save) sits inside `RouteDrawer` and closes with `useRouteModal`.
  `document-create-form` does the same in `RouteFocusModal`.
- `src/admin/cms/document-list-table/columns.tsx` - a table's columns are `useAsTitle` first, whatever
  `admin.defaultColumns` says, then `defaultColumns` without it, then the status and the published
  version for a collection with drafts, then `updated_at`, always. A cell is text from
  `formatFieldValue`: a select shows its stored value, a relationship its id, media its stored value.
  The first host's `useAsTitle: "segment_id", defaultColumns: ["homepage_id"]` reads as one column and
  shows three, with a market's code and a page's id (user, 2026-11-22: unreadable even for a developer).
- How a table edits its rows follows from where the collection sits, not from its config: a child of a
  singleton is drawn by `ChildCollectionSection`, its rows edited in a drawer with an actions menu; any
  other collection's rows open its document's page (`src/admin/routes/cms/[collection]/page.tsx`,
  `child-collection-section.tsx`, `child-document-columns.tsx`).
- `src/lib/registry/validate-collection-parents.ts` - refuses a singleton under a singleton ("which a
  singleton's page cannot show"). A child of a singleton needs `drafts: false` and no areas, because its
  rows are edited in a drawer: the layout reaches the model rules.
- `src/lib/collection/prepare-collection-actions.ts` - a list collection's default header buttons are
  one per child, found by `admin.parent` among every collection's config, then **Create**.
  `admin.actions` is a list or a function of `{ defaultActions }`, run at start (D40).
- `src/workflows/cms/steps/list-cms-collections.ts` - `buildClientCollection` passes a collection's
  `admin` to the Admin whole.
- `src/api/admin/cms/collections/[collection]/documents/validators.ts` - the Admin's list takes `q`,
  `status`, `order`, `limit` and `offset`, no field filter. `src/workflows/cms/steps/list-cms-documents.ts`
  already takes `filters`, today the store's on its `filterable` fields, and hands them to Query.
- `src/admin-extensions/registry.ts` - a host's Admin code is stored by name on `globalThis`, so the
  plugin's and the host's copies of the module share it.
- [a-host-vite-serves-its-own-stale-copy-of-admin-extensions](../../lessons/a-host-vite-serves-its-own-stale-copy-of-admin-extensions.md)
  - a host imports `./admin-extensions` from the compiled package and Vite pre-bundles it apart from the
  plugin's Admin.
- The first host's config (`apps/backend/src/cms/config.ts` in the first host) has `page` (a list),
  `page_settings` (a singleton, `parent: "page"`) and `page_settings_segment` (`parent: "page_settings"`,
  a `segment_id` select and a `homepage_id` relationship).
- `@medusajs/types` 2.22.7, `dist/http/view-configuration/admin/` and
  `@medusajs/medusa/dist/feature-flags/view-configurations.js` - Medusa's saved table views, behind the
  `view_configurations` flag, `default_val: false`, "[WIP] Enable view configurations for data tables";
  the dashboard's lists read them through `useFeatureFlag("view_configurations")`. The dashboard exports
  the table that reads them, `ConfigurableDataTable`, with `createTableAdapter` (an `entity`, a
  `useData` hook, `getRowHref`, `renderRowActions`, `defaultFilters`, a `viewConfigurationKey` per
  table) and `defineCellRenderer`, a cell drawn by a render mode registered by name
  (`dist/components.d.ts`, `dist/lib.d.ts`). Its columns come from `GET /admin/views/:entity/columns`,
  generated from the entity's GraphQL schema, and the settings module finds its entities in every
  module's joiner config, links aside (`@medusajs/settings`, `dist/utils/entity-discovery.js`).
  **Inference:** a CMS collection's model, an ordinary model of a host's module, is one of them; not run.
  The plain `DataTable`'s column menu, `enableColumnVisibility`, takes effect only with the flag on
  (`effectiveEnableColumnVisibility = isViewConfigEnabled && enableColumnVisibility`,
  `dist/chunk-VRKZYAEV.mjs`; the first host's 2.21.2 the same, `dist/chunk-6CQCXI3F.mjs`), and so does
  its view selector for an `entity` (`enableViewSelector`); without `onColumnVisibilityChange` a choice
  lives in the table's state. Its `filters` need no flag.
- `@medusajs/dashboard` 2.22.7, `dist/chunk-IAQO2TGC.mjs`, and the first host's 2.21.2,
  `dist/chunk-GVVNJYF3.mjs`, which holds the same code: `LayoutComposer` makes an entry of every element
  in a section, fragments taken apart - a `LayoutComposer.Entry` under its `id`, any other element under
  its component's name (`core:<name>`, which a production build minifies). The saved `hidden`,
  `section` and `order` apply to every entry, edit mode gives each a hide toggle, and `disableWidgets`
  only leaves the widgets out
  ([a-shared-widget-zone-shares-one-saved-layout](../../lessons/a-shared-widget-zone-shares-one-saved-layout.md)).
- `@medusajs/admin-sdk` 2.22.7, and 2.21.2 in the first host, exports `defineLayoutConfig` (a layout's
  `id` and `sections`) beside `defineWidgetConfig`. The admin bundler collects a layout from
  `src/admin/layouts/` and puts it in a plugin's build as `layoutModule`, beside its widgets and routes
  (`@medusajs/admin-vite-plugin` 2.21.2, `generatePluginEntryModule`), and the dashboard registers every
  plugin's layouts (`DashboardApp`, `plugin.layoutModule.layouts`). A layout's component gets
  `sections`, `data` and `className`; `@medusajs/admin-shared` lets a plugin add its layout's section
  names to `LayoutSectionRegistry`. The dashboard's own pages stand on `core:two-column`,
  `core:single-column` and the like.
- **Inference:** the one layer an established CMS lacks is ours: D37's `parent` composing a page. That is where
  every limit above sits, so that is the layer this sub-spec opens. A structure apart from the schema
  holds it in one place; Medusa's widgets are already how a Medusa host adds to a page.

## Target Behavior

- Without `admin.routes`, every collection is a page of its own, at its slug, and every screen looks and
  behaves as before this sub-spec, except that Customize Layout moves and hides only widgets: no card,
  table, form or status card of the CMS (user, 2026-11-22).
- The routes and the collections' sections alone order a page's blocks and place them in their column.
  In Customize Layout an editor moves and hides widgets only (user, 2026-11-22).
- **Content** lists the top-level routes in their order, by label; each page sits under the route the
  tree nests it in, with its breadcrumbs, and shows its collections in their order: a list as its
  table, a singleton as its sections in their own columns, and the routes under it as its table's
  buttons, on a route of one list, or as a list under its collections.
- A list on a route of several collections shows its documents under its entry's label, or its own,
  with its entry's columns and its own search, order and page in the URL under its key.
- A table edits its rows as the collection's `admin.edit` says, wherever the table stands (user,
  2026-11-22):
  - `"page"`: a row opens the document's page, `/cms/<route>/<collection>/<id>`, and **Create** or
    **Add** opens the create modal over the current page and goes to the new document's page after the
    save; a document is deleted from its page;
  - `"drawer"`: **Add** in a modal, a row and **Edit** in a drawer, **Delete** behind a confirmation, all
    over the current page, saved live.
- A table shows the columns `admin.table` lists, in their order, each under its label: a field's value
  drawn by its type (a select's option label, a relation's title, a media thumbnail, a date, a boolean
  badge), a system column where it is listed, or, from
  [sub-admin-table-cells](./2026-11-24-sub-admin-table-cells.md), a host's column drawn by its `cell`.
  Without `admin.table`, the columns are the title, the status for a collection with drafts, and
  `updated_at`; the published version, shown today, is a system column a table lists. From
  `sub-admin-table-cells`,
  where the store turns on `view_configurations`, an editor also shows and hides a table's columns,
  `admin.table`'s being the default set (user, 2026-11-23).
- `useAsTitle` names the field a document is titled by, in its page's heading, the breadcrumbs, a drawer,
  a picker and a relation's cell; it adds no column.
- An editor filters a table by the fields its `admin.table.filters` lists, besides the status, each
  filter drawn by the field's type: a select's options, a relation's documents by their title, a
  boolean's yes and no (user, 2026-11-23); a relation's from the picker of `sub-relations`' Phase 2
  (user, 2026-11-24). It narrows the table in the URL and lifts as the status filter does. A table
  keeps no condition of the config's own that an editor cannot lift (user, 2026-11-24).
- Every CMS page has a widget zone: every route's page shares `cms.route.details`, every document's
  page `cms.document.details` (user, 2026-11-24). A host's widget receives the route and its
  collections, a singleton's document among them, or the document and its collection, and checks the
  slug itself (user, 2026-11-22). The Editor view arranges them, as on any Medusa page.
- Routes that name an unknown collection, place a collection on two routes, leave a collection out of
  reach, repeat a slug or a key of a page, filter by a field a filter cannot take, or give a collection
  whose rows open their page no route stop the start with a config error.
- Every save goes through the plugin's routes and workflows: the server's checks, the `validate` hook,
  the events. A block hands a host no write of its own, here or in `sub-admin-blocks-export`.
- The blocks carry what the screens have today, unchanged: drafts, versions and history, the stale-version
  alert, autosave once `sub-autosave` lands, live validation, the taken-value check, slugs, rich text,
  media, component nodes and options hooks.

## Proposed Solution

### Three layers

| Layer | Says | Where | Today |
|---|---|---|---|
| Documents | fields, form, table, how documents are edited, relations, validation | a collection's `fields`, `admin.sections`, `admin.table`, `admin.edit` | `admin.table` and `admin.edit` new |
| Routes | which pages exist, their addresses, under which, and which collections each shows | `admin.routes` at the config's root | `admin.parent` on each child |
| Additions | a host's card on a CMS page; the plugin's blocks on the host's own pages | Medusa widgets; the exported blocks (`sub-admin-blocks-export`) | a widget zone on the singleton page only |

The routes are placement only. It never changes how a document is validated or saved. The rules it
leaked into the model are reconsidered once a page can draw what they forbade: a singleton under a
singleton, a drawer-edited collection with drafts. Each is a decision of its own.

### The routes

The final design, after 2b to 2g. `admin.structure` (2b) became `admin.routes` (2f); a node's page
entries (2b) became a singleton's `table` sections (2e), which went again in P2g.5; a separate view
kind (planned for 2g) became a route of several collections (user, 2026-11-24). The history is in the
Short Tracker and git.

**Routes lay out the pages; a collection describes itself** (user, 2026-11-24). `admin.routes` says
which pages exist, their addresses, their order and which collections stand on each, in which column.
A collection's `fields`, `admin.sections`, `admin.table`, `admin.edit` and `admin.actions` say what its
documents hold, how its form or cards are laid out, its table and how its rows are edited, wherever it
stands. A route's entry may give its table's settings for that page alone. Each need has one tool, so a
singleton's `table` section, which put a table on a page a second way, goes (P2g.5).

```ts
admin: {
  routes: [
    { slug: "pages", collections: ["page"] },                  // a list: its table
    {
      slug: "site",
      label: text("navigation.site"),                          // needed with several collections
      collections: [
        "page_settings",                                       // a singleton: its sections
        {
          collection: "page_settings_segment",                 // a list: its table
          label: text("navigation.homepages"),                 // the table's heading on this page
          pageSize: 20,                                        // its admin.table, in place here
        },
      ],
      children: [{ slug: "footer", collections: ["footer_settings"] }],
    },
  ],
}

// collections -> page_settings: its own fields' layout, nothing of other collections
admin: {
  sections: [{ key: "homepage", label: text("…"), fields: ["homepage_default_id"] }],
}
```

- **A route** is `{ slug, collections, label?, description?, children? }`, `admin.routes` a list of
  them or a function of `defaultRoutes` (D40). Without it every collection is a top-level route of its
  own slug, in config order. `collections` is always a list (user, 2026-11-24: no single form of a key
  that holds a list), one entry at least: a slug, or `{ collection, key?, position? }`, a list's entry
  also taking `label` and `description`, its table's heading on the page, and `columns`,
  `defaultSort`, `pageSize` and `filters` in place of its `admin.table` keys.
  A route of several collections needs a `label`; a route of one takes its collection's page label.
- **Each collection draws as its kind does,** wherever it stands: a list as its table, a singleton as
  its sections in their own columns and order (user, 2026-11-24), so a singleton's entry takes neither
  `position`, a heading nor table settings. A list's entry stands in its `position`, `main` by default. A route
  of one list keeps its table as the page's own, under the route's label at `h1`; among other
  collections a list's table is an `h2` under its key in the URL.
- **Every collection stands on exactly one route** (P2g.5), as its documents have one address and the
  Admin reaches it nowhere else. A drawer-edited list stands on a route as any list does.
- **A collection's sections** lay out its own fields and areas, each in exactly one section: a list's
  document form and drawer, a singleton's cards (2c). They hold nothing of other collections; a
  document page's table of related documents is a feature of its own, a `join` field in an established
  CMS.
- **Addresses** (B2, user, 2026-11-24): a route's page `/cms/<route>`; a document
  `/cms/<route>/<collection>/<id>` on every route, so a route holds any number of page-edited lists
  and a link survives a route's regrouping; **Create** and **Add** `/cms/<route>/tables/<key>/create`; a
  drawer-edited row `/cms/<route>/tables/<key>/<id>/edit`; a singleton's card
  `/cms/<route>/sections/<singleton>/<section>/edit`. A table is found by its list's entry key over
  the route; the start keeps the keys unique on the route. Every address comes from `buildCmsPath`.
- **A route's children** are buttons of its table's header when the route shows one list alone - the
  list's default actions, `{ type: "route", route }`, one per child, then **Create** - and a list
  ("Subpages") under its collections on any other route. **Content** lists the top-level routes in the
  tree's order, by label, with a route of one list's document count. The breadcrumbs follow the tree.
- **The registry** holds `routes` in the tree's order, each `{ slug, label, description?, collections,
  parent?, children }`, an entry `{ collection, key, label?, description?, position?, table? }`, and
  each collection its
  `admin.route`; `GET /admin/cms/collections` answers them beside the collections, the texts through the
  walk that knows no key.

### Tables and how a collection is edited

A collection describes its table and how its documents are edited, in its `admin`, beside its form. A
`table` entry may give its own `table` for one page:

```ts
type CmsTableConfig<TText = CmsText> = {
  /** Exactly the columns shown, in order. */
  columns: CmsTableColumn<TText>[]
  /** The fields an editor may filter the table by, besides the status (Phase 2d). */
  filters?: string[]
  defaultSort?: { column: string; direction: "asc" | "desc" }
  pageSize?: number
}

type CmsTableColumn<TText = CmsText> =
  /** A field's value, drawn by its type, or by `cell`, a host's component (sub-admin-table-cells). */
  | { field: string; label?: TText; cell?: string; sortable?: boolean; width?: number }
  /** A column of no field: a host's component, given the row's document (sub-admin-table-cells). */
  | { key: string; label: TText; cell: string; width?: number }
  /** A column of the plugin's own. */
  | { system: "status" | "published_version" | "created_at" | "updated_at"; label?: TText }

admin: {
  useAsTitle?: string
  /** The collection's table; the title, the status with drafts, and `updated_at` when left out. */
  table?: CmsTableConfig
  /** Where a row is edited: its document's page, or a drawer over the table, saved live. */
  edit?: "page" | "drawer"
}
```

The first host's segments:

```ts
{
  slug: "page_settings_segment",                       // live, as a collection is without drafts: true
  admin: {
    useAsTitle: "segment_id",
    edit: "drawer",
    table: {
      columns: [
        { field: "segment_id", label: text("…") },      // the market's portal, not its code
        { field: "homepage_id", label: text("…") },     // the page's title, not its id
        { system: "updated_at" },
      ],
      defaultSort: { column: "segment_id", direction: "asc" },
    },
  },
}
```

- **The table is exactly its `columns`.** Nothing is added or dropped. A field column's label defaults to
  the field's, and it sorts when the field is a column of the model.
- **A field's value is drawn by its type**, as a singleton's cards draw it through `DocumentFieldValue`:
  a select's option label, a relation's target titled by its `useAsTitle`, media as a thumbnail, a date
  formatted, a boolean as a badge. The values of a page are read in one request per source, not one per
  row: a relation's titles through the Admin list's `id` filter, one request per target collection
  (user, 2026-11-22).
- **A column's `cell`** draws that column in that table; a field's `Cell` draws the field's value
  everywhere, in tables and cards. The column's wins. A column of no field is kept apart from the fields
  because it stores nothing. All three come in
  [sub-admin-table-cells](./2026-11-24-sub-admin-table-cells.md), under one registration.
- **`useAsTitle`** is the document's title only, as in the common CMS shape. It is no longer the table's first
  column; a table that wants it lists it.
- **`admin.edit`** is `"page"` by default. `"drawer"` takes no drafts and no areas, as a drawer has no
  status, publish or blocks; the start checks it. Every collection stands on a route, so a document
  edited on its page has its address, `/cms/<route>/<collection>/<id>`. A singleton takes neither
  `admin.edit` nor `admin.table`: its sections are edited from their cards.
- **The frame stays the plugin's** (D41): order, pages, search, the URL state, the row actions and
  deletes. A developer designs what the table holds, not the component that draws it.
- **Filters an editor picks** (user, 2026-11-23), from Phase 2d: a table's `filters` names the fields an
  editor may filter it by, each of kind `select`, `relationship` or `boolean`, and the plugin draws each
  filter from the field's type; a `relationship` once `sub-relations`' picker draws it (user,
  2026-11-24). They need no flag: the dashboard's `DataTable` draws them as it draws
  today's status filter, their values in the URL.
- **Columns an editor shows and hides** (user, 2026-11-23), from `sub-admin-table-cells`: the dashboard's column menu,
  with `admin.table`'s columns the default set. The dashboard draws it only where the store turns on
  `view_configurations`, Medusa's flag, "[WIP]" and off by default; elsewhere a table shows exactly
  `admin.table`. A choice is kept in Medusa's saved views of the collection's model, through
  `DataTable`'s `entity`; that the settings module takes a CMS model is the inference in "Current State
  and Evidence", checked when `sub-admin-table-cells` is detailed, as are the columns the menu offers beyond
  `admin.table`'s.
- **A departure from the common CMS shape, with its reason.** There `defaultColumns` is a list of names,
  because the editor picks columns in the list and a developer replaces the list view where that is not
  enough. The CMS has no view replacement (D41), and an editor picks columns only where the store turns
  on Medusa's views. A list of names cannot label a column, place a system column, add a column of no
  field or sort by default, so the columns are objects, shaped as the dashboard's `DataTable` columns
  are. `useAsTitle` and `Cell` are taken as that shape has them. The CMS's drawer-edited collections are
  its own (D37). The CMS keeps the default sort and the page size in `admin.table`, not on the
  collection, as a `table` entry gives a table of its own for one page, sorted and paged apart. The CMS
  lists the filters in `admin.table` rather than offering every field, as `filterable` lists the
  store's, so a developer adds each filter an editor gets, and a `table` entry lists its own (user,
  2026-11-23).

### Widgets for a host's cards

A host adds to a CMS page the way it adds to a product's page: `defineWidgetConfig({ zone })`, with the
Editor view arranging the result. Every route's page shares one zone, and every document's page another
(user, 2026-11-24), so a widget checks the slug:

| Page | Zone | `data` |
|---|---|---|
| A route's | `cms.route.details` and `.side` | `CmsRouteWidgetData`: `{ route: { slug, label }, collections }`, a singleton's `document` among them |
| A document's | `cms.document.details` and `.side` | `CmsDocumentWidgetData`: `{ collection, document }` |

```tsx
const SettingsHelp = ({ data }: DetailWidgetProps<CmsRouteWidgetData>) =>
  data.route.slug === "site" ? <Container>…</Container> : null

export const config = defineWidgetConfig({ zone: "cms.route.details" })
```

The zones are declared in `InjectionZoneRegistry`, so a host's `defineWidgetConfig` completes them.
Zones per collection (`cms.page_settings.details`) would spare the check, but they need a spike on how
the dashboard collects widgets for a zone named at runtime. They are left out (user, 2026-11-22).
`cms.document.list` and `cms.singleton.details` went in 2g, with their data types.

A widget gets its zone's `data` and nothing else. On the document page it may render inside the form's
providers, which are no part of the contract: the form's state stays the plugin's (D41).

### Order on a page: the routes', with widgets the editor arranges

The routes and the collections' sections alone decide where the CMS's blocks stand. Customize Layout, the dashboard's Editor view,
arranges only the widgets around them (user, 2026-11-22). The CMS builds no ordering of its own beside
the config. This is stricter than Medusa's own pages, where an editor moves and hides the
dashboard's sections too: on a CMS page the config says where everything stands (D41).

`LayoutComposer` alone cannot hold it. It saves an arrangement per zone, `{ hidden, section, order }`
per entry, an editor's own or the store's default (`is_default`), through
`/admin/layouts/:zone/configuration`, and it makes an entry of every element a page puts in its
sections, a `LayoutComposer.Entry` or not ("Current State and Evidence"). One block per column, chosen
first, would be one entry, hidden with all it holds, a form's **Save** among it.

So the CMS draws its pages in a layout of its own, `cms:two-column`, which Medusa's `defineLayoutConfig`
registers from `src/admin/layouts/`, as a widget is registered from `src/admin/widgets/`:

- the page hands `LayoutComposer` empty sections, so it composes no entry but the widgets of its zone;
- the page gives its blocks, `{ main, side }`, to the layout through a context;
- the layout's component draws each column's blocks first, then the column's widgets, which the
  dashboard hands it as `sections`: plain in view mode, as drop zones in edit mode.

Its sections, `main` and `side`, are declared in `LayoutSectionRegistry` in the Admin's own source, as
only the plugin's pages name the layout. The singleton's page is its first user, and the gate (P1a.3): the
dashboard draws the layout, and Customize Layout offers widgets alone. If it does not, the user decides
between two fallbacks ("Alternatives Considered"): the CMS's blocks as entries an editor moves and
hides, as Medusa's own sections are, under ids naming their collection (`cms.<slug>.section.<key>`), or
the blocks outside `LayoutComposer` with the widgets after them.

The layout also ends what the shared zones cause today. Every singleton's first card is `cms.section.0`
in `cms.singleton.details`, so arranging one singleton arranged them all; and the document page's form,
status card and history are entries of `cms.document.details`, which an editor can hide for every
collection at once
([a-shared-widget-zone-shares-one-saved-layout](../../lessons/a-shared-widget-zone-shares-one-saved-layout.md)).

A widget's own place is saved in the shared zone under its id, so it stands in the same place on every
page of its kind. An arrangement saved for today's singleton cards is dropped once by Phase 1a; the
plugin is unreleased and the first host has one singleton.

### Which tool for which change

The rule of thumb: `admin.routes` says where the plugin's pages stand and what each shows; a
collection's `admin` says how it is laid out, tabled and edited; a widget adds what the config does not
describe; something drawn otherwise than the plugin draws it is a page of the host's own. Each need has
one tool, so no two keys do the same thing (user, 2026-11-24). The table holds the state after 2g; the
sub-specs named build their rows.

| A host wants | It uses | Code |
|---|---|---|
| A collection on **Content**, or its page under another page, at an address of its own | A route `{ slug, collections }` in `admin.routes`, with `children` (2f, 2g) | None |
| One page with several collections: lists' tables and singletons' cards | A route of several `collections`, under a `label` (2g) | None |
| Pages reordered, or moved under another | The order and nesting of `admin.routes` (2f) | None |
| A document's form: its fields, headings, tabs, columns | `admin.sections` | None |
| Settings held in one document, edited as cards | `singleton: true`, a card per section | None |
| A table's columns, labels, sorting, page size and an editor's filters | `admin.table`; a list's route entry for one page (its heading too) | None |
| Rows edited on their page or in a drawer | `admin.edit` | None |
| Drafts, versions and **Publish** | `drafts: true` (D19) | None |
| A card on a CMS page: a hint, a figure, a preview, data from another module | A widget in the page's zone | A Medusa widget |
| A widget moved or hidden | Customize Layout | None, the editor in the Admin |
| Another input in a form, such as a picker | A `{ type: "component" }` node, an options hook | A small component |
| A column of no field, or one value drawn otherwise in a table or a card | A column's `cell`, a field's `Cell` (`sub-admin-table-cells`) | A small component |
| A table's columns shown or hidden by an editor | The dashboard's column menu, where the store turns on `view_configurations` (`sub-admin-table-cells`) | None |
| Documents related to the one open, on its page | A related documents' table, a sub-spec of its own ("The plugin controls its views") | None |
| A screen of its own with CMS content, such as a product's content on its page, or CMS content beside another module's data | A route or a widget of its own from the exported blocks (`sub-admin-blocks-export`) | Yes |
| The plugin's table or form replaced on the plugin's page | Not possible (D41) | - |

Where two tools could look alike, one is given the job:

- **A route or a collection's sections?** A route lays out pages - which collections stand where; a
  collection's sections lay out its own fields. A table of another collection stands on a route, never in
  a section (P2g.5).
- **The config or the exported blocks?** The config arranges and fills the plugin's own pages, with no
  code; the exported blocks are for a page the plugin does not draw.

A widget reads CMS data through `sdk.client.fetch("/admin/cms/...")` until `sub-admin-blocks-export`, then through the
plugin's hooks; whatever it saves goes through the plugin's routes.

### Building blocks inside the plugin

Each route's page, `RoutePage`, renders the same small set of blocks in a loop over the route's
collections (2g):

| Block | Draws | Built from |
|---|---|---|
| `ListEntry` | a list on a route: its table, heading and header given by the route | `DocumentListPage` and the tables of 2b to 2e |
| `CmsDocumentTable` | a collection's documents: columns, search, order, pages, an optional filter, header and row actions given by the page | `DocumentListTable` and `ChildCollectionSection`, merged |
| `CmsSectionCard` | one section's fields, read-only, with **Edit** given by the page | `SingletonSectionCard` |
| Form cores | the create form, the drawer form, the document form: schema, defaults, providers, checks, media, save | `DocumentCreateForm`, `DocumentDrawerForm`, `DocumentEditForm` |
| Shells | a core in a route modal or drawer (the plugin's pages), or in one opened by state (a host's widget, `sub-admin-blocks-export`) | the `RouteFocusModal` and `RouteDrawer` around today's cores |

A block takes a collection and what the page decides: actions, links, a filter. It does not read the
route. The route's pages pass paths; a host's widget will pass callbacks. The form cores keep everything
the save needs, so a shell only opens, closes and titles them. No core, provider or field is rewritten:
the change separates them from their routes.

A block is named once, by the name `sub-admin-blocks-export` exports it under, with the `Cms` prefix of the host's API
today (`defineCmsFieldComponent`, `CmsSingletonWidgetData`): `CmsDocumentTable`, `CmsSectionCard`,
`CmsDocumentCreateForm` and `CmsDocumentDrawerForm` (user, 2026-11-23). The blocks keep their files and
names until that sub-spec exports them: 1b moves no file (user, 2026-11-23), so the renames, each committed
before its content changes (AGENTS.md), come with the export.

### The plugin controls its views

The rule is [D41](./2026-11-04-main-spec.md) of the main spec: the CMS's Admin is the plugin's, the
config fills it, and a host adds to it with widgets, a field's `Cell` and component nodes, never removing
or replacing the plugin's blocks. What this sub-spec adds to it:

- **The structure arranges, labels, filters and repeats** the plugin's blocks. It cannot hide what the
  editor needs: a list's own table, a singleton's sections, a collection with no other place. The start
  checks in Contracts hold it.
- **What a host wants drawn otherwise is a page of its own**, built from the blocks
  [sub-admin-blocks-export](./2026-11-24-sub-admin-blocks-export.md) exports, reads first.
- **"Used in", "Related" and a page of a document's relations** are sub-specs of their own, built from
  these blocks and the structure's tables; this sub-spec provides the blocks only (user, 2026-11-23).

### The export and a host's cells

The blocks exported to a host are [sub-admin-blocks-export](./2026-11-24-sub-admin-blocks-export.md), and a host's cells and an
editor's columns [sub-admin-table-cells](./2026-11-24-sub-admin-table-cells.md): Phases 3 and 4 of this sub-spec until it
closed (user, 2026-11-24).

### Alternatives Considered

- **A default card for fields in no section** (`general`, chosen first): a small singleton needs no
  sections, but the card is drawn from nothing the config shows, and three renderers keep a path for
  it. Explicit sections replace it (user, 2026-11-22). The CMS asks for sections, with no field outside
  them, because each section becomes a card or a heading of its own.
- **`sections` optional on a collection that is no singleton**, its form then one section of every
  field in config order, with no heading: a small collection
  such as the first host's segments would skip a section that only repeats its fields. Rejected: the
  config shows every section the Admin draws, a small collection's one included (user, 2026-11-24).
- **A document's page apart from the tree** (2026-11-24): every collection's documents at an address of
  their own, `/cms/documents/<collection>/<id>`, their breadcrumbs from the collection's label or from
  where they were opened, so a collection edited on a page could stand in a view's table alone. It
  needs a second scheme of addresses and breadcrumbs built apart from the tree; a node's two roles,
  navigation and the documents' home, coincide in every case met so far. Kept for a case they do not
  cover (user, 2026-11-24).
- **A node hidden from its parent's list** (`listed: false`), for a collection edited on a page that a
  view shows as a table: a patch over the node's two roles rather than a rule (user, 2026-11-24).
- **`defaultColumns` as the common CMS shape has it, a list of names:** it reads well only with an editor who picks
  columns and a list view a developer can replace; the CMS has neither (see "Tables and how a collection
  is edited").
- **How a table edits its rows derived from where the collection sits:** it works, but no config says
  it; the first host could not tell why one table opens drawers and the other pages (user, 2026-11-22).
- **A flag per arrangement** (`admin.childTable`, `admin.hideInParent`, ...): every new arrangement is
  plugin code again, the limit this sub-spec removes.
- **`admin.layout` on each collection beside `admin.parent`:** a smaller change, but one tree described
  in two places, the child naming its parent and the parent naming its page. The whole Admin is read
  from every collection. Rejected for one structure (user, 2026-11-22).
- **The config describes data only and the host composes every screen:** the plugin stops being a
  standalone CMS's replacement, which is its point (user, 2026-11-22).
- **A structure written as Admin code**: the config runs on the server, and Admin code is
  named in the config and registered in the Admin (D40).
- **A page entry for a host's component** (`{ type: "component" }` with a registry of page components):
  a second way to do what Medusa's widgets already do. Widgets are what a Medusa host knows, and they
  add without replacing (user, 2026-11-22).
- **Widget zones per collection:** they spare a widget its slug check, but need a spike on zones named
  at runtime. The shared zone works at once (user, 2026-11-22).
- **Slots that replace the plugin's blocks on its own pages** (a wrapper given the default): the plugin keeps control of its views (user, 2026-11-22). A replacement is
  a host's own page.
- **A fixed `filter` on a `table` entry** (chosen first, built in 2d, removed the same day): a view
  of a collection kept to a condition an editor cannot lift, with **Add** locked to its value. Medusa
  has no such key: its dashboard writes a fixed condition in the table's code (the customer group's
  customers, `useCustomers({ ...params, groups: group.id })`), and its `defaultFilters` are a start an
  editor can lift. It needed start checks of its own (an unfiltered table for a collection with no
  node, a select's values among its options), a locked create form, and a name beside the editor's
  `filters`; the first host needs no such view (user, 2026-11-24). The editor's filters stay.
- **One block per column in `LayoutComposer`** (chosen first): the dashboard makes an entry of that block
  too, so an editor could hide a whole column of the CMS, a form's **Save** among it.
- **The CMS's blocks as `LayoutComposer` entries an editor arranges**, as Medusa's own sections, under
  ids naming their collection: no layout of the plugin's own, but the editor's arrangement outranks the
  structure, and a card hidden in the store's default is hidden for every editor. The first fallback if
  the CMS's layout fails its gate (P1a.3).
- **The blocks outside `LayoutComposer`, its widgets after them:** no layout of the plugin's own, but a
  widget can no longer stand in the side column beside the CMS's side cards. The second fallback.
- **Medusa's configurable tables** (`ConfigurableDataTable`, its saved views, `defineCellRenderer`): an
  editor's own columns and filters, with no table of the CMS's own. Left for now: WIP behind a flag that
  is off by default; its columns come from the model's schema, which knows neither the CMS's version
  status nor its labels; and a view is an editor's, while `admin.table` is the developer's. The CMS's
  table takes the column menu the same flag turns on (`sub-admin-table-cells`) and draws an editor's filters itself
  (Phase 2d). `admin.table` is shaped to map onto it: a field column onto a schema column, a system
  column onto a computed one, a cell onto a render mode.

## Data Model and Persistence

None in the plugin. `admin.routes` is config, resolved into the registry at start. The dashboard
keeps the Editor view's arrangements of widgets in its own layout configurations; the CMS's blocks are
not among them ("Order on a page"). With `view_configurations` on, it keeps an editor's columns in its
view configurations (`sub-admin-table-cells`). Admin reads are not cached
(main spec, Architecture), so no cache key changes.

## Contracts

- **Config** (`src/lib/config/types.ts`): `admin.table` and `admin.edit` on a collection (2a);
  `admin.sections` required, each with a unique `key`, every field and area in one section, a `label`
  optional but on a singleton's sections (2c); a table's `filters` (2d); `admin.routes` at the root,
  `CmsRoute` with `collections` always a list and `CmsRouteEntryConfig`, a list's entry with its
  heading and table settings (2f, 2g); `CollectionAction`'s `route` (2g); `drafts` opt-in (D19).
  `admin.parent`, `admin.structure`, `admin.defaultColumns`, the page entries and a section's `type`
  (2e, gone in P2g.5) went. A column's `cell`, a column of no
  field and `admin.components.Cell` on a field are `sub-admin-table-cells`'. Before the first release
  to npm the contract changes freely (AGENTS.md, "Plugin Contract").
- **Start checks**, in `src/lib/registry/` once every collection is prepared:
  - a table's field columns name fields of the collection, `defaultSort` one of its sortable columns,
    `useAsTitle` a field, and `filters` fields of kind `select` or `boolean`, each once, none named
    `q`, `order`, `status` or `offset` (2a, 2d);
  - a collection with `edit: "drawer"` has no drafts and no areas, nor has a singleton; a singleton
    takes no `admin.table` or `admin.edit` (2a, D19);
  - every collection's sections have a unique key, its fields and areas each in exactly one section;
    a section naming a `type` or a `collection` is refused (2c, P2g.5);
  - every route has a snake_case slug once in the tree and `collections`, one entry at least, each a
    registered collection on no other route; a route of several collections has a `label`; a
    singleton's entry gives no list's key (`position`, `label`, `description`, table settings); a list's
    entry's table is checked as its collection's; the keys of a route's entries are unique (2f, 2g);
  - every collection stands on exactly one route (P2g.5);
  - an action names a collection on a route or a route (2f, 2g).
- **Registry and projection:** `Registry.routes` in the tree's order, each with its label, its
  collections resolved, its parent and children; each collection its `admin.route`, its sections
  resolved and its header's actions. `GET /admin/cms/collections` answers `routes` beside
  `collections`, read by `listCmsRoutesStep`; the texts reach the Admin through the walk that knows no
  key.
- **Admin list route** (`GET /admin/cms/collections/:collection/documents`):
  - `id`, one or several, from Phase 2a: a page reads its relations' titles through it, one request per
    target collection, and the picker of `sub-relations`' Phase 2 labels a stored value through it. It
    is the same for every collection, so it joins the static `AdminGetCmsDocumentsParams`.
  - `filters[<field>]`, repeated for several values, from Phase 2d, through an Admin list schema the
    registry builds per collection at start, which a middleware hands to Medusa's
    `validateAndTransformQuery`, as `verifyStoreQuery` does with `storeQuery`. It takes every field of
    kind `select`, `relationship` or `boolean`, coerces a boolean and answers 400 `invalid_data` to any
    other name.
- **Admin addresses**, every one from `buildCmsPath`:
  - `/cms/<route>`: a route's page;
  - `/cms/<route>/<collection>/<id>`: a document's page, of a list on that route;
  - `/cms/<route>/tables/<key>/create`: **Create** or **Add** of a table of the page, named by its key;
    after the save, the new document's page for `"page"`, `<route>` for `"drawer"`;
  - `/cms/<route>/tables/<key>/<id>/edit`: a drawer-edited row over the page;
  - `/cms/<route>/sections/<singleton>/<section>/edit`: a singleton's card over the page.
- **Widget zones:** `cms.route.details` and `.side` with `CmsRouteWidgetData`, and
  `cms.document.details` and `.side` with `CmsDocumentWidgetData`, declared in `InjectionZoneRegistry`
  in the package root's `index.d.ts`, so a host's generated `augmentation-refs.d.ts` reaches them. The
  CMS's layout, `cms:two-column` with `main` and `side`, is declared in `LayoutSectionRegistry` in the
  Admin's source; a host never names it. A widget gets its zone's `data` alone.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A delete in one of two tables of the same collection | Both refresh: every write clears `documentsQueryKeys.lists()` | Admin check |
| Two lists on one route's page | Separate search, order and page in the URL, by key | Unit test of the table query by prefix |
| Routes with an unknown collection, a collection on two routes or on none, a repeated slug or key | The start stops with the config error naming the route or entry | Registry unit tests |
| A host's widget in a shared zone that does not check the slug | It shows on every page of the kind | The zone's JSDoc and the README's example check it; nothing in the plugin breaks |
| A widget on the document page | Renders in its column outside the form's `<form>` element, so its buttons do not submit the document | Admin check with a widget holding a button |
| An editor opens Customize Layout on a CMS page | Only widgets can be moved or hidden; the CMS's blocks stand where the structure puts them | Admin check on each kind of page; the zone's saved arrangement holds widget ids alone |
| The dashboard does not draw the CMS's layout, or Customize Layout offers a CMS block | P1a.3 stops; the user decides between the fallbacks of "Order on a page" | The user's check in P1a.3 |
| A relation's target deleted while a row points at it | Its cell shows the stored id marked as missing, not an error | Unit test of the value read |
| A collection's field or area in no section, or in two (from Phase 2c) | The start stops with an error naming the collection and the fields or areas | Registry unit test |
| A section that still names a `type` or a `collection` (from P2g.5) | The start stops: another collection's table stands on a route | Registry unit test |
| `edit: "drawer"` on a collection with `drafts: true` or areas | The start stops with an error naming the collection | Registry unit test |
| A list request with a filter on a field that is not allowed | 400 `invalid_data` | HTTP integration test (run by the user) |
| A table's `filters` names a field of another kind, or no field | The start stops with an error naming the table and the field | Registry unit test |
| `edit: "page"` on a collection with no node (from Phase 2b) | The start stops with an error naming the collection: its document page would have no place | Registry unit test |
| A table's `filters` names a field called `q`, `order`, `status` or `offset` (2d) | The start stops: the dashboard keeps a filter under the field's name beside the table's own parameters | Registry unit test |
| Add in a table of a collection with a page of its own | The create modal over the current page, then the new document's page | Admin check |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Separating the form cores from their routes changes a form's behavior (close after save, dirty guard) | medium | Admin forms | Phase 1 changes no behavior; each step is checked on the first host's pages | A path no one opens in the check |
| Removing `admin.parent`, then `admin.structure`, breaks the first host's config | medium | First host | 2b, 2e, 2f and 2g each move its config in the same change, with the user's approval | - |
| A document's address changes when its route's shape changes | low | Editors' saved links | Documents carry their collection in the address from 2g, so regrouping routes keeps them (B2) | Links saved before 2g |
| The default structure differs from today's Admin in a case no test covers | medium | Every host | Phase 1 builds it from `admin.parent` and is checked against today's pages first | - |
| The dashboard does not draw a plugin's layout as the CMS needs, or a later Medusa changes how layouts work | high | Every CMS page | P1a.3 is the gate before any other page moves; layouts are Medusa's API (`defineLayoutConfig`), collected from a plugin's build in 2.21.2 and 2.22.7 | The user decides between the fallbacks if the gate fails |
| Until Phase 1c, an editor can hide the document page's form, status card or history in Customize Layout, for every collection at once | medium | Document page | Phase 1c draws the page in the CMS's layout (built) | An arrangement saved before 1c keeps entries no page draws any more; the dashboard ignores them |

**Rollout:** the plugin is unreleased; the first host takes each phase through `yalc`. A host with no
`admin.routes` gets a page per collection at its slug.

**Rollback:** each phase is its own commits. Phase 1 is a refactor with no contract change. Each
sub-phase of Phase 2 is reverted with its keys: 2a `admin.table`, `admin.edit` and the list's `id`; 2b
`admin.structure`, with `admin.parent` back; 2c the required sections; 2d the route's `filters`; 2e
the `table` sections; 2f and 2g `admin.routes`, with the Admin's routes and addresses.

## Dependencies

- Phase 2 of `sub-relations`: its picker draws the relationship filter an editor picks, which 2d
  leaves to it (user, 2026-11-24).
- Phase 1 of `sub-relations` (done). Its picker, Phase 2, uses this sub-spec's 2a - the list's `id`
  filter and a relation drawn by its title - and asks there how a relation's control is drawn, a
  field's question moved from this sub-spec (2026-11-23).
- `sub-autosave` (`review`) works in `DocumentEditForm`, which Phase 1c draws in the CMS's layout and
  Phase 2c gives a header of its own for **Save**; whichever lands second rebases on the other.
- `sub-workflow-hooks`: the `validate` hook every write already passes.
- D37 of the main spec: `admin.parent` gave way to `admin.structure` in Phase 2b, and that to
  `admin.routes` in 2f and 2g.
- Medusa's `defineLayoutConfig` (`@medusajs/admin-sdk`, 2.21.2 in the first host, 2.22.7 in the plugin):
  the CMS's layout rests on it, behind the gate of P1a.3.

## Acceptance Criteria

- [x] Without `admin.structure`, every CMS page renders and saves as before Phase 1, in the first host.
- [x] Every list's and singleton's page is drawn by one loop over its resolved entries, with no code of
  its own for children or cards.
- [x] On every CMS page, Customize Layout moves and hides widgets alone, and the zone's saved arrangement
  holds no id of the CMS's.
- [x] One table component serves a list's page and every `table` entry.
- [x] A table shows exactly its `admin.table` columns: a select by its option's label, a relationship by
  its target's title, system columns where listed. Media as a thumbnail moved to
  `sub-admin-table-cells` (user, 2026-11-24).
- [x] `admin.edit` alone decides whether a table's rows open their page or a drawer.
- [x] The first host's `page_settings_segment` shows its market's portal and its homepage's title.
- [x] No form core imports a route modal or reads the route; the shells do.
- [x] A host's widget renders on a list's, a singleton's and a document's page.
- [x] The first host's Admin is described by `admin.structure`, with no `admin.parent` left, and its
  settings show the `homepage` card and the table of every `page_settings_segment`, checked with Add,
  Edit and Delete, its segments filtered by market by the editor.
- [x] A collection whose rows open their page with no node stops the start.
- [x] Every collection's fields and areas sit in explicit sections, and one left out of them stops the
  start; no screen draws a field or an area outside a section, and the document page's **Save** stands
  in a header of its own.
- [x] Every config error named in Contracts stops the start: each has a registry or layout unit test
  (checked 2026-11-24).
- [x] Versions, history, rich text, media and component nodes behave as before in every form, checked
  on the first host by the user through 1b, 2c and 2g, drafts opt-in included (2026-11-24); autosave
  is `sub-autosave`'s, not built yet.
- [x] An editor filters a table by each field its `admin.table.filters` lists (2d).
- [x] A singleton's `table` sections stand among its cards in their order and columns (2e); they went
  in P2g.5, a route's list entry taking their place.
- [x] **Content** lists the routes in the tree's order, and a collection's documents open at its route's
  address; a slug no route has is not found (2f).
- [x] A route of several collections draws each as its kind does, a singleton's cards saved from it,
  a list's rows added and edited (2g, the first host's `content`, checked by the user); its children's
  list and its zone are covered by the code and unit tests, as the first host has neither.
- [x] A document opens at `/cms/<route>/<collection>/<id>` on the first host (2g).

## Phasing

Phases 1 and 2. The export and a host's cells were Phases 3 and 4 until they moved to
[sub-admin-blocks-export](./2026-11-24-sub-admin-blocks-export.md) and [sub-admin-table-cells](./2026-11-24-sub-admin-table-cells.md)
(user, 2026-11-24).

### Phase 1 - The plugin's pages built from blocks

**Goal:** every page is a loop over a structure resolved from today's config, rendering blocks in the
CMS's own layout, with a widget zone on every page. Nothing else visibly changes, except that Customize
Layout moves and hides widgets alone.

**Prerequisites:** none.

**Exit gate:** unit tests of the default structure and the table query; `yarn typecheck`,
`yarn typecheck:admin`, `yarn lint`, `yarn test:unit`; the first host's **Content**, page and settings
screens checked by the user with no change, and a test widget shown on each kind of page, the only
thing Customize Layout offers there.

- **1a** - the structure resolved from `admin.parent` into the registry and the projection; the CMS's
  layout, gated on the singleton's page; the singleton's page drawn from its entries.
- **1b** - one documents table built from a column definition, for a list's page and a singleton's
  tables, the definition derived from today's `useAsTitle` and `defaultColumns` and the edit mode from
  where the collection sits, so the tables look as today; the create and drawer cores apart from their
  route shells. No file moves; the blocks take their exported names with `sub-admin-blocks-export`.
- **1c** - the list page and the document page in the CMS's layout: `cms.document.list` with the list's
  table and entries, and widgets on in `cms.document.details` around the form, its status card and its
  history; the zones in `InjectionZoneRegistry`.

### Phase 2 - The Admin's structure, then its routes

**Goal:** a host describes its whole Admin in `admin.routes`, each route showing one collection or
several, singletons holding tables of other collections, each table's columns and an editor's filters
in `admin.table` and how its rows are edited in `admin.edit`.

**Prerequisites:** Phase 1.

**Exit gate:** the first host's Admin on `admin.routes` with its settings' table, its segments
showing a market's portal and a homepage's title and filtered by market;
registry unit tests for every start check; the list route's HTTP test named for the user to run.

- **2a** - tables and editing in the config, while `admin.parent` stands: `admin.table` with field and
  system columns, `defaultSort` and `pageSize`; values drawn by their field's type through
  `DocumentFieldValue`, read once per page and source, a relation's titles through the list's new `id`;
  `admin.edit` in place of the derived mode, with the routes of a list's own drawer-edited table;
  `admin.defaultColumns` removed and `useAsTitle` the title only; the start checks; JSDoc with
  examples; `integration-tests/http/cms/admin-cms-documents.spec.ts` extended with an `id` read. The
  first host's segments get `admin.table` and `edit: "drawer"`, with the user's approval. First, as it
  answers the first host's unreadable table, and it takes the edit mode out of a collection's place
  before the structure moves that place.
- **2b** - the `structure` key with nodes, `section` and `table` entries (key, label, description, the
  entry's `table`); optional section keys; the start checks; the header's default actions from the
  nodes; `admin.parent` removed. The first host's config moves to `admin.structure` in its own
  repository, with the user's approval.
- **2c** - explicit sections for every collection, its fields and areas each in one, with the
  `general` card, the first-section rule, the fields under the document page's header and an area's
  card outside the sections removed, and **Save** in a header of its own; the shared start check. The first host's collections get sections, with the user's approval.
- **2d** - filters: the per-collection Admin list schema and its middleware, and the filters an editor
  picks among a table's `filters`; `admin-cms-documents.spec.ts` extended with a filtered list and a
  refused name. Last: it has the most moving parts. A `table` entry's fixed `filter`, built here too,
  was removed (user, 2026-11-24; "Alternatives Considered"), and a section's `label` made optional.
- **2e** - a singleton's tables in its sections: `type: "details" | "table"`, the page entries and
  their checks removed, `admin.structure` the tree of collections alone, and the pieces every page
  draws moved to `page-sections/`; the first host's settings from its sections, with the user's approval.
- **2f** - `admin.routes` in place of `admin.structure`, every collection's page at its node's `slug`:
  the Admin's `[slug]` routes, links from a collection's `admin.route`, **Content** in the tree's
  order, the breadcrumbs and buttons from the routes; the first host on `admin.routes`, with the user's
  approval.
- **2g** - routes of one or several collections in place of views (user, 2026-11-24): `collections`
  always a list, documents at `/cms/<route>/<collection>/<id>`, one `RoutePage` for every route and one
  zone, `cms.route.details`; this sub-spec's earlier sections rewritten to the final design.

## Implementation Plan

### Phase 1a

1. **P1a.1 - The resolved structure in the registry**
   - **Outcome:** each collection of the registry carries its place and its page's entries, built from
     today's rules: top-level collections, a list's children as child nodes, a singleton's children as
     `table` entries after its sections.
   - **Areas:** `src/lib/registry/` (a `prepare-structure.ts` after the parents are checked),
     `src/lib/collection/types.ts`, `src/lib/layout/` for the section key's function.
   - **Changes:** a resolved entry type; a section's key from one function in `src/lib/layout/` -
     `general` for the fields in no section, else the section's index, as `listSingletonCards` derives
     it today - which `listSingletonCards` then calls too; no config key yet.
   - **As built:** `RegistryPageEntry` and `RegistryCollectionPlace` (`admin.node`, `admin.page`) in
     `src/lib/collection/types.ts`, with `PreparedCollection` for a collection before the structure
     places it; `formatSectionKey` and `GENERAL_SECTION_KEY` in `src/lib/layout/format-section-key.ts`;
     `listLayoutFieldNames` in `src/lib/layout/`, which tells the registry whether a singleton has fields
     in no section, as the Admin's `collectLayoutNames` tells its cards (until Phase 2c removes the
     `general` card). `prepareRegistry` checks the parents, then places the collections.
   - **Verification:** `src/lib/registry/__tests__/prepare-structure.unit.spec.ts` on `Test*` configs:
     the first host's shape (a list, a singleton under it, a collection under the singleton), a singleton
     with sections on both sides, two top-level lists; a unit test of the key's function;
     `yarn test:unit`, `yarn typecheck`, `yarn lint`.

2. **P1a.2 - The structure in the client projection**
   - **Outcome:** `GET /admin/cms/collections` answers each collection's place and entries.
   - **Areas:** `src/workflows/cms/steps/list-cms-collections.ts`, `ClientCollection`.
   - **Changes:** `buildClientCollection` passes `admin` whole, so the resolved structure reaches the
     Admin with no code beyond its client type, texts resolved as for the other labels.
   - **Verification:** `integration-tests/http/cms/admin-cms-collections.spec.ts` asserts the resolved
     entries of a singleton with a child, named for the user to run (`yarn test:integration:http`, that
     file only); `yarn typecheck`.

3. **P1a.3 - The CMS's own layout, the gate**
   - **Outcome:** the plugin registers `cms:two-column` with `defineLayoutConfig`, and the singleton's
     page draws today's cards and tables in it: `LayoutComposer` gets empty sections, the page gives its
     blocks through a context, and the layout's component draws them before each column's widgets.
   - **Areas:** `src/admin/layouts/` for the layout, collected from there as widgets are from
     `src/admin/widgets/`; a `page-layout/` folder in `src/admin/cms/` for the blocks' context and its
     hook; `src/admin/cms/singleton-page/singleton-layout.tsx`; `LayoutSectionRegistry`.
   - **As built:** `src/admin/layouts/cms-two-column-layout.tsx` draws `core:two-column`'s grid, each
     column's blocks before its widgets. `LayoutSectionRegistry` is augmented in
     `src/admin/cms/page-layout/layout-section-registry.d.ts`, not in `index.d.ts`: the Admin's
     typecheck does not read the package root, and only the plugin's pages name the layout.
     `LayoutComposer`'s `layoutProps` would spare the context, but its type takes `className` alone.
     The dashboard renders nothing when the layout id is not registered (`getLayout` in `DashboardApp`),
     so a blank settings page is the gate failing.
   - **Changes:** the cards and tables leave `LayoutComposer`'s sections; no structure is read yet.
   - **Verification:** the user's check on the first host's settings page: the cards and the table as
     today; Customize Layout offering a test widget to move and hide, in either column, and no card or
     table; the zone's saved arrangement holding the widget's id alone. `yarn typecheck:admin`,
     `yarn lint`. If the dashboard does not draw the layout so, the step stops there and the user decides
     between the fallbacks of "Order on a page"; the finding goes to the lesson either way.

4. **P1a.4 - The singleton's page drawn from its entries**
   - **Outcome:** `SingletonLayout` renders the collection's entries through `PageEntry`, which maps
     `section` to `SingletonSectionCard` and `table` to `ChildCollectionSection`, and hands them to the
     CMS's layout.
   - **Areas:** `src/admin/cms/singleton-page/`, a new `page-entry` beside it in `src/admin/cms/`.
   - **As built:** `PageEntry` sits in `src/admin/cms/singleton-page/` for now: it draws that folder's
     card and table, and a folder of its own would import the page's folder that imports it. It moves
     beside the blocks once 1b gives them folders of their own. `findSingletonCard` finds a card by key;
     `listChildCollections`, used by no other code, is removed. Built before the gate's check, so the
     user checks 1a once. As 1b moves no file, `PageEntry` stays here until `sub-admin-blocks-export`.
   - **Changes:** `listChildCollections` is no longer used by the page; the card of a `section` entry is
     found by its key.
   - **Verification:** a unit test of the card lookup by key in `src/admin/cms/singleton-page/utils/__tests__/`;
     `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`; the first host's settings page checked by the
     user, unchanged.

### Phase 1b

1. **P1b.1 - One documents table**
   - **Outcome:** `DocumentListTable` serves a list's page and a singleton's tables. It takes the
     collection and what the page decides: the URL prefix, the page size, the heading's level, the status
     filter, the header's buttons, the path a row opens and a row's menu. Its columns come from a
     definition, `{ field }` or `{ system }`, built from `useAsTitle` and `defaultColumns` as today.
   - **Areas:** `src/admin/cms/document-list-table/` (`types.ts`, `utils/build-default-table-columns.ts`,
     `utils/build-document-table-query.ts`, `columns.tsx`, `use-document-table-query.ts`);
     `src/admin/routes/cms/[collection]/page.tsx`; `src/admin/cms/singleton-page/` (`ChildCollectionSection`
     configures the shared table, `hooks/use-child-row-actions.tsx` builds **Edit** and **Delete**).
   - **Changes:** `child-document-columns.tsx` and `hooks/use-child-table-query.ts` removed; the edit mode
     stays the page's: a list's page opens a row's page, a singleton's table a drawer with a row menu. The
     collection's page now refuses an unknown slug itself, as the child routes do, where the documents
     request's 404 did.
   - **Verification:** unit tests of the column definition and of the table query
     (`document-list-table/utils/__tests__/`); `yarn typecheck:admin`, `yarn lint`, `yarn test:unit`; the
     user's check of the first host's lists and its settings' table: search, order, pages, Add, Edit and
     Delete as before.

2. **P1b.2 - The form cores apart from their route shells**
   - **Outcome:** `DocumentCreateForm` and `DocumentDrawerForm` read no route. Each draws its modal or
     drawer with `FocusModal` or `Drawer` from `@medusajs/ui`, which `RouteFocusModal` and `RouteDrawer`
     reuse, and takes from its shell only the `Frame` wrapping its `<form>` and `onSaved`.
   - **Areas:** `src/admin/cms/common/types.ts` (`DocumentFormFrame`);
     `document-create-form/document-create-route-form.tsx` and
     `document-drawer-form/document-drawer-route-form.tsx`, the shells, which pass `RouteFocusModal.Form`
     or `RouteDrawer.Form` and close through `useRouteModal`; the four routes that open the forms.
   - **Changes:** none in what a form shows, checks or saves; the route's form still asks before unsaved
     changes are dropped. `sub-admin-blocks-export` adds shells opened by state, a `Frame` without a route.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn test:unit`; no core imports a route
     modal; the user's check of Create on a list, Add, a row's drawer and a singleton's section drawer,
     each saved and each closed with unsaved changes.

### Phase 1c

1. **P1c.1 - The list page and the document page in the CMS's layout**
   - **Outcome:** every CMS page is drawn in `cms:two-column` with a widget zone: a list's page in
     `cms.document.list` (`CmsListWidgetData`: the collection), its table first, then its page's
     entries; a document's page in `cms.document.details` (`CmsDocumentWidgetData`: the collection and
     the document), widgets on after the form, its status card and its history. Customize Layout
     arranges widgets alone on both, so the form, the status card and the history can no longer be
     hidden for every collection at once.
   - **Areas:** `src/admin/cms/document-list-page/` (`DocumentListPage`, used by
     `src/admin/routes/cms/[collection]/page.tsx`); `src/admin/cms/document-edit-form/document-edit-form.tsx`;
     `src/admin-extensions/types.ts`; the zones in `index.d.ts`; `src/admin/layouts/cms-two-column-layout.tsx`;
     `README.md`.
   - **As built:** a list's page gives no side blocks, and the layout then draws one column at full
     width until a widget stands on the side or Customize Layout opens its drop zone; a page that gives
     side blocks, a singleton's or a document's, keeps the two columns as before. Widgets render in the
     layout's columns, outside the document form's `<form>`, which wraps only the header and the fields
     in no section.
   - **Verification:** `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`,
     `yarn test:unit`; the user's check on the first host with its test widget, now in all three zones:
     the widget under a list's table, under a document's form and on a singleton's page; the list's table
     at full width; Customize Layout moving the widget alone on each kind of page; a document saved as
     before.

### Phase 2a

The first host's config changes in the same sub-phase, with the user's approval: without it its start
stops on `defaultColumns` and on a singleton's child with no `edit: "drawer"`.

1. **P2a.1 - `admin.table` and `admin.edit` in the config and the registry**
   - **Outcome:** a collection's `admin.table` (`columns` of `{ field, label?, sortable? }` or
     `{ system, label? }`, `defaultSort`, `pageSize`) and `admin.edit` (`"page"` or `"drawer"`) reach
     the registry, resolved: a collection without `admin.table` gets the default table - its
     `useAsTitle` field, or the `id` without one, the status with drafts, `updated_at` - and one without
     `admin.edit` gets `"page"`. A singleton gets neither. `admin.defaultColumns` is removed.
   - **Areas:** `src/lib/config/types.ts` (the types, JSDoc with examples); `src/lib/collection/`
     (`prepare-collection-table.ts`, `validate-table-columns.ts` for `useAsTitle` and the columns,
     `validate-edit-mode.ts`); `src/lib/registry/validate-collection-parents.ts` (a singleton's child
     needs `edit: "drawer"`, in place of its drafts and areas check, which `"drawer"` now carries);
     the test config.
   - **Changes:** a system column `id` beside the spec's four, for the default table of a collection
     without `useAsTitle`, whose rows the table titled by their id until now. A field column names a
     field that is a scalar column and no `richtext`, once in a table; `defaultSort` names a sortable
     column of the table; `pageSize` is a whole number from 1 to 100.
   - **Verification:** registry unit tests for each start check and each default; `yarn test:unit`,
     `yarn typecheck`, `yarn lint`.

2. **P2a.2 - The Admin list's `id`**
   - **Outcome:** `GET /admin/cms/collections/:collection/documents` takes `id`, one or several, and
     answers those documents alone.
   - **Areas:** `validators.ts` and `route.ts` of the route, which hands `id` to the list step's
     existing `filters`; `integration-tests/http/cms/admin-cms-documents.spec.ts`.
   - **Verification:** the HTTP test reads two documents by id, one by a single `id`, and none by an id
     no document has; `yarn typecheck`.

3. **P2a.3 - The table drawn from `admin.table`**
   - **Outcome:** the Admin's documents table shows exactly the resolved `admin.table`: a field column
     under its label or the field's, a system column under its label or the plugin's; sorting where the
     column sorts; `defaultSort` as the first order and `pageSize` as the page size. A field's value is
     drawn by its type through `DocumentFieldValue`, as the singleton's cards draw it: a select by its
     option's label, a relationship by its target's title. The values a column needs are asked once per
     page and source: every cell of a column asks with the page's values, so the query client sends one
     request - a relation's titles through the list's `id`, a host's options hook through its hook.
     A target deleted under a row shows the stored id, marked as missing.
   - **Deferred:** media as a thumbnail needs the media of a page read by id, which no route takes yet;
     a media cell shows its stored value as today, and the read is decided with the user.
   - **Areas:** `src/admin/cms/document-list-table/` (the columns from the projection,
     `buildDefaultTableColumns` removed); `src/admin/cms/common/document-fields/`.
   - **Verification:** unit tests of the column building and of the page values a column asks with;
     `yarn typecheck:admin`, `yarn lint`, `yarn test:unit`; the first host's tables checked by the user.

4. **P2a.4 - `admin.edit` decides how a row is edited**
   - **Outcome:** a table's rows open their page for `"page"`, or a drawer over the page with **Edit**
     and **Delete** for `"drawer"`, wherever the table stands, a list's own table included; **Add** goes
     to the new document's page for `"page"`, and back to the page for `"drawer"`.
   - **Areas:** `src/admin/cms/document-list-page/`, `child-collection-section.tsx`,
     `build-child-edit-path.ts` (the page's slug and the collection's), the `@children` and `@create`
     routes, which check that the page shows a table of the collection - the list's own, or a `table`
     entry - in place of `admin.parent`.
   - **As built:** `hasPageTable` in `src/admin/cms/common/utils/`; `useTableRows` in
     `src/admin/cms/singleton-page/hooks/`, in place of `useChildRowActions`; the drawer's route also
     refuses a collection not edited in a drawer.
   - **Verification:** a unit test of the check that a page shows a collection's table;
     `yarn typecheck:admin`, `yarn lint`, `yarn test:unit`; the user's check of a list with
     `edit: "drawer"` and of the singleton's table.

5. **P2a.5 - The first host's segments** (with the user's approval)
   - **Outcome:** `page_settings_segment` gets `admin.table` (`segment_id`, `homepage_id`,
     `updated_at`), `edit: "drawer"` and `defaultSort`; `page` drops `defaultColumns` for an
     `admin.table` of its own.
   - **Verification:** the user's check of the settings page: the market's portal and the homepage's
     title in the segments' table.

### Phase 2b

The first host's config moves to `admin.structure` in the same sub-phase, with the user's approval: its
start stops on `admin.parent` without it.

1. **P2b.1 - `admin.structure` in the config and the registry**
   - **Outcome:** the config's root `admin.structure`, a list of nodes or a function of the default,
     resolves into each collection's `admin.node` and `admin.page`; without it every collection is a
     top-level node, a singleton's page holding its sections. `admin.parent` is removed, and a list's
     default header buttons come from its node's children.
   - **Areas:** `src/lib/config/types.ts` (`CmsStructureNode`, `CmsPageEntry`, a section's `key`, JSDoc
     with an example); `src/lib/registry/prepare-structure.ts`, split by the checks it runs;
     `src/lib/layout/format-section-key.ts` (a section's own `key`, else its index);
     `prepare-collection-actions.ts` (defaults from the node's children, run once the structure is
     resolved); `validate-collection-parents.ts` removed; the test config on `admin.structure`.
   - **Changes:** the start checks of Contracts tagged 2b: every node and entry names a collection; a
     collection is a node once at most; no `table` entry names a singleton; every collection is a node
     or in a `table` entry, and one with `edit: "page"` is a node; a singleton node has no children and
     sits under no singleton node; a `section` entry stands on a singleton's page and names one of its
     sections by key, and every section of a singleton is in an entry, `general` until Phase 2c; keys
     unique on a page, a list's own table counting under its slug, and given where a collection appears
     twice; a section's `key` unique in its collection and not `general`. A `table` entry's `table` is
     checked as the collection's own, its labels prepared.
   - **As built:** `prepare-structure.ts` composes `validate-structure-nodes.ts`,
     `prepare-page-entries.ts` and `validate-structure-reach.ts`; `prepare-table-labels.ts` and
     `validateTable` serve a collection's table and a `table` entry's; `validate-section-keys.ts` in
     `src/lib/layout/`. The actions run after the structure, in `prepareStructure`.
   - **Verification:** registry unit tests for the default, a given structure and each check;
     `yarn test:unit`, `yarn typecheck`, `yarn lint`.

2. **P2b.2 - The Admin on the resolved structure**
   - **Outcome:** **Content** lists the top-level nodes, the breadcrumbs follow the node's parents, and a
     `table` entry shows its own label, description, table and key, its search, order and page under the
     key; **Add** in an entry opens `/cms/<page>/children/<key>/create`, which finds the entry by key.
   - **Areas:** `collection-list-table.tsx`, `list-collection-chain.ts`, `singleton-page/`,
     `document-list-table/`, the `@children` create route; `findPageTable` beside `hasPageTable`.
   - **Verification:** unit tests of the chain and of the entry lookup by key; `yarn typecheck:admin`,
     `yarn lint`, `yarn test:unit`; `admin-cms-collections.spec.ts` named for a run.

3. **P2b.3 - The first host on `admin.structure`** (with the user's approval)
   - **Outcome:** `page` a node with `page_settings` under it, whose page holds its card and the
     segments' table; no `admin.parent` left.
   - **Verification:** the user's check of **Content**, the pages' list with its **Settings** button,
     the settings page and its breadcrumbs.

### Phase 2c

The first host's config changes in the same sub-phase, with the user's approval: its start stops on
`page_settings` and `page_settings_segment` without sections, and on the structure's `general`.

1. **P2c.1 - Explicit sections in the config and the registry**
   - **Outcome:** every collection has `admin.sections`, at least one, each with a `key` and a `label`,
     and each of its fields and areas sits in exactly one section (user, 2026-11-24, areas included). A
     section's key is its own: no index and no `general`. The start stops on a collection without
     sections, a section without a key, a key used twice in a collection, and a field or an area in no
     section, the error naming the collection and what is left out. A singleton's default page is a
     `section` entry per section, in its section's column; a `section` entry names one of the
     singleton's keys, `general` no longer among them.
   - **Areas:** `src/lib/config/types.ts` (`LayoutSectionConfig.key` and a collection's
     `admin.sections` required, so a collection's `admin` is required; JSDoc with an example;
     `LayoutBlockSectionConfig` still leaves `key` out); `src/lib/layout/validate-field-sections.ts`;
     `validate-section-keys.ts`; `prepare-field-sections.ts`; `src/lib/collection/prepare-collection.ts`
     (no `?? []`); `src/lib/registry/prepare-page-entries.ts`; `RegistryLayoutSection` (`key: string`);
     the test config; `README.md` ("Singletons" and "The Admin's structure").
   - **Changes:**
     - `validateFieldSections` takes the fields and the areas that must sit in a section and, after its
       walk, names those its own walk did not meet. A collection passes all of its own; a block passes
       none, so blocks keep their rule until Phase 3 of
       [sub-block-areas](./2026-11-23-sub-block-areas.md) passes a block's fields when it has sections.
       This is the shared "left out" check of Contracts, written here as this phase lands first.
     - `validateSectionKeys` asks every section for a key of text, once in the collection; `general` is
       no longer reserved.
     - `format-section-key.ts` (`formatSectionKey`, `GENERAL_SECTION_KEY`) is removed with its test, as
       a section's key is its own. `list-layout-field-names.ts` is removed with its test: only
       `hasUnsectionedFields` in `prepare-page-entries.ts` used it, and that function goes too.
     - The test config: `recipe` in a main section, a side section and a section of its `sections` area;
       `tag`, `settings` and `settings_link` one section each; the structure names the settings'
       section by its key. The inline collections of the registry's unit tests get sections.
     - README: a collection lays out every field and area in its `admin.sections`, each with a `key`;
       the singleton's example gets a section, and the structure's names it by key.
   - **As built:** `validateFieldSections` takes `required` (`RequiredSectionNames`: `fields` and
     `areas`) and names in one error every name of it no section holds. `prepareLayoutTexts` is generic
     over a collection's and a block's sections, and `validateFieldSections` reads a section's `label`,
     `fields` and `areas` alone, as a block's section has no `key`. A collection with neither a field nor
     an area cannot be configured, as a section must hold one. The registry's tests place the fields
     they do not lay out through `buildRestSection`, and give an added collection one section through
     `buildOneSectionAdmin`.
   - **Verification:** registry unit tests for each refusal (no sections, a section without a key, a key
     used twice, a field left out, an area left out) and for the default page from the keys, the
     existing ones moved to keyed sections; `yarn test:unit`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`. `admin-cms-collections.spec.ts` asserts the projection's sections, keys
     included, named for the user to run, that file only.

2. **P2c.2 - The Admin draws sections only**
   - **Outcome:** the document page holds **Save** in a header of its own, a card with the title and the
     buttons alone, then the sections in their columns. No fields stand under the header, and no area
     has a card outside a section. The create modal draws the sections alone. A singleton's page draws a
     card per section, keyed by the section's `key`, with no `general` card. The section drawer and a
     row's drawer find a section by its key, and a drawer of one section still draws no heading of its
     own.
   - **Areas:** `src/admin/cms/common/utils/section-document-fields.ts` (it answers `main` and `side`
     alone, without `unsectioned` and `unsectionedAreas`); `document-edit-form/document-edit-form.tsx`;
     `document-create-form/document-create-form.tsx` (a section keyed by its `key`, not its label);
     `singleton-page/utils/list-singleton-cards.ts` (the key from the section, `layout` required, the
     card lookup by label removed); `find-singleton-card.ts` (its JSDoc). A block's card keeps its fields
     in no section through `sectionFormFields`, which still answers them, until sub-block-areas' Phase 3.
   - **Changes:** none in what a form checks or saves. The `<form>` still wraps the header alone, so
     **Save** submits the whole form and widgets stay outside it, as built in 1c.
   - **As built:** the header's `Container` holds the `<form>` alone, its divider gone with the fields
     under it; a section is keyed by its `key` in the document and create forms.
   - **Verification:** unit tests of `listSingletonCards` (the keys and no `general` card) and of
     `sectionDocumentFields` (areas from their sections only), the existing tests moved;
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`, `yarn test:unit`.

3. **P2c.3 - The first host's sections** (with the user's approval)
   - **Outcome:** `page` keys its two sections `page` and `content`. `page_settings` gets one section,
     `homepage`, with `homepage_default_id`, and its node's page names it in place of `general`.
     `page_settings_segment` gets one section, `segment`, with `segment_id` and `homepage_id`. The
     labels are new keys in the host's `cms-content` namespace, `pageSettings.sections.homepage` and
     `pageSettingsSegment.sections.segment`, in `cms-content.en.json` and `cms-content.pl.json`, the
     copy checked through `codee-ui-copy`. The plugin's declarations reach the host through
     `npx tsc -p tsconfig.json --emitDeclarationOnly` and `yalc publish --push --no-scripts`.
   - **Verification:** the host's `src/cms/__tests__/cms-config.unit.spec.ts` passes; the user's check
     on the first host: a page's document page with **Save** in its own header above the **Page** and
     **Content** sections, saved; Create on the pages' list; the settings page's `homepage` card and its
     drawer, saved; a segment's drawer and Add, saved.

**Exit gate:** P2c.1 to P2c.3 verified; `admin-cms-collections.spec.ts` passes in the user's run.

### Phase 2d

An editor filters by `select` and `boolean` fields in 2d. A relationship filter an editor picks waits
for the relationship picker of [sub-relations](./2026-11-22-sub-relations.md)' Phase 2, which it draws
with (user, 2026-11-24): the dashboard's filters take a fixed list of options, and a relation's targets
are many. A `table` entry's fixed `filter`, with **Add** locked to its value, was built in 2d and removed
the same day (user, 2026-11-24; "Alternatives Considered"); its steps are left out below.

1. **P2d.1 - A table's filters in the config and the registry**
   - **Outcome:** a table's `filters` (`admin.table` and a `table` entry's `table`) lists the fields an
     editor may filter it by, checked at start.
   - **Areas:** `src/lib/config/types.ts` (`CmsTableConfig.filters`, JSDoc with an example);
     `src/lib/collection/validate-table-columns.ts`, whose `validateTable` calls
     `validate-table-filters.ts`.
   - **Changes:** a table's `filters` names fields of its collection, each once, of kind `select` or
     `boolean`. A field named after a parameter the table keeps in the URL, `q`, `order`, `status` or
     `offset`, is no filter, as the dashboard keeps a filter under its id beside them.
   - **As built:** the test config is unchanged: tests that replace the recipe's model or retype its
     fields would each have to undo a filter there, so each test gives the filters it checks.
   - **Verification:** `src/lib/collection/__tests__/validate-table-filters.unit.spec.ts`;
     `yarn test:unit`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P2d.2 - The Admin list's filters**
   - **Outcome:** `GET /admin/cms/collections/:collection/documents` takes `filters[<field>]`, one
     value or several, for every `select`, `relationship` and `boolean` field of the collection, and
     answers the documents whose row matches; several values match any of them. Any other name
     answers 400 `invalid_data`.
   - **Areas:** `src/lib/collection/prepare-admin-list-filters.ts`, the `filters` schema, kept on the
     collection as `adminListFilters` and not projected to the Admin; `src/api/middlewares/
     verify-admin-list-query.ts`, which extends `AdminGetCmsDocumentsParams` with it and hands it to
     `validateAndTransformQuery`, as `verifyStoreQuery` does, in place of the static schema in the
     route's `middlewares.ts`, as `src/lib/` does not import the plugin's routes; `route.ts`, which
     merges `filters` with `id` into the list step's `filters`.
   - **Changes:** a filter matches the row, the values a table shows, so for a collection with drafts
     it matches the stored row, not an unsaved or unpublished draft. The schema takes every field of
     the three kinds, a relationship included, as the exported table of `sub-admin-blocks-export`
     sends them.
   - **Verification:** `src/lib/collection/__tests__/prepare-admin-list-filters.unit.spec.ts`;
     `admin-cms-documents.spec.ts` with a list filtered by a boolean, by a select's one value and by
     two, by two fields, by a relationship's id, and three refused names; `yarn typecheck`.

3. **P2d.3 - The filters in the Admin's table**
   - **Outcome:** an editor filters a table by its `filters`: a select by a list of its options to
     tick, a boolean by yes or no, kept in the URL under the table's prefix, lifted as the status filter
     is.
   - **Areas:** `src/admin/cms/document-list-table/` (`filters.ts`, `utils/build-field-filters.ts`,
     `use-document-table-query.ts` and `utils/build-document-table-query.ts`, which read the picks from
     the URL).
   - **Changes:** a select filter is the dashboard's `multiselect`, a boolean its `radio`; the
     dashboard keeps a filter's value as JSON, a boolean's as the text it was given. Yes and no are the
     existing `documents.values.yes` and `.no`. A table with a filter shows the dashboard's filter bar
     always, empty until a filter is picked (`alwaysShowFilterBar` in `DataTable`), as Medusa's own
     lists do.
   - **Verification:** unit tests of the filters built from a table and of the query with picked
     values; `yarn typecheck:admin`, `yarn lint`, `yarn format:check`, `yarn test:unit`.

4. **P2d.4 - A section's label optional** (user, 2026-11-24)
   - **Outcome:** a collection's section may leave `label` out and is then drawn with no heading - on
     the document page, in the create modal and in a drawer of several sections. A singleton's sections
     keep it, as it titles their card and drawer. A block's sections are unchanged.
   - **Areas:** `src/lib/config/types.ts` (`LayoutSectionConfig.label` optional,
     `LayoutBlockSectionConfig` keeping it required); `src/lib/layout/prepare-layout-texts.ts` (an
     optional label for a collection's sections); `validate-field-sections.ts` (a section without a
     label named by its place in an error); `src/lib/collection/validate-singleton.ts`; in the Admin,
     the toolkit's `LayoutSectionConfig`, `DocumentSectionCard`, `DocumentCreateForm`,
     `DocumentDrawerForm` and `SingletonCard`.
   - **Verification:** `src/lib/layout/__tests__/prepare-field-sections.unit.spec.ts` (a section
     without a label kept, a singleton's refused, an error naming the place); `yarn test:unit`,
     `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

5. **P2d.5 - README, and the first host** (the host's change with the user's approval)
   - **Outcome:** the README names `filters` in "A collection's table", and a section's optional label
     in "A collection's form sections". The first host's segments' table filters by `segment_id`.
   - **Verification:** the user's check on the first host: a table filtered by an editor and lifted.

**Exit gate:** P2d.1 to P2d.5 verified; `admin-cms-documents.spec.ts` and
`admin-cms-collections.spec.ts` pass in the user's run.

### Phase 2e

The first host's config changes in the same sub-phase, with the user's approval: its start stops on a
node's `page` without it. Each move is committed before its content changes (AGENTS.md).

1. **P2e.1 - Table sections in the config and the registry**
   - **Outcome:** a collection's section takes `type`, `"details"` by default or `"table"`; a `table`
     section names a `collection`, its `key` that collection's slug unless given, and takes `label`,
     `description`, `position` and the list's `columns`, `defaultSort`, `pageSize` and `filters`. It
     stands on a singleton only. A singleton's resolved sections carry each table resolved: the
     collection's `admin.table`, each key the section gives in place of the collection's.
     `CmsStructureNode` keeps `collection` and `children`; `page`, `CmsPageEntry`, `RegistryPageEntry`,
     `RegistryCollectionPlace.page` and `prepare-page-entries.ts` go.
   - **Areas:** `src/lib/config/types.ts` (`LayoutSectionConfig` a union of a details and a table
     section, the table section one type, `CmsTableSectionConfig`, as 2g reuses it); `src/lib/layout/`
     (`prepare-field-sections.ts`, `validate-field-sections.ts`, `prepare-layout-texts.ts`,
     `validate-section-keys.ts`: details sections laid out and checked, a table section's key
     defaulted and its texts prepared); `src/lib/registry/prepare-table-section.ts` from
     `prepareTableEntry`, run once every collection is prepared; `prepare-structure.ts`,
     `validate-structure-reach.ts` reading table sections; `src/lib/collection/types.ts`; the test
     config, whose settings hold a `settings_link` table section.
   - **Changes:** start checks: a `table` section only on a singleton, naming a registered collection
     that is no singleton, its settings checked as a table of that collection; a key once among a
     collection's sections; every collection a node or in a table section, and one with `edit: "page"`
     a node. The checks of page entries go.
   - **Verification:** registry unit tests for each check, a resolved table and the default structure,
     `prepare-structure.unit.spec.ts` rewritten from entries to sections; `yarn test:unit`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P2e.2 - `page-sections/`, moved**
   - **Outcome:** what every kind of page draws leaves `singleton-page/` for `src/admin/cms/
     page-sections/`, under the names it keeps from here on: `page-entry.tsx` to `page-section.tsx`,
     `child-collection-section.tsx` to `table-section.tsx`, `hooks/use-table-rows.tsx`,
     `hooks/use-delete-child-document.ts` to `hooks/use-delete-table-document.ts`,
     `utils/build-child-edit-path.ts` to `utils/build-table-row-path.ts`, `utils/list-singleton-cards.ts`
     to `utils/list-section-cards.ts`, `utils/find-singleton-card.ts` to `utils/find-section-card.ts`,
     each with its test.
   - **Changes:** one commit of the moves, with the import paths alone changed; `git status --short`
     shows `R`, not `RM`. The symbols are renamed in P2e.3, with the content.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn test:unit`.

3. **P2e.3 - The Admin from the sections**
   - **Outcome:** a singleton's page draws its sections in their order and columns through
     `PageSection`, a `details` section as its card and a `table` section through `TableSection`; a
     list's page draws its own table alone. `listSectionCards` and the forms read `details` sections
     alone. **Add** in a table section opens `/cms/<page>/children/<key>/create`, found by its key.
   - **Areas:** `page-sections/` (the symbols renamed: `PageSection`, `TableSection`,
     `useDeleteTableDocument`, `buildTableRowPath`, `listSectionCards`, `SectionCard`,
     `findSectionCard`); `singleton-page/singleton-layout.tsx`; `document-list-page/`;
     `common/utils/section-document-fields.ts`; `document-create-form/config.ts`;
     `common/utils/find-page-table.ts`, `has-page-table.ts`; the row drawer's route.
   - **Verification:** unit tests of the section cards, of a singleton's tables and of the table lookup
     by key; `yarn typecheck:admin`, `yarn lint`, `yarn format:check`, `yarn test:unit`;
     `admin-cms-collections.spec.ts` and `admin-cms-documents.spec.ts` run.

4. **P2e.4 - README and the first host** (the host's change with the user's approval)
   - **Outcome:** the README's "A collection's form sections" names the `table` type, and "The Admin's
     structure" the tree alone. The first host's `page_settings` gets a `segments` table section, and
     its node loses `page`.
   - **Verification:** the host's `cms-config.unit.spec.ts`; the user's check of the settings page: the
     `homepage` card, then the segments' table with its filter, Add, Edit and Delete.

**Exit gate:** P2e.1 to P2e.4 verified.

### Phase 2f

Every collection's page at its node's `slug`. The first host's config moves to `admin.routes` in P2f.5,
with the user's approval: its start stops on `admin.structure` without it. Each move is committed before
its content changes.

1. **P2f.1 - `admin.routes` in the config and the registry**
   - **Outcome:** `admin.routes`, a list of `{ slug, collection, children? }` or a function of
     `defaultRoutes` (user, 2026-11-24), replaces `admin.structure`. The registry holds `routes`, every node in the tree's
     order with its parent and children, and each collection its node's slug, `admin.route`, when it
     has one. A list's default buttons are one per child node; an action `{ type: "collection" }` needs
     a collection with a node, as a collection with no node has no page (user, 2026-11-24).
   - **Areas:** a commit renaming `prepare-structure.ts` to `prepare-routes.ts`,
     `validate-structure-nodes.ts` to `validate-route-nodes.ts`, `validate-structure-reach.ts` to
     `validate-route-reach.ts` and their test, then their content; `src/lib/config/types.ts`
     (`CmsRoute`, JSDoc with examples; `CmsStructureNode` and `admin.structure` removed);
     `src/lib/registry/types.ts` (`Registry.routes`); `src/lib/collection/types.ts`
     (`RegistryCollectionPlace`: `route`, `actions`; `node` removed); `prepare-collection-actions.ts`;
     the test config on `admin.routes`.
   - **Changes:** start checks: a slug checked as a collection's (`validate-content-type-slug.ts`), once
     in the tree; a collection on one node at most; a singleton's node with no children; every
     collection on a node or in a table section, and one with `edit: "page"` on a node. Without
     `admin.routes`, every collection a top-level node of its own slug.
   - **Verification:** registry unit tests for each check, the default tree, a collection's `route`,
     a list's default buttons and an action naming a collection with no node; `yarn test:unit`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P2f.2 - The routes in the collection list**
   - **Outcome:** `GET /admin/cms/collections` answers `routes` in the tree's order beside
     `collections`, each collection with `admin.route` and without `admin.node`.
   - **Areas:** `src/workflows/cms/steps/list-cms-collections.ts`; `AdminCollectionsResponse`;
     `integration-tests/http/cms/admin-cms-collections.spec.ts`.
   - **Verification:** the HTTP test, run; `yarn typecheck`.

3. **P2f.3 - The Admin's routes and navigation, moved**
   - **Outcome:** `src/admin/routes/cms/[collection]/` is `[slug]/`, and `@children/[child]/` is
     `@tables/[table]/`; `collection-list-table/` is `route-list-table/`, `collection-breadcrumb/` is
     `route-breadcrumb/`, `common/utils/list-collection-chain.ts` is `list-route-chain.ts`, each with its
     test.
   - **Changes:** one commit of the moves, with the parameters' names and the import paths alone
     changed; `git status --short` shows `R`, not `RM`.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn test:unit`.

4. **P2f.4 - The Admin on the routes**
   - **Outcome:** **Content** lists the top-level nodes in the tree's order; `/cms/<slug>` looks its
     node up and draws its collection's page, calling the API with the collection's slug; a slug no node
     has is not found, a collection's with no node included; the document page and `@create` stand
     under a list's node only. Every address is built from a collection's
     `admin.route` by one helper; the breadcrumbs and the header's buttons follow the routes. The rows
     of a table are added and edited at `/cms/<page>/tables/<key>/...`, the table found by its key.
   - **Areas:** the hooks `useCmsRoutes` and `useCmsRoute` beside `useCmsCollection`; the `[slug]`
     pages; `RouteListTable` and its columns (the first column "Name" in English and Polish, user, 2026-11-24,
     through `codee-ui-copy`); `RouteBreadcrumb`,
     `listRouteChain`; `build-header-actions.ts`; the fourteen places that build an address;
     `buildTableRowPath`; `find-page-table.ts`, `has-page-table.ts`.
   - **Verification:** unit tests of the chain, the node lookup, the address helper and the table
     lookup; `yarn typecheck:admin`, `yarn lint`, `yarn format:check`, `yarn test:unit`.

5. **P2f.5 - README, the main spec and the first host** (the host's change with the user's approval)
   - **Outcome:** the README's "The Admin's structure, and the table's buttons" becomes "The Admin's
     routes, and the table's buttons"; D37 of the main spec is amended; the first host's config is on
     `admin.routes`, at the addresses the user picks.
   - **Verification:** the host's `cms-config.unit.spec.ts`; the user's check: **Content** in the tree's
     order, each page at its address, a document opened from its list, the breadcrumbs, the header's
     buttons, a table's row added and edited.

**Exit gate:** P2f.1 to P2f.5 verified; `admin-cms-collections.spec.ts` passes.

### Phase 2g

Routes of one or several collections ("The routes"). No model or migration changes. Each move is committed before its content changes. The
first host's start stops on its routes' `collection` from P2g.1 to P2g.4, where its config moves to
`collections`.

1. **P2g.1 - Routes of one or several collections in the config and the registry**
   - **Outcome:** `CmsRoute` takes `collections`, a list of one entry at least, `label` and
     `description`; an entry is a slug or `{ collection, key?, position?, columns?, defaultSort?,
     pageSize?, filters? }`.
     `Registry.routes` holds `{ slug, label, description?, collections, parent?, children }`, each
     entry `{ collection, key, position, table? }`, a list's table resolved; a collection keeps
     `admin.route`. A list's default buttons are `{ type: "route", route }`, one per child route, then
     `create`.
   - **Areas:** `src/lib/config/types.ts` (`CmsRoute`, `CmsRouteEntryConfig`, `CollectionAction`'s
     `route`, JSDoc with examples); `src/lib/registry/types.ts` (`RegistryRoute` generic in its texts,
     `RegistryRouteEntry`); `validate-route-nodes.ts`; a new `prepare-route-entries.ts` (a route's
     entries, keys and label); `prepare-table-section.ts` (no owner check, which
     `prepareCollectionSections` keeps); `prepare-routes.ts`; `validate-route-reach.ts`;
     `prepare-collection-actions.ts`.
   - **Changes:** start checks: `collections` a list of one entry at least; an entry naming a
     registered collection, on one route of the tree; a `label` of text with several collections; keys of text, unique on a route with the `table` sections of its singletons; a
     singleton's entry with no `position` and no table settings; a list's entry's table checked as a
     `table` section's (2e); a `route` action naming a route. The "singleton's node has no children"
     check goes.
   - **Verification:** `prepare-routes.unit.spec.ts` for a route of several collections, its label,
     entries, keys and each check; `prepare-registry.unit.spec.ts` for the `route` buttons;
     `list-cms-routes.unit.spec.ts`; `yarn test:unit`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`. The Admin reads the old route shape until P2g.3, so `yarn typecheck:admin`
     fails from here to P2g.3.

2. **P2g.2 - Moves**
   - **Outcome:** `routes/cms/[slug]/[id]/` is `[slug]/[collection]/[id]/`, and
     `@sections/[section]/` is `@sections/[singleton]/[section]/`; the parameters' names and import
     paths alone change.
   - **Changes:** one commit; `git status --short` shows `R`, not `RM`.
   - **Verification:** `yarn test:unit`; no missing module in `yarn typecheck:admin`.

3. **P2g.3 - The Admin on the new routes**
   - **Outcome:** a route's page draws its entries in order: a list's table under its entry's key, with
     **Create** at `tables/<key>/create`, and a singleton's sections in their own columns with its
     document; then, on any route but one of a single list, the list of its children; and the zone
     `cms.route.details` and `.side`. A route of a single list keeps its table's `h1` heading and its
     header's buttons. Documents open at `/cms/<route>/<collection>/<id>`, a card's drawer at
     `/cms/<route>/sections/<singleton>/<section>/edit`; `@create` goes. **Content**, the breadcrumbs
     and the children's list name a route by its label.
   - **Areas:** a new `src/admin/cms/route-page/` (`RouteLayout`, `SingletonEntry`) in place of
     `DocumentListPage` and `SingletonLayout`; `routes/cms/[slug]/page.tsx`, `[collection]/[id]/page.tsx`,
     the card drawer's and the tables' routes; `useCmsRoute`; `findPageTable` over a route;
     `buildCmsPath`'s callers; `RouteListTable`, `RouteBreadcrumb`; `build-header-actions.ts` (`route`);
     `src/admin-extensions/types.ts` (`CmsRouteWidgetData`; `CmsListWidgetData` and
     `CmsSingletonWidgetData` removed); `index.d.ts`.
   - **Verification:** unit tests of `findPageTable` over a route, of a route's row and of the header's
     `route` button; `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`,
     `yarn test:unit`; `admin-cms-collections.spec.ts` updated for the route shape, run by the user.

4. **P2g.4 - README, this sub-spec and the first host** (the host's change with the user's approval)
   - **Outcome:** the README's "The Admin's routes" with `collections`, the document's address and the
     one zone, its widget zones' section rewritten; this sub-spec's earlier sections, the view's
     example and the sections' table among them, rewritten to the final design; the first host's
     routes as the user wants them, its documents at `/cms/pages/page/<id>`.
   - **Verification:** the host's `cms-config.unit.spec.ts`; the user's check: **Content**, a route of
     several collections if the host has one, a document opened from its list at its new address, a
     card saved, a table's row added and edited, the breadcrumbs.

5. **P2g.5 - One tool for a page's tables: a singleton's `table` sections go** (user, 2026-11-24;
   the first host's change with the user's approval)
   - **Outcome:** a collection's sections lay out its own fields alone, with no `type`; a list's route
     entry takes `label` and `description`, its table's heading on the page; every collection stands on
     exactly one route.
   - **Areas:** a commit renaming `src/lib/registry/prepare-table-section.ts` to
     `prepare-entry-table.ts`, then its content. `src/lib/config/types.ts` (`LayoutSectionConfig` the
     details section alone; `LayoutDetailsSectionConfig` and `CmsTableSectionConfig` removed;
     `CmsRouteEntryConfig`'s `label`, `description`); `src/lib/field/types.ts` (`RegistryLayoutSection`
     with no `type`; the prepared and table section types removed); `src/lib/collection/types.ts`
     (`RegistryCollection` back to the prepared sections); `src/lib/layout/` (the section's type check,
     the table section's texts and key, and the table skip in `validateFieldSections` removed);
     `validate-singleton.ts`; `prepare-routes.ts` (no section resolution); `prepare-route-entries.ts`
     (a list's heading; keys of the entries alone); `validate-route-reach.ts` (every collection on a
     route); `src/admin/cms/page-sections/` (`TableSection` removed; `PageSection` a card's alone or
     gone); `section-document-fields.ts`, `document-create-form/config.ts` (no type filter);
     `find-page-table.ts` (entries alone); `ListEntry` (the entry's heading); the test config (the links
     on the settings' route); the README's sections and routes.
   - **Changes:** start checks: a section with a `type` is refused as an unknown key would be (a JS
     config's leftover); a singleton's entry with a `label` or `description` is refused; a collection
     on no route stops the start.
   - **Verification:** `prepare-routes.unit.spec.ts`, `prepare-field-sections.unit.spec.ts`,
     `find-page-table.unit.spec.ts` and the section cards' tests rewritten; `yarn test:unit`,
     `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`;
     `admin-cms-collections.spec.ts` updated, run by the user; the first host's
     `cms-config.unit.spec.ts` and the user's check of its settings and homepages.

**Exit gate:** P2g.1 to P2g.5 verified; then the closure below.

## Short Tracker

- `done` - P1a.1: the resolved structure in the registry, unit-tested.
- `done` - P1a.2: `integration-tests/http/cms/admin-cms-collections.spec.ts` passes (10 of 10,
  2026-11-23).
- `done` - P1a.3 and P1a.4: the gate passed on the first host (user, 2026-11-23): the settings page
  drawn in `cms:two-column`, its cards and table as before, a test widget under them, and Customize
  Layout moving that widget alone.
- `done` - 1b: checked on the first host by the user (2026-11-23), the lists, the settings table and
  the forms as before.
- `done` - 1c: checked on the first host by the user (2026-11-23): the widget on a list's, a
  singleton's and a document's page, moved alone in Customize Layout, the pages as before. Phase 1 done.
- `done` - P2a.1: `admin.table` and `admin.edit` in the config and the registry, unit-tested.
- `done` - P2a.2: `integration-tests/http/cms/admin-cms-documents.spec.ts` passes (105 of 105,
  2026-11-24), the `id` cases among them.
- `done` - P2a.3 and P2a.4: checked on the first host by the user (2026-11-23): the segments' table by
  the market's portal and the homepage's title, rows in a drawer, the pages' list on its own columns.
  Media in a table stays its stored value until the read by id is decided.
- `done` - P2a.5: the first host's config on `admin.table` and `admin.edit` (user, 2026-11-23).
- `done` - P2b.1: `admin.structure` in the config and the registry, unit-tested; the test config on a
  structure function of the default.
- `done` - P2b.2 and P2b.3: `admin-cms-collections.spec.ts` passes (10 of 10, 2026-11-24); the first
  host on `admin.structure`, checked by the user (2026-11-24): **Content**, the pages' list with its
  settings button, the settings page with its breadcrumbs, card and segments' table.
- `done` - 2c, explicit sections with **Save** in a header of its own, areas held to sections as
  fields are (user, 2026-11-24); `admin-cms-collections.spec.ts` passes (10 of 10, 2026-11-24).
  - `done` - P2c.1 and P2c.2 in the plugin: `yarn test:unit` (1090 of 1090), `yarn typecheck`,
    `yarn typecheck:admin`, `yarn lint`, `yarn format:check` (2026-11-24).
  - `done` - P2c.3: the first host's config and labels on keyed sections, its
    `cms-config.unit.spec.ts` passing; checked in the Admin by the user (2026-11-24).
- `done` - 2d, filters, an editor's relationship filter after `sub-relations`' picker (user,
  2026-11-24). A `table` entry's fixed `filter` built and removed the same day, and a section's
  `label` made optional (user, 2026-11-24). `yarn test:unit` (1111 of 1111), `yarn typecheck`,
  `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; `admin-cms-documents.spec.ts` (113 of 113)
  and `admin-cms-collections.spec.ts` (10 of 10) (2026-11-24). The first host's segments filtered by
  market, checked by the user, and their one section without a label, which repeated the create
  modal's title (user, 2026-11-24).
- `done` - 2e, a singleton's tables in its sections, `admin.structure` the tree alone and
  `page-sections/` (user, 2026-11-24); checked on the first host by the user (2026-11-24). `sections` stay required on every collection (user, 2026-11-24).
  - `done` - P2e.1: `table` sections in the config and the registry, `page` and the page entries
    removed; `yarn typecheck`, `yarn lint`, `yarn format:check`; `yarn test:unit` 1113 of 1114, the one
    failure `find-singleton-card.unit.spec.ts`, which reads `admin.page` and is rewritten in P2e.3
    (2026-11-24). `admin-cms-collections.spec.ts` updated to sections, not run.
  - `done` - P2e.2: the moves to `page-sections/` staged alone, every one `R` in `git status --short`,
    the importers' paths alone changed; `SingletonSectionCard` stays in `singleton-page/`, as the list
    names it not, and `singleton-page/index.ts` no longer re-exports the cards, whose importers now
    name `page-sections/utils/list-section-cards`. `yarn typecheck`, `yarn lint`, `yarn format:check`,
    `yarn test:unit` as after P2e.1; `yarn typecheck:admin` with no missing module (2026-11-24).
  - `done` - P2e.3: a singleton's page draws its sections in their order and columns through
    `PageSection`, a list's page its own table alone; the forms, the cards and the create form read
    `details` sections alone; `findPageTable` and `hasPageTable` read table sections. `yarn typecheck`,
    `yarn typecheck:admin`, `yarn lint`, `yarn format:check`, `yarn test:unit` (1115 of 1115)
    (2026-11-24). `admin-cms-collections.spec.ts` and `admin-cms-documents.spec.ts` not run.
  - `done` - P2e.4: the README's "A collection's form sections", "Singletons" and "The Admin's
    structure" rewritten for `table` sections and the tree alone; the first host's `page_settings`
    holds the segments' table section and its node no `page`, keeping its top-level place, as
    `page_settings_segment` does for its own list on **Content**. Its `cms-config.unit.spec.ts`
    passes; the settings page checked by the user (2026-11-24).
  - The Admin read `admin.page` until P2e.3: `yarn typecheck:admin` fails from P2e.1 to P2e.3, so
    P2e.2 is verified by `yarn typecheck` and `yarn test:unit` alone, and the first host's start stops
    on its node's `page` until P2e.4.
- `done` - 2f, `admin.routes`, every collection's page at its node's slug (user, 2026-11-24); checked on
  the first host by the user (2026-11-24).
  The analysis found that **Content** follows the config's order, not the structure's; 2f fixes it.
  - `done` - P2f.1: the rename committed alone (`b2d68f7`), then `admin.routes` (`CmsRoute`, for now
    `CmsCollectionRoute` alone, the union 2g extends) in the config and the registry: `Registry.routes`
    in the tree's order, a collection's `admin.route`, `node` removed; a slug checked by
    `validateContentTypeSlug` once in the tree; a `collection` action naming a collection on a route.
    `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn test:unit` (2026-11-24).
  - `done` - P2f.2: `routes` beside `collections` in `GET /admin/cms/collections`, read by a step of
    its own, `listCmsRoutesStep`, with its unit test; `AdminCollectionsResponse.routes`;
    `admin-cms-collections.spec.ts` updated, not run (2026-11-24). `yarn test:unit` 1121 of 1121.
  - `done` - P2f.3: the moves in two rename-only commits (`6297eaf`, `2985fe7`), folders first and the
    files inside them after, so the one-line `index.ts` files stay renames
    ([git-loses-the-rename-of-a-one-line-file-whose-line-changes](../../lessons/git-loses-the-rename-of-a-one-line-file-whose-line-changes.md)).
  - `done` - P2f.4: **Content** lists the top-level routes in the tree's order, its first column
    "Name" ("Nazwa"); `/cms/<slug>` looks its route up with `useCmsRoute` and calls the API with the
    route's collection, a slug no route has not found; the document page and `@create` stand under a
    list's route only; the breadcrumbs follow `listRouteChain`; every address comes from
    `buildCmsPath`; a table's rows are added and edited at `/cms/<page>/tables/<key>/...`, the table
    found by its key with `findPageTable`. `hasPageTable` goes, as the drawer finds its table by key,
    and `useCmsRoutes` is not built, as `useCmsCollections` already answers the routes.
    `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`, `yarn test:unit`
    (1121 of 1121) (2026-11-24).
  - `done` - P2f.5: the README's "The Admin's routes, and the table's buttons" in place of "The Admin's
    structure", the actions and `admin.edit` on routes; D37 of the main spec amended and its Current
    Status brought up to date; the first host on `admin.routes` at the addresses the user picked
    (2026-11-24): `pages` (`page`), `page_settings` (`page_settings`) and `homepages`
    (`page_settings_segment`), its tree as before. Its `cms-config.unit.spec.ts` passes; checked in
    the Admin by the user: **Content** in the tree's order, each page at its address, a document opened
    from its list, the breadcrumbs, the header's buttons, a table's row added and edited, and an old
    address not found (2026-11-24).
- `done` - 2g, routes of one or several collections in place of views, documents at
  `/cms/<route>/<collection>/<id>`, one zone for every route's page (user, 2026-11-24); checked on the
  first host by the user, drafts opt-in (D19) among it (2026-11-24).
  - `done` - P2g.1: `collections`, always a list, in the config, entries resolved by
    `prepare-route-entries.ts`, a route's label, `{ type: "route" }` buttons, `prepareTableSection`
    returning a table with its owner check moved to the collection's sections; `yarn typecheck`,
    `yarn lint`, `yarn format:check`, `yarn test:unit` (1132 of 1132) (2026-11-24);
    `admin-cms-collections.spec.ts` updated, not run.
  - `done` - P2g.2: the moves committed alone (`92d002b`), both `R` (2026-11-24); the first host's
    config on `collections` (its `713bf721`).
  - `done` - P2g.3: one `RoutePage` (`src/admin/cms/route-page/`) in place of `DocumentListPage`,
    `SingletonPage` and `SingletonLayout`: a list as `ListEntry`, a singleton's sections in their own
    columns with its document from `useSingletonDocuments` (which replaces `useSingletonDocument` and
    shares its queries with `useDocuments` and `useDocument` through `documentListQuery` and
    `documentQuery`), the children's list, and `cms.route.details`; documents at
    `/cms/<route>/<collection>/<id>`; **Create** at `tables/<key>/create`, `@create` removed; a card's
    drawer naming its singleton; **Content**, the breadcrumbs and the `route` button by the route's
    label; "Subpages" ("Podstrony") over a route's children. A list's status filter follows its
    collection's drafts, on every route. `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`,
    `yarn format:check`, `yarn test:unit` (1132 of 1132) (2026-11-24). A route's row has no unit test
    of its own: `RouteListTable` builds it inline.
  - `done` - P2g.4: the README's routes, their addresses, the actions and the one route zone; this sub-spec's
    TLDR, Target Behavior, "The routes" (in place of "The structure" and the 2e and 2f sections),
    widgets, Contracts, risks, phasing and acceptance rewritten to the final design (2026-11-24). The
    first host is on `collections` already (`713bf721`); its Admin checked by the user: **Content**, a
    document at its new address, **Create**, the header's button, a card saved, the segments' table
    with Add, Edit and Delete (2026-11-24). A route of several collections tried on the first host
    (`content`: the pages and their settings), checked by the user (2026-11-24); its config stays
    uncommitted until P2g.5.
  - `done` - P2g.5: a singleton's `table` sections go, a list's entry takes a heading, every
    collection on a route (user, 2026-11-24). The rename committed alone (`226bb8d`); in the plugin:
    sections back to one shape, refused with a `type` or a `collection`; `prepareEntryTable`;
    `validateRouteReach` putting every collection on a route, so `admin.route` is required; a list
    entry's `label` and `description`; `TableSection`, `PageSection` and `findSectionCard` removed, the
    route page drawing a singleton's cards from `listSectionCards`; the test config's links on the
    settings' route; README. `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`,
    `yarn format:check`, `yarn test:unit` (1116 of 1116) (2026-11-24); `admin-cms-collections.spec.ts`
    updated, not run. The first host's `content` route shows the pages, their settings and the market
    homepages, its settings' sections the card alone; checked by the user (2026-11-24).
- `done` - the questions of 2f's and 2g's analysis answered (user, 2026-11-24), recorded under
  "The routes".
- `done` - Phases 3 and 4 moved to [sub-admin-blocks-export](./2026-11-24-sub-admin-blocks-export.md)
  and [sub-admin-table-cells](./2026-11-24-sub-admin-table-cells.md), the media thumbnail with the
  cells (user, 2026-11-24).
- `done` - the first host's test widget, `apps/backend/src/admin/widgets/cms-layout-check/`, removed
  (user's approval, 2026-11-24).
- `in progress` - closure (user, 2026-11-24).
  - `done` - the review of `codee-spec-writing` and `codee-spec-review-medusa`, by the author, not
    independent (2026-11-24): the design sections brought to the state after 2g (Target Behavior,
    "Tables and how a collection is edited", "Which tool for which change", "Building blocks", Edge
    Cases, Contracts); the history sections (Problem, Current State, the phases' plans) kept as they
    were. No Critical or High finding; the one gate left is the HTTP tests below. Medusa layers: the
    collections' route reads through `listCmsCollectionsWorkflow`, its steps reading the registry, no
    mutation, cache, migration or new route; every new step has its unit test.
  - `done` - the HTTP tests, run at the user's request (2026-11-24): `admin-cms-collections.spec.ts`
    10 of 10, `admin-cms-documents.spec.ts` 113 of 113, `documents-without-drafts.spec.ts` 9 of 9,
    `workflows/drafts-off.spec.ts` 12 of 12.
  - `pending` - the move to `ended/`, with the main spec's references.
