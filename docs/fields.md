# Fields

This page covers a field's config, every field type and its options, relationships, rich text, and how the plugin keeps text and links safe. Other pages cover the rest:

- Rules that span several fields are in [Validation](./validation.md).
- Inputs of your own are in [Field components](./field-components.md).
- Media fields and their providers are in [Media](./media.md).

## Field types at a glance

A field's `type` sets what the Admin shows and which column type the field needs in your model. When Medusa starts, the plugin checks the column of each field and refuses a field whose column has another type.

| `type` | Column | What the Admin shows |
|---|---|---|
| `text` | text | a one-line input |
| `textarea` | text | a multi-line input |
| `number` | number, float or bigNumber | a number input |
| `boolean` | boolean | a switch |
| `date` | dateTime | a date input (schemas and the APIs get the value as ISO text) |
| `select` | text or enum | a dropdown of the options listed in the config (see [below](#fields-that-pick-from-options)) |
| `combobox` | text or enum, or array with `multiple: true` | a searchable list of the options from the config or from a hook (see [below](#fields-that-pick-from-options)) |
| `text_list` | array | a list of texts, entered as chips |
| `slug` | text | an input that fills from the `from` field as the editor types. On an existing document, it stays locked until the editor unlocks it (`admin.lockOnEdit`, `true` by default). |
| `media` | text, or array with `multiple: true` | a picker of the files from the media provider (see [Media](./media.md)) |
| `url` | text | a link input checked against a link policy (see [Text, links and safe output](#text-links-and-safe-output)) |
| `richtext` | text, holding the document as JSON | a rich text editor (see [Rich text](#rich-text)) |
| `relationship` | the foreign key of a `belongsTo` | a text input for the id, or the combobox of your hook (see [Relationships](#relationships)) |

A `textarea` is a text field shown on several lines. Everything this page says about text fields applies to it too.

## A field's config

In the CMS config, the `fields` of a collection or a block make up its form:

```ts
// src/cms/config.ts, in a collection's or a block's fields
seo_title: {
  type: "text",
  label: "SEO title",
  serverValidation: z.string().max(70, "Use at most 70 characters").nullish(),
  serverPublishValidation: z.string(),
  admin: { recommendedLength: 60, placeholderFrom: "title" },
},
```

Each key of a field belongs to one group. Where the key sits in the field config tells you where it takes effect:

| Group | Keys | Where it works |
|---|---|---|
| Data rules, at the top | `type`, `label`, `options`, `from`, `multiple`, `max`, `stores`, `linkPolicy`, `features`, `relationTo` | The server enforces them on every save, and the Admin mirrors them for the editor. |
| Server functions, named `server*` | `serverValidation` and `serverPublishValidation` (Zod schemas), `serverTransform` (for a slug) | The server only. The Admin marks a field as required when the schemas require it, and shows their messages as the editor types. |
| Admin code, referenced by name | `options: { hook }`, and a layout node `{ type: "component" }` | Your own Admin code. The server checks only the type of the value. |
| Editor hints, under `admin` | `description`, `recommendedLength`, `placeholderFrom`, `lockOnEdit`, `mimeTypes` | The Admin only. Nothing here changes what the server accepts on a save. |
| Store API, under `store` | `hidden`, `filterable` | How the field behaves in the Store API (see [Store API](./store-api.md#a-fields-store-config)). |

When the Admin must act on a rule, such as a limit it enforces in the input, make it a data rule (`max`). When a message is enough, make it a schema.

### Required fields

The schemas also decide whether a field must be filled:

- **`serverValidation`** runs every time a document is saved, drafts included.
- **`serverPublishValidation`** also runs, but only when a document is published.

A schema gets the value of the field after the plugin has checked it against the field type (a date arrives as ISO text). When the field is empty, the schema gets `null`, so a schema that refuses `null` makes the field required. In the example above:

- `z.string()` makes the SEO title required to publish.
- `.nullish()` lets a draft leave it empty.

A format rule without `.nullish()` makes the field required on every save. The Admin shows this by dropping `(Optional)` from the label.

A field with no schema may stay empty. If the database requires the column, give the field a `serverValidation` that refuses `null`.

Every kind of field takes the schemas. The base schema depends on the value the field holds:

| Field | Schema |
|---|---|
| a select, a date, or a combobox or media field of one value | `z.string()` |
| a list | `z.array(z.string())` |
| a boolean | `z.boolean()` |
| a number | `z.number()` |

### The types a media field takes

- **`admin.mimeTypes`** sets the types that the picker of a media field offers and accepts, as exact types or `type/*`. Without it, the picker takes JPG, PNG, and WebP.
- **The server's rule** comes from the media provider. `FileMediaProvider` takes `mimeTypes` in its options and refuses an upload of any other type. Without `mimeTypes`, it accepts any type.

[Media](./media.md) covers the rest of a media field, including `stores` and the providers.

## Fields that pick from options

A `select` and a `combobox` let the editor pick a value from a list of options:

```ts
// src/cms/config.ts, in a collection's or a block's fields
image_position: {
  type: "select",
  label: "Image position",
  options: [
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
  ],
},
product_ids: {
  type: "combobox",
  label: "Products",
  multiple: true,
  max: 3,
  options: { hook: "products" },
},
```

| Type | Column | Options | In the Admin |
|---|---|---|---|
| `select` | text or enum | a list in the config | a dropdown, for a few options |
| `combobox` | text or enum, or array with `multiple: true` | a list in the config, or a hook | a list the editor searches while typing, loaded a page at a time. With `multiple`, the values show as chips, at most `max` of them. |

### Options from a hook

The config reaches the Admin as JSON, so it cannot hold a function. `options: { hook: "products" }` names a React hook that you register in your own Admin code.

The hook fetches the options in the browser, from any source: Medusa's API, your own routes, or a constant. The plugin ships no hook and adds no route for options.

1. Register the hook in a file of your own:

   ```ts
   // src/admin/cms/cms-extensions.ts
   import { defineCmsOptionsHook } from "@mostrajs/cms/admin-extensions"
   import { useProductOptions } from "./use-product-options"

   defineCmsOptionsHook("products", useProductOptions)
   ```

2. Import that file from `src/admin/cell-renderers.tsx`. Medusa runs this file when the Admin starts, before anything renders, so the hook is registered by the time a form opens. Medusa sets the file name, so use exactly this name, with the `.tsx` extension:

   ```tsx
   // src/admin/cell-renderers.tsx
   import "./cms/cms-extensions"
   ```

3. Write the hook. It gets the stored value and returns the options together with the state of the fetch. `useComboboxData` from the Medusa dashboard returns exactly that, and adds search, pages, and the label of the stored value:

   ```ts
   // src/admin/cms/use-product-options.ts
   import type { CmsOptionsHookInput } from "@mostrajs/cms/admin-extensions"
   import { useComboboxData } from "@medusajs/dashboard/hooks"
   import { sdk } from "../lib/client"

   export const useProductOptions = ({ value }: CmsOptionsHookInput) =>
     useComboboxData({
       queryKey: ["cms-options", "products"],
       queryFn: (params) => sdk.admin.product.list({ ...params, fields: "id,title" }),
       getOptions: (data) =>
         data.products.map((product) => ({ value: product.id, label: product.title })),
       defaultValue: value ?? undefined,
     })
   ```

### The hook's contract

If your hook does not use `useComboboxData`, it returns this shape. `@mostrajs/cms/admin-extensions` exports the type as `CmsOptionsHook`:

```ts
type CmsOptionsHook = (input: {
  // a text for a field of one value, a list with `multiple`, `null` when empty
  value: string | string[] | null
}) => {
  options: { value: string; label: string }[]
  isPending: boolean
  isError: boolean
  // with search
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  // with pages
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
}
```

### Storing a key other than the id

Your hook decides which value is stored. To store a handle instead of an id, register a second hook under another name, such as `product-handles`, that maps `value: product.handle`.

Pass `defaultValueKey: "handle"` to `useComboboxData` so that it finds the stored product by its handle. The params type of `useComboboxData` knows only `id`, so pass a params type that includes `handle`:

```ts
// src/admin/cms/use-product-handle-options.ts
import type { HttpTypes } from "@medusajs/framework/types"
import type { CmsOptionsHookInput } from "@mostrajs/cms/admin-extensions"
import { useComboboxData } from "@medusajs/dashboard/hooks"
import { sdk } from "../lib/client"

export const useProductHandleOptions = ({ value }: CmsOptionsHookInput) =>
  useComboboxData<
    HttpTypes.AdminProductListResponse,
    { handle?: string; q?: string; offset?: number; limit?: number }
  >({
    queryKey: ["cms-options", "product-handles"],
    queryFn: (params) => sdk.admin.product.list({ ...params, fields: "id,title,handle" }),
    getOptions: (data) =>
      data.products.map((product) => ({ value: product.handle, label: product.title })),
    defaultValueKey: "handle",
    defaultValue: value ?? undefined,
  })

// src/admin/cms/cms-extensions.ts
// ...
defineCmsOptionsHook("product-handles", useProductHandleOptions)
```

If you need several such hooks, a small factory of your own keeps them short. It takes the fields to fetch and a function that turns a record into an option.

### What the server checks

The server does not see where the hook gets its options. It checks only that the value is a text, or a list of texts no longer than `max`. It does not check that the product exists.

The Store API returns the stored ids. Your storefront fetches the records itself, in the stored order.

### When the options fall short

- **A hook name that no one registered** disables the field and shows `Options unavailable: no hook named "<name>" is registered`.
- **A hook that reports `isError` or throws** disables the field and shows `Could not load the options`.
- **A stored value that the options lack**, such as a deleted product, shows as its raw value, and the editor can remove it.

In the first two cases, the field still shows its value, and the rest of the form still saves.

## Relationships

A `relationship` field points at a document of another collection in your config, or of the same collection. The field sits on the foreign key of a `belongsTo` in your model:

- The field key is the name of that column, `<relation>_id`.
- `relationTo` names the collection under which the target model of the relation is registered.

```ts
// src/modules/content/models/page-settings.ts
export const PageSettings = model.define("page_settings", {
  id: model.id({ prefix: "pgset" }).primaryKey(),
  homepage: model.belongsTo(() => ContentPage, { mappedBy: "homepage_of" }).nullable(),
  // ...the columns every collection's model carries
})

// on ContentPage, the other side, which a belongsTo needs:
// homepage_of: model.hasMany(() => PageSettings, { mappedBy: "homepage" }),
```

```ts
// src/cms/config.ts, in the page_settings collection
fields: {
  homepage_id: {
    type: "relationship",
    relationTo: "page",
    label: "Homepage",
    options: { hook: "pages" },
  },
},
```

[Models](./models.md#relations-between-collections) explains how a model declares its relations.

### When a relationship stops Medusa from starting

Medusa does not start when it finds any of these:

- a relationship field that is not on the foreign key of a `belongsTo`
- a relationship field with no `relationTo`
- a `relationTo` that names a block, or a slug that is not a collection
- a `relationTo` that names a collection whose model is not the target of the relation
- a field of another type on a foreign key
- a required `belongsTo` with no relationship field, because no write could fill it
- a relationship field in a block

### What the field holds and what the server checks

The field holds the id of the target. When the relation is nullable and the field is empty, the field holds `null`. The server refuses an empty text. A field holds one document only.

Each of these refuses an id that names no live document of the `relationTo` collection, and shows the error at the field:

- creating a document
- saving a document
- publishing a document
- restoring a version
- the live validation in the Admin

A draft of the target counts as a live document, so an editor can pick it. To allow only published targets, list only those in your hook, and refuse a draft in a [`validate` hook](./validation.md#your-own-rules-at-a-write).

### In the Admin

- **With a hook.** With `options: { hook }`, the field shows the combobox of that hook, as in [Options from a hook](#options-from-a-hook). Register a hook that lists the documents of the target collection. It can read them from your own route or from the plugin's `GET /admin/cms/collections/<slug>/documents`, which takes `q`, `status`, `limit`, and `offset`.
- **Without a hook.** The field is a text input for the id. Either way, the server checks the value as a relation.
- **The target's title.** A read-only view and a table column show the `useAsTitle` field of the target. Without that field, they show the id. An id that no longer names a document shows as `<id> (not found)`.

### When the target is deleted or unpublished

The plugin lets you delete or unpublish a document that other documents point at, and leaves their keys as they are. Deleting is a soft delete, so the foreign key rule of the database never runs. The next write that still holds the id is refused at the field until the id is changed.

To keep a document in use from being deleted or unpublished, refuse both in a `validate` hook. To find what points at the document, use either of these:

- **`listCmsReferencesWorkflow`**, from `@mostrajs/cms/workflows`
- **The Admin route** `GET /admin/cms/collections/:collection/documents/:id/references`

Both return the live rows of any collection that point at the document, leaving out the document itself. For an unknown or deleted document, the route answers `404`. Otherwise it answers:

```json
{
  "references": [{ "collection": "page_settings", "field": "homepage_id", "id": "pgset_01..." }]
}
```

### What the Store API returns

The Store API returns the id as stored, under the field key. Your storefront reads the target from the store route of the target collection. That route serves only published documents, so treat a target that the storefront cannot read as missing.

## Text, links and safe output

On every save, the server refuses a text value that holds a control character (`U+0000` to `U+001F`, and `U+007F`). It shows the error at the field. This covers:

- text and textarea values
- list items
- media values
- combobox values from a hook
- the text in a rich text document

A textarea and a rich text document keep their tabs and line breaks. The server changes nothing else. It trims nothing and removes no HTML, because `a < b` is content.

> [!WARNING]
> Escape text where you show it (React does this for you), and never write it as HTML.

### Links in a url field

A link belongs in a `url` field, on a text column:

```ts
// src/cms/config.ts
import { defineConfig } from "@mostrajs/cms"

export const cmsConfig = defineConfig({
  // ...module, collections
  // every url field, unless it sets its own; this is the default
  linkPolicy: { protocols: ["http", "https", "mailto", "tel"], relative: true },
  blocks: [
    {
      slug: "hero",
      // ...model, labels
      fields: {
        cta_href: { type: "url", label: "Button link" },
        // its own links, each key over the config's
        partner_url: { type: "url", label: "Partner", linkPolicy: { protocols: ["https"], relative: false } },
      },
    },
  ],
})
```

A link policy is a `LinkPolicy`, exported from `@mostrajs/cms/shared`:

```ts
type LinkPolicy = {
  protocols: string[]
  relative: boolean
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `linkPolicy` in the config | `Partial<LinkPolicy>` | `http`, `https`, `mailto`, `tel`, and relative links | The links every `url` field takes, unless the field sets its own. |
| `linkPolicy` in a `url` field | `Partial<LinkPolicy>` | the config's | The links this field takes, each key overriding the same key of the config. |

A relative link starts with `/`, `#`, or `?`. The `linkPolicy` of the config applies to `url` fields only. Links in rich text follow their own policy, set on [the link feature](#links-in-rich-text).

### When a link is refused

The server refuses these at the field:

- a link with a space, a backslash, or a control character
- `//host`
- any scheme the policy does not list
- `javascript:`, `data:`, and `vbscript:`, always, because no policy may list them

A link that is already stored is returned as it is. The next save is refused until the link is fixed.

### Links in the storefront

In the storefront, pass every stored link through `sanitizeUrl`. It returns `#` for a link the policy refuses, such as one saved before the policy narrowed, or one written outside the plugin:

```tsx
import { sanitizeUrl } from "@mostrajs/cms/shared"

// a url field holds null when it is empty
{block.cta_href && <a href={sanitizeUrl(block.cta_href)}>{block.cta_label}</a>}
```

| Function | Returns | Description |
|---|---|---|
| `sanitizeUrl(url, policy?)` | the link, or `#` | Checks the link against the default policy, or against the policy you pass as the second argument. |
| `validateUrl(url, policy)` | `true` or the message | Checks a link against a policy. |
| `DEFAULT_LINK_POLICY` | a `LinkPolicy` | The default policy, as in the config above. |

> [!NOTE]
> `@mostrajs/cms/shared` loads in a browser, because it imports nothing from Medusa.

## Rich text

A `richtext` field holds formatted text. In the Admin, an editor writes it in a rich text editor built on [Lexical](https://lexical.dev):

```ts
// src/cms/config.ts, in a collection's or a block's fields
summary: { type: "richtext", label: "Summary" },
```

- **The column.** It is a text column (`model.text()`, not `.searchable()`) that holds the document as JSON, in the shape of the Lexical editor state.
- **What you read.** The Admin and the Store API give you the document as an object.
- **Where Lexical runs.** Lexical runs in the Admin only. The server checks a document against the features of its field without Lexical.
- **No HTML.** The plugin neither builds nor stores HTML, so your storefront renders the nodes of the document, as shown [below](#reading-rich-text-in-the-storefront).

A rich text field works in a collection and in a block. A table cannot show it as a column.

### Features

The features of a field set what the rich text editor offers and what the server accepts on a save. `@mostrajs/cms` exports a factory for each feature:

| Factory | Key | What it allows |
|---|---|---|
| `BoldFeature()` | `bold` | bold text |
| `ItalicFeature()` | `italic` | italic text |
| `HeadingFeature({ enabledHeadingSizes })` | `heading` | headings of the listed levels, from `h1` to `h6`, or all six when the option is left out |
| `UnorderedListFeature()` | `unorderedList` | bulleted lists, nested ones included |
| `OrderedListFeature()` | `orderedList` | numbered lists, nested ones included |
| `BlockquoteFeature()` | `blockquote` | quotes |
| `LinkFeature({ linkPolicy })` | `link` | links whose URL the policy allows |

Paragraphs, text, and line breaks need no feature.

### Where a field's features come from

A field takes the first of these that is set:

1. the field's own `features`
2. the config's `richText.features`
3. the built-in features, `DEFAULT_RICH_TEXT_FEATURES` from `@mostrajs/cms/shared` (every feature, headings `h2` to `h4`, and links by the default link policy)

| Option | Type | Default | Description |
|---|---|---|---|
| `richText.features` in the config | `RichTextFeature[]`, or a function of `{ defaultFeatures }` | the built-in features | The features of every rich text field in the config. |
| `features` in a field | `RichTextFeature[]`, or a function of `{ defaultFeatures, rootFeatures }` | the config's `richText.features` | The field's own features. |

- **A list** replaces the features it would otherwise fall back to.
- **A function** runs once, when Medusa starts. `defaultFeatures` holds the built-in features, and `rootFeatures` holds the features of the config.
- **When two features share a key**, the last one wins.

```ts
// src/cms/config.ts
import {
  BoldFeature,
  HeadingFeature,
  ItalicFeature,
  LinkFeature,
  defineConfig,
} from "@mostrajs/cms"

export const cmsConfig = defineConfig({
  // ...module, collections
  richText: {
    // the built-in features, with links to https and mailto only
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter(({ key }) => key !== "link"),
      LinkFeature({ linkPolicy: { protocols: ["https", "mailto"] } }),
    ],
  },
})
```

```ts
// in a collection's or a block's fields
summary: {
  type: "richtext",
  label: "Summary",
  // a list replaces the config's features
  features: [BoldFeature(), ItalicFeature(), LinkFeature()],
},
body: {
  type: "richtext",
  label: "Body",
  // the config's features, with two heading levels
  features: ({ rootFeatures }) => [
    ...rootFeatures.filter(({ key }) => key !== "heading"),
    HeadingFeature({ enabledHeadingSizes: ["h2", "h3"] }),
  ],
},
```

### When the features stop Medusa from starting

Medusa does not start when it finds any of these:

- a feature that is not one of the plugin's
- feature props that are not an object
- `enabledHeadingSizes` that is not a list of `h1` to `h6`
- a link policy that the plugin cannot use

### Links in rich text

A link in rich text follows the `linkPolicy` of its link feature. The `linkPolicy` of the config applies to `url` fields only.

Each key of the feature's policy replaces the same key of the default policy, which allows `http`, `https`, `mailto`, `tel`, and relative links.

> [!WARNING]
> `LinkFeature()` without a policy uses the default policy. This holds even in a field whose feature list replaces a narrower link feature from the config.

A link opens in the same tab, or in a new tab with `target: "_blank"`. The server checks a link in rich text by the same rules as a `url` field ([above](#text-links-and-safe-output)).

### When the server refuses a document

The server checks every document against the features of its field, without the rich text editor. When a document breaks a rule, the server refuses it at the field with the message of the first problem, and rewrites nothing. The server refuses a document that holds:

- a node of a type that no feature of the field allows, such as a heading in a field without `HeadingFeature`
- an element the plugin does not know, with `Remove the "<type>" element: this field does not allow it`
- a node inside a parent that cannot hold it, such as a list inside a heading
- a text format that the features of the field do not add (only bold and italic exist), or an inline style
- an alignment, or an indent outside a list item
- a heading of a level the field does not offer, or a link the policy refuses
- a control character in the text other than a tab or a line break

The plugin stores a document without text, such as an empty paragraph or only line breaks, as `null`. So, as for any field, a schema that refuses `null` makes the field required.

### Reading rich text in the storefront

The Store API returns the document as an object, in the node shapes of the Lexical editor. Render each node your storefront knows, and pass the `url` of every link through `sanitizeUrl` with the policy of the field.

```json
{
  "root": {
    "type": "root",
    "children": [
      {
        "type": "heading",
        "tag": "h2",
        "children": [{ "type": "text", "text": "Opening hours", "format": 0 }]
      },
      {
        "type": "paragraph",
        "children": [
          { "type": "text", "text": "Open ", "format": 0 },
          { "type": "text", "text": "every day", "format": 1 },
          { "type": "linebreak" },
          {
            "type": "link",
            "url": "/contact",
            "target": "_blank",
            "children": [{ "type": "text", "text": "Contact us", "format": 0 }]
          }
        ]
      },
      {
        "type": "list",
        "listType": "bullet",
        "children": [
          {
            "type": "listitem",
            "children": [{ "type": "text", "text": "Monday to Friday", "format": 0 }]
          }
        ]
      }
    ]
  }
}
```

The example shows the keys a storefront reads. Each node also carries keys that Lexical uses for itself, such as `version`.

| Node `type` | Keys to read |
|---|---|
| `root` | `children`, the blocks of the document |
| `paragraph` | `children` |
| `heading` | `tag` (the level) and `children` |
| `quote` | `children` |
| `list` | `listType` (`bullet` or `number`) and `children` (the `listitem` nodes) |
| `listitem` | `children` |
| `link`, `autolink` | `url`, `target`, and `children` |
| `linebreak` | none |
| `text` | `text` and `format` (bit `1` for bold, bit `2` for italic) |

The types `RichTextDocument` and `RichTextNode`, from `@mostrajs/cms/shared`, describe a document:

```ts
type RichTextNode = {
  type: string
  children?: RichTextNode[]
  [key: string]: unknown
}

type RichTextDocument = {
  root: RichTextNode & { type: "root"; children: RichTextNode[] }
}
```

`@mostrajs/cms/shared` holds the helpers below, which run in a browser.

### `parseRichText(value)`

Returns the document that a field holds:

```ts
import { parseRichText } from "@mostrajs/cms/shared"

const summary = parseRichText(page.summary)
```

- **A document** is returned as it is.
- **JSON from the column** is parsed into a document.
- **Plain text** becomes one paragraph per line. This also covers a column that held plain text before its field became a rich text field.
- **An empty text or `null`** gives `null`.

### Other rich text helpers

| Function | Returns | Description |
|---|---|---|
| `formatPlainText(document)` | a text | The text without formatting, one line per block and per list item (for a meta description, for example), or an empty text for `null`. |
| `isRichTextEmpty(document)` | a boolean | Whether a document holds no text. |
| `validateRichText(document, { features })` | `RichTextError[]`, each `{ path, message }` | The errors a save would return, each with the path to its node. |
| `findRichTextFeature(features, key)` | a feature, or `undefined` | The feature with that key, including its options. |
| `DEFAULT_RICH_TEXT_FEATURES` | a list of features | The built-in features. |
| `RICH_TEXT_HEADINGS` | a list of levels | The heading levels. |
