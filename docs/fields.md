# Fields

What a field's config holds, every type of field and its options, relationships, rich text, and how text and links are kept safe. Rules over several fields are in [Validation](./validation.md), an input of your own is in [Field components](./field-components.md), and media fields and their providers are in [Media](./media.md).

## Field types at a glance

A field's `type` says what the Admin shows and which column of your model it must sit on. The plugin checks the column at start and refuses a field whose column has another type.

| `type` | Column | What the Admin shows |
|---|---|---|
| `text` | text | a one-line input |
| `textarea` | text | a multi-line input |
| `number` | number, float or bigNumber | a number input |
| `boolean` | boolean | a switch |
| `date` | dateTime | a date input; a schema and the APIs get the value as its ISO text |
| `select` | text or enum | a dropdown of the options the config lists, see [below](#fields-that-pick-from-options) |
| `combobox` | text or enum; array with `multiple: true` | a searchable list of the config's options or a hook's, see [below](#fields-that-pick-from-options) |
| `text_list` | array | a list of texts, entered as chips |
| `slug` | text | an input built from its `from` field as the editor types, locked on an existing document until the editor unlocks it (`admin.lockOnEdit`, `true` by default) |
| `media` | text; array with `multiple: true` | a picker of the media provider's files, see [Media](./media.md) |
| `url` | text | a link input, checked against a link policy, see [Text, links and safe output](#text-links-and-safe-output) |
| `richtext` | text, holding the document as JSON | a rich text editor, see [Rich text](#rich-text) |
| `relationship` | a `belongsTo`'s foreign key | a text input of the id, or your hook's combobox, see [Relationships](#relationships) |

A `textarea` is a text field drawn in several lines; everything said about text fields holds for it.

## A field's config

A model's `fields` in the CMS config are its form. Every key of a field belongs to one group, and its place says where it works:

| Group | Keys | Where it works |
|---|---|---|
| Data rules, at the top | `type`, `label`, `options`, `from`, `multiple`, `max`, `stores`, `linkPolicy`, `features`, `relationTo` | The server enforces them on every save; the Admin mirrors them for the editor. |
| Server functions, named `server*` | `serverValidation` and `serverPublishValidation` (Zod schemas), `serverTransform` (a slug's) | The server only. The Admin marks a field the schemas require and shows their messages while the editor types. |
| Admin code, named | `options: { hook }`, and a layout node `{ type: "component" }` | Your own Admin; the server checks the value's type only. |
| Editor hints, under `admin` | `description`, `recommendedLength`, `placeholderFrom`, `lockOnEdit`, `mimeTypes` | The Admin only; nothing here changes what a save accepts. |
| Store API, under `store` | `hidden`, `filterable` | What the field does in the store API, see [Store API](./store-api.md#a-fields-store-config). |

A media field's `admin.mimeTypes` - exact types or `type/*`, JPG, PNG and WebP when left out - is what its picker offers and takes. The rule the server holds is the media provider's: `FileMediaProvider` takes `mimeTypes` in its options and refuses an upload of any other type, and takes any type without them. The rest of a media field, `stores` and the providers, is in [Media](./media.md).

```ts
seo_title: {
  type: "text",
  label: "SEO title",
  serverValidation: z.string().max(70, "Use at most 70 characters").nullish(),
  serverPublishValidation: z.string(),
  admin: { recommendedLength: 60, placeholderFrom: "title" },
},
```

The schemas also say whether a field must be filled. `serverValidation` runs at every save, a draft's included; `serverPublishValidation` runs besides it at a publish only. A schema gets the field's value, already checked against the field's type - a date as its ISO text - or `null` when the field is empty, so one that refuses `null` makes the field required: `z.string()` above makes the SEO title required to publish, and `.nullish()` lets a draft leave it empty. A format rule without `.nullish()` makes its field required at every save, which the Admin shows by dropping `(Optional)` from the label. A field with no schema may stay empty, and a column the database requires needs a `serverValidation` that refuses `null`. Every kind of field takes them: `z.string()` for a select, a single combobox or media and a date, `z.array(z.string())` for a list, `z.boolean()`, `z.number()`.

A rule the Admin must act on, such as a limit it enforces in the input, is a data rule (`max`). A rule a message is enough for is a schema.

## Fields that pick from options

| Type | Column | Options | In the Admin |
|---|---|---|---|
| `select` | text, enum | a list in the config | a dropdown, for a few options |
| `combobox` | text or enum; array with `multiple: true` | a list in the config, or a hook | searched as the editor types, a page at a time; chips with `multiple`, no more than `max` |

```ts
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

### Options from a hook

The config reaches the Admin as JSON, so it cannot hold a function. `options: { hook: "products" }` names a React hook that you register in your own Admin. The hook fetches the options in the browser, from any source: Medusa's API, your own routes, a constant. The plugin ships no hook and adds no route for options.

1. Register the hook in a file of your own:

   ```ts
   // src/admin/cms/cms-extensions.ts
   import { defineCmsOptionsHook } from "@codee-sh/medusa-plugin-cms/admin-extensions"
   import { useProductOptions } from "./use-product-options"

   defineCmsOptionsHook("products", useProductOptions)
   ```

2. Import that file from `src/admin/cell-renderers.tsx`. Medusa runs this file when the Admin starts, before anything renders, so the registration is in place when a form opens. The name is Medusa's and must be exactly this, with the `.tsx` extension:

   ```tsx
   // src/admin/cell-renderers.tsx
   import "./cms/cms-extensions"
   ```

3. Write the hook. It gets the stored value and returns the options with the state of fetching them. The dashboard's `useComboboxData` returns exactly that, with search, pages and the label of the value already stored:

   ```ts
   // src/admin/cms/use-product-options.ts
   import type { CmsOptionsHookInput } from "@codee-sh/medusa-plugin-cms/admin-extensions"
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

The hook's contract, for a hook that does not use `useComboboxData`:

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

What to know:

- **The mapping is yours.** To store a handle instead of an id, register a second hook under another name (`product-handles`) that maps `value: product.handle`, and pass `defaultValueKey: "handle"` to `useComboboxData`, so that it finds the stored product by its handle. Its type knows `id` only, so give it a params type with `handle`: `useComboboxData<HttpTypes.AdminProductListResponse, { handle?: string; q?: string; offset?: number; limit?: number }>`. A small factory of your own, taking the fields to fetch and a function from a record to an option, keeps several such hooks short.
- **The server does not see the hook's source.** It checks a hook's value as a text, or a list of texts no longer than `max`; it does not check that the product exists. The store API returns the stored ids, and the storefront fetches the records itself, in the stored order.
- **A name no one registered** disables its field with `Options unavailable: no source named "<name>" is registered`. A hook that reports `isError`, or throws, disables its field with `Could not load the options`. Either way the field shows what it holds, and the rest of the form saves.
- **A stored value the options lack**, such as a deleted product, shows as its raw value and can be removed.

## Relationships

A `relationship` field points at a document of another collection of your config, or of its own. It sits on the foreign key of a `belongsTo` in your model, so the field's key is that column, `<relation>_id`, and `relationTo` names the collection the relation's target model is registered under:

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

The start fails on a relationship that sits on no `belongsTo`'s foreign key, has no `relationTo`, names a block or a slug that is no collection, or names a collection whose model is not the relation's target. It also fails on another type of field on a foreign key, on a `belongsTo` the model requires with no relationship field, as no write could fill it, and on a relationship field in a block. How a model declares its relations is in [Models](./models.md#relations-between-collections).

- **What it holds.** The target's id, or `null` when the relation is nullable and the field is empty; an empty text is refused. A field holds one document.
- **What a write checks.** A create, a save, a publish, a restore and the Admin's live validation refuse an id that names no live document of `relationTo`, at the field. A draft of the target is a live document, so it may be picked. To allow published targets only, list only those in your hook and refuse a draft in a [`validate` hook](./validation.md#your-own-rules-at-a-write).
- **How the Admin picks.** With `options: { hook }` the field is drawn as that hook's combobox, as [above](#options-from-a-hook): register a hook that lists the target's documents, from your own route or the plugin's `GET /admin/cms/collections/<slug>/documents`, which takes `q`, `status`, `limit` and `offset`. Without a hook the field is a text input of the id. Either way the server checks the value as a relation.
- **How the Admin shows it.** A read-only view and a table column show the target's title, its `useAsTitle` field, or its id without one; an id that names no document any more shows as `<id> (not found)`.
- **When the target is deleted or unpublished.** The plugin refuses neither for a reference, and leaves the key as it is: a delete is a soft delete, so the database's foreign key rule never runs. The next write that holds the id is refused at the field until it is changed. To keep a document in use from going away, refuse its delete and unpublish in a `validate` hook, reading what points at it with `listCmsReferencesWorkflow` from `@codee-sh/medusa-plugin-cms/workflows`, or the Admin route `GET /admin/cms/collections/:collection/documents/:id/references`. Both answer the live rows that point at the document, of any collection, the document itself left out: `{ references: [{ collection, field, id }] }` from the route.
- **What the store API returns.** The id, as stored, under the field's key. The storefront reads the target from its own collection's store route, which serves published documents only, and treats one it cannot read as missing.

## Text, links and safe output

Every text value a save takes - a text, a textarea, a list item, a media value, a combobox value from a hook, the text in a rich text document - is refused at its field when it holds a control character (`U+0000` to `U+001F`, `U+007F`); a textarea and a rich text document keep their tabs and line breaks. Nothing else is changed: no trimming, and no HTML removed, as `a < b` is content. Escape text where you show it - React does - and never write it as HTML.

A link belongs in a `url` field, on a text column:

```ts
// src/cms/config.ts
import { defineConfig } from "@codee-sh/medusa-plugin-cms"

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

A relative link starts with `/`, `#` or `?`. A link with a space, a backslash or a control character, `//host`, and any scheme the policy does not list are refused at the field, `javascript:`, `data:` and `vbscript:` always, as no policy may list them. A link already stored is returned as it is, and its next save is refused until it is fixed. The config's `linkPolicy` is the `url` fields'; links in rich text follow their own, set on [the link feature](#links-in-rich-text).

In the storefront, pass every stored link through `sanitizeUrl`, which answers `#` for one the policy refuses - a link saved before the policy narrowed, or written around the plugin. It checks against the default policy, or against the one you pass as its second argument:

```tsx
import { sanitizeUrl } from "@codee-sh/medusa-plugin-cms/shared"

<a href={sanitizeUrl(block.cta_href)}>{block.cta_label}</a>
```

`./shared` loads in a browser: it imports nothing of Medusa. `validateUrl(url, policy)` answers `true` or the message, and `DEFAULT_LINK_POLICY` is the policy above.

## Rich text

A `richtext` field is formatted text, edited in a rich text editor. It sits on a text column (`model.text()`, not `.searchable()`), which holds the editor's document as JSON; the Admin and the store API hand the document to you as an object. Nothing builds or stores HTML: your storefront renders the document's nodes.

```ts
summary: { type: "richtext", label: "Summary" },
```

A rich text field works in a collection and in a block. A table cannot show it as a column.

### Features

What the editor offers, and what a save accepts, is the field's features. Each one is made by a factory exported from `@codee-sh/medusa-plugin-cms`:

| Factory | Key | What it allows |
|---|---|---|
| `BoldFeature()` | `bold` | bold text |
| `ItalicFeature()` | `italic` | italic text |
| `HeadingFeature({ enabledHeadingSizes })` | `heading` | headings of the levels listed, `h1` to `h6`; all six when left out |
| `UnorderedListFeature()` | `unorderedList` | bulleted lists, nested ones included |
| `OrderedListFeature()` | `orderedList` | numbered lists, nested ones included |
| `BlockquoteFeature()` | `blockquote` | quotes |
| `LinkFeature({ linkPolicy })` | `link` | links whose URL the policy allows |

Paragraphs, text and line breaks need no feature. A field without its own `features` takes the config's `richText.features`, and without those the built-in ones, `DEFAULT_RICH_TEXT_FEATURES` from `/shared`: every feature, headings `h2` to `h4`, and links by the default link policy.

`richText.features` sets them for every rich text field of the config, and a field's `features` sets its own. Each is a list, which replaces what it falls back to, or a function run once at start. The config's function gets `defaultFeatures`, the built-in ones; a field's gets `defaultFeatures` and `rootFeatures`, the config's. Of two features with one key, the last wins:

```ts
// src/cms/config.ts
import {
  BoldFeature,
  HeadingFeature,
  ItalicFeature,
  LinkFeature,
  defineConfig,
} from "@codee-sh/medusa-plugin-cms"

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

The start fails on a feature that is not one of the plugin's, on props that are not an object, on `enabledHeadingSizes` that is not a list of `h1` to `h6`, and on a link policy that cannot be used.

### Links in rich text

A link in rich text follows its link feature's `linkPolicy`, not the config's `linkPolicy`, which is the `url` fields'. Each key of the feature's policy replaces the default policy's - `http`, `https`, `mailto`, `tel` and relative links - so `LinkFeature()` with no policy takes the default one, even in a field whose list replaces a config's narrower link feature. A link opens in the same tab or, with `target: "_blank"`, in a new one. The rules of a link are those of a `url` field, [above](#text-links-and-safe-output).

### What a save checks

The server checks every document against its field's features, without the editor, and refuses one that breaks a rule at its field, with the first problem's message; nothing is rewritten. A document is refused for:

- a node of a type no feature of the field allows, such as a heading in a field without `HeadingFeature`, or an element the plugin does not know: `Remove the "<type>" element: this field does not allow it`;
- a node where its parent cannot hold it, such as a list inside a heading;
- a text format the field's features do not add - only bold and italic exist - or an inline style;
- an alignment, or an indent outside a list item;
- a heading of a level the field does not offer, or a link its policy refuses;
- a control character in the text other than a tab or a line break.

A document without text - an empty paragraph, or only line breaks - is stored as `null`, so a schema that refuses `null` makes the field required, as for any field.

### Reading rich text in the storefront

The store API returns the document as an object, `{ root: { type: "root", children: [...] } }`, in the node shapes of the Lexical editor: `paragraph`, `heading` with its `tag`, `quote`, `list` with its `listType` (`bullet` or `number`) and its `listitem`s, `link` and `autolink` with their `url` and `target`, `linebreak`, and `text` with its `text` and its `format`, bit `1` for bold and `2` for italic. Render each node your storefront knows, and pass every link's `url` through `sanitizeUrl` with the field's policy.

`@codee-sh/medusa-plugin-cms/shared` holds the helpers, which run in a browser:

- `parseRichText(value)` turns what a field holds into a document: a document as it is, the column's JSON parsed, plain text as one paragraph per line, or `null` for nothing. A column that held plain text before its field became rich text reads so too.
- `formatPlainText(document)` writes the text without its formatting, one line per block and per list item, such as for a meta description; an empty text for `null`.
- `isRichTextEmpty(document)` tells whether a document holds no text.
- `validateRichText(document, { features })` returns the errors a save would give, each with the path to its node.
- `findRichTextFeature(features, key)` finds a feature of one key with its options, and `DEFAULT_RICH_TEXT_FEATURES` and `RICH_TEXT_HEADINGS` are the built-in features and the heading levels. The types `RichTextDocument` and `RichTextNode` describe a document.
