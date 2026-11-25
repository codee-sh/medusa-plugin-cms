# @codee-sh/medusa-plugin-cms

## 0.1.1

### Patch Changes

- [#5](https://github.com/codee-sh/medusa-plugin-cms/pull/5) [`625f645`](https://github.com/codee-sh/medusa-plugin-cms/commit/625f6456142d782868a86fa9e95b648d1ac8d97a) Thanks [@kriss145](https://github.com/kriss145)! - The package holds the compiled plugin again. `0.1.0` was published without its build - only its type declarations - so Medusa could not load it; install `0.1.1` or later instead.

## 0.1.0

### Minor Changes

- [#1](https://github.com/codee-sh/medusa-plugin-cms/pull/1) [`2de6562`](https://github.com/codee-sh/medusa-plugin-cms/commit/2de65620c44e5e0f453a38f7dc119f674ba41419) Thanks [@kriss145](https://github.com/kriss145)! - The first public release: a CMS inside your Medusa v2 project, with content modelled as Medusa data models, edited in Medusa Admin and served through the store API.

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
  - The whole setup is in the [README](https://github.com/codee-sh/medusa-plugin-cms/tree/v0.1.0#basic-setup)

  **Documentation**

  - [Models](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/models.md)
  - [Collections, drafts and singletons](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/collections.md)
  - [Blocks and areas](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/blocks.md)
  - [Fields](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/fields.md)
  - [Media](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/media.md)
  - [Validation](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/validation.md)
  - [The Admin](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/admin.md)
  - [Field components](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/field-components.md)
  - [Translations](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/translations.md)
  - [Store API](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/store-api.md)
  - [Workflows and events](https://github.com/codee-sh/medusa-plugin-cms/blob/v0.1.0/docs/workflows.md)
