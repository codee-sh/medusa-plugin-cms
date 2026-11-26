# The Admin

This page explains how the plugin lays out the Admin's **Content** pages. It covers the routes that group collections into pages, each collection's table, the form's sections, and the widgets you can add. The fields themselves are in [Fields](./fields.md), and inputs of your own are in [Field components](./field-components.md).

## The Admin's routes, and the table's buttons

`admin.routes`, at the root of the config, is the tree of pages in the Admin. Routes lay out the pages. A collection describes its own fields, sections, table, and editing, wherever it stands in the tree. The tree only places collections and relates no data.

```ts
// src/cms/config.ts
admin: {
  routes: [
    { slug: "pages", collections: ["page"] },
    {
      slug: "site",
      label: "Site",
      collections: [
        "page_settings",
        { collection: "page_settings_segment", key: "homepages", pageSize: 20 },
      ],
      children: [{ slug: "footer", collections: ["footer_settings"] }],
    },
  ],
}
```

Without `admin.routes`, every collection becomes a top-level route under its own slug, in config order. To rearrange that default, set `admin.routes` to a function that takes `defaultRoutes`. The plugin runs the function once, when Medusa starts.

### A route

Each route is a `CmsRoute`:

| Option | Type | Default | Description |
|---|---|---|---|
| `slug` | `string` | Required | The route's address, in snake_case. |
| `collections` | `CmsRouteEntry[]` | Required | The collections the route's page shows, one or several. |
| `label` | `CmsText` | On a route of one collection, that collection's page label | The route's name in **Content**, required on a route of several collections. |
| `description` | `CmsText` | On a route of one collection, that collection's description in **Content** | The text under the route's name in **Content**, and under the page heading on a route of one list. |
| `children` | `CmsRoute[]` | - | The routes under this route's page. |

**Content** lists the top-level routes in config order, each by its `label`. A route's page draws each collection by its kind: a list as a table, a singleton as its sections. Every collection stands on exactly one route.

On a route that shows one list, the child routes are buttons on the list's table. On any other route, the child routes are listed under the route's collections. The breadcrumbs follow the tree.

### A route's collections

Each entry of `collections` is either the slug of a collection or an object that names the collection:

```ts
// src/cms/config.ts, in a route
collections: [
  "page_settings",
  { collection: "page_settings_segment", key: "homepages", pageSize: 20 },
]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `collection` | `string` | Required | The collection's slug. |
| `key` | `string` | The collection's slug | The entry's name on the page and in the table's address. |
| `position` | `"main" \| "side"` | - | The page column a list stands in. |
| `label` | `CmsText` | - | The heading of a list's table on that page. |
| `description` | `CmsText` | - | The description of a list's table on that page. |
| `columns`, `defaultSort`, `pageSize`, `filters` | As in [`admin.table`](#the-tables-options) | The collection's `admin.table` keys | The settings of a list's table, for that page alone. |

A singleton keeps the columns, order, and headings of its sections on every route, so a singleton's entry takes none of these options.

### The pages' addresses

| Page | Address |
|---|---|
| A route's page | `/app/cms/<slug>` |
| A list's document | `/app/cms/<slug>/<collection>/<id>` |
| A table's **Create** and **Add** | `/app/cms/<slug>/tables/<key>/create` |
| A row edited in a drawer | `/app/cms/<slug>/tables/<key>/<id>/edit` |
| A singleton's card | `/app/cms/<slug>/sections/<singleton>/<section>/edit` |

The `<slug>` in a document's address is the route's slug, whatever the collection's own slug is. In the example above, a document of `page` opens at `/app/cms/pages/page/<id>`.

### When a route stops Medusa from starting

- A route without a snake_case slug, or with a slug another route has.
- A route with no collections.
- An entry that names no collection.
- A collection on two routes, or twice on one route.
- A route with several collections and no `label`.
- A singleton's entry that gives a list's option: `position`, `label`, `description`, `columns`, `defaultSort`, `pageSize` or `filters`.
- A list's entry whose table, with the entry's settings in place, breaks a rule in [When a table stops Medusa from starting](#when-a-table-stops-medusa-from-starting).
- Two collections on one page with the same key.
- A collection on no route.

### The table's buttons

The buttons in the header of a list's table come from the collection's `admin.actions`. By default, they are:

1. One button for each child of the route, in order, when the route shows that list alone.
2. **Create**.

An array of actions replaces the defaults. A function that takes `defaultActions` can keep, reorder, remove, or add buttons. The plugin runs the function once, when Medusa starts:

```ts
// src/cms/config.ts, in a collection
{
  slug: "page",
  admin: {
    actions: ({ defaultActions }) => [
      ...defaultActions,
      { type: "link", label: "Import", to: "/import-pages" },
    ],
  },
}
```

Each action is a `CollectionAction`, one of:

- **`{ type: "create" }`** - the **Create** button.
- **`{ type: "collection", collection: "<slug>" }`** - opens the page of the route that holds that collection. The button shows the collection's page label.
- **`{ type: "route", route: "<slug>" }`** - opens the route's page. The button shows the route's label.
- **`{ type: "link", label, to }`** - opens `to`, any Admin path that starts with `/`. The `label` is a `CmsText`, like any other text in the config.

A singleton takes no actions, because its page has no header.

### When an action stops Medusa from starting

- An unknown `type`.
- A `collection` on no route.
- A `route` that does not exist.
- A link without a `label` or an Admin path.
- A **Create** action given twice.

## A collection's table, and how its rows are edited

`admin.table` lists the exact columns of a collection's table, in order. `admin.edit` sets where an editor edits a row. Every table of the collection, on any route, edits rows this way:

```ts
// src/cms/config.ts
{
  slug: "page_settings_segment",
  admin: {
    useAsTitle: "segment_id",
    edit: "drawer",
    table: {
      columns: [
        { field: "segment_id", label: "Market" },
        { field: "homepage_id" },
        { system: "updated_at" },
      ],
      defaultSort: { column: "segment_id", direction: "asc" },
      filters: ["segment_id"],
    },
  },
}
```

A singleton takes neither key, because an editor edits its sections from their cards.

### The table's options

`admin.table` is a `CmsTableConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `columns` | `CmsTableColumn[]` | Required | The table's exact columns, in order. |
| `defaultSort` | `{ column: string; direction: "asc" \| "desc" }` | - | Orders the table until an editor sorts it. |
| `pageSize` | `number` | - | The number of rows on a page of the table, from 1 to 100. |
| `filters` | `string[]` | - | The fields an editor can filter the table by, besides the status. |

A column is one of:

- **`{ field }`** - a field's value, drawn by the field's type: a select by the label of its option, a relationship by the title of its target.
- **`{ system }`** - a column the plugin provides: `id`, `status`, `published_version`, `created_at` or `updated_at`.

The table keeps the filter values in the URL. The values a filter offers depend on the field:

- A `select` field filters by its options.
- A `boolean` field filters by yes or no.

Without `admin.table`, the table shows:

- the `useAsTitle` field, or the id when the collection has no `useAsTitle`
- the status, for a collection with drafts
- `updated_at`

`useAsTitle` sets a document's title and does not add a column.

### Where a row is edited

`admin.edit` takes one of:

- **`"page"`** - an editor edits the row on the document's page. This is the default.
- **`"drawer"`** - an editor edits the row in a drawer over the table, which saves live. A collection edited in a drawer takes no drafts and no areas.

### When a table stops Medusa from starting

- A column that names no field.
- A column of a `richtext` field, or of a field that is not a scalar column.
- A column shown twice.
- A `defaultSort` that names no sortable column of the table.
- A `defaultSort` with a direction other than `asc` or `desc`.
- A `pageSize` that is not a whole number from 1 to 100.
- A filter that is not a `select` or `boolean` field.
- A filter named `q`, `order`, `status` or `offset`.
- A filter given twice.
- A drawer for a collection with drafts or areas.

## A collection's form sections

`admin.sections` lays out a collection's form. Every field and every area sits in exactly one section.

```ts
// src/cms/config.ts, in a collection
admin: {
  sections: [
    { key: "page", label: "Page", fields: ["title", "slug"] },
    { key: "content", label: "Content", fields: [], areas: ["sections"] },
    { key: "seo", label: "SEO", fields: ["seo_title", "og_image"], position: "side" },
  ],
}
```

A section is a `LayoutSectionConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | Required | The section's name, unique in the collection. |
| `label` | `CmsText` | - | The section's heading. |
| `fields` | `LayoutItemConfig[]` | Required | The section's fields, in the order shown. |
| `areas` | `string[]` | - | The areas drawn after the section's fields. |
| `position` | `"main" \| "side"` | `"main"` | The column the section stands in: `main`, or `side` beside it. |

A section without a `label` draws its fields with no heading, which suits the one section of a small form. Each section of a singleton needs a `label`, because the label titles the section's card and drawer.

### How the sections are drawn

- A section lays out only the fields and areas of its own collection. A table of another collection stands on a route, beside the collection ([The Admin's routes](#the-admins-routes-and-the-tables-buttons)).
- A document's page draws a card for each section under the page header, which holds **Save**.
- A singleton draws a card for each section on the route that shows it. Each card stands in its section's column, and an editor edits the section's fields in a drawer.
- A block's card can take sections, which have no `key`. The card draws the fields that sit in no section before the sections.

### When a section stops Medusa from starting

- A collection without sections.
- A section without a `key`, or with the `key` of another section.
- A section that names a `type` or a `collection`.
- A field or an area in no section, or in two.

## Widgets in the plugin's pages

The plugin's pages have their own widget zones. You add a widget to them as you would to any page of Medusa's Admin. Create a file in `src/admin/widgets/` that exports a component and a `defineWidgetConfig` that names the zone.

| Zone | Where the widget stands | The widget's `data` |
|---|---|---|
| `cms.route.details` | A route's page, under the route's collections | `CmsRouteWidgetData` |
| `cms.route.details.side` | The side column of a route's page | `CmsRouteWidgetData` |
| `cms.document.details` | A document's page, under the form | `CmsDocumentWidgetData` |
| `cms.document.details.side` | The side column of a document's page, under the document's status and history | `CmsDocumentWidgetData` |

Every route's page shares the two route zones, and every document's page shares the two document zones. So a widget checks the slug in its `data` and returns `null` on the pages where it does not belong.

The page's **Customize layout** arranges your widgets. The plugin's own sections stay where the config puts them.

### What a widget gets as `data`

`@mostrajs/cms/admin-extensions` exports both types. The labels already come in the editor's language.

```ts
type CmsRouteWidgetData = {
  route: { slug: string; label: string }
  collections: {
    slug: string
    labels: { singular: string; plural: string }
    singleton: boolean
    document?: { id: string; [column: string]: unknown } | null
  }[]
}
```

`collections` holds the collections the page shows, in the page's order. A singleton also carries `document`, which holds the columns of the singleton's document, or `null` until an editor first saves it. A list carries no `document`, so a widget that needs the list's documents reads them itself.

```ts
type CmsDocumentWidgetData = {
  collection: { slug: string; labels: { singular: string; plural: string } }
  document: { id: string; [column: string]: unknown }
}
```

`document` holds the document's `id` and columns, as the document's page read them.

> [!NOTE]
> `document` is the stored row. When a published document has changes waiting, `document` holds the published content, not the draft. It never holds what the editor is typing.

The document zones stand only on a document's own page:

- A row edited in a drawer has no zone.
- A singleton's content reaches the zones of its route, through `collections[].document`.

A widget stands outside the document's form and takes no part when an editor saves the document.

### Making TypeScript know the zones

The types at the package root declare the zones in Medusa's `InjectionZoneRegistry`, and `defineWidgetConfig` reads the zones from there. `medusa develop` and `medusa build` write `.medusa/types/augmentation-refs.d.ts` in your project. That file references the root types of each installed plugin, including this one.

TypeScript in your Admin knows the zones once that file is part of the program. If `src/admin/tsconfig.json` does not include the file, add it. Otherwise, the typecheck rejects `cms.document.details` as an unknown zone.

```jsonc
// src/admin/tsconfig.json
{
  // ...
  "include": [".", "../../.medusa/types/augmentation-refs.d.ts"]
}
```

### An example widget

This widget shows the storefront address of a `page` document on that document's page:

```tsx
// src/admin/widgets/page-address.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"
import type { CmsDocumentWidgetData } from "@mostrajs/cms/admin-extensions"

const PageAddressWidget = ({
  data,
}: DetailWidgetProps<CmsDocumentWidgetData>) => {
  if (data.collection.slug !== "page") {
    return null
  }

  const slug = typeof data.document.slug === "string" ? data.document.slug : null

  return (
    <Container className="px-6 py-4">
      <Heading level="h2">Storefront address</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {slug ? `/${slug}` : "No address until the page has a slug"}
      </Text>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "cms.document.details",
})

export default PageAddressWidget
```

`document` types its columns as `unknown`, so the widget narrows the column it reads. `document` is the stored row, so for a published page the widget shows the address the Store API serves until an editor publishes a new slug.
