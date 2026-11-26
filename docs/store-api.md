# Store API

This page covers the store routes, which serve published documents to a storefront. It also covers the `store` config of a collection and of a field, which shapes what the routes answer. [Media](./media.md) covers media records, [Blocks](./blocks.md) covers blocks and areas, and [Workflows](./workflows.md) covers the workflows behind the routes.

## The routes

Every collection gets three read-only routes under `/store/cms`, addressed by the collection's `slug`:

| Route | Answers |
|---|---|
| `GET /store/cms/:collection` | One page of the collection's published documents, newest published first, as `documents`, `count`, `limit`, and `offset`. |
| `GET /store/cms/:collection/:id` | One published document by its id, as `document`. |
| `GET /store/cms/:collection/slug/:slug` | One published document by the value of the collection's `slug` field, as `document`. |

[What a document looks like](#what-a-document-looks-like) shows the answers.

### Only published documents

The Store API serves published documents only:

- A draft that was never published, an unpublished document, and a deleted document never appear in a list. Reading one of them by its id or slug answers `404`.
- If the collection has [drafts](./collections.md#drafts-and-versions) (`drafts: true`), the routes keep serving the published content of a document while a newer draft waits. When an editor publishes the draft, the routes serve the new content.

### Reading a singleton

You read a [singleton](./collections.md#singletons) through the list route:

```http
GET /store/cms/settings?limit=1
```

The document is `documents[0]`. It is absent until the document is first saved.

## The publishable API key

The routes sit under `/store`, so Medusa requires a publishable API key on every request, as for Medusa's own store routes.

- Send the key in the `x-publishable-api-key` header. Without the key, the route answers `400`.
- Create a key in the Admin under **Settings > Publishable API Keys**.

```bash
curl "http://localhost:9000/store/cms/page/slug/about-us" \
  -H "x-publishable-api-key: pk_..."
```

> [!NOTE]
> The plugin does not scope documents by the key's sales channels. Any valid key reads every collection in the Store API.

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

- **`id`, `published_at`, and `updated_at`.** Every answer carries `id`, whatever `fields` selects.
- **`metadata`.** It comes whole when the model has a `metadata` column, and as `null` when it is empty.
- **Every public field, under its name.** A field is public unless it has `store: { hidden: true }`. See [The form of each value](#the-form-of-each-value).
- **Each media field.** It comes as its media record in place of the stored value, as `null`, or as a list of records. See [Media](./media.md#what-a-read-returns).
- **Each area, on a single document.** It comes as a list of the area's blocks, in their order. See [Blocks in an area](#blocks-in-an-area).

### The form of each value

Each value comes as its column holds it:

| Field | Comes as |
|---|---|
| a date | ISO text |
| a list | an array |
| `select` or `combobox` | the stored value |
| `relationship` | the id of the related document, which you fetch with a request of its own when you need it |
| `richtext` | the rich text document, as an object and not a string |

### Blocks in an area

- Each block carries `id`, `block_type`, its public fields, and its own areas, nested to any depth.
- When an area no longer allows a block type, the routes leave out the blocks of that type. The server logs a warning with the ids of those blocks.

### What is never answered

The routes never answer what the plugin keeps for its own bookkeeping:

- `status`
- `created_by` and `updated_by`
- `created_at` and `deleted_at`
- a block's place in its area

### A list

The list route answers the same documents without their areas, unless `fields` asks for an area:

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

Every route takes `fields` in Medusa's syntax, as `/store/products` does:

| `fields` | Answers |
|---|---|
| left out | The defaults of the route: every public column on a list, and every public column and area on a single document. The collection's `store` config can set other defaults. |
| `title,slug` | Only these fields, plus `id`. |
| `+sections` | The defaults and the `sections` area. |
| `-metadata` | The defaults without `metadata`. |

The routes skip a hidden or unknown name without an error. If `internal_note` is hidden, `fields=title,internal_note` answers `id` and `title`:

```http
GET /store/cms/page/slug/about-us?fields=title,internal_note
```

```json
{ "document": { "id": "cntpage_01JD8Q0Z4V7K", "title": "About us" } }
```

### Selecting blocks in an area

To select blocks in an area, write a path of the area, the block type, and the field:

| `fields` | Answers |
|---|---|
| `sections` or `*sections` | The whole area, with every block type the area allows. Each block comes with its public fields and its areas. |
| `sections.hero` or `sections.hero.*` | The area's `hero` blocks, whole. Blocks of other types are left out. |
| `sections.hero.heading` | The area's `hero` blocks, with `heading` only. |
| `sections.grid.items.grid_item.title` | The `grid` blocks. In each one, the `items` area holds the `grid_item` blocks with `title` only. |

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

Medusa counts each level of a path against the store relations limit. For example, `sections.hero.heading` has two levels, and `sections.grid.items.grid_item.title` has four.

- The limit is your project's `http.storeRelationsLimit`, 3 by default.
- The routes answer `400` to a deeper block path until you raise the limit.
- Raise it for one collection with `storeRelationsLimit` in its [`store` config](#a-collections-store-config), or for every store route in `medusa-config.ts`.
- Selecting a whole area, `sections` or `*sections`, stays within the default.

## Paging, ordering and filtering

The list route takes:

| Parameter | Default | Description |
|---|---|---|
| `limit` | 20, or the collection's `store.list.defaultLimit` | Documents per page. At most 100, or at most 50 when `fields` selects an area. |
| `offset` | 0 | Documents to skip. |
| `order` | `-published_at` | A public column to sort by, with `-` in front for descending order, such as `order=title` or `order=-updated_at`. |
| `fields` | the route's defaults | See [Choosing fields](#choosing-fields). |
| a filterable field | - | Lists only the documents whose field matches, such as `featured=true` or `featured=false`. Only a field with `store: { filterable: true }` is a parameter. |

The id and slug routes take `fields` only.

```bash
curl "http://localhost:9000/store/cms/page?featured=true&order=title&limit=12&offset=12&fields=title,slug,cover" \
  -H "x-publishable-api-key: pk_..."
```

### When a list query is refused

- When `order` names a `richtext` field, an area, a hidden field, or anything that is not a column, the route answers `400`.
- When the query has any other key, including a filter on a field that is not filterable, the route answers `400`.

## A collection's `store` config

Every collection is in the Store API unless you keep it out. `store` takes `false` or an object, `CollectionStoreConfig`. The object follows Medusa's own `QueryConfig`, as `listProductQueryConfig` and `retrieveProductQueryConfig` do for products:

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
| `store` | `false` or `CollectionStoreConfig` | in the Store API | `false` keeps the collection out, and its routes answer `404` as for a collection that does not exist. |
| `list.defaults` | `string[]` | every public column | The fields a list answers when the request has no `fields`, from public fields and columns only, never an area. |
| `list.defaultLimit` | `number` | `20` | The page size of the list when the request has no `limit`, from 1 to 100. |
| `list.storeRelationsLimit` | `number` | your project's `http.storeRelationsLimit` | The relations limit of the list route. |
| `retrieve.defaults` | `string[]` | every public column and area | The fields the id and slug routes answer when the request has no `fields`. |
| `retrieve.storeRelationsLimit` | `number` | your project's `http.storeRelationsLimit` | The relations limit of the id and slug routes. |

> [!NOTE]
> There is no `allowed` key. The plugin derives what a client may select from the config: every public field, the columns of the document, and the paths into its areas.

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

### When the `store` config stops Medusa from starting

The plugin checks the `store` config at startup. Medusa does not start when:

- A `defaults` entry is not a public field: `store.list.defaults names "internal_note", which is not a public field`. For the id and slug routes, the message starts with `store.retrieve.defaults`.
- The defaults of a list include an area: `store.list.defaults names the area "<name>", and a list carries no areas by default`.
- A `defaultLimit` is outside 1 to 100: `store.list.defaultLimit must be a whole number from 1 to 100`.

## A field's `store` config

The `store` config of a field sets what the field does in the Store API, as `admin` sets what it does in the Admin. A field of a block takes `store` too.

```ts
// exported from @mostrajs/cms
type FieldStoreConfig = {
  hidden?: true
  filterable?: true
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `hidden` | `true` | public | Keeps the field out of every Store API answer. |
| `filterable` | `true` | not a parameter | Makes the field a parameter of the list route, such as `?featured=true`. Only a public `boolean` field of a collection takes it. |

When a field has `hidden: true`:

- `fields` cannot select the field.
- If the field belongs to a block, the blocks in the area come without it.
- The list route cannot sort by the field.

### When a filterable field stops Medusa from starting

Medusa does not start when the config has:

- a filterable field that is not a boolean
- a filterable field that is hidden
- any filterable field of a block

## Errors

Errors come in Medusa's shape, `{ type, message }`:

```http
GET /store/cms/pages
```

```json
{ "type": "not_found", "message": "Collection \"pages\" was not found" }
```

### When a request fails

- A request without a publishable API key, or with a key Medusa does not accept, gets `400`.
- A query key the route does not take gets `400`.
- A `limit` over 100 gets `400`, with `Use a limit of at most 100`.
- A filter value other than `true` or `false` gets `400`.
- An `order` the list cannot sort by gets `400`.
- Selecting an area on a list with a `limit` over 50 gets `400`.
- A path deeper than the relations limit gets `400`.
- An unknown collection, or one with `store: false`, gets `404`, with `Collection "<slug>" was not found`.
- Reading by id a document that is not published, deleted, or unknown gets `404`, with `Document "<id>" was not found in collection "<slug>"`.
- Reading such a document by slug gets `404`, with `Document with slug "<slug>" was not found in collection "<slug>"`.
- The slug route on a collection without a slug field gets `404`, with `Collection "<slug>" has no slug field`.
- When the config does not resolve, the route answers `500`, and the server log lists the problems.

## Edge cases

### Caching

When your project runs Medusa's Caching Module, the store routes read through it. Whenever the plugin saves, publishes, unpublishes, or deletes a document, it clears the cached answers that the change touched. A document you publish is then served on the next request. Without the module, the routes read the database on every request.

### Your own data on a document

By default, a client cannot select a path the plugin does not know, such as a module link of your own. Your own middleware on `/store/cms/*` can add the path to `req.allowed`, as for Medusa's own store routes. The plugin then reads that data with the document and answers it under the name of the path.

### Reading content in your own code

The routes run `listPublishedCmsDocumentsWorkflow` and `getPublishedCmsDocumentWorkflow`, which `@mostrajs/cms/workflows` exports. When your own route or subscriber runs them, it gets the same answer. See [Workflows](./workflows.md).

### Links in content

Pass every stored link through `sanitizeUrl` before you render it. See [Fields](./fields.md#text-links-and-safe-output).
