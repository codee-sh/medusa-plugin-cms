# Media

How media fields hold files, how the media provider stores and reads them, and how to write a provider of your own; the field's other options are in [Fields](./fields.md), and how a storefront reads the files is in [Store API](./store-api.md).

## What a media field is

A media field holds a file, or several, that the media provider stores. The field's column does not hold the file: it holds the value the provider reads the file back by, the record's `id` or its `url`, as the field's `stores` says. Every read - the Admin's and the store API's - asks the provider for the records and returns each record in place of its value.

There are two layers, and you set up each in its own place:

- **The provider** - `media.provider` in the CMS config - decides what a field can store, uploads a file, reads records back and, when it can, searches them. The plugin ships `FileMediaProvider`, and you can write your own.
- **The storage** is the provider's concern. `FileMediaProvider` hands files to Medusa's File Module, so where they end up - a local folder, S3 - is whatever file provider your `medusa-config.ts` sets up for the File Module.

## Setting up the provider

Name the provider once per config, in `media`. There is no default: a config with a media field and no `media.provider` fails at startup with `media "<field>" needs media.provider in the config`.

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

`resolve` is the provider's class, not an instance; `options` are handed to the class's `validateOptions` at startup and to its constructor. The CMS creates the provider in each workflow step that needs it, with that step's container.

### `FileMediaProvider`

`FileMediaProvider` stores files through Medusa's File Module and has no table of its own. A field holds the File Module's file key, so it takes `stores: "id"` only; a field with `stores: "url"` fails at startup with `stores "url", which file cannot read`.

| Option | Type | Default | What it does |
|---|---|---|---|
| `maxFileSize` | number, in bytes | 10 MB (`10485760`) | The largest upload. The upload route refuses a larger file, and the Admin's drop zone shows the limit and refuses a larger file before uploading. |
| `mimeTypes` | `string[]`, exact types or `type/*` | any type | The types an upload may have. The server refuses an upload of any other type with `The file type "<type>" is not allowed`. |

Both are checked at startup: `maxFileSize` must be a positive number, and `mimeTypes` a non-empty list of MIME types such as `image/png` or `image/*`. How `mimeTypes` here relates to a field's `admin.mimeTypes` is in [Fields](./fields.md#a-fields-config): the provider's list is the rule the server holds, and the field's list narrows what its picker offers.

A record from `FileMediaProvider` is `{ id, url }`: the File Module's key and the URL its file provider answers. An upload answers `filename`, `mime_type` and `size` too, but a later read cannot, as the File Module does not keep them. The URL is the file provider's: with S3 it can be a signed URL that expires, so a storefront should use the URL it reads and not keep a copy.

`FileMediaProvider` cannot be searched, as the File Module only finds a file by its key. The Admin offers upload only, with no library to choose from.

## Adding a media field

A media field is `type: "media"` with `stores`. One file sits on a text column; several sit on an array column with `multiple: true`, in the order the editor puts them, at most `max` of them when you set it.

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

A media field fits in a block's `fields` the same way. Whether it must be filled is a schema, as for any field: `serverValidation: z.string()` on a single file, `z.array(z.string())` on several - see [Validation](./validation.md).

The registry checks at startup that `stores` is `"id"` or `"url"` and one the provider can read, that a single field sits on a text column and a `multiple` one on an array column, and that `admin.mimeTypes`, when given, is a list of MIME types.

## What a read returns

A read puts each record in place of its stored value, in a document and in its blocks at any depth:

- **One file** comes as its record, or `null` when the provider found none for the stored value, such as a file deleted from storage.
- **Several files** come as a list of records in the stored order, without the values the provider found nothing for.
- **An empty field** stays `null`.

A record has `id` and `url` always, and `filename`, `mime_type`, `size` (in bytes) and `thumbnail_url` when the provider knows them. A provider may add keys of its own, and the store API returns them as they are:

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

A save checks that every media value the body sends has a record, and refuses one without at its field with `The file "<value>" was not found`. It does not check the file's type: a stored file need not carry one.

## The Admin's picker

Each media field shows a drop zone that lists the types the field takes and the provider's size limit, and refuses a file of another type or over the limit before uploading it. A field with `multiple` lists its files in order, with buttons to move and remove each, and stops taking files at `max`.

A file the editor drops or browses is uploaded when the document is saved, before the document is sent; the field then holds the new record's `id` or `url`. A file that fails to upload marks its field and stops the save. A file uploaded for a save that then fails for another reason stays in storage, and the next save uses it without uploading it again.

When the provider can be searched - it has `list` - the field shows **Choose from library** too, which opens the provider's records filtered to the field's types, with a search by file name and pages. An image previews from its `thumbnail_url`, or else its `url`; any other file shows as a document icon.

## The Admin's media routes

The picker uses two Admin routes. Both need an Admin session, as every route under `/admin` does; the store API has no media route, as a document's read already returns its records.

| Route | Takes | Answers |
|---|---|---|
| `POST /admin/cms/media` | `multipart/form-data` with one `file` | `{ media }`, the record the provider's `upload` answered. `400` for a body without a file, a file over `maxFileSize` (`The file is larger than <n> bytes`), or a type outside the provider's `mimeTypes`. |
| `GET /admin/cms/media` | `q`, `mime_type` (one or several, exact or `type/*`), `limit` (1 to 100, 10 by default), `offset` | `{ media, count, limit, offset }` from the provider's `list`. `400` when the provider has no `list`: `The file media provider cannot be searched`. |

Both answer `400` when the config names no media provider.

## Writing your own provider

Write a provider when your files live somewhere the File Module does not reach, or when you want a searchable library: a module of your own with an asset table, another plugin's media, an external service. Extend `AbstractCmsMediaProvider` and name your class in the config.

| Member | What it does |
|---|---|
| `static identifier` | A name for logs and errors, such as `"asset"`. Required. |
| `static stores` | What a field may store for this provider: `["id"]`, `["url"]` or both - what `retrieve` can read back by. Required, not empty. |
| `static validateOptions(options)` | Throws when `media.provider.options` are wrong; runs at startup. Accepts anything when you leave it out. |
| `constructor(container, options)` | Inherited: keeps the step's container as `this.container` and the options as `this.options`. Resolve the modules you need from `this.container`. |
| `get maxFileSize()` | The largest upload in bytes. Required; the upload route and the Admin's drop zone use it. |
| `get mimeTypes()` | The MIME types an upload may have, exact or `type/*`; `undefined`, the default, takes any type. |
| `retrieve(values, by)` | Reads the records whose `id` or `url` (`by`, the field's `stores`) is among `values`. Any order; leave out the values you found nothing for. |
| `upload(file)` | Stores `{ filename, mimeType, content }` - `content` is a `Buffer` - and answers the record. The CMS has already checked `mimeTypes` and `maxFileSize`. |
| `delete(media)` | Removes what `upload` stored. The CMS calls it only to undo an upload whose workflow failed. |
| `list(query)` | Optional. Searches the records for `{ q?, mime_type?, limit, offset }` and answers `{ media, count }`. A `mime_type` entry may be `type/*`. Without it the provider cannot be searched and the Admin offers upload only. |

A record you answer is a `CmsMedia`: `id` and `url`, and `filename`, `mime_type`, `size`, `thumbnail_url` and keys of your own when you have them. Answer only what a storefront may see, as the store API returns the record whole.

The example below reads records from a project module, `asset`, whose service `MedusaService` generated over an `Asset` model with `url`, `filename`, `mime_type`, `size` and `file_id`; the file itself goes to the File Module.

```ts
// src/cms/asset-media-provider.ts
import {
  AbstractCmsMediaProvider,
  type CmsMedia,
  type CmsMediaList,
  type CmsMediaListQuery,
  type CmsMediaStore,
  type CmsMediaUpload,
} from "@mostrajs/cms"
import { Modules } from "@medusajs/framework/utils"
import AssetModuleService, { ASSET_MODULE, type Asset } from "../modules/asset/service"

type AssetMediaProviderOptions = { maxFileSize?: number }

// Keeps what a storefront may see: not the file's key.
const toMedia = ({ id, url, filename, mime_type, size }: Asset): CmsMedia => ({
  id,
  url,
  filename,
  mime_type,
  size,
})

export class AssetMediaProvider extends AbstractCmsMediaProvider<AssetMediaProviderOptions> {
  static identifier = "asset"
  static stores: CmsMediaStore[] = ["id", "url"]

  static validateOptions(options: Record<string, unknown>): void {
    const { maxFileSize } = options

    if (maxFileSize !== undefined && (typeof maxFileSize !== "number" || maxFileSize <= 0)) {
      throw new Error('"maxFileSize" must be a positive number of bytes')
    }
  }

  get maxFileSize(): number {
    return this.options.maxFileSize ?? 5 * 1024 * 1024
  }

  get mimeTypes(): string[] {
    return ["image/*", "application/pdf"]
  }

  private get assets() {
    return this.container.resolve<AssetModuleService>(ASSET_MODULE)
  }

  async retrieve(values: string[], by: CmsMediaStore): Promise<CmsMedia[]> {
    const assets = await this.assets.listAssets({ [by]: values })

    return assets.map(toMedia)
  }

  async upload(file: CmsMediaUpload): Promise<CmsMedia> {
    const stored = await this.container.resolve(Modules.FILE).createFiles({
      filename: file.filename,
      mimeType: file.mimeType,
      content: file.content.toString("base64"),
      access: "public",
    })
    const asset = await this.assets.createAssets({
      url: stored.url,
      filename: file.filename,
      mime_type: file.mimeType,
      size: file.content.length,
      file_id: stored.id,
    })

    return toMedia(asset)
  }

  async delete(media: CmsMedia): Promise<void> {
    const [asset] = await this.assets.listAssets({ id: media.id })

    await this.assets.deleteAssets(media.id)
    if (asset) {
      await this.container.resolve(Modules.FILE).deleteFiles(asset.file_id)
    }
  }

  async list({ q, mime_type, limit, offset }: CmsMediaListQuery): Promise<CmsMediaList> {
    const filters: Record<string, unknown> = {}

    if (q) {
      filters.filename = { $ilike: `%${q}%` }
    }
    if (mime_type?.length) {
      // `image/*` matches every image type.
      filters.$or = mime_type.map((type) =>
        type.endsWith("/*")
          ? { mime_type: { $like: `${type.slice(0, -1)}%` } }
          : { mime_type: type }
      )
    }

    const [assets, count] = await this.assets.listAndCountAssets(filters, {
      take: limit,
      skip: offset,
    })

    return { media: assets.map(toMedia), count }
  }
}
```

Name it in the config. Its `stores` lists `"url"` too, so a field may store the URL:

```ts
// src/cms/config.ts
import { defineConfig } from "@mostrajs/cms"
import { AssetMediaProvider } from "./asset-media-provider"

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
  media: { provider: { resolve: AssetMediaProvider, options: { maxFileSize: 20 * 1024 * 1024 } } },
})
```

The registry checks the class by its shape at startup: it needs `retrieve`, `upload`, `delete` and `validateOptions`, a static `identifier`, and a static `stores` of `"id"`, `"url"` or both; `validateOptions` must accept the options. It does not call the provider then, so a provider that cannot reach its module fails at the first read or upload.

## Edge cases

- **Storing ids or URLs.** An id survives a change of domain or CDN; a URL needs no lookup when your provider can read by it. A signed URL that expires is no value to store; `FileMediaProvider` stores the File Module's key, the only thing the File Module reads a file by.
- **A file removed from storage** reads as `null` in a single field and drops out of a list; the document still reads, in the Admin and in the store API.
- **Changing the provider** does not move stored values. Values the new provider cannot read come back as `null` or drop out of lists, so move the files and their values with a script of your own first.
- **`mimeTypes` is checked against the type the client sends**, as the upload's `Content-Type`. It guards against a mistake, not against a crafted file.
