# Media

This page explains how a media field holds files, how the media provider stores and reads them, and how to write your own. The other options of a field are in [Fields](./fields.md), and [Store API](./store-api.md) shows how a storefront reads the files.

## What a media field is

A media field holds one file or several, and the media provider stores them. The column of the field does not hold the file itself. It holds the value the provider finds the file by: the `id` or the `url` of the file's record, as the field's `stores` option sets. A record is what the provider returns for a file, shown in [What a read returns](#what-a-read-returns).

When the Admin or the Store API reads a document, the plugin asks the provider for the records. The plugin then returns each record in place of the stored value.

Media has two layers, and you set up each one in its own place:

- **The provider**, set by `media.provider` in your config, decides what a field can store. It uploads a file, reads records back, and searches them when it can. The plugin ships `FileMediaProvider`, and you can write your own.
- **The storage** is up to the provider. `FileMediaProvider` hands files to Medusa's File Module. The file provider that your `medusa-config.ts` sets up for the File Module decides where the files end up, such as a local folder or S3.

## Setting up the provider

You name the provider once per config, in `media`. There is no default provider.

```ts
// src/cms/config.ts
import { defineConfig, FileMediaProvider } from "@mostrajs/cms"

export const cmsConfig = defineConfig({
  module: CONTENT_MODULE,
  collections: [/* ... */],
  media: {
    provider: {
      resolve: FileMediaProvider,
      options: {
        maxFileSize: 5 * 1024 * 1024,
        mimeTypes: ["image/*", "application/pdf"],
      },
    },
  },
})
```

`media` is a `MediaConfig`:

```ts
type MediaConfig = {
  provider: {
    resolve: MediaProviderClass
    options?: Record<string, unknown>
  }
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `provider.resolve` | the provider's class | none | The class of the provider, not an instance. |
| `provider.options` | object | - | Passed to the `validateOptions` method of the class at startup, and to the constructor. |

The plugin creates the provider in each workflow step that needs it, and passes it that step's container.

### When there is no provider

- **The config has a media field but no `media.provider`** - Medusa does not start, and reports `media "<field>" needs media.provider in the config`.

### `FileMediaProvider`

`FileMediaProvider` stores files through Medusa's File Module and has no table of its own. A field that uses it holds the file key from the File Module, so the field takes `stores: "id"` only.

| Option | Type | Default | Description |
|---|---|---|---|
| `maxFileSize` | number, in bytes | 10 MB (`10485760`) | The largest file an upload may have. The upload route refuses a larger file, and the Admin's drop zone shows the limit and refuses a larger file before uploading it. |
| `mimeTypes` | `string[]`, exact types or `type/*` | any type | The types a file may have. The server refuses a file of any other type with `The file type "<type>" is not allowed`. |

[Fields](./fields.md#a-fields-config) explains how this `mimeTypes` relates to the `admin.mimeTypes` of a field. The server enforces the provider's list. A field's list narrows what the field's picker offers.

### When `FileMediaProvider` stops Medusa from starting

At startup, the plugin checks both options and every field that uses the provider. Medusa does not start in these cases:

- **`maxFileSize` is not a positive number**
- **`mimeTypes` is not a non-empty list of MIME types**, such as `image/png` or `image/*`
- **A field has `stores: "url"`**, with the error `stores "url", but the media provider "file" stores only "id"`

### What `FileMediaProvider` returns

A record from `FileMediaProvider` holds the file key from the File Module and the URL that the file provider returns:

```json
{ "id": "team-01JD8Q2W.png", "url": "https://cdn.example.com/team-01JD8Q2W.png" }
```

The record returned for an upload also holds `filename`, `mime_type`, and `size`. When you read the document later, these keys are missing, as the File Module does not keep them.

> [!WARNING]
> The URL comes from the file provider. With S3, it can be a signed URL that expires. A storefront should use the URL it reads and not keep a copy.

You cannot search `FileMediaProvider`, as the File Module finds a file by its key only. With this provider, the Admin offers upload only, with no library to choose from.

## Adding a media field

A media field has `type: "media"` and a `stores` option. A field for one file sits on a text column. A field for several files has `multiple: true` and sits on an array column. The column keeps the files in the order the editor puts them.

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `"media"` | - | Makes the field a media field. |
| `stores` | `"id"` or `"url"` | - | What the column holds for a file, one that the provider can read. |
| `multiple` | boolean | - | Holds several files, on an array column, in the order the editor puts them. |
| `max` | number | no limit | The most files a `multiple` field holds. |
| `admin.mimeTypes` | `string[]` | see [Fields](./fields.md#a-fields-config) | The MIME types the picker of the field offers. |

```ts
// src/modules/content/models/content-page.ts
export const ContentPage = model.define("content_page", {
  // ...
  cover: model.text().nullable(),
  gallery: model.array().nullable(),
  brochure: model.text().nullable(),
})
```

```ts
// src/cms/config.ts, the collection's fields
fields: {
  // one file, on a text column
  cover: { type: "media", label: "Cover", stores: "id" },
  // several files, on an array column, at most 6
  gallery: { type: "media", label: "Gallery", stores: "id", multiple: true, max: 6 },
  // the picker offers PDF files only
  brochure: {
    type: "media",
    label: "Brochure",
    stores: "id",
    admin: { mimeTypes: ["application/pdf"] },
  },
},
```

You add a media field to the `fields` of a block the same way.

As with any field, a schema decides whether the field must be filled (see [Validation](./validation.md)):

- **A single file** - `serverValidation: z.string()`
- **Several files** - `serverValidation: z.array(z.string())`

### What the registry checks at startup

- **`stores`** is `"id"` or `"url"`, and one that the provider can read.
- **A field for one file** sits on a text column, and a `multiple` field sits on an array column.
- **`admin.mimeTypes`**, when given, is a list of MIME types.

## What a read returns

When you read a document, each record takes the place of its stored value, in the document and in its blocks at any depth:

- **One file** comes back as its record. It is `null` when the provider finds no record for the stored value, such as when the file was deleted from storage.
- **Several files** come back as a list of records in the stored order. The list leaves out the values the provider found no record for.
- **An empty field** stays `null`.

A record is a `CmsMedia`:

```ts
type CmsMedia = {
  id: string
  url: string
  filename?: string
  mime_type?: string
  /** The file's size in bytes. */
  size?: number
  thumbnail_url?: string
  [key: string]: unknown
}
```

A record always has `id` and `url`, and it has the other keys when the provider knows them. A provider may add keys of its own, and the Store API returns them unchanged. Here is a document as the Store API returns it:

```json
{
  "id": "cntpage_01JD8...",
  "title": "About us",
  "cover": { "id": "team-01JD8Q2W.png", "url": "https://cdn.example.com/team-01JD8Q2W.png" },
  "gallery": [
    { "id": "office-01JD8Q3A.jpg", "url": "https://cdn.example.com/office-01JD8Q3A.jpg" }
  ],
  "brochure": null
}
```

### When a media value is refused

When you save a document, the plugin checks that every media value in the request body has a record:

- **A value has no record** - the plugin refuses it at the field that holds it, with `The file "<value>" was not found`.

Saving does not check the file type, as a stored file need not carry one.

## The Admin's picker

In the Admin, each media field shows a drop zone:

- It lists the types the field takes and the size limit of the provider.
- It refuses a file of another type or over the limit before uploading it.
- For a `multiple` field, it lists the files in order, with buttons to move and remove each one. It stops taking files at `max`.

### When a file is uploaded

The Admin uploads a file that an editor drops or browses for when the editor saves the document, before it sends the document. The field then holds the `id` or `url` of the new record.

- **A file fails to upload** - the Admin marks the file's field and does not save the document.
- **Saving fails for another reason after the upload** - the file stays in storage. When the editor saves again, the Admin uses the file without uploading it again.

### The library

If the provider has a `list` method, it can be searched, and the field also shows **Choose from library**. **Choose from library** opens the provider's records, filtered to the types the field takes. The editor can search them by file name and go through them page by page.

An image shows a preview from its `thumbnail_url`, or from its `url` when there is none. Any other file shows as a document icon.

## The Admin's media routes

The picker uses two Admin routes. Like every route under `/admin`, both need an Admin session. The Store API has no media route, as reading a document already returns its records.

### `POST /admin/cms/media`

Uploads a file through the provider. The body is `multipart/form-data` with one `file`. The route returns the record that the provider's `upload` method returned:

```ts
{ media: CmsMedia }
```

### `GET /admin/cms/media`

Searches the provider's records through its `list` method.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | - | The search text. |
| `mime_type` | string, one or several | - | The MIME types to keep, exact or `type/*`. |
| `limit` | number, 1 to 100 | `10` | The number of records per page. |
| `offset` | number | - | The number of records to skip. |

The route returns a page of records:

```ts
{
  media: CmsMedia[]
  count: number
  limit: number
  offset: number
}
```

### When a media route fails

- **The config names no media provider** - `The CMS config names no media provider`, `400` from both routes.
- **The upload body holds no file** - `The body holds no "file"`, `400`.
- **The upload body cannot be parsed, for example because it holds a second file** - `The file could not be read: <reason>`, `400`.
- **The uploaded file is over `maxFileSize`** - `The file is larger than <n> bytes`, `400`.
- **The type of the uploaded file is outside the provider's `mimeTypes`** - `The file type "<type>" is not allowed`, `400`.
- **You search a provider without `list`** - `The media provider "file" does not support search`, `400`.

## Writing your own provider

Write a provider when your files live where the File Module does not reach, or when you want a library that editors can search. Such a place can be:

- a module of your own with an asset table,
- another plugin's media,
- an external service.

Extend `AbstractCmsMediaProvider` and name your class in the config.

### The members of a provider

| Member | What it does |
|---|---|
| `static identifier` | A name for logs and errors, such as `"my-media"`. Required. |
| `static stores` | The values a field may store for this provider, the ones `retrieve` can read by: `["id"]`, `["url"]`, or both. Required and not empty. |
| `static validateOptions(options)` | Runs at startup and throws when `media.provider.options` are wrong. When you leave it out, the provider accepts any options. |
| `constructor(container, options)` | Inherited. Keeps the step's container as `this.container` and the options as `this.options`. Resolve the modules you need from `this.container`. |
| `get maxFileSize()` | The largest upload, in bytes. Required. The upload route and the Admin's drop zone use it. |
| `get mimeTypes()` | The MIME types an upload may have, exact or `type/*`. The default, `undefined`, accepts any type. |
| `retrieve(values, by)` | Reads the records whose `id` or `url` is among `values`. `by` says which of the two, from the field's `stores`. Return the records in any order, and leave out the values you found no record for. |
| `upload(file)` | Stores a `CmsMediaUpload` and returns the record of the stored file. The plugin has already checked `mimeTypes` and `maxFileSize`. |
| `delete(media)` | Removes what `upload` stored. The plugin calls it only to undo an upload when the upload's workflow fails. |
| `list(query)` | Optional. Searches the records for a `CmsMediaListQuery` and returns a `CmsMediaList`. Without it, the provider cannot be searched, and the Admin offers upload only. |

### What a provider takes and returns

`upload` takes the file, with its `content` as a `Buffer`:

```ts
type CmsMediaUpload = {
  filename: string
  mimeType: string
  content: Buffer
}
```

`list` takes a search and returns a page of records. An entry of `mime_type` may be `type/*`.

```ts
type CmsMediaListQuery = {
  q?: string
  mime_type?: string[]
  limit: number
  offset: number
}

type CmsMediaList = {
  media: CmsMedia[]
  count: number
}
```

A record you return is a `CmsMedia`, as [What a read returns](#what-a-read-returns) shows. It always has `id` and `url`. Add `filename`, `mime_type`, `size`, `thumbnail_url`, and keys of your own when you have them.

> [!WARNING]
> Return only what a storefront may see, as the Store API returns the whole record.

### Naming your provider in the config

`resolve` takes the class. `options` reach the class's `validateOptions` method and `this.options`. A field may store a URL when the class's `stores` lists `"url"`:

```ts
// src/cms/config.ts
import { defineConfig } from "@mostrajs/cms"
import { MyMediaProvider } from "./my-media-provider"

export const cmsConfig = defineConfig({
  module: CONTENT_MODULE,
  collections: [
    {
      // ...
      fields: {
        cover: { type: "media", label: "Cover", stores: "url" },
      },
    },
  ],
  media: { provider: { resolve: MyMediaProvider, options: { maxFileSize: 20 * 1024 * 1024 } } },
})
```

### When the registry refuses a provider

At startup, the registry checks the shape of the class. It refuses a class:

- **without `retrieve`, `upload`, `delete`, or `validateOptions`**
- **without a static `identifier`**
- **without a static `stores`** of `"id"`, `"url"`, or both
- **whose `validateOptions` does not accept the options**

> [!NOTE]
> The registry does not call the provider at startup. If the provider cannot reach its module, it fails the first time a document is read or a file is uploaded.

## Edge cases

- **Storing ids or URLs.** An id survives a change of domain or CDN. A URL needs no lookup when your provider can read by it.
- **A signed URL that expires** is not worth storing. `FileMediaProvider` stores the file key, as the File Module reads a file by its key only.
- **A file removed from storage** reads as `null` in a single field and drops out of a list. The Admin and the Store API still read the document.
- **Changing the provider** does not move stored values. Values the new provider cannot read come back as `null` or drop out of lists. Move the files and their values with a script of your own first.
- **The server checks `mimeTypes` against the type the client sends**, the `Content-Type` of the upload. The check guards against a mistake, not against a crafted file.
