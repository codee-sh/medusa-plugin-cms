# The Admin

How the Admin's **Content** pages are laid out: the routes that group collections into pages, each collection's table, its form's sections, and the widgets you can add to them. The fields themselves are in [Fields](./fields.md); inputs of your own are in [Field components](./field-components.md).

## The Admin's routes, and the table's buttons

`admin.routes`, at the config's root, is the tree of the Admin's pages: routes lay out the pages, and a collection describes itself - its fields, sections, table and editing - wherever it stands. Each route has a `slug`, its address, and the `collections` its page shows, one or several, each drawn as its kind does: a list as its table, a singleton as its sections. Its `children` sit under its page. **Content** lists the top-level routes in their order, each by its `label`; a route of one collection takes that collection's page label when it gives none, and a route of several needs one. The tree places collections only and relates no data. Without it every collection is a top-level route of its own slug, in config order:

```ts
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

An entry of `collections` is a collection's slug, or an object naming it with a `key`, its name on the page and in its table's address, the slug when left out. A list's entry also takes a `position`, `main` or `side`; a `label` and a `description`, its table's heading on that page; and `columns`, `defaultSort`, `pageSize` and `filters` in place of its `admin.table` keys, for that page alone. A singleton's sections keep their own columns, order and headings wherever it stands, so its entry takes none of these.

A route's page stands at `/app/cms/<slug>`, and a list's documents at `/app/cms/<slug>/<collection>/<id>`, whatever the collection's own slug: a document of `page` above opens at `/app/cms/pages/page/<id>`. A table's **Create** and **Add** open `/app/cms/<slug>/tables/<key>/create`, a drawer-edited row `/app/cms/<slug>/tables/<key>/<id>/edit`, and a singleton's card `/app/cms/<slug>/sections/<singleton>/<section>/edit`. On a route of one list the children are buttons on its table; on any other route they are listed under its collections. The breadcrumbs follow the tree. Every collection stands on exactly one route. A route's slug is snake_case, and a function of `defaultRoutes`, run once at start, can rearrange the default.

The start fails on a route without a snake_case slug or with a slug another route has, a route of no collections, an entry naming no collection, a collection on two routes or twice on one, a route of several collections without a label, a singleton's entry with a list's key, a list's entry whose table does not fit, a key two collections of a page share, and a collection on no route.

The buttons in the header of a list collection's table are its `admin.actions`. By default they are a button per child of its route, in order, when the route shows that list alone, then **Create**. A list replaces them; a function of them, run once at start, keeps, reorders, removes or adds:

```ts
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

An action is `{ type: "create" }`, `{ type: "collection", collection: "<slug>" }`, shown under that collection's page label and opening its route's page, `{ type: "route", route: "<slug>" }`, a route's page under the route's label, or `{ type: "link", label, to }`, any Admin path starting with `/`, whose label is a text of the config like any other. The start fails on an unknown type, a collection on no route, a route that does not exist, a link without a label or an Admin path, and **Create** twice. A singleton takes none, as its page has no header.

## A collection's table, and how its rows are edited

`admin.table` lists exactly the columns of a collection's table, in order: a field's value, drawn by its type - a select by its option's label, a relationship by its target's title - or a column of the plugin's own (`id`, `status`, `published_version`, `created_at`, `updated_at`). `defaultSort` orders the table until the editor sorts it, and `pageSize` sets its page, from 1 to 100. `filters` lists the fields an editor filters the table by, besides the status: a select by its options, a boolean by yes or no, kept in the URL. Without `admin.table` the table shows the `useAsTitle` field, or the id without one, the status for a collection with drafts, and `updated_at`. `useAsTitle` titles a document and adds no column.

`admin.edit` says where a row is edited: `"page"`, its document's page, by default, or `"drawer"`, a drawer over the table, saved live, which takes no drafts and no areas. Each table of the collection, on whichever route, edits its rows so:

```ts
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

The start fails on a column naming no field, a `richtext` field or one that is no scalar column, a column shown twice, a `defaultSort` naming no sortable column of the table, a filter that is no `select` or `boolean` field, is named `q`, `order`, `status` or `offset`, or repeats, and a drawer for a collection with drafts or areas. A singleton takes neither key, as its sections are edited from its cards.

## A collection's form sections

`admin.sections` lays out a collection's form, and every field and every area sits in exactly one of its sections. A section has a `key`, unique in the collection, and a `label`, its heading; a section without one draws its fields with no heading, such as the one section of a small form, while a singleton's sections need one, as it titles their card and drawer. A section lists its `fields`, in the order shown, and the `areas` drawn after them, and stands in the `main` column or, with `position: "side"`, beside it:

```ts
admin: {
  sections: [
    { key: "page", label: "Page", fields: ["title", "slug"] },
    { key: "content", label: "Content", fields: [], areas: ["sections"] },
    { key: "seo", label: "SEO", fields: ["seo_title", "og_image"], position: "side" },
  ],
}
```

A section lays out its own collection's fields and areas alone; a table of another collection stands on a route, beside the collection ("The Admin's routes"). A document's page draws a card per section under its header, which holds **Save**; a singleton draws a card per section, each in its column and edited in a drawer, on the route that shows it. The start fails on a collection without sections, a section without a `key` or with another section's, a section naming a `type` or a `collection`, and a field or an area in no section or in two. A block's card takes optional sections, without a `key`, and draws its fields in no section before them.

## Widgets in the plugin's pages

The plugin's pages have widget zones of their own, so you add a widget to them as you add one to any page of Medusa's Admin: a file in `src/admin/widgets/` that exports a component and a `defineWidgetConfig` naming the zone.

| Zone | Where the widget stands | Its `data` |
|---|---|---|
| `cms.route.details` | A route's page, under its collections | `CmsRouteWidgetData` |
| `cms.route.details.side` | The side column of a route's page | `CmsRouteWidgetData` |
| `cms.document.details` | A document's page, under its form | `CmsDocumentWidgetData` |
| `cms.document.details.side` | The side column of a document's page, under its status and history | `CmsDocumentWidgetData` |

Every route's page shares the two route zones, and every document's page the two document zones, so a widget checks the slug in its `data` and returns `null` on the pages it does not belong to. The page's Customize Layout arranges your widgets; the plugin's own sections stay where the config puts them.

What a widget gets as `data`, both types exported from `@mostrajs/cms/admin-extensions`:

- **`CmsRouteWidgetData`** - `route`, its `slug` and `label`, and `collections`, the collections the page shows in its order, each with its `slug`, its `labels` (`singular` and `plural`) and `singleton`. A singleton also carries its `document`, the document's columns, or `null` before its first save; a list carries none, so a widget that needs its documents reads them itself.
- **`CmsDocumentWidgetData`** - `collection`, its `slug` and `labels`, and `document`, the document's `id` and columns as its page read them. That is the stored row: for a published document with changes waiting, the published content, not the draft, and never what the editor is typing.

The labels are already in the editor's language. The document zones stand only on a document's own page: a row edited in a drawer has no zone, and a singleton's content is in its route's zones, through `collections[].document`. A widget stands outside the document's form and takes no part in its save.

The zones reach `defineWidgetConfig` through the package root's types, which declare them in Medusa's `InjectionZoneRegistry`. `medusa develop` and `medusa build` write `.medusa/types/augmentation-refs.d.ts` in your project, referencing the root types of each installed plugin, this one among them. Your Admin's TypeScript knows the zones once that file is in its program: if `src/admin/tsconfig.json` does not include it, add it, or the typecheck refuses `cms.document.details` as an unknown zone.

```json
{
  "include": [".", "../../.medusa/types/augmentation-refs.d.ts"]
}
```

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
