# Mostra

`@mostrajs/cms`

Mostra is a CMS for Medusa v2 that keeps your content in your store's own project. You define it as data models, editors manage it in the Admin, and the Store API serves it to your storefront.

Your content shares the store's database, Admin, users, and roles.

You don't host a separate CMS, and you don't copy product data between two systems.

## Features

- Content as Medusa data models in a module of your own, described by one typed config
- Admin screens under **Content**: tables with filters and sorting, forms in sections and tabs, editing on a page or in a drawer, and routes that group collections into pages
- Drafts and versions per collection: **Publish**, **Unpublish**, **Discard**, and a version history to restore from
- Singletons for one-of-a-kind content such as site settings
- Blocks in areas, ordered and nested, for page builders and repeated content
- Fields: text, number, boolean, date, select, combobox, text list, slug, URL, rich text, media, and relationships between collections
- Rich text edited with [Lexical](https://lexical.dev) and stored as Lexical JSON, with the formatting each field allows
- Media through Medusa's File Module, or a media provider of your own
- Server-side validation with Zod schemas, mirrored in the Admin, and your own rules at every write
- Admin extensions: your own field components, options loaded by a hook, and widgets in the plugin's pages
- The Admin in English and Polish, with the texts of your config translatable
- Store API for published documents, with field selection, filters, and lookup by slug
- Workflows exported for your own routes and subscribers

## Compatibility

- Medusa: `^2.22.7`, any 2.x release from 2.22.7
- Node.js: `>=22.22.0`

## Installation

```bash
npm install @mostrajs/cms
# or
yarn add @mostrajs/cms
```

## Basic setup

**1. A module with your content models.** Each collection's model carries the columns the plugin writes: `status`, `published_at`, `created_by`, and `updated_by`. [Models](./docs/models.md) covers what else a model needs.

```typescript
// src/modules/content/index.ts
import { MedusaService, Module, model } from "@medusajs/framework/utils"

export const ContentPage = model.define("content_page", {
  id: model.id({ prefix: "cntpage" }).primaryKey(),
  title: model.text().nullable(),
  slug: model.text().nullable(),
  status: model.enum(["draft", "published"]).default("draft"),
  published_at: model.dateTime().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})

class ContentModuleService extends MedusaService({ ContentPage }) {}

export const CONTENT_MODULE = "content"

export default Module(CONTENT_MODULE, { service: ContentModuleService })
```

**2. The CMS config.** It tells the plugin how editors edit each model and how the Store API serves it:

```typescript
// src/cms/config.ts
import { defineConfig } from "@mostrajs/cms"
import { z } from "@medusajs/framework/zod"
import { CONTENT_MODULE, ContentPage } from "../modules/content"

export const cmsConfig = defineConfig({
  module: CONTENT_MODULE,
  collections: [
    {
      slug: "page",
      model: ContentPage,
      drafts: true,
      labels: { singular: "Page", plural: "Pages" },
      admin: {
        useAsTitle: "title",
        sections: [{ key: "page", fields: ["title", "slug"] }],
      },
      fields: {
        title: { type: "text", label: "Title", serverValidation: z.string() },
        slug: { type: "slug", label: "Slug", from: "title", serverPublishValidation: z.string() },
      },
    },
  ],
})
```

**3. Register both** in `medusa-config.ts`:

```typescript
import { cmsConfig } from "./src/cms/config"

module.exports = defineConfig({
  // ...
  modules: [{ resolve: "./src/modules/content" }],
  plugins: [
    {
      resolve: "@mostrajs/cms",
      options: { config: cmsConfig },
    },
  ],
})
```

**4. Create the tables** of your module and of the plugin:

```bash
npx medusa db:generate content
npx medusa db:migrate
```

The pages appear under **Content** in the Admin, and the Store API serves them at `/store/cms/page`.

The Admin shows a label written as a string the same in every language. To show it in the editor's language, give it a key with `translationKey`, as [Translations](./docs/translations.md) explains.

Continue with the guides under [Documentation](#documentation).

## Documentation

- [Models](./docs/models.md)
- [Collections, drafts and singletons](./docs/collections.md)
- [Blocks and areas](./docs/blocks.md)
- [Fields](./docs/fields.md)
- [Media](./docs/media.md)
- [Validation](./docs/validation.md)
- [The Admin](./docs/admin.md)
- [Field components](./docs/field-components.md)
- [Translations](./docs/translations.md)
- [Store API](./docs/store-api.md)
- [Workflows and events](./docs/workflows.md)
- [Development](./docs/development.md)
- [Tests](./docs/tests.md)

## Exports

- **`@mostrajs/cms`** - `defineConfig`, `translationKey`, `validateConfig`, the config types, the media providers (`FileMediaProvider`, `AbstractCmsMediaProvider`), the rich text features, and the document events
- **`@mostrajs/cms/workflows`** - the plugin's workflows and steps, for your own routes and subscribers
- **`@mostrajs/cms/admin-extensions`** - `defineCmsFieldComponent`, `defineCmsOptionsHook`, `useDocumentValue`, and `useBlockPlace`, with their types, for your Admin
- **`@mostrajs/cms/shared`** - code that runs on the server and in a browser, such as `sanitizeUrl`, `normalizeSlug`, and the rich text helpers

## License

MIT

## Author

Codee Team ([https://codee.dev](https://codee.dev))
