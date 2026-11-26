# Store API

How a storefront reads published documents through the store routes, and how a collection's and a field's `store` config shape what they answer. Media records are in [Media](./media.md), blocks and areas in [Blocks](./blocks.md), and the workflows behind the routes in [Workflows](./workflows.md).

## The routes

Every collection gets three read-only routes under `/store/cms`, named by its `slug`:

| Route | Answers |
|---|---|
| `GET /store/cms/:collection` | One page of the collection's published documents, newest published first, as `documents`, `count`, `limit` and `offset`. |
| `GET /store/cms/:collection/:id` | One published document by its id, as `document`. |
| `GET /store/cms/:collection/slug/:slug` | One published document by the value of the collection's `slug` field, as `document`. |

The answers are shown in [What a document looks like](#what-a-document-looks-like).

### Only published documents

The store only ever sees published documents:

- A draft that was never published, an unpublished document and a deleted one answer `404` and are left out of every list.
- In a collection with `drafts: true`, a published document keeps answering its published content while a newer draft waits. It answers the new content once the draft is published.

### Reading a singleton

A singleton is read through its list:

```http
GET /store/cms/settings?limit=1
```

The document is `documents[0]`, which is absent until the document's first save.

## The publishable API key

The routes sit under `/store`, so Medusa requires a publishable API key on every request, as it does for its own store routes.

- Send it in the `x-publishable-api-key` header. A request without one answers `400`.
- Create a key in the Admin under **Settings > Publishable API Keys**.

```bash
curl "http://localhost:9000/store/cms/page/slug/about-us" \
  -H "x-publishable-api-key: pk_..."
```

> [!NOTE]
> The CMS does not scope documents by the key's sales channels: any valid key reads every collection the store may read.

### With the Medusa JS SDK

Set `publishableKey` once and call the routes with `sdk.client.fetch`, which sends the header for you:

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

The id and slug routes answer one document under `document`:

```http
GET /store/cms/page/slug/about-us
```

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

- **`id`, `published_at` and `updated_at`.** `id` is in every answer, whatever `fields` selects.
- **`metadata`**, whole, when the model has a `metadata` column; `null` when it is empty.
- **Every public field** - each field without `store: { hidden: true }` - by its name. See [How a value comes](#how-a-value-comes).
- **Each media field** as its record in place of the stored value, or `null`, or a list of records - see [Media](./media.md#what-a-read-returns).
- **Each area**, on a single document, as a list of its blocks in their order. See [Blocks in an area](#blocks-in-an-area).

### How a value comes

A value comes as the column holds it:

| Field | Comes as |
|---|---|
| a date | ISO text |
| a list | an array |
| `select` or `combobox` | the stored value |
| `relationship` | the related document's id, which you read with its own request when you need it |
| `richtext` | its document, an object and not a string |

### Blocks in an area

- A block has its `id`, its `block_type`, its public fields and its own areas, at any depth.
- A block of a type its area no longer allows is left out, and the server logs a warning with its id.

### What is never answered

Nothing of the CMS's own bookkeeping is answered:

- `status`
- `created_by` and `updated_by`
- `created_at` and `deleted_at`
- a block's place in its area

### A list

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

A name that is hidden or unknown is left out without an error. So when `internal_note` is hidden, `fields=title,internal_note` answers `id` and `title`:

```http
GET /store/cms/page/slug/about-us?fields=title,internal_note
```

```json
{ "document": { "id": "cntpage_01JD8Q0Z4V7K", "title": "About us" } }
```

### Selecting blocks in an area

An area is selected by a path of the area, the block type and the field:

| `fields` | Answers |
|---|---|
| `sections` or `*sections` | The whole area: every block type it allows, each with its public fields and its areas. |
| `sections.hero` or `sections.hero.*` | The area's `hero` blocks, whole; the other block types are left out. |
| `sections.hero.heading` | The area's `hero` blocks with `heading` only. |
| `sections.grid.items.grid_item.title` | The `grid` blocks, each with its `items` area holding `grid_item` blocks with `title` only. |

- A block always keeps its `id` and `block_type`.
- A path without a block type, such as `sections.heading`, selects nothing.

```http
GET /store/cms/page/slug/about-us?fields=title,sections.hero.heading
```

```json
{
  "document": {
    "id": "cntpage_01JD8Q0Z4V7K",
    "title": "About us",
    "sections": [{ "id": "cnthero_01JD8Q5B", "block_type": "hero", "heading": "Who we are" }]
  }
}
```

### Deep paths and the relations limit

Medusa counts each level of a path against the store's relations limit: `sections.hero.heading` has two, `sections.grid.items.grid_item.title` four.

- The limit is your project's `http.storeRelationsLimit`, 3 by default.
- A deeper block path answers `400` until you raise the limit.
- Raise it for one collection with `storeRelationsLimit` in its [`store` config](#a-collections-store-config), or for every store route in `medusa-config.ts`.
- Selecting a whole area, `sections` or `*sections`, stays within the default.

## Paging, ordering and filtering

The list route takes:

| Parameter | Default | Description |
|---|---|---|
| `limit` | 20, or the collection's `store.list.defaultLimit` | Documents per page: at most 100, and at most 50 when `fields` selects an area. |
| `offset` | 0 | Documents to skip. |
| `order` | `-published_at` | A public column, with `-` in front for descending: `order=title`, `order=-updated_at`. |
| `fields` | the route's defaults | See [Choosing fields](#choosing-fields). |
| a filterable field | - | `featured=true` or `featured=false` lists only the documents whose field matches. Only a field with `store: { filterable: true }` is a parameter. |

The id and slug routes take `fields` only.

```bash
curl "http://localhost:9000/store/cms/page?featured=true&order=title&limit=12&offset=12&fields=title,slug,cover" \
  -H "x-publishable-api-key: pk_..."
```

### When a list query is refused

- `order` names a `richtext` field, an area, a hidden field or anything that is not a column - `400`.
- Any other key, a filter on a field that is not filterable included - `400`.

## A collection's `store` config

Every collection is in the store API unless you keep it out. `store` takes `false` or an object, `CollectionStoreConfig`. The object follows Medusa's own `QueryConfig`, as `listProductQueryConfig` and `retrieveProductQueryConfig` do for products:

```ts
import type { QueryConfig } from "@medusajs/framework/types"

// exported from @mostrajs/cms
type CollectionStoreConfig = {
  list?: Pick<QueryConfig<unknown>, "defaults" | "defaultLimit" | "storeRelationsLimit">
  retrieve?: Pick<QueryConfig<unknown>, "defaults" | "storeRelationsLimit">
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `store` | `false` or `CollectionStoreConfig` | in the store API | `false` keeps the collection out: its routes answer `404`, the same as for a collection that does not exist. |
| `list.defaults` | `string[]` | every public column | The fields a list answers without `fields`: public fields and columns only, never an area. |
| `list.defaultLimit` | `number` | `20` | The list's page size without `limit`, from 1 to 100. |
| `list.storeRelationsLimit` | `number` | your project's `http.storeRelationsLimit` | The relations limit of the list. |
| `retrieve.defaults` | `string[]` | every public column and area | The fields the id and slug routes answer without `fields`. |
| `retrieve.storeRelationsLimit` | `number` | your project's `http.storeRelationsLimit` | The relations limit of the id and slug routes. |

> [!NOTE]
> There is no `allowed` key: what a client may select is every public field, the document's columns and the paths into its areas, derived from the config.

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

### When the `store` config fails the start

The registry checks the `store` config at startup and refuses:

- A `defaults` entry that is not a public field: `store.list.defaults names "internal_note", which is not a public field`.
- An area among a list's defaults.
- A `defaultLimit` outside 1 to 100.

## A field's `store` config

A field's `store` says what it does in the store API, as its `admin` says what it does in the Admin. A block's field takes it too.

```ts
// exported from @mostrajs/cms
type FieldStoreConfig = {
  hidden?: true
  filterable?: true
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `hidden` | `true` | public | Keeps the field out of every store answer. |
| `filterable` | `true` | not a parameter | Makes the field a parameter of the collection's list: `?featured=true`. A collection's public `boolean` field only. |

With `hidden: true`:

- `fields` cannot select the field.
- A block's field is left out of its area.
- The list cannot order by it.

### When a filterable field fails the start

The registry refuses at startup:

- A filterable field that is not a boolean.
- A filterable field that is hidden.
- Any filterable field of a block.

## Errors

Errors come in Medusa's shape, `{ type, message }`:

```http
GET /store/cms/pages
```

```json
{ "type": "not_found", "message": "Collection \"pages\" was not found" }
```

### When a request fails

- No publishable API key, or one Medusa does not accept - `400`.
- A query key the route does not take - `400`.
- A `limit` over 100 - `400`.
- A filter value that is not `true` or `false` - `400`.
- An `order` the list cannot sort by - `400`.
- An area on a list of more than 50 - `400`.
- A path deeper than the relations limit - `400`.
- An unknown collection, or one with `store: false` - `Collection "<slug>" was not found`, `404`.
- A document that is not published, deleted or unknown, by its id - `Document "<id>" was not found in collection "<slug>"`, `404`.
- The same by its slug - `Document with slug "<slug>" was not found in collection "<slug>"`, `404`.
- A slug route on a collection without a slug field - `Collection "<slug>" has no slug field`, `404`.
- A config that does not resolve - `500`, with its problems in the server log.

## Edge cases

### Caching

When your project runs Medusa's Caching Module, the store routes read through it. Every write the CMS makes - a save, a publish, an unpublish, a delete - clears what it touched, so a publish is served on the next request. Without the module every read goes to the database.

### Your own data on a document

A path the CMS does not know, such as a module link of your own, is not selectable by default. A middleware of yours on `/store/cms/*` can add it to `req.allowed`, as for Medusa's own store routes. The CMS then reads it with the document and answers it under its name.

### Reading content in your own code

The routes run `listPublishedCmsDocumentsWorkflow` and `getPublishedCmsDocumentWorkflow`, exported from `@mostrajs/cms/workflows`. Your own route or subscriber gets the same answer - see [Workflows](./workflows.md).

### Links in content

Pass every stored link through `sanitizeUrl` before you render it - see [Fields](./fields.md#text-links-and-safe-output).
