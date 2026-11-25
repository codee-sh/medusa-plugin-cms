# Store API

How a storefront reads published documents through the store routes, and how a collection's and a field's `store` config shape what they answer; media records are in [Media](./media.md), blocks and areas in [Blocks](./blocks.md), and the workflows behind the routes in [Workflows](./workflows.md).

## The routes

Every collection gets three read-only routes under `/store/cms`, named by its `slug`:

| Route | Answers |
|---|---|
| `GET /store/cms/:collection` | `{ documents, count, limit, offset }`: one page of the collection's published documents, newest published first. |
| `GET /store/cms/:collection/:id` | `{ document }`: one published document by its id. |
| `GET /store/cms/:collection/slug/:slug` | `{ document }`: one published document by the value of the collection's `slug` field. |

The store only ever sees published documents. A draft that was never published, an unpublished document and a deleted one answer `404` and are left out of every list. In a collection with `drafts: true`, a published document keeps answering its published content while a newer draft waits, and answers the new content once the draft is published.

A singleton is read through its list: `GET /store/cms/settings?limit=1`, then `documents[0]`, which is absent until the document's first save.

## The publishable API key

The routes sit under `/store`, so Medusa requires a publishable API key on every request, as it does for its own store routes. Send it in the `x-publishable-api-key` header; a request without one answers `400`. Create a key in the Admin under **Settings > Publishable API Keys**. The CMS does not scope documents by the key's sales channels: any valid key reads every collection the store may read.

```bash
curl "http://localhost:9000/store/cms/page/slug/about-us" \
  -H "x-publishable-api-key: pk_..."
```

With the Medusa JS SDK, set `publishableKey` once and call the routes with `sdk.client.fetch`, which sends the header for you:

```ts
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

type CmsDocument = { id: string; [field: string]: unknown }

const { document } = await sdk.client.fetch<{ document: CmsDocument }>(
  "/store/cms/page/slug/about-us"
)

const { documents, count } = await sdk.client.fetch<{
  documents: CmsDocument[]
  count: number
  limit: number
  offset: number
}>("/store/cms/page", {
  query: { fields: "title,slug,cover", featured: true, limit: 12 },
})
```

## What a document looks like

```json
{
  "document": {
    "id": "cntpage_01JD8Q0Z4V7K",
    "published_at": "2026-11-20T10:00:00.000Z",
    "updated_at": "2026-11-21T08:30:00.000Z",
    "metadata": null,
    "title": "About us",
    "slug": "about-us",
    "featured": true,
    "cover": { "id": "team-01JD8Q2W.png", "url": "https://cdn.example.com/team-01JD8Q2W.png" },
    "author_id": "cntauth_01JD8P9X2M",
    "sections": [
      {
        "id": "cnthero_01JD8Q5B",
        "block_type": "hero",
        "heading": "Who we are",
        "image": { "id": "hero-01JD8Q5C.jpg", "url": "https://cdn.example.com/hero-01JD8Q5C.jpg" }
      },
      {
        "id": "cntgrid_01JD8Q6D",
        "block_type": "grid",
        "items": [
          { "id": "cntitem_01JD8Q6E", "block_type": "grid_item", "title": "Since 1998" }
        ]
      }
    ]
  }
}
```

A document holds:

- **`id`, `published_at` and `updated_at`**; `id` is in every answer, whatever `fields` selects.
- **`metadata`**, whole, when the model has a `metadata` column; `null` when it is empty.
- **Every public field** - each field without `store: { hidden: true }` - by its name. A value comes as the column holds it: a date as ISO text, a list as an array, a `select` or `combobox` as the stored value, a `relationship` as the related document's id, which you read with its own request when you need it. A `richtext` field comes as its document, an object and not a string.
- **Each media field** as its record in place of the stored value, or `null`, or a list of records - see [Media](./media.md#what-a-read-returns).
- **Each area**, on a single document, as a list of its blocks in their order. A block has its `id`, its `block_type`, its public fields and its own areas, at any depth. A block of a type its area no longer allows is left out, and the server logs a warning with its id.

Nothing of the CMS's own bookkeeping is answered: not `status`, `created_by`, `updated_by`, `created_at` or `deleted_at`, and not a block's place in its area.

A list answers the same documents without their areas, unless `fields` asks for one:

```json
{
  "documents": [
    { "id": "cntpage_01JD8Q0Z4V7K", "title": "About us", "slug": "about-us", "cover": null }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

`count` is the number of published documents that match the filters, across all pages.

## Choosing fields

`fields` takes Medusa's syntax, as on `/store/products`, on every route:

| `fields` | Answers |
|---|---|
| left out | The route's defaults: every public column on a list, every public column and area on a single document, unless the collection's `store` config sets its own. |
| `title,slug` | Only these, with `id`. |
| `+sections` | The defaults and the `sections` area. |
| `-metadata` | The defaults without `metadata`. |

A name that is hidden or unknown is left out without an error, so `fields=title,internal_note` answers `id` and `title` when `internal_note` is hidden.

An area is selected by a path of the area, the block type and the field:

| `fields` | Answers |
|---|---|
| `sections` or `*sections` | The whole area: every block type it allows, each with its public fields and its areas. |
| `sections.hero` or `sections.hero.*` | The area's `hero` blocks, whole; the other block types are left out. |
| `sections.hero.heading` | The area's `hero` blocks with `heading` only. |
| `sections.grid.items.grid_item.title` | The `grid` blocks, each with its `items` area holding `grid_item` blocks with `title` only. |

A block always keeps its `id` and `block_type`. A path without a block type, such as `sections.heading`, selects nothing.

Medusa counts each level of a path against the store's relations limit: `sections.hero.heading` has two, `sections.grid.items.grid_item.title` four. The limit is your project's `http.storeRelationsLimit`, 3 by default, so a deep block path answers `400` until you raise it, for one collection with `storeRelationsLimit` in its `store` config or for every store route in `medusa-config.ts`. Selecting a whole area, `sections` or `*sections`, stays within the default.

## Paging, ordering and filtering

The list route takes:

| Parameter | What it does |
|---|---|
| `limit` | Documents per page: 20 by default, or the collection's `store.list.defaultLimit`; at most 100, and at most 50 when `fields` selects an area. |
| `offset` | Documents to skip; 0 by default. |
| `order` | A public column, with `-` in front for descending: `order=title`, `order=-updated_at`. `-published_at` by default. A `richtext` field, an area, a hidden field or anything that is not a column answers `400`. |
| `fields` | See [Choosing fields](#choosing-fields). |
| a filterable field | `featured=true` or `featured=false` lists only the documents whose field matches. Only a field with `store: { filterable: true }` is a parameter. |

Any other key answers `400`, a filter on a field that is not filterable included. The id and slug routes take `fields` only.

```bash
curl "http://localhost:9000/store/cms/page?featured=true&order=title&limit=12&offset=12&fields=title,slug,cover" \
  -H "x-publishable-api-key: pk_..."
```

## A collection's `store` config

Every collection is in the store API unless you keep it out. `store` takes `false` or an object, and follows Medusa's own `QueryConfig`, as `listProductQueryConfig` and `retrieveProductQueryConfig` do for products:

| Key | What it does |
|---|---|
| `store: false` | Keeps the collection out: its routes answer `404`, the same as for a collection that does not exist. |
| `list.defaults` | The fields a list answers without `fields`. Every public column when left out. Public fields and columns only, never an area. |
| `list.defaultLimit` | The list's page size without `limit`, from 1 to 100; 20 when left out. |
| `list.storeRelationsLimit` | The relations limit of the list, in place of your project's `http.storeRelationsLimit`. |
| `retrieve.defaults` | The fields the id and slug routes answer without `fields`. Every public column and area when left out. |
| `retrieve.storeRelationsLimit` | The relations limit of the id and slug routes, in place of your project's `http.storeRelationsLimit`. |

There is no `allowed` key: what a client may select is every public field, the document's columns and the paths into its areas, derived from the config.

```ts
{
  slug: "page",
  model: ContentPage,
  drafts: true,
  labels: { singular: "Page", plural: "Pages" },
  admin: {
    useAsTitle: "title",
    sections: [{ key: "page", fields: ["title", "slug", "featured", "internal_note", "cover"] }],
  },
  store: {
    // a list answers cards: no metadata, no dates
    list: { defaults: ["id", "title", "slug", "cover"], defaultLimit: 12 },
    // one page may select block paths five levels deep
    retrieve: { storeRelationsLimit: 5 },
  },
  fields: {
    title: { type: "text", label: "Title", serverPublishValidation: z.string() },
    slug: { type: "slug", label: "Slug", from: "title", serverPublishValidation: z.string() },
    featured: { type: "boolean", label: "Featured", store: { filterable: true } },
    internal_note: { type: "textarea", label: "Internal note", store: { hidden: true } },
    cover: { type: "media", label: "Cover", stores: "id" },
  },
}
```

```ts
// an Admin-only collection
{
  slug: "redirect",
  model: ContentRedirect,
  store: false,
  // ...
}
```

The registry checks the `store` config at startup and refuses a `defaults` entry that is not a public field (`store.list.defaults names "internal_note", which is not a public field`), an area among a list's defaults, and a `defaultLimit` outside 1 to 100.

## A field's `store` config

A field's `store` says what it does in the store API, as its `admin` says what it does in the Admin. A block's field takes it too.

| Key | What it does |
|---|---|
| `hidden: true` | Keeps the field out of every store answer: `fields` cannot select it, a block's field is left out of its area, and the list cannot order by it. Public when left out. |
| `filterable: true` | Makes the field a parameter of the collection's list: `?featured=true`. A collection's public `boolean` field only. |

The registry refuses at startup a filterable field that is not a boolean, one that is hidden, and any filterable field of a block.

## Errors

Errors come in Medusa's shape, `{ type, message }`:

| Status | When |
|---|---|
| `400` | No publishable API key, or one Medusa does not accept. A query key the route does not take, a `limit` over 100, a filter value that is not `true` or `false`, an `order` the list cannot sort by, an area on a list of more than 50, a path deeper than the relations limit. |
| `404` | An unknown collection, or one with `store: false`: `Collection "<slug>" was not found`. A document that is not published, deleted or unknown: `Document "<id>" was not found in collection "<slug>"`, or `Document with slug "<slug>" was not found in collection "<slug>"`. A slug route on a collection without a slug field: `Collection "<slug>" has no slug field`. |
| `500` | A config that does not resolve, with its problems in the server log. |

```json
{ "type": "not_found", "message": "Collection \"pages\" was not found" }
```

## Edge cases

- **Caching.** When your project runs Medusa's Caching Module, the store routes read through it, and every write the CMS makes - a save, a publish, an unpublish, a delete - clears what it touched, so a publish is served on the next request. Without the module every read goes to the database.
- **Your own data on a document.** A path the CMS does not know, such as a module link of your own, is not selectable by default. A middleware of yours on `/store/cms/*` can add it to `req.allowed`, as for Medusa's own store routes; the CMS then reads it with the document and answers it under its name.
- **Reading content in your own code.** The routes run `listPublishedCmsDocumentsWorkflow` and `getPublishedCmsDocumentWorkflow`, exported from `@codee-sh/medusa-plugin-cms/workflows`, so your own route or subscriber gets the same answer - see [Workflows](./workflows.md).
- **Links in content.** Pass every stored link through `sanitizeUrl` before you render it - see [Fields](./fields.md#text-links-and-safe-output).
