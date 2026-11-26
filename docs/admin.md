# The Admin

How the Admin's **Content** pages are laid out: the routes that group collections into pages, each collection's table, its form's sections, and the widgets you can add to them. The fields themselves are in [Fields](./fields.md); inputs of your own are in [Field components](./field-components.md).

## The Admin's routes, and the table's buttons

`admin.routes`, at the config's root, is the tree of the Admin's pages. Routes lay out the pages, and a collection describes itself - its fields, sections, table and editing - wherever it stands. The tree places collections only and relates no data.

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

Without `admin.routes`, every collection is a top-level route of its own slug, in config order. A function of `defaultRoutes`, run once at start, can rearrange the default.

### A route

Each route is a `CmsRoute`:

| Option | Type | Default | Description |
|---|---|---|---|
| `slug` | `string` | Required | Its address, in snake_case. |
| `collections` | `CmsRouteEntry[]` | Required | The collections its page shows, one or several. |
| `label` | `CmsText` | The collection's page label, on a route of one collection | Its name in **Content**; a route of several collections needs one. |
| `children` | `CmsRoute[]` | - | The routes that sit under its page. |

**Content** lists the top-level routes in their order, each by its `label`. A page draws each of its collections as its kind does: a list as its table, a singleton as its sections. Every collection stands on exactly one route.

On a route of one list, the children are buttons on its table. On any other route, they are listed under its collections. The breadcrumbs follow the tree.

### A route's collections

An entry of `collections` is a collection's slug, or an object naming it:

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
| `key` | `string` | The collection's slug | Its name on the page and in its table's address. |
| `position` | `"main" \| "side"` | - | A list's column on the page. |
| `label` | `CmsText` | - | A list's table heading on that page. |
| `description` | `CmsText` | - | A list's table description on that page. |
| `columns`, `defaultSort`, `pageSize`, `filters` | As in [`admin.table`](#the-tables-options) | The collection's `admin.table` keys | A list's table settings, for that page alone. |

A singleton's sections keep their own columns, order and headings wherever it stands, so its entry takes none of these.

### The pages' addresses

| Page | Address |
|---|---|
| A route's page | `/app/cms/<slug>` |
| A list's document | `/app/cms/<slug>/<collection>/<id>` |
| A table's **Create** and **Add** | `/app/cms/<slug>/tables/<key>/create` |
| A drawer-edited row | `/app/cms/<slug>/tables/<key>/<id>/edit` |
| A singleton's card | `/app/cms/<slug>/sections/<singleton>/<section>/edit` |

A document's address takes its route's slug, whatever the collection's own slug: a document of `page` above opens at `/app/cms/pages/page/<id>`.

### When the start fails on a route

- A route without a snake_case slug, or with a slug another route has.
- A route of no collections.
- An entry naming no collection.
- A collection on two routes, or twice on one.
- A route of several collections without a `label`.
- A singleton's entry with a list's key.
- A list's entry whose table does not fit.
- A key two collections of a page share.
- A collection on no route.

### The table's buttons

The buttons in the header of a list collection's table are its `admin.actions`. By default they are:

1. A button per child of its route, in order, when the route shows that list alone.
2. **Create**.

A list replaces them. A function of `defaultActions`, run once at start, keeps, reorders, removes or adds:

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

An action is a `CollectionAction`, one of:

- **`{ type: "create" }`** - the **Create** button.
- **`{ type: "collection", collection: "<slug>" }`** - opens that collection's route's page, shown under the collection's page label.
- **`{ type: "route", route: "<slug>" }`** - opens a route's page, shown under the route's label.
- **`{ type: "link", label, to }`** - opens `to`, any Admin path starting with `/`. Its `label` is a text of the config like any other.

A singleton takes no actions, as its page has no header.

### When the start fails on an action

- An unknown `type`.
- A `collection` on no route.
- A `route` that does not exist.
- A link without a `label` or an Admin path.
- **Create** twice.

## A collection's table, and how its rows are edited

`admin.table` lists exactly the columns of a collection's table, in order. `admin.edit` says where a row is edited. Each table of the collection, on whichever route, edits its rows so:

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

A singleton takes neither key, as its sections are edited from its cards.

### The table's options

`admin.table` is a `CmsTableConfig`:

| Option | Type | Default | Description |
|---|---|---|---|
| `columns` | `CmsTableColumn[]` | Required | Exactly the table's columns, in order. |
| `defaultSort` | `{ column: string; direction: "asc" \| "desc" }` | - | Orders the table until the editor sorts it. |
| `pageSize` | `number` | - | The size of the table's page, from 1 to 100. |
| `filters` | `string[]` | - | The fields an editor filters the table by, besides the status. |

A column is one of:

- **`{ field }`** - a field's value, drawn by its type: a select by its option's label, a relationship by its target's title.
- **`{ system }`** - a column of the plugin's own: `id`, `status`, `published_version`, `created_at` or `updated_at`.

A filter's values are kept in the URL:

- A `select` field filters by its options.
- A `boolean` field filters by yes or no.

Without `admin.table`, the table shows:

- the `useAsTitle` field, or the id without one;
- the status, for a collection with drafts;
- `updated_at`.

`useAsTitle` titles a document and adds no column.

### Where a row is edited

`admin.edit` takes one of:

- **`"page"`** - its document's page. The default.
- **`"drawer"`** - a drawer over the table, saved live. It takes no drafts and no areas.

### When the start fails on a table

- A column naming no field.
- A column of a `richtext` field, or of one that is no scalar column.
- A column shown twice.
- A `defaultSort` naming no sortable column of the table.
- A filter that is no `select` or `boolean` field.
- A filter named `q`, `order`, `status` or `offset`.
- A filter that repeats.
- A drawer for a collection with drafts or areas.

## A collection's form sections

`admin.sections` lays out a collection's form. Every field and every area sits in exactly one of its sections.

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
| `key` | `string` | Required | Its name, unique in the collection. |
| `label` | `CmsText` | - | Its heading. |
| `fields` | `LayoutItemConfig[]` | Required | Its fields, in the order shown. |
| `areas` | `string[]` | - | The areas drawn after its fields. |
| `position` | `"main" \| "side"` | `"main"` | The column it stands in: `main`, or `side`, beside it. |

A section without a `label` draws its fields with no heading, such as the one section of a small form. A singleton's sections need one, as it titles their card and drawer.

### How the sections are drawn

- A section lays out its own collection's fields and areas alone. A table of another collection stands on a route, beside the collection ([The Admin's routes](#the-admins-routes-and-the-tables-buttons)).
- A document's page draws a card per section under its header, which holds **Save**.
- A singleton draws a card per section, each in its column and edited in a drawer, on the route that shows it.
- A block's card takes optional sections, without a `key`. It draws its fields in no section before them.

### When the start fails on a section

- A collection without sections.
- A section without a `key`, or with another section's.
- A section naming a `type` or a `collection`.
- A field or an area in no section, or in two.

## Widgets in the plugin's pages

The plugin's pages have widget zones of their own. You add a widget to them as you add one to any page of Medusa's Admin: a file in `src/admin/widgets/` that exports a component and a `defineWidgetConfig` naming the zone.

| Zone | Where the widget stands | Its `data` |
|---|---|---|
| `cms.route.details` | A route's page, under its collections | `CmsRouteWidgetData` |
| `cms.route.details.side` | The side column of a route's page | `CmsRouteWidgetData` |
| `cms.document.details` | A document's page, under its form | `CmsDocumentWidgetData` |
| `cms.document.details.side` | The side column of a document's page, under its status and history | `CmsDocumentWidgetData` |

Every route's page shares the two route zones, and every document's page the two document zones. So a widget checks the slug in its `data` and returns `null` on the pages it does not belong to.

The page's Customize Layout arranges your widgets; the plugin's own sections stay where the config puts them.

### What a widget gets as `data`

Both types are exported from `@mostrajs/cms/admin-extensions`. The labels are already in the editor's language.

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

`collections` are the collections the page shows, in its order. A singleton also carries its `document`, the document's columns, or `null` before its first save. A list carries none, so a widget that needs its documents reads them itself.

```ts
type CmsDocumentWidgetData = {
  collection: { slug: string; labels: { singular: string; plural: string } }
  document: { id: string; [column: string]: unknown }
}
```

`document` holds the document's `id` and columns as its page read them.

> [!NOTE]
> `document` is the stored row. For a published document with changes waiting, it holds the published content, not the draft, and never what the editor is typing.

The document zones stand only on a document's own page:

- A row edited in a drawer has no zone.
- A singleton's content is in its route's zones, through `collections[].document`.

A widget stands outside the document's form and takes no part in its save.

### Making TypeScript know the zones

The zones reach `defineWidgetConfig` through the package root's types, which declare them in Medusa's `InjectionZoneRegistry`. `medusa develop` and `medusa build` write `.medusa/types/augmentation-refs.d.ts` in your project. It references the root types of each installed plugin, this one among them.

Your Admin's TypeScript knows the zones once that file is in its program. If `src/admin/tsconfig.json` does not include it, add it, or the typecheck refuses `cms.document.details` as an unknown zone.

```jsonc
// src/admin/tsconfig.json
{
  // ...
  "include": [".", "../../.medusa/types/augmentation-refs.d.ts"]
}
```

### An example widget

This widget shows a page's storefront address in its document's page:

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

`document` types its columns as `unknown`, so the widget narrows the one it reads. Since `document` is the stored row, a published page shows the address the store serves until a new slug is published.
