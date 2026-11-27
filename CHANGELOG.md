# @mostrajs/cms

## 0.1.2

### Patch Changes

- [#17](https://github.com/mostrajs/cms/pull/17) [`d297ebd`](https://github.com/mostrajs/cms/commit/d297ebd4bf41798b7f54ddf318257fa8bfc56893) Thanks [@kriss145](https://github.com/kriss145)! - The Admin's forms, tabs and rich text editor look as intended in a project that installs the plugin from npm.

  **Fixes**
  - A form with tabs shows only the open tab's fields, where it showed every tab's fields at once.
  - The rich text editor keeps its height when empty, its redo button shows a mirrored arrow, and a quote shows its left border.
  - A link in the rich text editor takes Medusa's interactive colour on hover, in place of an underline the Admin never drew.
  - A block's sections are divided by a line, with none above the first.

- [#14](https://github.com/mostrajs/cms/pull/14) [`6d27584`](https://github.com/mostrajs/cms/commit/6d2758467d27349bb896ee3c78fec2941fe81582) Thanks [@kriss145](https://github.com/kriss145)! - The package's description on npm is shorter and matches the README: a CMS inside your Medusa v2 project, with content as data models, edited in the Admin and served by the Store API.

- [#16](https://github.com/mostrajs/cms/pull/16) [`83d6e94`](https://github.com/mostrajs/cms/commit/83d6e947768dbb524ec717a4cefc81ec084e71bd) Thanks [@kriss145](https://github.com/kriss145)! - `translationKey(key, options?)` names a translation as a text of the config, in place of a `({ t }) => t(key)` function of your own.

  **Features**
  - `translationKey` is exported from `@mostrajs/cms` and takes the options of `t`, `ns` included: `label: translationKey("page.singular")`.
  - The README's basic setup says that a label written as a string shows the same in every language, and links to the page on translations.

## 0.1.1

### Patch Changes

- [#12](https://github.com/mostrajs/cms/pull/12) [`5c11c9d`](https://github.com/mostrajs/cms/commit/5c11c9de9671d873047399219c505599d26d3319) Thanks [@kriss145](https://github.com/kriss145)! - Clearer error messages, and documentation that is easier to read.

  - **Messages.** These messages now say what is wrong in plainer words. If your code or tests match one of them, update the text:
    - `The media provider "<identifier>" does not support search`, when the Admin searches a provider without `list`
    - `media "<field>" stores "url", but the media provider "<identifier>" stores only "id"`, at startup
    - `admin "edit" needs "page" or "drawer"`, at startup
    - `admin "edit" "drawer" takes no "drafts: true", as a drawer shows no status and cannot publish`, at startup
    - `a singleton takes no "drafts: true", as its page shows no status, publish actions, or version history`, at startup
    - `field "<name>" is filterable, but only a boolean field can be filterable`, at startup
    - `Options unavailable: no hook named "<name>" is registered`, in the Admin, in English and Polish
  - **Documentation.** Every page is laid out for scanning, with options in tables, data shapes and responses in code blocks, and failures in lists, and it is written in plainer English. It now also covers the save checks of blocks, the startup checks of tables, singletons and store lists, the media routes' errors, and when `serverPublishValidation` runs.

## 0.1.0

### Minor Changes

- [#7](https://github.com/mostrajs/cms/pull/7) [`d325210`](https://github.com/mostrajs/cms/commit/d325210ae6e0dd261ea02fe711b0b747370a7b9e) Thanks [@kriss145](https://github.com/kriss145)! - The first release of Mostra as `@mostrajs/cms`: a CMS inside your Medusa v2 project, with content modelled as Medusa data models, edited in Medusa Admin and served through the store API.

  **Moving from `@codee-sh/medusa-plugin-cms`**

  - This is the plugin published as `@codee-sh/medusa-plugin-cms` up to `0.1.1`, under its new name; that package is deprecated. No data, table, route or config key changes.
  - Swap the package: `npm uninstall @codee-sh/medusa-plugin-cms` and `npm install @mostrajs/cms`.
  - Rename every import and the plugin's `resolve` in `medusa-config.ts` from `@codee-sh/medusa-plugin-cms` to `@mostrajs/cms`, its `/workflows`, `/admin-extensions` and `/shared` entry points with it, then delete `node_modules/.vite` before starting the Admin.

  **Features**

  - **Content model**
    - Collections and singletons as Medusa data models in a module of your own, described by one typed config
    - Blocks in areas, ordered and nested, for page builders and repeated content
    - Fields: text, number, boolean, date, select, combobox, text list, slug, URL, rich text, media and relationships between collections
  - **Editing in Medusa Admin**
    - Pages under **Content**: routes that group collections, tables with filters and sorting, forms in sections and tabs, editing on a page or in a drawer
    - Drafts and versions per collection: **Publish**, **Unpublish**, **Discard changes** and a version history to restore from
    - Rich text edited with Lexical, with the features you allow per field
    - Validation with Zod schemas on the server, mirrored in the form, and your own rules in a `validate` hook
    - Extensions: your own field components, options loaded by a hook, widgets in the plugin's pages
    - Admin texts in English and Polish, and your config's texts translatable
  - **Media**
    - Media fields over Medusa's File Module, or a media provider of your own
  - **Safe input**
    - Links checked against a link policy, `javascript:` and `data:` never allowed, control characters refused
  - **Store and backend**
    - Store API for published documents: a list, by id or by slug, with field selection, filters and paging
    - Admin API, workflows, steps and document events exported for your own routes and subscribers

  **Getting started**

  - `npm install @mostrajs/cms`
  - Write a module with your content models and a CMS config with `defineConfig`, and register the plugin with `options: { config }` in `medusa-config.ts`
  - Run `npx medusa db:generate <your module>` and `npx medusa db:migrate`
  - The whole setup is in the [README](https://github.com/mostrajs/cms/tree/v0.1.0#basic-setup)

  **Documentation**

  - [Models](https://github.com/mostrajs/cms/blob/v0.1.0/docs/models.md)
  - [Collections, drafts and singletons](https://github.com/mostrajs/cms/blob/v0.1.0/docs/collections.md)
  - [Blocks and areas](https://github.com/mostrajs/cms/blob/v0.1.0/docs/blocks.md)
  - [Fields](https://github.com/mostrajs/cms/blob/v0.1.0/docs/fields.md)
  - [Media](https://github.com/mostrajs/cms/blob/v0.1.0/docs/media.md)
  - [Validation](https://github.com/mostrajs/cms/blob/v0.1.0/docs/validation.md)
  - [The Admin](https://github.com/mostrajs/cms/blob/v0.1.0/docs/admin.md)
  - [Field components](https://github.com/mostrajs/cms/blob/v0.1.0/docs/field-components.md)
  - [Translations](https://github.com/mostrajs/cms/blob/v0.1.0/docs/translations.md)
  - [Store API](https://github.com/mostrajs/cms/blob/v0.1.0/docs/store-api.md)
  - [Workflows and events](https://github.com/mostrajs/cms/blob/v0.1.0/docs/workflows.md)

## Published as `@codee-sh/medusa-plugin-cms`

The same plugin, under its first name, up to `0.1.1`. That package is deprecated; `@mostrajs/cms` continues it.

### `@codee-sh/medusa-plugin-cms@0.1.1`

#### Patch Changes

- [#5](https://github.com/mostrajs/cms/pull/5) [`625f645`](https://github.com/mostrajs/cms/commit/625f6456142d782868a86fa9e95b648d1ac8d97a) Thanks [@kriss145](https://github.com/kriss145)! - The package holds the compiled plugin again. `0.1.0` was published without its build - only its type declarations - so Medusa could not load it; install `0.1.1` or later instead.

### `@codee-sh/medusa-plugin-cms@0.1.0`

#### Minor Changes

- [#1](https://github.com/mostrajs/cms/pull/1) [`2de6562`](https://github.com/mostrajs/cms/commit/2de65620c44e5e0f453a38f7dc119f674ba41419) Thanks [@kriss145](https://github.com/kriss145)! - The first public release: a CMS inside your Medusa v2 project, with content modelled as Medusa data models, edited in Medusa Admin and served through the store API.

  **Features**

  - **Content model**
    - Collections and singletons as Medusa data models in a module of your own, described by one typed config
    - Blocks in areas, ordered and nested, for page builders and repeated content
    - Fields: text, number, boolean, date, select, combobox, text list, slug, URL, rich text, media and relationships between collections
  - **Editing in Medusa Admin**
    - Pages under **Content**: routes that group collections, tables with filters and sorting, forms in sections and tabs, editing on a page or in a drawer
    - Drafts and versions per collection: **Publish**, **Unpublish**, **Discard changes** and a version history to restore from
    - Rich text edited with Lexical, with the features you allow per field
    - Validation with Zod schemas on the server, mirrored in the form, and your own rules in a `validate` hook
    - Extensions: your own field components, options loaded by a hook, widgets in the plugin's pages
    - Admin texts in English and Polish, and your config's texts translatable
  - **Media**
    - Media fields over Medusa's File Module, or a media provider of your own
  - **Safe input**
    - Links checked against a link policy, `javascript:` and `data:` never allowed, control characters refused
  - **Store and backend**
    - Store API for published documents: a list, by id or by slug, with field selection, filters and paging
    - Admin API, workflows, steps and document events exported for your own routes and subscribers

  **Getting started**

  - `npm install @codee-sh/medusa-plugin-cms`
  - Write a module with your content models and a CMS config with `defineConfig`, and register the plugin with `options: { config }` in `medusa-config.ts`
  - Run `npx medusa db:generate <your module>` and `npx medusa db:migrate`
  - The whole setup is in the [README](https://github.com/mostrajs/cms/tree/medusa-plugin-cms-v0.1.0#basic-setup)

  **Documentation**

  - [Models](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/models.md)
  - [Collections, drafts and singletons](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/collections.md)
  - [Blocks and areas](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/blocks.md)
  - [Fields](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/fields.md)
  - [Media](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/media.md)
  - [Validation](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/validation.md)
  - [The Admin](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/admin.md)
  - [Field components](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/field-components.md)
  - [Translations](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/translations.md)
  - [Store API](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/store-api.md)
  - [Workflows and events](https://github.com/mostrajs/cms/blob/medusa-plugin-cms-v0.1.0/docs/workflows.md)
