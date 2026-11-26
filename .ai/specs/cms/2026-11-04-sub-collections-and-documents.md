# CMS Collections and Documents

**Date:** 2026-11-04
**Status:** in_progress
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-04-sub-collections-and-documents.md`

## TLDR

The first working CMS, version 0.0.1 of the plugin (main spec D22). A host project writes its content
the Medusa way - a module with one model per collection, one area model and one model per block type, a
block's repeated items being blocks too, every value in a column, foreign keys and cascades from each row
up to its document - and registers those models in a config, every collection in the same shape. The plugin
reads their DML schema and provides the rest: validation, generic workflows writing a document with its
blocks, Admin API, a store API read with Medusa's `fields`, `order` and declared filters, and the Admin
**Content** screens where an editor edits, orders blocks, publishes and unpublishes. Permissions,
versions, draft reads, scheduling and translations come in later sub-specs.

**Paths.** A path starting with `src/` is in this repository. A path in a host project is named as such:
"the host project's `src/cms/config.ts`". The examples use a module named `content` and the models of
the first host project; the plugin names none of them.

## Problem

- Medusa has no content model. A project that needs editable pages builds one content type at a time,
  each with its own module, workflows, routes, Admin screens and storefront code, and the next project
  builds the same again.
- Editorial sections of a storefront often start as constants in its code, so changing a heading needs a
  deploy.

## Current State and Evidence

- Built in this repository (Phase 0, sub-phase 1.0, P1a.1 to P1a.5, P1c.1 and P1c.2), in the layout of
  [sub-lib-cleanup](./ended/2026-11-10-sub-lib-cleanup.md): `src/lib/` by domain - `config/` (the config
  types, `defineConfig`), `model/` (`describeModel`), `field/`, `area/`, `block/`, `collection/` (each
  with its `types.ts`, its `prepare-` and `validate-` functions), `registry/` (`prepareRegistry`,
  `validateConfig`, `getRegistry`, `getCollection`) and `document/` (the document schema, its errors,
  the stale-version message); the `cms` module holding the config,
  `GET /admin/cms/health`, the `list-cms-collections`, `list-cms-documents`, `create-cms-document`,
  `get-cms-document`, `update-cms-document`, `check-cms-taken-value` and `validate-cms-document`
  workflows with their steps, `GET /admin/cms/collections`, `GET` and `POST
  /admin/cms/collections/:collection/documents` and `.../documents/:id` behind `ensure-collection`
  (and `verify-document-body` on `POST`), `GET .../taken-values`, `POST .../validate`, and the
  Admin `/app/cms`, `/app/cms/:collection` with its `@create` modal and `/app/cms/:collection/:id`, with unit tests on models of their own and HTTP tests on the `Test*` models. The config passes the DML models and names their one module;
  the registry resolves collections, blocks and the area model, which it finds through the `areas` and `area` relations from P1c.3b (Registry resolution; repeaters and nesting come with 1d). A host project runs them through yalc:
  its config test, `validateConfig` on its real models, passes, and its user reads the collections through the Admin
  API.
- The generated `listAndCount<Plural>` takes `q` and searches the `.searchable()` columns with
  `ilike`, word by word; a model without one ignores it
  ([lesson](../../lessons/a-generated-list-method-searches-with-q.md)). The dashboard's `DataTable`
  writes a filter to the URL as JSON
  ([lesson](../../lessons/a-datatable-filter-reaches-the-url-as-json.md)), and calls `rowHref` with
  its own row, whose only field is `id`
  ([lesson](../../lessons/datatable-rowhref-gets-the-table-row-not-the-data.md)).
- A write that breaks a unique index answers 400: `dbErrorMapper` turns the violation into
  `INVALID_DATA` ("... already exists"), not `DUPLICATE_ERROR`
  ([lesson](../../lessons/a-unique-index-violation-answers-400-not-422.md)); so a 422 needs the value
  checked before the write. Medusa's `toHandle` keeps letters outside ASCII (`Żurek` gives `żurek`),
  which the slug format refuses; `normalizeSlug` drops the diacritics instead
  ([lesson](../../lessons/medusa-tohandle-keeps-letters-outside-ascii.md)).
- Medusa facts with their source lines are in the main spec's Evidence: `Model.parse()` and
  `property.parse()` describe every column and relation; `.cascades()`, `.checks()` and partial
  `.indexes()` exist on DML entities; generated method names come from the model key through `pluralize`;
  inside a workflow step a module service is a Proxy that returns every function property, `constructor`
  included, as a wrapper (`@medusajs/orchestration` 2.21.2 `dist/workflow/local-workflow.js:51-84`), so
  a class static of the service cannot be read there; a DML model passed in the plugin's options reaches
  the `cms` module unchanged (checked in a host project, 2026-11-08);
  translations are applied recursively through nested `query.graph` results.
- Errors: `DUPLICATE_ERROR` answers 422 and `INVALID_DATA` 400
  (`packages/core/framework/src/http/middlewares/error-handler.ts:73-80`); `UNEXPECTED_STATE` keeps its
  message and answers 500 (`@medusajs/framework` 2.21.2 `dist/http/middlewares/error-handler.js:81-82`);
  the handler answers `{ code, type, message }` and nothing else, so a list of field errors has to travel
  in `message`. Errors from `body-parser` keep their status, such as 413
  (`getHttpResponseFromError`, same file).
- Cache: a cached empty `query.graph` result carries no tag
  ([lesson](../../lessons/an-empty-cached-query-result-carries-no-tags.md)); module events reach the cache
  only after the workflow
  ([lesson](../../lessons/module-events-invalidate-the-cache-only-after-the-workflow.md)); the Redis
  provider does not overwrite a live key
  ([lesson](../../lessons/clear-a-cache-key-before-rewriting-it.md)).
- Store reads (main spec D20): `@medusajs/framework` 2.21.2 exports `prepareListQuery` from
  `@medusajs/framework/http`. `prepareListQuery(validated, { defaults, allowed, isList })` parses
  `fields`, drops what `allowed` does not cover without an error (`dist/http/utils/get-query-config.js`)
  and refuses an `order` outside `allowed`. A field is allowed only if its full path is listed:
  `categories` does not allow `categories.name` (`dist/http/utils/field-filtering/field-validator.js`).
  Its middleware wrapper `validateAndTransformQuery` takes a fixed schema and `defaults`, so it does not
  fit routes whose filters and defaults depend on `:collection`.
- Since 2.21.0 Medusa's Store routes keep a strict `allowed` list and `allowFields(...)` adds to it
  through `req.allowed` (`dist/http/middlewares/allow-fields-middleware.js`). `validateAndTransformQuery`
  merges `req.allowed` and runs `validateRelationsLimit` (default 3, `dist/http/utils/validate-query.js`);
  `prepareListQuery` alone does neither. Both functions are exported from `@medusajs/framework/http`.
- Relations: DML requires the other side of a `belongsTo` and of a `manyToMany`
  (`@medusajs/utils` `dist/dml/helpers/entity-builder/define-relationship.js:349,382`). Generated `create`
  and `update` methods take a `manyToMany` as an array of ids in the relation property, and `update`
  replaces the list ([Manage Relationships](https://docs.medusajs.com/learn/fundamentals/data-models/manage-relationships#manage-many-to-many-relationship));
  an empty array detaches all (`dist/dal/mikro-orm/mikro-orm-repository.js:187-228`).
- A model's key in `MedusaService({ ... })` has to be the PascalCase of its DML name
  ([lesson](../../lessons/a-model-key-in-medusaservice-must-match-its-dml-name.md)).
- Medusa loads a module's models only from the top of its `models/` folder
  ([lesson](../../lessons/medusa-loads-models-only-from-the-top-of-the-models-folder.md)).
- A soft delete and a restore walk cascades with `withDeleted: true`, so a restore also brings back rows
  deleted long before it ([lesson](../../lessons/a-cascading-restore-brings-back-rows-deleted-earlier.md)).
- A soft delete refuses a cycle of cascades across models: `page -> area -> grid -> item -> area` throws
  `Circular dependency detected` (checked by running `mikroOrmUpdateDeletedAtRecursively`, 2.21.2;
  [lesson](../../lessons/a-cycle-of-cascades-makes-every-soft-delete-throw.md)). So no block cascades
  to the area model, and an area inside one is not tied to it by a relation (main spec D26).
- `Model.parse()` returns `checks` and `indexes` as given, with `name` and `expression`, and `unique` and
  `where` (checked by running it on a DML model, 2.21.2). A partial unique index with a raw `where` on
  the area model generates a correct migration (checked in a host project).
- The foreign keys DML generates for `belongsTo` are `on delete cascade` (checked in a generated
  migration), which the plugin does not rely on: its deletes are soft.
- Media (main spec D29): the File Module's `FileDTO` is `{ id, url }`; `listFiles` takes ids only and fails whole when one is missing, as the local provider throws `NOT_FOUND` for a missing file while S3 signs any key; on
  S3 `retrieveFile` answers a signed URL that expires after `download_file_duration`, one hour by
  default, while the local provider answers its public URL (sources in the main spec's Evidence).
  Medusa's `/admin/uploads` reads files with `multer` in memory storage. The first host project's asset
  library - a drop zone that checks type and size before sending, a library modal stacked on a route
  modal, a select table with search and pages in local state, a picker field that uploads at once and
  holds `{ id, url, filename, thumbnail_url }` - is built only from `@medusajs/ui` and
  `@medusajs/dashboard` exports.
- A column named `metadata` is special: the internal service merges it as an object on `update`
  (`@medusajs/utils` `dist/modules-sdk/medusa-internal-service.js`, `mergeMetadata`) and translations skip
  it (`dist/translations/apply-translations.js`, `excludedKeys`). The merge removes a key sent as `""`,
  replaces a nested object whole instead of merging it (`dist/common/merge-metadata.js`), and an empty
  object changes nothing, because it runs only when `isPresent(update.metadata)`. A `text` column of that
  name would be corrupted on the first update.
- Option fields (main spec D18): `@medusajs/utils` 2.21.2 `dist/common/get-resolved-plugins.js:74-93`
  hands the plugin options object as given - no serialisation, so a function in it reaches the `cms`
  module; whether the module loader keeps a function unchanged is in Risks. `@mikro-orm/core` 6.6.14
  `enums.js:44-45` has `$overlap` and `$contains` for PostgreSQL arrays.
- `@medusajs/dashboard` 2.21.2 exports `Combobox` and `useComboboxData`; `Combobox` takes
  `value: string | string[]` and options `{ value, label, disabled? }` (`dist/components.d.ts:226-247`).
  A plugin's Admin cannot import a host project's components.

## Target Behavior

- A model added to the host project's module, related to the area model and registered in the config is
  editable under **Content** and served by the store API after the user's migration, with no CMS code
  written for it.
- Every value an editor fills is a column of a model; the only JSON an editor edits is `metadata`.
- Every block row has a foreign key to its area, and every area, at any depth, to exactly one document;
  deleting a document soft-deletes its areas and blocks through Medusa's cascades, at any depth.
- Any block can hold repeaters - areas inside it whose items are blocks - in any combination, through the
  config alone, down to `maxDepth` (main spec D32, D26).
- A save writes the document, its areas and its blocks at any depth as sent, or undoes what it wrote: a
  failed save leaves the document as it was.
- The plugin names no collection.
- A new document is a draft. Publishing checks every required field of the document and of its blocks
  at any depth, and fails with the path of each one missing. The store API never returns a draft.
- Saving a published document validates it as if publishing, and the change is live at once (main spec
  D8).
- Blocks keep their ids across saves; reordering changes only `rank`.
- A collection with `drafts: false` has no draft state: a document is published when created.
- The store API checks no customer: a project restricts it with its own middleware on `/store/cms/*`,
  which runs before the plugin's.
- Any authenticated admin may use the Admin routes (main spec D12).
- A store list returns documents without areas; a single document, by id or by slug, comes with its areas
  as ordered block lists, media fields and CMS relations populated one level, commerce references as ids.
  `fields` narrows or extends that as in Medusa, down to one field of one block type -
  `sections.hero.title` - on a list too; a list that names an area takes at most 50 documents (main spec
  D10).
- A store list filters only by the fields marked `store: { filterable: true }`, and sorts by `order`,
  newest published first by default.
- A field marked `store: { hidden: true }`, of a collection or a block, never reaches the store API.
- A relation to a registered collection is picked in Admin by searching the target's `useAsTitle`, or
  from its `options` when it has them, and only its owning side is a field.
- An options field offers the values its `options` list or function returns, shows their labels in Admin,
  accepts only those values on a write, and stores the values only. The store API returns the values and,
  when `filterable`, filters a list by them; it hides nothing by itself (main spec D18).
- A wrong config (unknown column, missing relation or cascade, duplicate prefix) makes every CMS route
  answer with a message naming the problem, and fails the host project's config test.
- The plugin imports nothing from a host project.

## Proposed Solution

### What a host project writes

**A collection model:**

```ts
// src/modules/content/models/content-page.ts
import { model } from "@medusajs/framework/utils"
import { ContentArea } from "./content-area"

export const ContentPage = model
  .define("content_page", {
    id: model.id({ prefix: "cntpage" }).primaryKey(),
    title: model.text().searchable().nullable(),
    slug: model.text().nullable(),
    markets: model.array().nullable(),                         // options field
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    metadata: model.json().nullable(),
    areas: model.hasMany(() => ContentArea, { mappedBy: "page" }),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .cascades({ delete: ["areas"] })
  // a slug unique in the collection
  .indexes([{ name: "IDX_content_page_slug_unique", on: ["slug"], unique: true, where: { deleted_at: null } }])
```

**The area model** - the one file that knows every collection and every block type:

```ts
// src/modules/content/models/content-area.ts
export const ContentArea = model
  .define("content_area", {
    id: model.id({ prefix: "cntarea" }).primaryKey(),
    name: model.text(),
    parent_id: model.text().nullable(),
    metadata: model.json().nullable(),
    page: model.belongsTo(() => ContentPage, { mappedBy: "areas" }).nullable(),
    blog_post: model.belongsTo(() => ContentBlogPost, { mappedBy: "areas" }).nullable(),
    block_heroes: model.hasMany(() => ContentBlockHero, { mappedBy: "area" }),
    block_grids: model.hasMany(() => ContentBlockGrid, { mappedBy: "area" }),
    block_grid_items: model.hasMany(() => ContentBlockGridItem, { mappedBy: "area" }),
  })
  .cascades({ delete: ["block_heroes", "block_grids", "block_grid_items"] })
  .checks([{ name: "CHK_content_area_owner", expression: "num_nonnulls(page_id, blog_post_id) = 1" }])
  .indexes([
    {
      name: "IDX_content_area_page_id_name_unique",
      on: ["page_id", "name"],
      unique: true,
      where: "page_id IS NOT NULL AND parent_id IS NULL AND deleted_at IS NULL",
    },
    {
      name: "IDX_content_area_blog_post_id_name_unique",
      on: ["blog_post_id", "name"],
      unique: true,
      where: "blog_post_id IS NOT NULL AND parent_id IS NULL AND deleted_at IS NULL",
    },
    {
      name: "IDX_content_area_parent_id_name_unique",
      on: ["parent_id", "name"],
      unique: true,
      where: "parent_id IS NOT NULL AND deleted_at IS NULL",
    },
  ])
```

Every area points at its document, at any depth. `parent_id` is the block it sits in - a repeater of that
block - and `null` at the top of the document (main spec D26, D32):

```text
id | page_id | parent_id | name
a1 | p1      | null      | sections   <- top of the page
a2 | p1      | cntg_7    | items      <- a grid's repeater
a3 | p1      | cntgi_4   | content    <- a grid item's repeater
```

**A block model, and a block with a repeater**, whose items are blocks of their own types - here grid
items and heroes:

```ts
// src/modules/content/models/content-block-hero.ts
export const ContentBlockHero = model
  .define("content_block_hero", {
    id: model.id({ prefix: "cnthero" }).primaryKey(),
    label: model.text().nullable(),
    title: model.text().nullable(),
    description: model.text().nullable(),
    image: model.text().nullable(),
    image_alt: model.text().nullable(),
    metadata: model.json().nullable(),
    area: model.belongsTo(() => ContentArea, { mappedBy: "block_heroes" }),
    rank: model.number().default(0),
  })
  .indexes([{ name: "IDX_content_block_hero_area_id_rank", on: ["area_id", "rank"], where: "deleted_at IS NULL" }])

// src/modules/content/models/content-block-grid.ts
export const ContentBlockGrid = model
  .define("content_block_grid", {
    id: model.id({ prefix: "cntg" }).primaryKey(),
    title: model.text().nullable(),
    metadata: model.json().nullable(),
    area: model.belongsTo(() => ContentArea, { mappedBy: "block_grids" }),
    rank: model.number().default(0),
  })
  .indexes([{ name: "IDX_content_block_grid_area_id_rank", on: ["area_id", "rank"], where: "deleted_at IS NULL" }])

// src/modules/content/models/content-block-grid-item.ts - a block type like any other
export const ContentBlockGridItem = model
  .define("content_block_grid_item", {
    id: model.id({ prefix: "cntgi" }).primaryKey(),
    label: model.text().nullable(),
    value: model.text().nullable(),
    metadata: model.json().nullable(),
    area: model.belongsTo(() => ContentArea, { mappedBy: "block_grid_items" }),
    rank: model.number().default(0),
  })
  .indexes([{ name: "IDX_content_block_grid_item_area_id_rank", on: ["area_id", "rank"], where: "deleted_at IS NULL" }])
```

The grid's model knows nothing of its items: the repeater is configured on the block (`repeaters`, The
config), its area row points at the grid through `parent_id`, and no relation ties them, as a cycle of
cascades would make every soft delete throw (main spec D26). Removing a grid removes its repeaters'
rows in the plugin (Reading and writing areas).

**A blog** - a collection with relations, and a dictionary collection:

```ts
export const ContentBlogPost = model
  .define("content_blog_post", {
    id: model.id({ prefix: "cntbpost" }).primaryKey(),
    title: model.text().searchable().nullable(),
    slug: model.text().nullable(),
    excerpt: model.text().nullable(),
    cover: model.text().nullable(),
    categories: model.manyToMany(() => ContentBlogCategory, { mappedBy: "posts", pivotTable: "content_blog_post_category" }),
    tags: model.manyToMany(() => ContentBlogTag, { mappedBy: "posts", pivotTable: "content_blog_post_tag" }),
    areas: model.hasMany(() => ContentArea, { mappedBy: "blog_post" }),
    // status, published_at, created_by, updated_by, metadata as on the page
  })
  .cascades({ delete: ["areas"] })

export const ContentBlogCategory = model.define("content_blog_category", {
  id: model.id({ prefix: "cntbcat" }).primaryKey(),
  name: model.text().searchable().nullable(),
  slug: model.text().nullable(),
  posts: model.manyToMany(() => ContentBlogPost, { mappedBy: "categories" }),  // other side, structure only
  // status, published_at, created_by, updated_by, metadata
})
```

**The service** is a plain `MedusaService`:

```ts
class ContentModuleService extends MedusaService({
  ContentPage, ContentArea, ContentBlockHero, ContentBlockGrid, ContentBlockGridItem,
}) {}
```

Each key is the PascalCase of the model's DML name, which Medusa requires; a model file is that name in
kebab-case, flat under `models/`. Migrations come from `npx medusa db:generate <module>`, run by the user.

**A media field** is a text column for one file, or an `array` column with `multiple: true` for
several, `type: "media"` in the config, holding each record's id or URL as its `stores` says; a read
returns the record in its place, under the column's name, and it needs no link (main spec D29). The
config names the
provider: the plugin's `FileMediaProvider`, over the File Module, and later one of the project's own over
its media library, such as:

```ts
// the host project's src/cms/asset-media-provider.ts
import { AbstractCmsMediaProvider, type CmsMedia } from "@mostrajs/cms"

export class AssetMediaProvider extends AbstractCmsMediaProvider {
  static identifier = "asset"
  static stores = ["id", "url"] as const

  async retrieve(values: string[], by: "id" | "url"): Promise<CmsMedia[]> { /* the asset module */ }
  async upload(file: CmsMediaUpload): Promise<CmsMedia> { /* the asset module's upload */ }
  async delete(id: string): Promise<void> { /* the asset module's delete */ }
  async list(query: CmsMediaListQuery): Promise<{ media: CmsMedia[]; count: number }> { /* search */ }
}
```

**Adding to the content model** - the same steps for every type, repeated in the README:

| To add | Model | Area model | Config |
|---|---|---|---|
| A collection without blocks | a new model | no change | an entry in `collections` |
| A collection with blocks | a new model with `areas` and its cascade | `belongsTo`, the `CHECK`, an index on `(<owner>, name)` | an entry with `areas` |
| A relation between collections | `belongsTo` or `manyToMany`, and its other side | no change | nothing; `fields` or `required` if wanted |
| A block type | a new model | `hasMany` and its cascade | an entry in `blocks`, its slug in an area |
| Repeaters in a block | no change | the unique index on `(parent_id, name)` for nested areas, once | `repeaters` on the block, each listing its block types |
| A media field | a nullable text column for one file, an `array` column for several | no change | `type: "media"` with `stores`, and `multiple: true` on an array; `media.provider` once per config |

**A `belongsTo` relation**, which the README shows: a page in one category is `category: belongsTo(...)`
on the page, `pages: hasMany(...)` on the category, and
`fields: { category_id: { type: "relationship", relationTo: "category", label: "Category" } }` in the config
(user, 2026-11-22). `belongsTo` gives one id, `category_id`, where `manyToMany` gives `category_ids`.

### What the plugin expects of a model

Every model may have `metadata: model.json().nullable()`, Medusa's convention. It holds presentation
settings, the values that say how a block looks and not what it says, such as `background` or
`padding_top`. It is not a field of the config, so the registry leaves it out of `fields`; the Admin edits
it as key-value rows on a document and a block, and the store API returns it whole. Its keys
are free: no config lists them. Content stays in columns (main spec D3), because `metadata` is not
translated and everything in it is public.

A collection model writes its state columns itself: `status`, `published_at`, `created_by`, `updated_by`.
The area model writes `name` and `parent_id`. Blocks write `rank`. The registry checks them.
The relations around the area model have fixed names too: what holds areas has `areas: hasMany(...)` to
the area model, and every block `area: belongsTo(...)` back, so its column is `area_id` (main spec D4,
user, 2026-11-10). The config does not name the area model; the registry reads it from those relations.

Content columns are nullable so a draft can be incomplete; each field says in the config what it needs:
`required: "always"` for every save, a draft's included, `required: "publish"` for a publish (user,
2026-11-09). A column made non-nullable without a default is required on every write.

### The config

Plain data except `serverTransform` functions and `serverValidation` schemas (main spec D6, D33), passed as
`plugins: [{ resolve: "@mostrajs/cms", options: { config } }]`:

```ts
// the host project's src/cms/config.ts
import { defineConfig, FileMediaProvider } from "@mostrajs/cms"
import { ContentBlockGrid, ContentBlockGridItem, ContentBlockHero, ContentBlogCategory, ContentPage } from "../modules/content/models"

const SECTIONS = { label: "Sections", blocks: ["hero", "grid"] }

const MARKETS = [{ value: "de", label: "Germany" }, { value: "pl", label: "Poland" }]

export const cmsConfig = defineConfig({
  module: "content",
  collections: [
    {
      slug: "page", model: ContentPage,
      labels: { singular: "Page", plural: "Pages" },
      admin: { useAsTitle: "title", defaultColumns: ["slug"] },
      fields: {
        title: { required: "always" },
        slug: { type: "slug", from: "title", required: "publish", store: { filterable: true } },
        seo_description: { input: "textarea" },
        markets: { type: "options", input: "checkboxes", options: MARKETS, store: { filterable: true } },
      },
      areas: { sections: SECTIONS },
    },
    {
      slug: "blog_category", model: ContentBlogCategory, drafts: false,
      labels: { singular: "Blog category", plural: "Blog categories" },
      admin: { useAsTitle: "name" },
      fields: { slug: { type: "slug", from: "name" } },
    },
  ],
  blocks: [
    {
      slug: "hero", model: ContentBlockHero,
      labels: { singular: "Hero", plural: "Heroes" },
      fields: {
        title: { required: "publish" },
        description: { type: "richtext", required: "publish" },
        image: { type: "media", label: "Image", stores: "id", required: "publish" },
        image_alt: { required: "publish" },
      },
    },
    {
      slug: "grid", model: ContentBlockGrid,
      labels: { singular: "Grid", plural: "Grids" },
      repeaters: {
        items: { label: "Items", blocks: ["grid_item", "hero"], minRows: 1 },
      },
    },
    {
      slug: "grid_item", model: ContentBlockGridItem,
      labels: { singular: "Grid item", plural: "Grid items" },
      fields: { label: { type: "text", label: "Label" }, value: { type: "text", label: "Value" } },
      repeaters: { content: { label: "Content", blocks: ["hero", "grid"] } },   // a grid inside a grid item, down to maxDepth
    },
  ],
  media: { provider: { resolve: FileMediaProvider } },
})
```

Every content type has the same core (main spec D19): `slug`, `model`, `labels`, `fields`.
`model` is the DML model itself, imported from the project's module. The config's one `module` names the
module whose service holds every model, each under its name (`ContentPage`), which Medusa requires, so
one service writes a document. A key of `fields` is a column, or a relation's id key
(`category_ids`). Config
types (`src/lib/config/types.ts`, no runtime imports - the Admin reads the same types):

| Type | Keys |
|---|---|
| `Config` | `module`, `collections`, `blocks?` (default `[]`), `media?`, `maxDepth?` (levels of areas, default 4) - no key for the area model, which the registry reads from the `areas` and `area` relations (user, 2026-11-10) |
| `CollectionConfig` | `slug` (snake_case, the API and Admin name), `model`, `labels`, `drafts?` (default true), `store?: false | { list?, retrieve? }` (main spec D20; left out, the collection is in the store with derived defaults; `list` and `retrieve` are parts of Medusa's `QueryConfig`: `defaults`, `defaultLimit` on `list`, `storeRelationsLimit`; user, 2026-11-18), `admin?: { useAsTitle?, defaultColumns?, description?, sections?: LayoutSectionConfig[] }`, `fields?: Record<column, FieldOverride>`, `areas?: Record<name, AreaConfig>` |
| `FieldGroup` | `label`, `description?`, `fields: string[]` (in the order shown), `areas?: string[]` (from 1c: the collection's areas shown in the section after its fields; user, 2026-11-09), `position?: "main" \| "side"` (default `main`) - a section of the Admin's form; it lays the fields out and stores nothing |
| `BlockConfig` | `slug` (the `block_type`), `model`, `labels`, `fields?`, `repeaters?: Record<name, AreaConfig>` - areas inside the block, whose items are blocks (main spec D32); replaces `lists` and the block's `areas` (user, 2026-11-12) |
| `AreaConfig` | `label`, `blocks: string[]`, `minRows?`, `maxRows?` |
| `FieldConfig` | the field a model's `fields` lists, in the form's order (main spec D28); where each key works is main spec D33. Data rules: `type` (`"text" \| "textarea" \| "number" \| "boolean" \| "date" \| "text_list" \| "select" \| "combobox" \| "slug" \| "media"`; later types below), `label`, `required?: "always" \| "publish"`, `options` (with `select`: `{ value, label }[]`; with `combobox`: that or `{ hook }`, main spec D18), `from` (slug source); with `type: "media"`, from 1f: `stores: "id" \| "url"` (what the column holds; a read returns the record in its place), `accept?` (MIME types, JPG, PNG and WebP when left out), `multiple?: true` (several files, on an `array` column) and `max?` (with `multiple`, the most files). Server functions: `serverValidation?` (a Zod schema a filled value must pass, e.g. `z.string().min(3)`, from `@medusajs/framework/zod`), `serverTransform?: (text) => string` (with `type: "slug"`, `normalizeSlug` by default; its result must pass the slug format). The Store API, under `store?` (main spec D20, user, 2026-11-18): `hidden?: true` (never in the store API, in a collection or a block) and `filterable?: true` (a query parameter of the list; moved from the field's top level on 2026-11-18). Editor hints, under `admin?`: `description`, with `text` and `textarea` `recommendedLength` and `placeholderFrom`, with `slug` `lockOnEdit` (default `true`: the document page shows the slug locked until the editor unlocks it). Renamed on 2026-11-12 from `validation`, `transform` and top-level hints (user); the done steps below keep the names they were built with |
| `OptionsInput` | `"select" \| "radio"` on a `text` column or a `belongsTo`, `"multiselect" \| "checkboxes"` on an `array` column or a `manyToMany` |
| `Option` | `value: string`, `label: string`, `description?`, `disabled?` - `value` is what is stored, `label` is only shown |
| `OptionsLoader` | `(container: MedusaContainer) => Option[] \| Promise<Option[]>` |
| `MediaConfig` | from 1f: `provider: { resolve, options? }` - `resolve` a class extending `AbstractCmsMediaProvider`, the plugin's `FileMediaProvider` or the project's own, `options` handed to its constructor and its `validateOptions`; no default (main spec D29). Replaces `MediaTarget` (`entity`, `labelField`, `thumbnailField?`, `allowedFields`) |

Each phase adds its keys to the types; the types of a later phase do not exist before it. Built-in
commerce targets: `product` (`title`), `product_category` (`name`), `product_collection` (`title`).

### How the plugin reads a model

`describeModel(model)` (`src/lib/model/describe-model.ts`, pure) maps `Model.parse().schema`
through `property.parse(name)`. Like the registry it grows with the steps: from P1a.1 it returns the
model's name, table and columns; the id prefix and unique indexes come with P1a.4, relations, cascades
and checks with 1c. The table is the target mapping:

| DML | CMS field |
|---|---|
| `id` | hidden; its prefix is collected for the duplicate check |
| `text` | text input (`input: "textarea"` for multi-line); `searchable` enables list search |
| `number`, `float`, `bigNumber` | number |
| `boolean` | switch |
| `dateTime` | date |
| `enum` | select with `dataType.options.choices` |
| `array` | list of texts |
| `text` / `array` with `type: "media"` | media picker |
| `text` / `array` with `type: "combobox"` and `options: { hook }` | a commerce reference, or any record a hook of the host's Admin finds (main spec D18) |
| `text` with `type: "richtext"` | Lexical editor; the value is a Lexical document ([sub-rich-text](./2026-11-17-sub-rich-text.md)) |
| `text` / `enum` with `type: "select"`, `text` / `enum` / `array` with `type: "combobox"` | one value, or several with `multiple`, from its `options` (main spec D18) |
| `belongsTo`, or `manyToMany` with `pivotTable`, to a registered collection | a document picker named `<relation>_id` / `<singular relation>_ids`, or an options field when it has `options`; populated in the store API |
| `hasMany` to a registered collection, `manyToMany` without `pivotTable` | the other side of a relation: structure, not a field |
| `areas` on a collection, `area` on a block, the area model's relations | structure, not fields |
| `json` | refused as a field; `metadata` is handled apart (above) |
| `created_at`, `updated_at`, `deleted_at`, CMS columns | not editable; refused as fields |

Only the columns a model's config lists in `fields` become fields, in the config's order; any other
column is no field, which the Admin does not show and a write refuses (main spec D28). Each field's
`type` and `label` come from the config, not from the table above, which now says which column a type
may sit on: `text`, `textarea`, `slug`, `media` and `select` on a text column (`select` also on an
enum, whose values bound its options), `number` on a number, `boolean` on a boolean, `date` on a date
and time, `text_list` on an array. Phase 3's options fields build on `select`.

A field is required **always** when its column is non-nullable without a default or its config says
`required: "always"`, **at publish** when its config says `required: "publish"`, which the registry
refuses on a column the model already requires, otherwise optional. A field with a `from` column is
filled by the server when empty, so a body is checked without requiring it (`beforeFill`) and the
filled document with it. Labels default to the column name in sentence case.

### Registry resolution

`prepareRegistry(config)` (`src/lib/registry/prepare-registry.ts`, pure) takes the config, whose entries carry
their DML models, and returns a frozen registry or throws at the first problem it finds, as Medusa's DML
does, with `The CMS config is invalid: <path>: <problem>` (user, 2026-11-10). It grows with the steps: each one resolves and checks only the keys it uses, and a key
of the config whose step has not come yet is accepted by the types and not resolved.

From P1a.1 it resolves collections - one collection in `src/lib/collection/prepare-collection.ts`, its fields in
`src/lib/field/prepare-fields.ts` - and checks:

- collection slugs snake_case and unique;
- each `model` a DML model; its name is the collection's service key in the config's `module`, the
  service the steps resolve; a service holding the model under another key fails at the first call;
- every key of `fields` names a column.

`metadata` and other `json` columns are left out of the fields.

Each later step or sub-phase adds the resolution and the rules of its keys:

- **P1a.3** - `useAsTitle` and `defaultColumns` name scalar columns, system and CMS columns included
  (`json` and `array` are not scalar); the collection records its scalar columns as `columns`, which
  `list-cms-documents` orders by and the projection carries;
- **P1a.4** - the checks the writes rely on: the document columns `status` (an enum of `draft` and
  `published`), `published_at`, `created_by` and `updated_by`; `metadata`, when present, a `json`
  column, because Medusa merges it as an object; `slug` on a text column
  with a text `from`; each model's id prefix, recorded as `idPrefix` and unique across the
  collections; the columns a unique index covers alone, through `.unique()` or `indexes`, recorded as
  `unique`; each slug field's function, its `serverTransform` (refused when not a function) or `normalizeSlug`,
  recorded as `slugTransforms` and left out of the projection, which tells only `default` or `custom`, as a
  function does not travel as JSON (user, 2026-11-09); each field's `serverValidation`, a Zod schema whose
  JSON Schema type (`z.toJSONSchema`) fits the field - a string for text and slug, a number for a
  number, an array for a text list, no other kind - recorded as `validation` and left out of the
  projection (user, 2026-11-09, after weighing a rule vocabulary and a schema sent as JSON Schema, whose
  `refine` and messages are lost and whose `fromJSONSchema` Zod 4.2 calls semi-experimental);
- **P1a.5** - `admin.groups`: each group lists at least one field, every name an editable field of the
  collection, and no field in two groups; recorded with
  `position` defaulted to `main` and carried by the projection; each slug field's `admin.lockOnEdit`,
  `true` when left out, carried by the projection (user, 2026-11-09). Blocks get the same `groups`
  with 1c;
- **1c** - blocks and the area model: the area model is the target of the `areas` `hasMany` of each
  collection with areas and of the `area` `belongsTo` of each block, one model for all of them, or an
  error naming the models found; a config with neither areas nor blocks has none (user, 2026-11-10); `name` and a nullable text `parent_id` on the area model, `rank` on blocks;
  a collection with areas has `areas` and cascades it; the area model has a nullable
  `belongsTo` to that collection, a `hasMany` to every configured block type, and cascades each; its
  `checks` hold an expression naming every owner column; each block has `area`;
  every block named in an area is configured; area names distinct from the columns of what holds them,
  because the store API returns them under those names, and none named `areas`, the relation the read
  keeps the area rows under; id prefixes unique across every registered model;
  each name in a group's `areas` an area of the collection, no area in two groups, and a group with a
  field or an area (user, 2026-11-09); a block's slug fields checked as a collection's (a text column,
  a text `from`, a `serverTransform` that is a function), and each field's `serverValidation` and slug function built
  by `prepareFields` for collections and blocks alike and recorded on the block as on the collection
  ([sub-lib-cleanup](./ended/2026-11-10-sub-lib-cleanup.md) D5, user, 2026-11-10);
- **1d** - repeaters (main spec D32): each a block's area, checked as an area is by `prepareAreas` - its
  `blocks` configured block types, its name neither a column of the block's model nor `areas`; recorded
  on the block as `repeaters`; `maxDepth` a positive whole number, 4 when left out, recorded on the
  registry. A block type may be listed inside itself, directly or through another type, because
  `maxDepth` bounds the data (main spec D26); 1e was merged into 1d (user, 2026-11-16);
- **1f** - `media.provider`: `resolve` a class extending `AbstractCmsMediaProvider` with an
  `identifier`, and its `validateOptions` run on `options`; a `media` field refused when the config has
  no `media.provider`, as there is no default (main spec D29); each media field's `stores` one the
  provider's `static stores` lists; a media field on a text column, or with `multiple: true` on an `array` column,
  and `max` a positive integer only with `multiple`;
- **phases 3-5** - options, relations and their id keys, `reference` overrides, `filterable` and rich
  text, listed in their sub-phases.

The registry does not call the media provider: a provider that cannot reach its module fails at the
first media read or upload, which the host project's HTTP test covers. It sees the `CHECK` through
`Model.parse().checks` and does not parse the expression beyond the owner column names.

For each collection the registry records the service key, so the steps can name the generated methods
(`` `create${pluralize(key)}` ``); the id prefix, which the write functions need to generate ids, is
recorded from P1a.4.

`getRegistry(container)` (`src/lib/registry/get-registry.ts`) reads the config from the `cms` module, calls
`prepareRegistry` once per process and memoises the result or the error. On error,
every CMS route answers 500 with the error's message, logged once at `error` with `LOG_PREFIX`. A host
project runs `validateConfig` (`src/lib/registry/validate-config.ts`), exported from the package root, on
its config in a unit test, so a broken config fails its tests instead of a deploy; the registry itself
stays internal.

### Reading and writing areas

Three plain functions in `src/lib/document/` hold everything that knows how blocks are tied to documents (main
spec D5). They take the registry and plain data, so their tests need no database.

**`buildDocumentAreas`** turns what `query.graph` returns into the tree the API serves. The read itself is one
`query.graph` on the collection entity with `areas.*` and `areas.<block relation>.*` for every configured
block type; media records are read apart, through the provider. The graph has the same depth for any
nesting, because every area, a repeater's included, hangs off the document. The function groups blocks
by area, orders them by `rank` across block types and adds `block_type` from the registry; under each
block it puts each repeater of the block's type, under the repeater's name, from the area row of that
name whose `parent_id` is the block's id - `[]` when there is none - and so on down. An area row that no
live block and not the document holds is not reached, and the read step logs it, once per document. The
document read keeps the area rows under `areas`, with their `id`, `name` and `parent_id` only, which a
save needs for an area without blocks, so each block is held once, under its area's or its repeater's
name; a read that only checks a document exists leaves the areas out (`with_areas: false`). The Admin
read (`buildAdminDocumentRead`) and the store read leave out `areas`, and `rank` and `area_id` from each
block at any depth, by those fixed names (user, 2026-11-10).

**`listDocumentBlocks(registry, collection, document)`** (`src/lib/document/list-document-blocks.ts`,
pure) walks that tree, a stored one or a body alike, and lists every block at any depth with where it
sits: its path (`sections.4.items.0`), the area or repeater it is in, and the id of the block holding
that repeater, `null` in a document's own area. Whatever needs every block of a document - the write,
its undo, the live rows, the stale-block check, media and versions - goes through it rather than walking
the tree again.

A block whose type is configured but no longer in its area's list is **stale** (user, 2026-11-09). The
Admin read keeps it, marked `allowed: false`, so the editor sees it and removes it; nothing disappears
by a save the editor did not see. `buildDocumentAreas` marks it in every read; the store read (1h)
drops the marked blocks itself, with one warning per document (user, 2026-11-10). A
body may carry a stale block only as `{ id, block_type }` with the id stored in that area - the same
repeater of the same block, at depth: it keeps its place, its stored values and its repeaters, and a new
block of that type is refused. A block whose type is not
configured at all is not read, since the read names only configured block relations; no save touches
it, and it goes with its document.

**`prepareDocumentWrite(registry, collection, documentId, stored, submitted)`** decides what a save writes
(main spec D27). `stored` is the document's tree as read before the save; `submitted` is the body. It
compares ids only, never values:

- the document and every block in the body whose id is in `stored`, at any depth, is **updated** with
  all the values it carries, plus `rank` (its position) and `area_id`, so a block may move to another
  area or repeater of the document;
- every block without a known id is **created**, with an id from `generateEntityId` and the model's
  prefix, so the `parent_id` of its repeaters' rows is known before anything is written; so is the area
  row of an area or repeater the body holds that has none stored, with the document's owner column and
  `parent_id` `null` at the top or the holding block's id inside one;
- every block in `stored` that the body no longer carries is **soft-deleted**, together with its
  repeaters' area rows and, at any depth, the blocks and rows under them, found in `stored` because no
  cascade leads there; a block the body moved elsewhere is not;
- a block whose `block_type` changed is a new block, and the old one is deleted with what it held;
- an area or repeater key absent from the body is left as it is, a stale block's repeaters included;
  present, it replaces that area's or repeater's whole content.

It returns a `DocumentWrite`, a list of calls grouped by model:

```ts
type DocumentWrite = {
  create: { key: string; rows: Record<string, unknown>[] }[]   // parents first
  update: { key: string; rows: Record<string, unknown>[] }[]
  delete: { key: string; ids: string[] }[]                     // soft delete
}
```

For a document with 20 heroes and grids, a save is a few calls - one `update` per block model, one
`create` and one `softDelete` where needed - not one per block. `metadata` is sent as the body has it;
the Admin sends `""` for a removed key, because Medusa merges `metadata`.

**The write steps** make the calls through the generated methods of the host project's plain
`MedusaService`, one step per kind of call, because a write step's prefix names what it writes and each
kind has its own undo (`codee-medusa-backend-conventions`; user, 2026-11-09):
`create-cms-document-content` creates, parents first, and its compensation deletes;
`update-cms-document-content` updates, and its compensation writes the stored values back;
`delete-cms-document-content` (1c) soft-deletes, and its compensation restores. They run in that order.
Each call is its own transaction (main spec D23). A step that fails after some of its calls reports them,
answering `StepResponse.permanentFailure(message, undo)`: Medusa compensates the failed step, but a
thrown error leaves its compensation with `undefined` (checked by running a workflow, 2.21.2).

**Undo** is built from `stored` and the calls made: delete what was created, update the updated rows back
to their stored values, and restore what was soft-deleted. Medusa's restore also brings back rows
soft-deleted long before it, so the compensation restores the root rows and soft-deletes again every row
that came back and was not live, which **`listRevivedRows(restored, live)`**
(`src/lib/document/list-revived-rows.ts`, pure) finds from the ids the restore returns. The calls stay in
the step: no function outside a step calls Query or a module service (user, 2026-11-10). An area
deleted with its block is a root of its own, since no cascade leads to it.

### Client projection and validation

The projection is a type, `ClientCollection` (`src/lib/collection/types.ts`), which the Admin
imports; the `list-cms-collections` step builds it, its only producer, from the registry's collection
and, from 1c, the registry's blocks. It stays in the step until a second caller needs it (user,
2026-11-09). The target projection is
the serialisable description the Admin needs: labels,
drafts, store, admin options, fields (name, kind, label, description, required `always` / `publish` /
`false`, choices, searchable, input, slug source, reference target, multiple), areas with
the slugs of their block types, and `maxDepth`. `blocks` holds every block type the collection's areas
reach, through repeaters too, each described once, with its fields and its repeaters, so a block allowed
inside itself stays finite. `GET /admin/cms/collections` returns it after the options are resolved.

`buildDocumentSchema(z, collection, { mode })` (`src/lib/document/build-document-schema.ts`, pure, `z`
passed in - main spec D14) reads `{ fields, areas, blocks }`: the Admin passes its projection, the server
the registry's collection with the registry's blocks, so the server needs no projection (P1c.4b):

- `shape` - types, enum choices, options values, slug format, unknown keys rejected; `metadata` optional,
  an object of text values, because Medusa's merge replaces a nested object whole; each area an array of
  objects: a type the area allows with its fields, any other as `{ id, block_type }` only, which
  `validate-cms-document` refuses unless that id is a stored block of the area; a block carries its
  type's repeaters under their names, each optional and checked as an area is; a repeater at a depth
  past `maxDepth` takes no blocks (`Blocks cannot be nested this deep`); `id` optional on blocks;
  `required: always` enforced. Used for every write.
- `publish` - `shape` plus `required: publish` at every depth, and area and repeater `minRows` /
  `maxRows`. Used by publish and by an update of a published document.

The server passes `{ validation, blockValidation }`, the registry's Zod schemas of the document's fields
and of each block's: each applies to a filled value of the
right type, with the schema's own message, an empty value left to the required check. The Admin has no
schemas, so it checks types and `required` itself and asks `POST .../validate` for the rest.

From P1a.2 the schema covers a document's own columns: every field optional and nullable, a column the config
lists as no field refused as unknown, a date as a `Date` or an ISO text with an offset, a media field as its stored text (1f
checks it through the provider's `retrieve`), and each required field checked apart, so a missing value - missing,
`null`, an empty text or an empty list - is reported next to the type errors. `metadata`, areas and
repeaters join it with their sub-phases.

Errors are collected as `{ path, message }[]` with dot paths (`sections.2.title`,
`sections.4.items.0.value`, `sections.4.items.0.content.1.title`). `formatDocumentErrors(errors)`
(`src/lib/document/document-errors.ts`, pure) writes them as one `<path>: <message>` per line, the `message` of
the `INVALID_DATA` error. `buildDocumentErrors(issues)`, in the same file, turns a failed parse's issues into
those errors and gives each unknown key its own `<key>: Unknown field`. The Admin splits it with `parseDocumentErrors`; a line without a path is a general
error.

### Option fields

Reworked on 2026-11-12 (main spec D18): no options are resolved on the server. Three field types pick
from options; each takes a listed `{ value, label }[]` set, and the two marked below a hook of the host's
Admin, named as `options: { hook }` and registered as
[sub-admin-extension-registry](./ended/2026-11-12-sub-admin-extension-registry.md) describes:

| Type | Column | Hook | Admin input |
|---|---|---|---|
| `select` | text, enum | no | `Select`, for a few options |
| `combobox` | text; array with `multiple: true` | yes | the dashboard's `Combobox`, searched, a page at a time; chips with `multiple` |
| `checkboxes` | array | yes, for short sources | a list of `Checkbox`; "Load more" when the hook has pages |

- Built by sub-phase 1a of `sub-admin-extension-registry`: `select` with a list, `combobox` with one value,
  listed or from a hook. Phase 3 adds `multiple` and `checkboxes`.
- The registry checks a listed set as a select's (at least one, each value once, within an enum's
  values) and a hook's name; a hook needs a text or an array column, never an enum.
- A write checks a listed set's values, and a hook's values as texts only; on an array column each item.
- The hook contract's `value` widens to `string | string[] | null` with `multiple` and `checkboxes`,
  additively; `useComboboxData` already takes a list as its `defaultValue`.
- A relation with `options` keeps its relation behaviour; its values are document ids.

### Rich text

Moved to [sub-rich-text](./2026-11-17-sub-rich-text.md), which takes over sub-phase 1g (user,
2026-11-17).

### Media

Two layers (main spec D29): the File Module and its file provider store the file, as the host project's
`medusa-config.ts` sets them up; the plugin's media provider says what a media field stores and reads, uploads
and searches records. `src/lib/media-provider/` holds both plugin classes and the types a provider
author uses, exported from the package root; `src/lib/media/` and the media read in `src/lib/document/`
are the CMS's own and stay out of it:

| Member | Contract |
|---|---|
| `constructor(container, options)` | the container of the step that creates the instance, and `media.provider.options` |
| `static identifier` | a name for logs and errors |
| `static validateOptions(options)` | throws on wrong options; run when the registry is built |
| `static stores` | what a media field can hold for this provider, `"id"`, `"url"` or both: what its `retrieve` reads back |
| `maxFileSize` | the largest upload in bytes, from the provider's options; the upload route asks an instance for it and refuses a larger file, and the projection carries it to the drop zone |
| `retrieve(values, by)` | the records whose `id` or `url` (`by`, the field's `stores`) is among the values, in any order, without the ones it does not find |
| `upload(file)` | stores `{ filename, mimeType, content }` and answers its record |
| `delete(media)` | removes what `upload` stored; called only by the upload's compensation |
| `list?(query)` | `{ media, count }` for `{ q?, mime_type?, limit, offset }`; a provider without it cannot be searched |

`CmsMedia` is `{ id, url, filename?, mime_type?, size?, thumbnail_url? }` and whatever else the provider
adds; a provider answers what its backend answers, and the store API returns it whole (main spec D29).
The field holds the record's `id` or `url`, as its `stores` says (user, 2026-11-10).
`FileMediaProvider` has `stores = ["id"]`, as the File Module reads a file by its key only, answers
`retrieve` with `retrieveFile` per key, leaving out a key the file provider reports missing, `upload` with `createFiles` and
`delete` with `deleteFiles`, and has no `list`; on S3 its URLs are Medusa's signed ones, valid for an
hour, which the README states. Steps resolve the provider through one function of `src/lib/media/`,
which builds the instance from the registry's class and options with the step's container.

### Workflows

Under `src/workflows/cms/`, named and documented per `codee-medusa-backend-conventions`. The collection
slug travels in every input; steps resolve the registry with `getRegistry`.

| Workflow | Steps, in order |
|---|---|
| `list-cms-collections` (Admin) | `list-cms-collections` (the projections, their resolved options and each collection's document `count`) |
| `list-cms-media` (Admin) | `list-cms-media` (the provider's `list`; refused when it has none) |
| `upload-cms-media` (Admin) | `upload-cms-media` (the provider's `upload`; compensated by its `delete`) |
| `list-cms-documents` (Admin) | `list-cms-documents` (uncached, no areas) |
| `check-cms-taken-value` (Admin) | `list-cms-taken-values` (the unique values live documents hold among those given), then a `transform()` answering `{ taken, suggestion? }` with the first free `-<n>` form |
| `validate-cms-document` (Admin) | `list-cms-taken-values` -> `prepare-cms-document-input` -> `validate-cms-document` (report mode: the problems returned, nothing thrown, nothing written) |
| `get-cms-document` (Admin) | `get-cms-document` (with areas, uncached) -> `list-cms-document-media` (from 1f) |
| `create-cms-document` | `list-cms-taken-values` -> `prepare-cms-document-input` -> `validate-cms-document` -> `prepare-cms-write` -> `create-cms-document-content` -> `clear-cms-cache` -> `emitEventStep` `cms.document.created` |
| `update-cms-document` | `get-cms-document` -> `list-cms-taken-values` -> `prepare-cms-document-input` -> `validate-cms-document` -> `prepare-cms-write` -> `create-cms-document-content` (from 1c) -> `update-cms-document-content` -> `delete-cms-document-content` (from 1c) -> `clear-cms-cache` -> `emitEventStep` `cms.document.updated` (`save`; `publish` without drafts) |
| `publish-cms-document` | `get-cms-document` -> `validate-cms-document` (publish) -> `prepare-cms-publish` -> `update-cms-document-content` -> `clear-cms-cache` -> `emitEventStep` `cms.document.updated` (`publish`) |
| `unpublish-cms-document` | `get-cms-document` -> `prepare-cms-unpublish` -> `update-cms-document-content` -> `clear-cms-cache` -> `emitEventStep` `cms.document.updated` (`unpublish`) |
| `delete-cms-document` | `get-cms-document` -> `prepare-cms-delete` -> `delete-cms-document-content` -> `clear-cms-cache` -> `emitEventStep` `cms.document.deleted` |
| `list-published-cms-documents` (store) | `list-cms-documents` (cached, published; only the areas `fields` names) -> `prepare-cms-reference-ids` -> `list-cms-reference-targets` -> `list-cms-document-media` -> `prepare-cms-store-documents` |
| `get-published-cms-document` (store) | `get-cms-document` (cached, published; areas unless `fields` drops them) -> `prepare-cms-reference-ids` -> `list-cms-reference-targets` -> `list-cms-document-media` -> `prepare-cms-store-documents` |

Each sub-phase builds only the workflows and steps it needs, and a step grows with the sub-phases that use
it.

- `list-cms-taken-values` reads, for each unique column, the values live documents hold among those the
  document may take: a submitted value, or for an empty slug its source's slug, each with its `-<n>`
  forms, so a free one can be picked or suggested. The two steps after it decide from what it read and read nothing themselves, as a step
  reads, decides or writes (user, 2026-11-09).
- `prepare-cms-document-input` fills an empty slug from its source column (`normalizeSlug`, then `-2`, `-3`
  past the taken values), stamps `created_by` / `updated_by` from the actor, refuses system and CMS columns, and turns each `<singular relation>_ids` key into the
  relation property holding the ids (`tag_ids` -> `tags: ["cntbtag_1"]`).
- `validate-cms-document` runs after it, so a generated slug is validated too: the `shape` schema, a
  unique column's value not among the taken values (`DUPLICATE_ERROR`), every relation
  id a live document of its target, option values, and the `publish` schema for a published document
  and for any document of a collection without drafts.
- `prepare-cms-write` calls `prepareDocumentWrite`, and in a collection without drafts writes a new
  document, or a draft row left from before drafts were turned off, `published` with `published_at` now;
  `prepare-cms-publish` returns a write of
  `{ status: "published", published_at: <now> }`, the time created in the step; `prepare-cms-unpublish` `{ status: "draft", published_at: null }`.
- `create-cms-document-content`, `update-cms-document-content` and `delete-cms-document-content` each
  make the calls of their kind from the write and undo them (Reading and writing areas).
- `prepare-cms-delete` returns a write that soft-deletes the document's row, which
  `delete-cms-document-content` makes; the models' cascades soft-delete its areas and blocks at
  any depth, because every area points at it. Compensation restores it and deletes again what `listRevivedRows`
  finds against the live ids from `get-cms-document`, so a block removed by an earlier save stays
  removed. The write steps return nothing; a workflow that answers the document reads it back.
- `clear-cms-cache` clears `computeTags` over every row of the write, each with its own operation, and
  the collection's list tag, because module events reach the cache only after the workflow. No
  compensation (P1h.3).
- The read steps cache only when their input says `cache: true`. `get-published-cms-document` and
  `list-published-cms-documents` set it, `true` by default and exported for a project's own code; the
  Admin's reads and the reads inside a write have no such input and never do (user, 2026-11-17,
  2026-11-18; Order after 1d).
- `list-cms-document-media` collects the stored values of every media field the documents hold, blocks
  included, and calls the provider's `retrieve` once per kind of value, `id` and `url`; it writes
  nothing (main spec D29).
- `prepare-cms-store-documents` puts each media field's record in place of its value, `null` when the
  provider found none, and for a `multiple` field the records in the array's order, without the ones
  the provider found none for; puts a populated CMS relation under the relation's name (published only), leaves
  commerce ids and option values as they are, returns each area under its name, turns rich text into its
  document, and removes `status`, `created_by`, `updated_by`, `area_id`, `parent_id`, `rank` and the area
  rows. It drops every block `buildDocumentAreas` marked `allowed: false`, with one warning per document
  (user, 2026-11-10).

### Alternatives Considered

- **Fields declared in config, models generated by the CMS.** Rejected (main spec D2).
- **Block content as JSON.** Rejected (main spec D3).
- **Variants A and C of block ownership.** Rejected (main spec D4).
- **A storage interface with one implementation.** Rejected (main spec D5).
- **One transaction through a plugin base class.** All or nothing from the database, but a class to
  maintain and a module unlike every other. Rejected (main spec D23).
- **A diff of every value, or deleting and inserting the whole tree.** Rejected (main spec D27).
- **Building every layer before anything runs.** Rejected for sub-phases that each end in something a
  user can try.
- **Passing model objects in the plugin options.** Typed, but the Admin shares the config types and the
  projection is built from the config; names resolved at runtime keep it plain data. Rejected.
- **Named option sources, an options route, static options only.** Rejected for `options` in the field,
  carried by the projection, as a list or a function (main spec D18).
- **Exclusive flags and scopes** - a boolean `type: "exclusive"` held by at most one published document
  per cell of its `scope` fields, such as a page's `is_homepage`, and values unique per cell of a compound
  unique index. Dropped before release (user, 2026-11-18): a homepage taken from another page at a
  publish, cells with a default value and a most-specific pick are rules an editor cannot see; a slug is
  unique in its collection, and which page is a homepage is to be held by a collection's settings.
- **A dedicated store route per filtered read, `?include=areas`.** Rejected for declared filters and `fields`
  (main spec D20).
- **`options` as the only relation picker.** Rejected for `useAsTitle` by default, `options` when wanted.
- **An `allowed` list in a collection's `store` config, as Medusa's `QueryConfig` has it.** Rejected
  (user, 2026-11-18): it would need every new field added by hand, cannot reach a block's fields, as an
  area is selected whole, and would say a field's visibility away from the field. `store: { hidden }` on
  the field says it, `allowed` is derived, and a path that is no field is opened with `allowFields`; a
  link of the project's as a field type of its own is a possible later addition.
- **Filters derived from every options field and relation.** Rejected: an opt-in `filterable` keeps the
  public API to what a project chooses.

## Data Model and Persistence

- Host project: its content module, with the tables of its models and pivots. Migrations are generated
  and run by the user. A sub-phase that needs a model in the host project stops there.
- Plugin: no table in this version.
- Integrity is the database's: the area model has one foreign key per collection and a `CHECK` that
  exactly one is set, a unique partial index per owner on `(owner, name)` for top areas and one on
  `(parent_id, name)` for nested ones; every block has a foreign key to its area, and a nested area names
  its block in `parent_id`, with no foreign key (main spec D26). Soft deletes cascade through the models' `.cascades()`.
- Changing content types later is ordinary Medusa model work. A renamed column is add, copy with a
  migration script, remove in a later deploy.
- No personal data. `created_by` / `updated_by` hold admin user ids.

## Contracts

### Admin API

Every route resolves `:collection` through `ensure-collection` (`src/api/middlewares/`): an unknown
slug answers 404, a broken registry 500 with its message. No route declares `policies` (main spec D12).

| Method and path | Body / query | Answer |
|---|---|---|
| `GET /admin/cms/health` | - | `{ registry: "resolved" }`, or 500 naming the problem |
| `GET /admin/cms/collections` | - | `{ collections: ClientCollection[], media_provider: { searchable, maxFileSize } \| null }`, each collection with its document `count`; `media_provider` is what the Admin's picker needs of the provider, `null` without one |
| `GET /admin/cms/collections/:collection/documents` | `q`, `status`, `order`, `limit` (default 20), `offset` | `{ documents, count, limit, offset }` - no areas |
| `GET /admin/cms/collections/:collection/taken-values` | `column`, `value` | `{ taken, suggestion? }` - whether a live document holds the value, and when it does, its first free `-<n>` form (`findFreeValue`, in the `check-cms-taken-value` workflow); a column without a unique index is never taken. From P1a.5 it also takes the document's own `id`, which does not count |
| `POST /admin/cms/collections/:collection/validate` | the document's columns, as for a create; query `id`, from P1a.5, for the document being edited | `{ errors: [{ path, message }] }` - 200 with every problem a save would meet, the fields' `validation` schemas and taken values included, the edited document's own values not counted as taken; nothing is written |
| `POST /admin/cms/collections/:collection/documents` | columns, relations and areas | `{ document }` |
| `GET /admin/cms/collections/:collection/documents/:id` | - | `{ document }` with areas |
| `POST /admin/cms/collections/:collection/documents/:id` | columns, relations and areas, partial | `{ document }` |
| `POST /admin/cms/collections/:collection/documents/:id/publish` | - | `{ document }` |
| `POST /admin/cms/collections/:collection/documents/:id/unpublish` | - | `{ document }` |
| `DELETE /admin/cms/collections/:collection/documents/:id` | - | `{ id, object: "cms_document", deleted: true }` |
| `GET /admin/cms/media` | `q`, `mime_type` (repeatable), `limit`, `offset` | `{ media: CmsMedia[], count, limit, offset }`; 400 when the provider has no `list` |
| `POST /admin/cms/media` | `multipart/form-data` with one `file`, read with `multer` in memory storage | `{ media: CmsMedia }`, uploaded through the provider; a file over its `maxFileSize` answers 400 |

- `document` is the row's columns (system ones included), relations to registered collections as ids,
  and each area as `[{ id, block_type, ...columns, <repeater>: [{ id, block_type, ... }] }]`, at any depth.
  From 1f each media field comes as its `CmsMedia` record in place of its value, `null` when the
  provider finds none, or a `multiple` field as its records in order, so the picker shows them without
  another request; a write body carries the stored value only, the record's `id` or `url` as the
  field's `stores` says, which the Admin form takes from the record it read.
- A write body holds columns, relation ids and areas. On update, a key present replaces the value, `null`
  clears it, an absent key is untouched; an area or repeater key present replaces its whole content,
  compared by id; an absent one is untouched. A block carries its repeaters under their names. System and
  CMS columns in a body answer 400.
- On update, `verify-document-body` requires only the keys the body holds: a required field sent as
  `null` or `""` answers 400, one left out passes. The workflow then checks the document as it will be -
  the stored values of its editable fields with the body over them - with the `shape` schema, the
  fields' `serverValidation` schemas included. A slug sent empty is filled from its source, the body's or the
  stored one, as on create (user, 2026-11-09).
- The Admin's document page sends every field it shows, an emptied one as `null` whatever its kind, and
  leaves out the fields it does not show (media until 1f), so they stay as stored
  (user, 2026-11-09).
- Document write routes set `bodyParser: { sizeLimit: "2mb" }`: the default limit is `body-parser`'s 100
  KB, a save sends the whole document, and Lexical's JSON is verbose.
- `verify-document-body` (`src/api/middlewares/`) checks the body's shape with the collection's
  projection, option values excluded, and throws `INVALID_DATA`. Option values and everything that needs
  a read are `validate-cms-document`'s.
- Every 400 about a body is Medusa's `{ code, type: "invalid_data", message }` with `message` as one
  `<path>: <message>` per line.
- A body holding an options field whose options failed to load answers 500 (`UNEXPECTED_STATE`) naming
  the field; a value outside the options is a 400 at its path.
- A relation picker searches its target collection through
  `GET /admin/cms/collections/:collection/documents` and its `q`, and shows each document by the
  collection's `useAsTitle`. A commerce reference has no route of the CMS: it is a combobox whose options
  a hook of the host's Admin fetches (main spec D18, user, 2026-11-12).
- `publish` and `unpublish` on a `drafts: false` collection answer 400.
- Handlers run workflows only, reads included. Workflow errors: `DUPLICATE_ERROR` (422), `NOT_ALLOWED`
  (400), `INVALID_DATA` (400), `NOT_FOUND`.

### Store API

| Method and path | Query | Answer |
|---|---|---|
| `GET /store/cms/:collection` | `limit` (default 20, max 100), `offset`, `order`, `fields`, `q` (searchable columns), one parameter per `filterable` field (repeatable) | `{ documents, count, limit, offset }`, with only the areas `fields` names |
| `GET /store/cms/:collection/:id` | `fields` | `{ document }` with areas |
| `GET /store/cms/:collection/slug/:slug` | `fields` | `{ document }` with areas; 404 for a collection without a slug field |

```
GET /store/cms/page?markets=de&fields=title,slug
GET /store/cms/blog_post?category_ids=cntbcat_1&fields=title,slug,excerpt,cover,categories.name
```

- Published documents only; `store: false`, a draft or a deleted document answer 404. Publishable key
  only, no customer authentication: a storefront also reads at build time, without a session. The
  publishable key is public (a storefront ships it to the browser), so anything the store API answers
  is public, a filter included: `?segment=at` is a choice, not access control.
- **Access is the project's** (user, 2026-11-17). Medusa sorts middlewares `global`, `wildcard`,
  `regex`, `static`, `params` (`@medusajs/framework` 2.22.7, `dist/http/routes-sorter.js`), so a
  project's middleware on `/store/cms/*` runs before the plugin's on `/store/cms/:collection`. There it
  may require a customer (`authenticate("customer", ["session", "bearer"])`) for every collection or some,
  and overwrite `req.query` - a filter forced to the customer's segment, whatever the client sent. The
  plugin's contract: it reads the query only in its own route middleware, through Medusa's
  `validateAndTransformQuery`, so what such a middleware sets is what is validated and read. The cache
  key is the validated query, so customers of one forced filter share an entry and never get another's.
  A collection read behind a session is not read at build time, and a storefront's own cache must key on
  what the middleware forces. The README shows both (1i). Two rules of Medusa's that such a middleware
  follows, found in the first host's `src/api/store/allowed-fields.ts`: it has no `method` or `methods`
  key, as a method-scoped middleware runs after the route has validated its query, so `allowFields`
  there adds nothing; and a string matcher matches by prefix, so `/store/cms/page` also reaches
  `/store/cms/page/...`. The project tests its own middleware: the
  plugin's test app is the plugin, where a test middleware would ship in the package (user, 2026-11-18).
- **The routes run two workflows** (user, 2026-11-18): the list route `list-published-cms-documents`,
  the id and slug routes `get-published-cms-document`. Each route reads `req.queryConfig` and
  `req.filterableFields`, runs one, and answers its result; the read, the media and the store's shape are
  the workflow's, so a project running it in its own code gets what the API answers. A draft preview
  (`sub-draft-read`) has its own route and workflow, never cached.
- `document` is `{ id, published_at, updated_at, ...columns }` without system and CMS columns; a media
  field comes as its record, whole, in place of its value, or `null`; a relation to a registered
  collection is that published document without its own relations and areas (or `null`); a commerce
  reference is its id; each area is `[{ id, block_type, ...columns, <repeater>: [...] }]` in `rank`
  order, at any depth. `metadata` comes whole, and `null` when empty. A `richtext` field comes as a Lexical
  document, an object and not a string.
- **The query is Medusa's** (user, 2026-11-17). `validateAndTransformQuery(schema, queryConfig)` takes
  both when a route is defined, while the CMS's depend on the collection and its config reaches the
  plugin only through the `cms` module's options, in the container. So `prepareRegistry` builds, once,
  each store collection's `storeQuery` - a `list` and a `retrieve`, each `{ schema, config }` - and
  `verifyStoreQuery` (`src/api/middlewares/verify-store-query.ts`, a `verify-` middleware as the
  conventions name one) only hands the request to
  `validateAndTransformQuery` with them; `getCollection` is an in-memory lookup in the registry built
  once per process. Medusa then does what it does for `/store/products`: adds `req.allowed` and empties
  it, so a project opens its own link with `allowFields` in a middleware on `/store/cms/*`; applies
  `req.restrictedFields`; runs `prepareListQuery` or `prepareRetrieveQuery`, which leave a field outside
  `allowed` out and refuse an `order` outside it; runs `validateRelationsLimit` with
  `req.storeRelationsLimit`; and sets `req.validatedQuery`, `req.filterableFields` and `req.queryConfig`,
  which the routes read as Medusa's do.
  - The **schema** is Medusa's `createFindParams` (`@medusajs/medusa/api/utils/validators`) without
    `with_deleted`, as the store never reads deleted rows, plus one key per `filterable` field, in a
    `z.strictObject` (Zod 4), so any other key answers 400, refined only by `limit` at most
    100, as `createFindParams` sets no upper limit. The CMS repeats nothing Medusa does (user, 2026-11-18):
    `order` on an area or rich text is refused by the list step, and an area on a list over 50 is checked
    on the fields Medusa resolved.
  - The **config** is a `QueryConfig` per route. `allowed` is derived, never configured: each public
    field - every field of the config without `store: { hidden: true }` - with `id`, `metadata`,
    `published_at` and `updated_at`, `<relation>`, `<relation>.<public column of the target>`, each media
    field (its record selected whole), each area by its name, and the path of each block type and each
    of its public fields under it, through repeaters to `maxDepth` - `sections.hero`,
    `sections.hero.title`, `sections.grid.items.grid_item.title`; so it is never empty, and a project's
    `allowFields` adds to it rather than replacing it. `defaults` are derived the same way - a list's
    without the areas, a single document's with them - unless the collection's `store.list` or
    `store.retrieve` gives them, with `defaultLimit` (20) and `storeRelationsLimit`, as Medusa's
    `listProductQueryConfig` and `retrieveProductQueryConfig` do (user, 2026-11-18); `isList` is the
    plugin's. The registry refuses, at startup, a `defaults` entry that is not a public field.
  - The read step turns `req.queryConfig.fields` into what it reads: an area's path into its area rows
    and the relations and columns of the block types it names. That is the CMS's only own part of the
    query.
- **`fields`** has Medusa's syntax (main spec D20). Defaults: every public column, media field and
  relation; `areas` too on a single document. `id` is always returned. Public fields are the config's
  fields without `store: { hidden: true }` (main spec D20, D28), plus `metadata`, `published_at`, `updated_at`, media keys,
  relation names and area names; anything else is left out without an error, as Medusa's
  `AllowedFieldFilter` matches `allowed` exactly. An area and its blocks are selected by a path of the
  area, the block type and the field (main spec D20, user, 2026-11-18):

  | `fields` | Answer |
  |---|---|
  | `*sections` or `sections` | the whole area: every block type, every public field, every repeater |
  | `sections.hero.*` | the area's hero blocks with all their public fields |
  | `sections.hero.title` | the area's hero blocks with `title` |
  | `sections.grid.items.grid_item.title` | the grids, with their items holding `title` |
  | `sections.title` | nothing: a path without a block type is not in `allowed` |

  A block always comes with `id` and `block_type`, in `rank` order; a block type the selection does not
  name is left out. A block field with `store: { hidden: true }` is in no path, and is cut from a whole
  area. Any path in an area on the list route with `limit` over 50 answers 400 (main spec D10). A path
  inside a repeater is deep, two relations a level for Medusa's `storeRelationsLimit`
  (`relations-limit.js`), so a project that sets a low limit raises it per collection with
  `store.retrieve.storeRelationsLimit`.
- **`order`** takes `<column>` or `-<column>` of a public scalar column that is not `richtext`, default
  `-published_at`; any other answers 400.
- **Filters.** Only fields marked `store: { filterable: true }` (user, 2026-11-17; under `store` since
  2026-11-18); any other query key answers 400, and so do more than 100 values for one key. Blocks are
  not filterable. The route passes `req.filterableFields` to the read.

  | Field | Match |
  |---|---|
  | `boolean` | equal (`true` / `false`) |
  | `text`, `enum`, options on a `text` column | any of the values (`$in`) |
  | options on an `array` column | any of the values (`$overlap`) |
  | relation | any of the ids |
- Reads are cached through `query.graph` with
  `cache: { enable: true, tags: [<collection list tag>], computeAutomaticTags: true }`, because an empty
  result has no automatic tag. The list tag is `<collection key>:list:*`. Only these routes cache; the
  Admin API never does (user, 2026-11-17).

### Events

One event per write, after its last write step (main spec D38; user, 2026-11-18), from P5b.1:

| Event | Data | Emitted by |
|---|---|---|
| `cms.document.created` | `{ collection, id, status }` | a create |
| `cms.document.updated` | `{ collection, id, action, status }` | a save (`save`), a restore (`restore`), a publish (`publish`), an unpublish (`unpublish`), a discard (`discard`); a save in a collection without drafts is `publish`, as it changes what the store serves |
| `cms.document.deleted` | `{ collection, id }` | a delete |

What the store serves changes at a `created` with `status: "published"`, an `updated` with `publish` or
`unpublish`, and a `deleted`. Nothing in the CMS subscribes. The
module events of every written model keep driving the cache.

## UI/UX

Plugin Admin routes under `src/admin/routes/cms/`, label **Content**, built only from `@medusajs/ui` and
`@medusajs/dashboard` exports, laid out as `references/file-structure.md` in
`codee-medusa-admin-dashboard` has it (feature folder `src/admin/cms/`). Copy follows `codee-ui-copy`
(English): every text is a translation key under `cms` in `src/admin/i18n/json/en.json`, because Medusa
merges the translations of the application and every plugin into one namespace.

- `/app/cms` - the collections, one row each with its description and document count.
- `/app/cms/:collection` - dashboard `DataTable` with URL state: `useAsTitle`, `defaultColumns`, status
  badge (none for `drafts: false`), `updated_at`; search when a column is
  searchable; status filter; **Create**. Its columns show the row, which is what is published, or the draft for a document never
  published; a published document's waiting draft shows only as "Published with changes", never in the
  columns. A "Published version" column gives the number of the published version the store serves, or a
  dash for a draft, an unpublished document included (user, 2026-11-09).
- `/app/cms/:collection/@create` - `RouteFocusModal` with the fields required always or at publish, media
  fields excepted until 1f; only `always` blocks the save. A slug built by `normalizeSlug` fills from its
  source once the editor pauses typing it (400 ms), until the editor changes it, and is sent as shown; a slug with the
  config's own `serverTransform` is left to the server. Each unique field is checked through
  `GET .../taken-values` once the editor pauses (400 ms), so a quickly typed title costs one request. A
  taken value the form filled in moves to the suggested free form; one the editor typed shows on the
  field, blocks the save, and **Use <suggestion>** puts the free form in (user, 2026-11-09). Once the
  editor pauses (400 ms) the whole document goes to `POST .../validate`, and its errors show on the
  fields the editor has filled, blocking the save; a missing value stays the form's own check, and a
  taken value the taken-value check's. A save the server refuses shows each `<path>: <message>` line on
  its field, split by `parseDocumentErrors`, and the lines without a known field in a toast (user,
  2026-11-09). On success it opens the document.
- `/app/cms/:collection/:id` - a full page. Main column: the document's fields, then one section per area
  in no group, and an area a group names inside that group's section after its fields (from 1c), each
  listing its blocks as collapsible cards (block label and first text value), each with move up, move
  down, remove, and an **Add block** menu of the area's block types; a block's repeaters show inside its
  open card after its fields and sections, each under its label, in the same way, through the toolkit's
  `BlocksField` (main spec D31; user, 2026-11-16), a block at `maxDepth` showing no repeaters; `metadata`
  as key-value rows on the document and each block. Side column: status
  badge, **Publish** / **Unpublish** (neither for `drafts: false`), created and updated by and at,
  **Delete** in the action menu. **Save** is disabled while pending and when unchanged. A published
  document shows "Changes go live when you save." The slug, the taken-value check and the live
  validation work as in the create modal, with the document's id sent along so its own values are not
  taken; a stored slug counts as the editor's, so it follows its source only once the editor empties it
  (user, 2026-11-09). A refused save maps its lines onto the fields with `parseDocumentErrors`. A slug field
  with `admin.lockOnEdit` (the default) is disabled, with "<label> is locked. Changing it changes the
  document's URL." and **Unlock**, which makes it editable until the page is left (user, 2026-11-09).
  The fields outside `admin.sections` form the first section of the main column, whose header holds
  **Save**; each section of the config is a card of its own with its label and description, in the main
  column or, with `position: "side"`, in the side column above the created and updated section; one
  form spans them all. The create modal shows each section with a field it shows as a subheading after
  the other fields, side sections last. `admin.groups` was renamed `admin.sections` by
  [sub-form-layout](./ended/2026-11-11-sub-form-layout.md), which owns the form's layout from then on.
- Fields render one by one in the config's order (main spec D28, D30, D31), each through
  `ManagerFormField` (`src/admin/components/manager-form-fields/`, first copied from the host project as
  `ManagerFields`, rebuilt on the dashboard's `Form` parts; user, 2026-11-11) with the description
  `buildFieldConfig` gives it - a date with `DatePicker`, a media field with its picker. Every field
  shows its label, "(Optional)" unless it is required always, its description and its error the same
  way; the slug lock and the taken-value suggestion show under their field. Both forms lay their
  sections out with the toolkit's `sectionFormFields`. The kinds: text and
  textarea, number, switch, date, select, text list, slug (fills from its source until edited), media
  picker (below), Lexical editor for `richtext`, and for a relation a `Combobox` with
  `useComboboxData` over `GET /admin/cms/collections/:collection/documents`. Options fields render as "Option fields"
  above lists; their unknown values and failing hooks are `sub-admin-extension-registry`'s (1b).
- The media components live in `src/admin/components/media/`, started from the first host project's
  asset library (main spec D29) and reduced to what a provider gives:

  | Component | From the asset library | What changes |
  |---|---|---|
  | `MediaDropzone`, `checkUploadFile`, `mimeTypesLabel` | the drop zone and its checks | the size limit comes from the projection, not a module constant; `useMediaUpload` checks every chosen file, the drop zone hands it on |
  | `StackedModalShell` (`src/admin/components/`) | as it is | nothing |
  | `MediaLibraryModal`, `MediaSelectTable` | the library modal and its select table | `GET /admin/cms/media`; search and pages only, the field's types sent as `mime_type`, no other filters |
  | `MediaThumbnail` | the thumbnail and the table's columns | thumbnail, name and type; no rendition badges |
  | `MediaPickerField`, `MediaListField`, with `MediaRow` and `MediaAddControls` | the picker field | holds a chosen file, previewed from the browser, until the form's save uploads it through `POST /admin/cms/media` and then sends the document, as Medusa's product media form does; **Choose from library** only when the provider has `list`; **Remove** clears the field and deletes nothing; with `multiple`, several files up to `max`, each removable and moved up or down |

  Without `filename` or `thumbnail_url` a record shows the URL's last segment and the URL itself.
  The media components import nothing of the CMS (main spec D31): a form hands them a `MediaSource` -
  for the CMS, the provider's limit and search from the collection list, `CMS_MEDIA_PAGE_SIZE` and
  `useMediaList` - and their copy is under `managerFormFields.media`.
  Renditions, a file's origin and regenerating widths stay in the host project.
- The form validates with the `publish` schema when the document is published and `shape` otherwise, maps
  the paths from `parseDocumentErrors` onto fields, shows a line without a path above the form, opens the card
  holding the first error and scrolls to it.
- The plugin documents itself in its `README.md`; a host project may add its own guide.

## Performance and Cache

- Expected scale: up to ~1000 documents per collection, up to ~20 blocks per document.
- The common read is one document by slug: an indexed lookup on the slug, then the document's areas by
  owner key, then each block type by `area_id`, repeaters' rows coming with the document's areas -
  a few rows per table,
  whatever the number of documents. One `query.graph`; MikroORM loads each relation with its own `SELECT`.
- A save is one call per model and operation (main spec D27): a few calls for a document of any size.
- A list reads only the areas `fields` names, at most 50 documents with them (main spec D10), and only
  the block types those areas reach. `fields`, `order` and filters are part of the
  `query.graph` input and so of its cache key; the collection's list tag clears every variant.
- Cache owner: the CMS workflows; invalidation by the module events after the workflow and by
  `clear-cms-cache` inside it. Admin reads are never cached. Media records are read through the provider
  after the cached document read, one `retrieve` per kind of value and request; the plugin does not
  cache them, and a provider caches its own if it needs to (user, 2026-11-10). A related
  document is read under its own collection's list tag. TTL is the Caching Module's default.
- A store read is one `query.graph` through the document's `areas`, so it loads the blocks of each
  selected type from the whole document - every area and repeater - and the selection drops the ones
  outside it in memory. Query cannot narrow it in that call: a filter on `areas` narrows the documents,
  not the rows of the relation ([lesson](../../lessons/a-query-filter-on-a-relation-narrows-the-parents-not-the-relation.md)).
  Accepted (user, 2026-11-18): the common store read, a whole page by its slug, uses every block it
  loads; a list reads the document's own fields for its cards rather than a block; and narrowing would
  take a query per level of areas, from the area entity, with a cache entry each. A collection may have
  several areas, and a project that needs a narrower read runs its own query from the area entity, or
  its own workflow from the exported steps.
- Phase 2 measures a single-document read without cache with ~1000 documents of ~20 blocks, and one
  whose unselected areas hold many blocks of the selected types.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| Config names a missing column, misses a relation or cascade on the area model, misses `areas` or `area`, points them at two models, or repeats a prefix | every CMS route answers 500 naming the problem; the host project's config test fails | unit tests of `prepareRegistry` |
| Unknown collection slug or reference target | 404 | HTTP test |
| No admin session | 401 | HTTP test |
| Body with a block type outside the area, a wrong type, an extra key or a system column | 400, a `<path>: <message>` line per error | HTTP test |
| Publish with a missing required field in a block inside a grid's repeater | 400 naming `sections.<n>.items.<m>.value`; nothing written | workflow test |
| Saving a published document that empties a required field | 400; nothing written | workflow test |
| Duplicate slug | 422; a soft-deleted document's slug is free | workflow test |
| Reorder blocks | same ids, new `rank` values; nothing created or deleted | unit test of `prepareDocumentWrite` |
| Block type changed in place | the old row deleted, a new row created in the other table | unit test of `prepareDocumentWrite` |
| A block moved to another area of the same document | updated with the new `area_id`; nothing deleted | unit test of `prepareDocumentWrite` |
| A block holding repeaters is deleted | its repeaters' rows and their blocks are soft-deleted at any depth; other blocks, and one moved out of it by the same save, stay | unit test of `prepareDocumentWrite`; module integration test |
| A body id that is not in the stored document | treated as new: a new id is generated | unit test of `prepareDocumentWrite` |
| A call inside a write step fails | `permanentFailure` hands the calls made to the compensation; the document is as before | module integration test |
| A step after a write step fails | each write step's compensation undoes its calls | step test (invoke and compensate) |
| A compensation restores a row that had children removed by an earlier save | those children stay soft-deleted | module integration test |
| Document deleted | areas and blocks soft-deleted by cascade at any depth; compensation brings back what was live | workflow test |
| Second area of one name for one owner, or for one `parent_id` (concurrent saves) | the unique index refuses it; the save fails and the editor saves again | module integration test |
| Blocks nested deeper than `maxDepth` | 400 at the path that goes too deep | unit test of the schema |
| A block moved from a grid's repeater to the page's sections, or the other way | updated with the new `area_id`; nothing created or deleted | unit test of `prepareDocumentWrite` |
| Two grids of one document each with a repeater `items` | one area row per grid, told apart by `parent_id`; the indexes hold | unit test of `prepareDocumentWrite`; HTTP test |
| A new grid saved with its items | the grid's id generated first, its repeater's row created with it as `parent_id`, then the items | unit test of `prepareDocumentWrite` |
| A grid whose type changed in place, or a stale grid kept as `{ id, block_type }` | the first: its repeaters deleted with it; the second: its repeaters kept as stored | unit test of `prepareDocumentWrite` |
| A type its repeater does not list, sent with values | 400 at paths under `sections.<n>.items.<m>` - its `id` and its unknown keys, as in a document's own area | unit test of the schema; HTTP test |
| A save that deleted a grid with items is compensated | the grid, its repeater's row and its items restored; an item removed by an earlier save stays removed | step test; module integration test |
| A block allowed inside itself | the registry accepts it; `maxDepth` bounds the data | unit test of the registry |
| An area whose parent is not live | left out of the read, one warning per document | unit test of `buildDocumentAreas` |
| A block type no longer in its area's list (stale) | the Admin read returns it with `allowed: false` and shows a remove-only card; a save keeps it when sent as `{ id, block_type }`; a new block of that type answers 400 at its path; the store read leaves it out with a warning | unit tests of `buildDocumentAreas` and the schema; step test of `validate-cms-document` |
| A block type removed from the config's `blocks` | not read, not touched by a save, soft-deleted with its document | unit test of `buildDocumentAreas` |
| A new block saved, then saved again from the same form | the save answers the document read back with its blocks' ids, and the form resets from it, so the second save updates the block instead of creating another | HTTP test; the user's walkthrough |
| An editor removes a `metadata` key | the Admin sends `""`; Medusa's merge removes it and keeps the other keys | HTTP test |
| A save that changed `metadata` is compensated | the undo sends the old value of a changed key and `""` for a key the save added | step test |
| A nested object in `metadata` | 400 at its path | unit test of the schema |
| A document larger than 2 MB | 413 from the body parser | HTTP test |
| A path inside a media record in `fields` (`image.url`) | left out without an error; `image` returns the whole record | unit test of the registry's `storeQuery` |
| A media field whose `stores` its provider does not list | every CMS route answers 500 naming the field; the config test fails | unit test of `prepareRegistry` |
| A field opened with `allowFields` | selectable through `fields`; deeper than the relations limit answers 400 | Medusa's `validateAndTransformQuery`; the project that opens it tests its middleware |
| A stored media value the provider no longer finds, related document unpublished or deleted | `null` under the key; left out of a `manyToMany` list | step test |
| A step after the upload fails | the provider's `delete` removes the uploaded file | step test (invoke and compensate) |
| A media search with a provider without `list` | 400; the picker shows no library button | HTTP test |
| A file of a type the field does not `accept`, or over the provider's `maxFileSize` | refused in the picker before any request; a file over the limit also by the upload route | unit test of `checkUploadFile`; HTTP test |
| A chosen file fails to upload when the document is saved | the save stops before the document is sent, the field shows "Could not upload the file. Try again.", and the files uploaded before it keep their stored values in the form, so the next save does not upload them again; a file uploaded by a save that then fails stays in the provider, as with Medusa's `/admin/uploads` | unit test of `uploadPendingMedia` |
| A media value saved that the provider does not find | 400 at the field's path | step test of `validate-cms-document` |
| A media field in a config without `media.provider` | every CMS route answers 500 naming the field; the config test fails | unit test of `prepareRegistry` |
| `multiple` on a text column, a single media field on an array, or `max` without `multiple` | every CMS route answers 500 naming the field; the config test fails | unit test of `prepareRegistry` |
| More files in a `multiple` field than its `max` | 400 at the field's path; the picker offers no more | unit test of the schema |
| Cached empty list, then the first publish | the next store read returns it | HTTP test |
| Two editors save the same document | last write wins | documented; locking later |
| A query parameter on a field not marked `filterable`, an area named on a list with `limit` over 50, `order` on a relation | 400 | HTTP test |
| `fields=status`, an unknown field, `categories.posts.title` or `areas.x` | left out of the answer; 200 | HTTP test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Any authenticated admin changes or unpublishes content. | high | access | Accepted until `sub-cms-permissions` (main spec D12). | Open until then. |
| A call fails during a save and its undo fails too, leaving part of a document. | medium | data | Each call is small; the failure is logged at `error` with the document id. The next save writes the whole document again (main spec D27). | A rare double failure needs another save. |
| A compensation brings back rows removed by an earlier save. | high | content | Every compensation that restores deletes again what `listRevivedRows` finds. | none once the test runs |
| `parent_id` has no foreign key, so a row deleted outside the plugin leaves its areas behind. | low | data | Only the plugin writes content; such areas are left out of reads with a warning, and go with the document. | Orphan rows until the document is deleted. |
| Deep or wide documents make the Admin form heavy. | medium | admin | `maxDepth` defaults to 4; the 2 MB body limit bounds a document. | Measured in the walkthrough. |
| A host project's media provider cannot reach its module, or answers records without `id` and `url`. | medium | backend | `validateOptions` when the registry is built; the plugin checks each record's `id` and `url`; the host project's HTTP test. | Found at a read, not at boot. |
| The plugin imports `multer` without declaring it, so a host project whose package manager does not let the plugin reach `@medusajs/medusa`'s dependencies cannot load the upload route. | medium | delivery | The same import already runs in the first host project; checked again with the packed package in 6a. | A strict install would need `multer` declared, a production dependency the user approves. |
| `FileMediaProvider` on S3 answers signed URLs that expire after an hour; a cached store read or a storefront build keeps dead links. | medium | store API | Medusa's own behaviour, kept as it is; the README says so, and a project that needs lasting URLs names a provider that stores them (main spec D29). | A project on S3 with `FileMediaProvider` builds around it. |
| A value that is not for the public lands in `metadata`, which the store API returns whole. | medium | visibility | `metadata` is for presentation settings; the README says so. | Editors can still type anything. |
| A storefront takes an options filter for access control. | medium | content | The README says the store API is public and hides nothing. | Review discipline. |
| The module loader copies the plugin options and drops a `serverTransform` or a `serverValidation` schema. | medium | backend | A Zod schema reaches the `cms` module both through the test app's module options, its message coming back in a 400 (HTTP test, 2026-11-09), and through a host project's plugin options, its message shown in the create modal (the user's walkthrough, 2026-11-09). A bare function is not proven yet. If one were dropped, `defineConfig` keeps them in a module-level map keyed by field path. A dropped `transform` falls back to `normalizeSlug` and a dropped `validation` checks nothing, without an error until then. | Known at the first custom `transform`. |
| `query.graph` does not pass `$overlap` to a `model.array()` column. | medium | store API | Phase 3 proves it through the real route; if refused, the step reads `id` and the column of the published documents and filters in memory, cheap at ~1000 rows. | Known at the first custom `transform`. |
| `query.graph` does not filter a list through a `manyToMany` with a correct `count` and pagination. | medium | store API | Phase 5 proves it; if not, the list reads the matching ids from the target side, then the documents by id. | Known in Phase 5. |

**Rollout:** additive. A host project registers the plugin and its module; nothing existing reads them.

**Rollback:** remove the plugin and the content module from the host project's `medusa-config.ts`; the
tables stay unused until the user drops them with the module's migration down.

## Dependencies

- Medusa 2.21 as peer (main spec D15).
- A host project with its content module and config, and a file provider for the File Module, to run
  integration tests and walkthroughs; a media provider of its own, to try `list`, only after 1f.

## Acceptance Criteria

- [ ] **1a** An editor lists, creates, edits, publishes, unpublishes and deletes pages in **Content**,
      through the Admin API, and sees server errors on the right fields.
- [ ] **1a** A body with a wrong shape answers 400 with a path per error; a duplicate slug answers 422;
      every Admin route answers 401 without a session and 404 for an unknown collection.
- [ ] **1c** An editor adds, reorders and removes blocks in an area; ids survive a reorder; a reload
      shows the blocks in order; a save that fails leaves the document as it was.
- [ ] **1d** A block's repeater holds items of each block type it lists, added, reordered and removed,
      and required at publish at any depth; a type it does not list is refused. Deleting a block removes
      what its repeaters hold; nothing deeper than `maxDepth` is accepted (1e merged into 1d, user,
      2026-11-16).
- [ ] **1f** With `FileMediaProvider`, an image is uploaded into a single field and several files into a
      `multiple` field, and shown from `retrieve` in order after a reload; a failed upload leaves no
      file. Editing `metadata` is not in 1f (user, 2026-11-10).
- [ ] **1g** Moved to [sub-rich-text](./2026-11-17-sub-rich-text.md).
- [ ] **1h** A published page is read through the store API by id, by slug and in a list, with its blocks
      in order, their repeaters, media, `metadata` and rich text; a draft and a deleted page are never served;
      `store: false` answers 404.
- [ ] **1i** A second collection added with only a model and a config entry appears under **Content** and
      in the store API, and the plugin's code names no collection; the README documents the plugin.
- [ ] **2** `fields` follows Medusa's syntax and keeps non-public fields out; `order` sorts; declared
      filters work and any other parameter answers 400; a single-document read is measured.
- [ ] **3** A combobox with `multiple` and a checkboxes field each hold several values, listed or from a
      hook, reject a listed value outside their options, and filter a store list.
- **4** Dropped (user, 2026-11-18): exclusive flags and scopes (Alternatives Considered).
- [ ] **Access** The store API checks no customer, and a project's middleware on `/store/cms/*` decides
      what is read: the plugin reads the query only through `validateAndTransformQuery` in its route
      middleware (Store API).
- [ ] **5** Relations to registered collections are picked, saved, restored on compensation, returned
      populated and filter the list; a `drafts: false` collection is live on creation.
- [ ] **6** The packed package installed in a host project runs its routes before publication.

## Phasing

Each phase is split into sub-phases. A sub-phase is a few steps and ends in something a user can try in a
host project. Its detailed steps are written in the Implementation Plan when it is next; the sub-phases
after it are listed with their goal only.

### Phase 0 - Plugin repository and local link

**Goal:** the plugin builds in its own repository and runs in a host project through yalc. **Done.**

### Phase 1 - Core on pages

**Goal:** pages work end to end - config, Admin, publish, store API, blocks - and every mechanism built
here serves any collection.

| Sub-phase | Goal | Exit gate |
|---|---|---|
| **1.0 Foundation** (done) | Config types, introspection, registry, the `cms` module, `GET /admin/cms/health` | Unit tests pass; the host project's config test passes on its models |
| **1a Pages in the Admin** | Collections and documents without areas, one vertical slice per action: projection, schema, workflows, Admin routes and screens | A page is created, edited, published, unpublished and deleted in **Content**; tests pass |
| **1b Versions and drafts** | The phases of `sub-versions-and-drafts`, after 1a and before 1c (user, 2026-11-09; main spec D22); the earlier 1b was merged into 1a (2026-11-08) | A published page saved as a draft, published, and restored from its history |
| **1c Blocks in an area** | Blocks and the area model in the registry; `buildDocumentAreas`, `prepareDocumentWrite`, the write steps and their undo for blocks without lists; areas in the schema and the Admin, `areas` in `admin.groups`; areas in the version snapshot and its `changed_fields`; from the closed `sub-versions-and-drafts`, a check that block ids survive a publish and later saves, and that a restore skips a block type no longer configured | Blocks added, reordered and removed in the Admin, and shown in order after a reload |
| **1d Repeaters and depth** | A block's `repeaters` - areas inside it whose items are blocks of the types each lists (main spec D32) - in the registry, the read, the schema, the write, media, versions and the Admin, where a `BlocksField` of the form toolkit renders areas and repeaters alike (D31); `maxDepth`; deleting a block removes what its repeaters hold. `lists`, `ListConfig` and the block's `areas` leave the config types; the host's grid moves its items to block types, with models and migrations the user makes. 1e merged into it (user, 2026-11-16) | A grid with items of two block types edited and reloaded; a hero in a grid item's repeater edited, then the grid deleted and its items gone |
| **1f Media** (built after 1c, before 1d and 1e; the `metadata` editor left out for now; user, 2026-11-10) | `AbstractCmsMediaProvider` and `FileMediaProvider`, `media.provider` in the registry, the upload and search routes, media read through `retrieve` for the Admin, the media components and picker | An image uploaded and shown after a reload |
| **1g Rich text** | Moved to [sub-rich-text](./2026-11-17-sub-rich-text.md) (user, 2026-11-17) | - |
| **1h Store reads** | `list-published-cms-documents` and `get-published-cms-document`; `clear-cms-cache` in every write workflow; the three store routes with `limit` and `offset`, newest published first; cached reads with the list tag; `prepare-cms-store-documents` with areas, repeaters, media, `metadata` and rich text; from the closed `sub-versions-and-drafts`, a check that a save of a published document leaves the store's answer unchanged until the draft is published | A published page with blocks, a grid, an image and formatted text is served by id, by slug and in a list; a draft never is |
| **1i Proof and README** | A temporary second collection added and removed with no plugin change; the README, with the section on drafts, history, restore and discard moved here from `sub-versions-and-drafts` P3.3 (user, 2026-11-09), and a project's middleware on `/store/cms/*` requiring a customer and forcing a filter (user, 2026-11-17); the store routes' HTTP tests of `store: false` and of a collection without a slug, which wait for this second collection (user, 2026-11-18) | The second collection works; a search of `src` finds no collection name |

### Phase 2 - Store reads as in Medusa

| Sub-phase | Goal |
|---|---|
| **2a `fields` and `order`** | The Store API's config - `store` on a collection in the shape of Medusa's `QueryConfig`, `store: { hidden }` on a field - the registry's `storeQuery` handed to Medusa's `validateAndTransformQuery`, and the selection in the read |
| **2b `filterable`** | Filters on `text`, `enum` and `boolean` columns; `boolean` first (user, 2026-11-17) |
| **2c Measurement** | A single-document read timed with ~1000 documents of ~20 blocks, recorded in Performance and Cache |

### Phase 3 - Option fields

| Sub-phase | Goal |
|---|---|
| **3a Several values** (brought forward; user, 2026-11-12) | `multiple: true` and `max` on a `combobox` over an array column, listed or from a hook: the config type, the registry rule, a list schema with `max`, the hook's `value` as a list, the `Combobox` in chips mode with the rest disabled at `max` |
| **3b Checkboxes** | `type: "checkboxes"` on an array column, listed or from a hook, with "Load more" for a paged hook |
| **3c Array filters** | `$overlap` on array columns, proven through the real route |

Rewritten on 2026-11-12 (main spec D18): the earlier 3a and 3b - `type: "options"` with four inputs,
`prepareFieldOptions` and a loader run on the server - are dropped. One value from a list or a hook, and
the unknown values and failing hooks of every options field, are `sub-admin-extension-registry`'s.

### Phase 4 - Dropped

Exclusive flags and scopes, dropped before release (user, 2026-11-18; Alternatives Considered). The
number is kept so the later phases keep theirs.

### Phase 5 - Relations and dictionaries

| Sub-phase | Goal |
|---|---|
| **5a Introspection and writes** | Moved to [sub-relations](./2026-11-22-sub-relations.md) (2026-11-22) |
| **5b `drafts: false`** | The events of main spec D38 first; live on creation and at each save, `publish` and `unpublish` refused; from the closed `sub-versions-and-drafts`, no versions for such a collection |
| **5c Pickers and search** | Moved to `sub-relations` (2026-11-22); a commerce reference stays a combobox fed by a hook (main spec D18; user, 2026-11-12) |
| **5d Store reads** | Moved to `sub-relations` (2026-11-22) |

Brought forward for [sub-singletons](./ended/2026-11-18-sub-singletons.md) (user, 2026-11-18): **5b** before its
Phase 1, as a singleton requires `drafts: false`. **5a, 5c and 5d** moved to
[sub-relations](./2026-11-22-sub-relations.md) (user, 2026-11-22), whose Phase 1 - a `belongsTo` to
another collection, the check that an id is a live document of the target, and the read of what
references a document - comes before `sub-singletons`' Phase 3; the refusal of an unpublish or a delete
of a referenced document is the host's, through a hook of
[sub-workflow-hooks](./2026-11-22-sub-workflow-hooks.md), and the plugin's picker waits for
`sub-admin-building-blocks`.

The read of references, `list-cms-references` (user, 2026-11-18), is specified in `sub-relations`, P1b.2.

### Phase 6 - Release

| Sub-phase | Goal |
|---|---|
| **6a Packed package** | `npm pack`, installed in a host project instead of yalc; routes and Admin run |
| **6b Publication** | The first npm version, on the maintainer's decision |

## Implementation Plan

### Phase 0 and sub-phase 1.0

Done: the repository, its scripts and agent rules, the yalc link, the config types, `defineConfig`,
`describeModel`, `prepareRegistry` (collections only, from the DML models the config passes; the rules of
blocks, lists, nesting and media come with 1c-1f), `getRegistry`, the `cms` module and
`GET /admin/cms/health`, each with unit tests; their files are in the layout of
[sub-lib-cleanup](./ended/2026-11-10-sub-lib-cleanup.md).

### Sub-phase 1a - Pages through the API

1. **P1a.1 - Projection and collections route**
   - **Outcome:** the `ClientCollection` type; the `list-cms-collections` step and workflow;
     `GET /admin/cms/collections`.
   - **Areas:** `src/lib/`, `src/workflows/cms/`, `src/api/admin/cms/`
   - **Verification:** step test of the projection (no `key`) and of the count;
     a workflow integration test (manual run): a soft-deleted document not counted; an HTTP test (manual
     run): 200 with the collection, 401 without a session.

2. **P1a.2 - Document schema**
   - **Outcome:** `buildDocumentSchema` for a document's own columns, `shape` and `publish`;
     `buildDocumentErrors` and `formatDocumentErrors`.
   - **Areas:** `src/lib/`
   - **Verification:** unit tests: each field kind, unknown keys, system columns, `required` at publish,
     the error lines.

Integration tests run in the plugin, on its test module with the `Test*` models and a Docker Postgres
(2026-11-09); a host project keeps its config test on its real models.

Steps from P1a.3 on are vertical slices: each adds the workflow, the route and the screen of one
action, and ends in something the user can click (user, 2026-11-08). Store reads move to sub-phase 1h.

3. **P1a.3 - Documents table**
   - **Outcome:** the `list-cms-documents` step and workflow (uncached, no areas: `q` over the searchable
     columns, `status`, `order`, `limit` default 20, `offset`);
     `GET /admin/cms/collections/:collection/documents`; `ensure-collection`, for the first routes with
     `:collection`; the registry's check of `useAsTitle` and `defaultColumns`; `/app/cms/:collection`, a
     dashboard `DataTable` with URL state (`useAsTitle`, `defaultColumns`, status badge, `updated_at`,
     search when a column is searchable, status filter), reached from a row of `/app/cms`.
   - **Areas:** `src/lib/`, `src/workflows/cms/`, `src/api/admin/cms/`, `src/api/middlewares/`,
     `src/admin/`
   - **Verification:** unit test of the registry's check; step test of `list-cms-documents` (filters,
     order, count); HTTP test (manual run): the list, `q`, `status`, 404 for an unknown
     collection, 401; the user's walkthrough of the table.

4. **P1a.4 - Create a document**
   - **Outcome:** the registry's checks for writes and the id prefix (Registry resolution); the steps
     `list-cms-taken-values`, `prepare-cms-document-input`, `validate-cms-document`, `prepare-cms-write`
     (columns only), `create-cms-document-content`; the `create-cms-document` workflow;
     `POST /admin/cms/collections/:collection/documents` with `verify-document-body`; the
     `/app/cms/:collection/@create` modal with the columns required always or at publish, media fields
     excepted until 1f, through ManagerFields. `clear-cms-cache` moves to 1h, where the first cached read
     comes (user, 2026-11-09); the test model's unique slug index comes with the user's migration.
   - **Areas:** `src/lib/`, `src/workflows/cms/`, `src/api/admin/cms/`, `src/api/middlewares/`,
     `src/admin/`
   - **Verification:** unit tests of the registry's checks for writes, each refused once; step tests: slug
     filled and de-duplicated, authorship from the actor, a duplicate slug, invoke and compensate of
     `create-cms-document-content`; HTTP test (manual run): created, a 400 with its lines, a 422 for a
     duplicate slug; the user's walkthrough.

5. **P1a.5 - Document page and save**
   - **Outcome:** the `get-cms-document` step and workflow; the `update-cms-document` workflow;
     `GET` and `POST /admin/cms/collections/:collection/documents/:id`; `/app/cms/:collection/:id` with
     the document's fields rendered by kind (ManagerFields, UI/UX), created and updated by
     and at, and **Save**; the slug fills from its source as in the create modal; the form validates with `buildDocumentSchema` and maps the server's lines to
     the fields with `parseDocumentErrors`.
   - **Steps:**
     1. Move `cms-slug-fill`, `cms-taken-value-check` and `cms-document-validation` to
        `src/admin/cms/common/`, as a commit of its own, since the document page uses them too.
     2. Read: the `get-cms-document` step (the generated `retrieve`, `NOT_FOUND` for an unknown or
        soft-deleted document, no areas until 1c) and workflow; `GET .../documents/:id`.
     3. Write: `list-cms-taken-values` takes the edited document's `id`, whose values do not count, and
        so do `GET .../taken-values` and `POST .../validate`; `buildDocumentSchema` takes `partial`,
        which requires only the keys present, and `verify-document-body` uses it on a route with
        `:id`; `prepare-cms-document-input` takes the stored document, stamps only `updated_by` and fills
        a slug sent empty from the body's or the stored source; `validate-cms-document` checks the
        stored editable values with the body over them; `prepare-cms-write` takes the stored document
        and returns an `update` call; the write step of P1a.4 splits into `create-cms-document-content`
        and `update-cms-document-content`, one per kind of call (user, 2026-11-09), and the update's
        compensation writes the stored values back;
        the `update-cms-document` workflow; `POST .../documents/:id`. The `publish` schema on a saved
        published document waits for P1a.6, which makes the first published one.
     4. Admin: `parseDocumentErrors`; `useDocument` and `useUpdateCmsDocument`; `/app/cms/:collection/:id`
        with the edit form and the created and updated section; a row of the table opens the document;
        the create modal opens it after a save and maps a refused save onto its fields.
     5. Field groups and the slug lock (user, 2026-11-09): `admin.groups` and `lockOnEdit` in the config
        types, the registry's checks and the projection; the edit form's sections in both columns and the
        modal's subheadings, through one component that renders a set of fields; the locked slug with
        **Unlock** on the document page.
   - **Areas:** `src/lib/`, `src/workflows/cms/`, `src/api/admin/cms/`, `src/api/middlewares/`,
     `src/admin/`
   - **Verification:** unit tests of `partial`, `parseDocumentErrors` and the registry's checks of `groups`
     and `lockOnEdit`, each refused once; step tests of `get-cms-document`
     (404 for an unknown or deleted document), of the edited document's id in `list-cms-taken-values`,
     of the update paths of `prepare-cms-document-input`, `validate-cms-document` and
     `prepare-cms-write`, and of invoke and compensate of `create-cms-document-content` and
     `update-cms-document-content`;
     workflow integration test (manual run): create, then update; HTTP test: read, update, a 400 with its
     lines, a 422 for another document's slug, its own slug kept, 404; the user's walkthrough with a
     server error shown on its field.

6. **P1a.6 - Publish and unpublish**
   - **Outcome:** `prepare-cms-publish` and `prepare-cms-unpublish`; the `publish-cms-document` and
     `unpublish-cms-document` workflows with `cms.document.published` and `cms.document.unpublished`; their
     routes; **Publish** and **Unpublish** on the document page, the status badge, and "Changes go live
     when you save." on a published document.
   - **Steps:**
     1. Backend: `prepare-cms-publish` returns an update of `{ status: "published", published_at }`, the
        time created in the step, and `prepare-cms-unpublish` one of `{ status: "draft",
        published_at: null }`, each refusing with `NOT_ALLOWED` a document already in that status;
        `validate-cms-document` takes a `mode`, and checks the `publish` schema on the stored document
        for a publish and on a save of a published document; `publish-cms-document` (`get-cms-document`
        -> `validate-cms-document` in `publish` mode -> `prepare-cms-publish` ->
        `update-cms-document-content` -> `emitEventStep` `cms.document.published`) and
        `unpublish-cms-document` (`get-cms-document` -> `prepare-cms-unpublish` ->
        `update-cms-document-content` -> `emitEventStep` `cms.document.unpublished`); `POST
        .../documents/:id/publish` and `.../unpublish`. `clear-cms-cache` waits for 1h, and `drafts:
        false`, not yet in the config, for phase 5.
     2. Admin: a status section at the top of the side column with the badge, **Publish** or
        **Unpublish**, each behind a confirmation; **Publish** disabled with "Save your changes first"
        while the form holds unsaved changes, because it publishes the stored document; **Save** stays
        apart in the main section (user, 2026-11-09). A refused publish maps its lines onto the fields
        with `parseDocumentErrors`. A published document's form checks the `publish` schema and shows
        "Changes go live when you save." until versions (1b) replace it.
   - **Areas:** `src/workflows/cms/`, `src/api/admin/cms/`, `src/admin/`
   - **Verification:** step tests of both `prepare-` steps and of `validate-cms-document` in `publish`
     mode; workflow integration test: publish refused without its required fields, then published and
     unpublished; HTTP test: publish and unpublish, a 400 with its lines, a second publish refused, a save
     of a published document emptying a field required at publish refused, 404 and 401; the user's
     walkthrough.

7. **P1a.7 - Delete a document**
   - **Outcome:** `delete-cms-documents` with its compensation; the `delete-cms-document` workflow with
     `cms.document.deleted`; `DELETE /admin/cms/collections/:collection/documents/:id`; **Delete** in the
     document's action menu, with a prompt.
   - **Steps:**
     1. Backend: `delete-cms-documents` soft-deletes through the generated method, and its compensation
        calls the generated `restore` until 1c (Workflows); `delete-cms-document` (`get-cms-document`
        -> `delete-cms-documents` -> `emitEventStep` `cms.document.deleted`, named in `DocumentEvents`);
        `DELETE .../documents/:id`. A published document can be deleted (user, 2026-11-09).
     2. Admin: an action menu beside **Save** with **Delete**, behind a confirmation that says a
        published document leaves the storefront; on success the table, with its counts read again.
        Deleting from the table waits (user, 2026-11-09).
   - **Areas:** `src/workflows/cms/`, `src/api/admin/cms/`, `src/admin/`
   - **Verification:** step test of invoke and compensate; HTTP test: deleted, then 404 and out of the
     list, its slug free for another document, 404 for an unknown document, 401; the user's walkthrough.

**Exit gate of 1a:** plugin unit tests, lint, typecheck and format pass; the host project's HTTP and
workflow tests pass in a manual run; the user creates, edits, publishes, unpublishes and deletes a page in
**Content**.

### Sub-phase 1c - Blocks in an area

Blocks without lists and without nesting: the registry, the read, the write and its undo, versions and
the Admin. Lists stay as stored: a body without a list key leaves it untouched (Admin API), and the read
leaves list relations out until 1d. Every area in 1c has `parent_id` `null`.

1. **P1c.1 - A second block type in the test module**
   - **Outcome:** `TestCallout` (`tcall`, `body` text nullable, `rank`, `belongsTo` `TestSection` as
     `callouts`) in `integration-tests/modules/test-content/models/`; `callouts` `hasMany` and its
     cascade on `TestSection`; a `callout` block in `buildTestConfig`, allowed in `sections`. Two block
     types let the tests order blocks across types and change a block's type.
   - **Areas:** `integration-tests/modules/test-content/`
   - **Verification:** the existing unit tests pass on the new config. **Stop:** the user runs
     `yarn test:db:generate` and the migration before the integration tests of later steps.

2. **P1c.2 - Blocks in the registry and the projection**
   - **Outcome:** `describeModel` returns relations, cascades and checks; `prepareBlock`
     (`src/lib/block/prepare-block.ts`) resolves a block's fields as a collection's are, and `rank`; the
     area model resolved apart (`src/lib/area/prepare-area-model.ts`); the 1c rules of Registry resolution;
     the registry holds `blocks`, `area` and each collection's `areas`, each area with its relation and
     owner column, and each block with its relation name on the area model; `groups[].areas` checked.
     `list-cms-collections` adds to its projection the collection's areas with their block slugs,
     `minRows` and `maxRows`, and each block they allow, described once, with its fields and
     `groups`.
   - **Areas:** `src/lib/`, `src/workflows/cms/steps/list-cms-collections.ts`
   - **Verification:** unit tests of each 1c rule, each refused once on a broken copy of the test config;
     the step test of `list-cms-collections` (areas, blocks once, no `key`, no `relation`); the HTTP test of `GET /admin/cms/collections` carries the areas.

3. **P1c.3 - Read a document with its areas**
   - **Outcome:** `buildDocumentAreas(registry, collection, document)` (`src/lib/document/build-document-areas.ts`,
     pure): groups blocks by area name, orders them by `rank` across block types, adds `block_type`,
     marks a stale block `allowed: false` (Reading and writing areas); `get-cms-document` reads through `query.graph` on the
     collection's entity with `areas.*` and `areas.<block relation>.*` for every configured block type,
     and returns each area under its name, `rank`, the block's area column and the area rows left out,
     so `buildAdminDocumentRead` carries them as they are. The registry records each block's area
     column as `areaColumn`, kept out of the projection. P1c.3b replaces both with the fixed names.
   - **Areas:** `src/lib/`, `src/workflows/cms/steps/get-cms-document.ts`, `src/workflows/cms/utils/`
   - **Verification:** unit tests of `buildDocumentAreas`: order across types, an empty area, a stale block
     marked, an unconfigured type not read; step test of `get-cms-document` with areas; HTTP test:
     `GET .../documents/:id` returns blocks created through the test module's service, in order.

3b. **P1c.3b - The area model from the relations**
   - **Outcome:** `Config` loses `area`, and `blocks` becomes optional; `prepareRegistry` finds the area
     model (`findAreaModel`, `src/lib/area/find-area-model.ts`) as the target of each collection's
     `areas` and each block's `area`, fails at once on a missing relation, two targets or an area model
     without its columns, and resolves none for a config with neither areas nor blocks, so `prepareBlock`
     takes the area model as given, and an area model left `undefined` means a config without areas; `RegistryAreaLink.relation` and
     `RegistryBlock.areaColumn` go, and `validateAreaLink` and `validateBlockRelation` check the fixed
     names; `get-cms-document` reads `areas.*` and keeps the area rows under `areas`; `buildDocumentAreas`
     keeps `rank` and `area_id`, and `buildAdminDocumentRead` leaves out `areas`, and `rank` and `area_id`
     from the blocks of each area named in `areas`. The test module: `TestRecipe.sections` becomes
     `areas`, `section` on `TestStep` and `TestCallout` becomes `area`, their indexes on `area_id`; its
     config loses `area`.
   - **Areas:** `src/lib/`, `src/workflows/cms/steps/get-cms-document.ts`, `src/workflows/cms/utils/`,
     `integration-tests/modules/test-content/`
   - **Verification:** registry unit tests, each refused once on a broken copy of the test config: no
     `areas` on a collection with areas, no `area` on a block, two area models, an area named `areas`;
     a config with neither areas nor blocks resolves without an area model; unit tests of
     `buildDocumentAreas` and `buildAdminDocumentRead`; the step test of `get-cms-document`. **Stop:** the
     user runs `yarn test:db:generate` and the migration; then the HTTP tests `admin-cms-documents` and
     `admin-cms-collections`. The host project drops `area` from its config once the plugin reaches it
     through yalc.

4. **P1c.4a - The block gaps of sub-lib-cleanup D5**
   - **Outcome:** `prepareFields` (`src/lib/field/prepare-fields.ts`), which collections and blocks
     share, calls `validateSlugFields` and returns the fields with their `validation` and
     `slugTransforms`, today built by `prepareCollection` alone; `RegistryBlock` records both, as
     `RegistryCollection` does, and keeps them out of `ClientBlock`, so a block's slug fields are checked
     as a collection's and its fields' `validation` reaches the schema of P1c.4b.
   - **Areas:** `src/lib/field/`, `src/lib/collection/`, `src/lib/block/`,
     `src/workflows/cms/steps/list-cms-collections.ts`
   - **Verification:** registry unit tests: a block's slug field on a column that is not text, a block's
     slug from a column that is not text, a block field's `validation` of the wrong type, each refused on a
     broken copy of the test config; a block's `validation` and `slugTransforms` recorded; the step test of
     `list-cms-collections` (neither on a block of the projection).

   **P1c.4b - Areas in the schema**
   - **Outcome:** `buildDocumentSchema(z, collection, options)` takes `{ fields, areas, blocks }`, each
     block with its `slug` and `fields`: the Admin passes its projection, the server the registry's
     collection with `Object.values(registry.blocks)`. Each area is an array; an item whose
     `block_type` the area allows is that block's fields, strict, with an optional `id`; any other item is
     `{ id, block_type }` only, strict, with `id` required, so a stale block keeps its place and an unknown
     type is refused by `validate-cms-document` (P1c.5) when no stored block has that id. `publish` adds
     each block's `required: publish` and the area's `minRows` and `maxRows`; `beforeFill` reaches block
     fields, and `partial` applies to the document's own keys only, a block being checked whole; an area
     key absent from the body is not checked. `options.blockValidation`, the registry's `validation` of
     each block by its slug, applies as `validation` does on the document. Paths as
     `sections.2.heading`. Until P1c.5 nothing passes areas to the schema on a request:
     `findDocumentErrors` and the Admin forms keep checking the document's own fields, so a body with an
     area key is still refused as unknown.
   - **Areas:** `src/lib/document/build-document-schema.ts`, `src/lib/document/types.ts`
   - **Verification:** unit tests of the schema: blocks of two types in order, a type outside the area as
     `{ id, block_type }` passes, the same with values refused, a block without `block_type`, a missing
     required field at publish at `sections.0.heading`, `minRows` and `maxRows` at publish only, a block
     field's `validation` with its message, an area key absent from a partial body.

   **P1c.4c - The write plan**
   - **Outcome:** `prepareDocumentWrite(registry, collection, documentId, stored, submitted)`
     (`src/lib/document/prepare-document-write.ts`, pure) returns the `DocumentWrite` of Reading and
     writing areas (`src/lib/document/types.ts`), which replaces `CmsWrite` in `prepare-cms-write` and the
     inputs of the write steps. `stored` is the document as `get-cms-document` reads it, or nothing for a
     new one; `submitted` holds the prepared `values`, the authorship and, from P1c.5, the body's area
     keys. The document row is created with `documentId`, `created_by` and `updated_by`, or updated with
     its values and `updated_by`; for each area key present: the area row created, with an id from the
     area model's prefix, the owner column and `parent_id` `null`, when `stored.areas` holds none of that
     name; a block whose id is a stored block of that area or another area of the document updated with
     its values, `rank` (its position) and `area_id`; one without a known id created with an id from its
     model's prefix; a stored block the area no longer carries deleted; a changed `block_type` a delete
     and a create; a `{ id, block_type }` block updated with its `rank` only. An area key absent from the
     body is left as stored. Creates come parents first: the document, then the area rows, then the
     blocks. The step `prepare-cms-write` generates a new document's id, as today, and calls it; until
     P1c.5 no area key reaches it, so its plan holds the document row and an empty `delete`.
   - **Areas:** `src/lib/document/`, `src/workflows/cms/steps/prepare-cms-write.ts`,
     `src/workflows/cms/steps/create-cms-document-content.ts`,
     `src/workflows/cms/steps/update-cms-document-content.ts`
   - **Verification:** unit tests of `prepareDocumentWrite`, each row of Edge Cases marked for it:
     reorder (same ids, new ranks), type change, move between areas, unknown id, removed block, a stale
     block, absent area key, a new document with blocks, an area without a row yet, parents first; the
     step tests of `prepare-cms-write` and the two write steps pass on `DocumentWrite`.

5. **P1c.5 - Save a draft with blocks**
   - **Outcome:** `listRevivedRows(restored, live)` (`src/lib/document/list-revived-rows.ts`, pure),
     which finds the rows a restore brought back that were not live; `delete-cms-document-content`,
     which soft-deletes, and whose compensation restores and deletes again what `listRevivedRows`
     finds; `update-cms-document-content` writes back each row's stored
     values from the stored tree, blocks included; `validate-cms-document` refuses a stale block whose id
     is not stored in its area (400 at its path); `create-cms-document` and the draft branch of
     `update-cms-document` run `create-` -> `update-` -> `delete-cms-document-content` and answer the
     document read back with `get-cms-document`, so new blocks carry their ids; `delete-cms-documents`
     restores the same way, with the live ids from `get-cms-document`.
     `findDocumentErrors`, and so `verify-document-body` and `validate-cms-document`, check areas with the
     schema of P1c.4b, and the workflows pass the body's area keys to `prepare-cms-write`.
   - **Areas:** `src/workflows/cms/`, `src/api/middlewares/verify-document-body.ts`
   - **Verification:** unit test of `listRevivedRows`: a restored row not live is found; step tests of invoke and compensate of the three write steps and of
     `delete-cms-documents`, a failed call answered with `permanentFailure`; module integration test: a
     compensation leaves a block removed by an earlier save removed; HTTP test: create with blocks, reorder
     (same ids), remove, change a type, a block outside the area (400 with its path), a second save with
     the returned ids keeps one row per block, delete and its areas gone from a read.

6. **P1c.6 - Blocks in versions**
   - **Outcome:** `prepare-cms-version-snapshot` keeps each area of the collection as the read returns
     it, without `allowed`, and counts an area in `changed_fields` when its blocks differ; a restore
     leaves out a block whose type is not in its area's list now, logged once at `warn`; the published
     branch of `update-cms-document` checks areas in `shape` mode and records them in the draft version;
     `publish-cms-document` writes the latest snapshot's areas through `prepareDocumentWrite` with the status
     update, runs the create and delete steps, and builds the published version from the rows read
     back, so a block added in a draft gets its id; discard and the version view show areas.
   - **Areas:** `src/workflows/cms/`
   - **Verification:** step tests of `prepare-cms-version-snapshot` (an area changed, unchanged, a
     restored stale block); workflow integration tests carried from `sub-versions-and-drafts`: a block
     added in a draft gets an id at publish and keeps it through later saves; a restore of a version
     holding a block type no longer allowed; HTTP test: a published page's save leaves its blocks rows
     unchanged until publish.

7. **P1c.7 - Blocks in the Admin**
   - **Outcome:** each area of the form lives under `document.<area>`, so the server's paths
     (`sections.2.heading`) land on their fields through `setCmsServerErrors` unchanged. `AreaField`
     (`src/admin/cms/common/cms-area-field/`) runs `useFieldArray` on it: a collapsible card per block
     with its label and first text value, move up and move down (`move`), remove, and **Add block**, a
     `DropdownMenu` of the area's allowed types, which appends `{ block_type }` with each field's empty
     value; a block's fields render through `ManagerFields` under `document.<area>.<index>`, and
     `DateFields` takes the same prefix in place of its fixed `document.`. The block's database id is
     read from the form's values (`useWatch`), never from `fields[i].id`, which `useFieldArray`
     generates for React keys. A stale block shows as a card with "This block type is no longer allowed
     here." and remove only, and is sent as `{ id, block_type }`. An area in no group gets a section of
     its own; one named in a group's `areas` sits in that section after its fields. After a save the form
     resets from the answer. The create modal shows no areas; blocks are added on the document page.
     Every text is a key under `cms` in `en.json`, per `codee-ui-copy`.
   - **Areas:** `src/admin/cms/`, `src/admin/i18n/json/en.json`
   - **Verification:** `yarn typecheck:admin`, lint and format; the user's walkthrough in the host
     project: add a hero and a grid, reorder, save, reload in the same order, remove one, a refused save
     opens on its block's field, publish, and a block type removed from `sections` in the config shown
     as a remove-only card.

**Exit gate of 1c:** plugin unit tests, lint, typecheck and format pass; the integration tests pass in a
manual run; the user adds, reorders and removes blocks in the Admin and sees them in order after a
reload.

### Sub-phase 1d - Repeaters and depth

Main spec D32 and D26; 1e merged into it (user, 2026-11-16). A block's `repeaters` are areas inside it
whose items are blocks, at any depth down to `maxDepth`, and removing a block removes what its
repeaters hold. The read already loads every area row of a document, nested ones included, since each
points at its document; what changes is how the tree is built from them, walked, checked and written.

**Settled** (user, 2026-11-16):

- `lists`, `ListConfig` and a block's `areas` leave the config types; `repeaters` replaces them. A
  breaking change of the config, stated in the changeset.
- A block type may sit inside itself, directly or through another type; `maxDepth` (default 4) bounds
  it.
- A repeater shows inside its block's open card, after the card's fields and sections, under its label.
  Placing a repeater in one of the block's sections waits until a config needs it.
- The host's grid: `items` lists `grid_item` and `image_text`, `minRows: 1`; `grid_item` (the former
  list row, `label` and `value`) keeps the row's `content` as a repeater of `hero` and `grid`, which
  proves nesting and `maxDepth` there.

**Review of the code 1d touches** (2026-11-16), which the steps below act on:

- Eleven functions walk a document's areas one level deep, each in its own way: on the server
  `buildLiveRows`, `indexStoredRows` in `update-cms-document-content`, `findStaleBlockErrors` in
  `validate-cms-document`, the stored blocks of `prepareDocumentWrite`, `buildMediaPlacement`,
  `listMediaSlots` with `placeMediaRecords` (a shallow copy of each area, then mutated in place),
  `buildAreaSnapshot` and `omitAreaRows`; in the Admin `buildEditDefaults`, `emptyToNull`,
  `collectFormMedia` and `buildDocumentValue`. Each would have to learn recursion on its own. Two
  functions over one shape replace the walking in all of them (P1d.3).
- That shape - the areas, and each block type with its repeaters - is what both sides hold: the server
  as the collection and the registry's blocks, the Admin as its projection. `buildDocumentSchema`
  already reads the same pair, so the walk takes it too and serves both, with no registry in the Admin.
- `prepareDocumentWrite` finds each submitted block among the stored ones with `find`, and each stored
  block among the kept ids with `includes`, quadratic once stored blocks span every depth; the diff
  walks a `Map` of the stored blocks by id and a `Set` of kept ids instead, the index `AGENTS.md`
  allows. `findAreaRow` keeps its `find`: a few area rows, read where needed.
- `buildAreaSchema` builds the schema of every allowed type for each area; with a type inside itself
  that is repeated at every depth, in the Admin on every change of mode too. Each type's schema is built
  once per depth within one `buildDocumentSchema` call, and the five arguments travel as one context.
- The projection and `buildMediaPlacement` each collect the block types of the collection's own areas.
  One function lists every type the areas reach, through repeaters too, and both use it.
- Unchanged, as they stay right with nesting: `splitDocumentAreas` and `buildUpdatePayload`, which work
  on the document's own areas, a change deep in a repeater making its top area differ; `addRow` and
  `addDeletedId`, whose `find` runs over one call per model.

1. **P1d.1 - Config types and the test module**
   - **Outcome:** `BlockConfig.repeaters?: Record<string, AreaConfig>` (main spec D32), and `lists`,
     `ListConfig` and the block's `areas` removed from `src/lib/config/types.ts`; a changeset stating the
     break. The test module: `TestTip` becomes a block type - `area` `belongsTo` `TestSection` in place
     of `step`, an index on `(area_id, rank)` - and `TestSection` gains `tips` `hasMany` and its cascade;
     `TestStep` loses `tips` and its cascade; `TestSection`'s owner index adds `parent_id IS NULL`, and a
     unique index on `(parent_id, name)` where `parent_id IS NOT NULL AND deleted_at IS NULL` joins it,
     as two blocks may each hold a repeater of one name. `buildTestConfig` adds a `tip` block (`text`)
     and gives `step` `repeaters: { tips: { label: "Tips", blocks: ["tip", "step"] } }`, a step inside a
     step proving self-nesting; `minRows` stays out of the shared config, so existing publish tests are
     unchanged, and is tested on a copy.
   - **Areas:** `src/lib/config/types.ts`, `.changeset/`, `integration-tests/modules/test-content/`
   - **Verification:** `yarn typecheck`; the unit tests pass, the registry not resolving `repeaters`
     yet. The host's config, still on `lists`, stops typechecking against the plugin until P1d.9.
     **Stop:** the user runs `yarn test:db:generate` and the migration before the integration tests
     of later steps.

2. **P1d.2 - Repeaters in the registry and the projection**
   - **Outcome:** `prepareBlock` resolves `repeaters` through `prepareAreas` with the block's model as
     the holder, recorded as `RegistryBlock.repeaters: RegistryArea[]`; `prepareRegistry` resolves
     `maxDepth` (a positive whole number, 4 when left out) onto the registry. `listReachableBlocks(areas,
     blocks)` (`src/lib/block/list-reachable-blocks.ts`, pure) lists, once each and in the order first
     named, every block type the areas reach through repeaters, a type inside itself included.
     `ClientBlock` gains `repeaters`, `ClientCollection` `maxDepth`, and `list-cms-collections` builds
     the projection's `blocks` with `listReachableBlocks` in place of its own set of the areas' types.
   - **Areas:** `src/lib/block/`, `src/lib/area/prepare-areas.ts`, `src/lib/registry/`,
     `src/lib/collection/types.ts`, `src/workflows/cms/steps/list-cms-collections.ts`
   - **Verification:** registry unit tests, each refused once on a broken copy of the test config: a
     repeater naming a type not configured, named as a column of the block's model, named `areas`;
     `maxDepth` `0` and `1.5`; a step inside a step accepted. Unit test of `listReachableBlocks`: a type
     reached only through a repeater, a cycle listed once. The step test of `list-cms-collections`: `tip`
     in `blocks`, `repeaters` on `step`, `maxDepth`. The HTTP test of `GET /admin/cms/collections`
     carries them.

3. **P1d.3 - One walk over a document's blocks** (no change in behaviour; the review above)
   - **Outcome:** in `src/lib/document/`, pure, each in a file of its own:
     - `DocumentShape` (`types.ts`): `{ areas: RegistryArea[]; blocks: { slug: string; repeaters:
       RegistryArea[] }[] }`, which a `RegistryCollection` with `Object.values(registry.blocks)` and a
       `ClientCollection` both fit;
     - `listDocumentBlocks(shape, document)`: every block under the shape's areas and, through each
       block's type, its repeaters, at any depth, as `{ block, path, area, parentId }` - `path` the dot
       path (`sections.4.items.0`), `area` the area or repeater it sits in, `parentId` the id of the
       block holding that repeater, `null` in a document's own area; a block whose type is not in the
       shape is listed without its repeaters;
     - `mapDocumentBlocks(shape, document, mapBlock)`: a copy of the document with each area and
       repeater rebuilt from `mapBlock(block, { path, area })` at any depth, the document's own keys and
       the blocks untouched otherwise;
     - `findAreaRow(rows, name, parentId = null)`, which finds a nested area's row too.

     The eleven walks move onto them with their results unchanged: `buildLiveRows`, `indexStoredRows`
     and the stored blocks of `prepareDocumentWrite` list through `listDocumentBlocks`;
     `findStaleBlockErrors` takes each block's `path` and `area` from it; `MediaPlacement` loses `areas`
     and `buildMediaPlacement` takes its block types from `listReachableBlocks`, `listMediaSlots` lists
     through `listDocumentBlocks`, and `placeMediaRecords` builds its copy with `mapDocumentBlocks`
     instead of a shallow copy mutated in place; `buildAreaSnapshot` maps through `mapDocumentBlocks`;
     `rank` and `area_id` leave the Admin read in `completeAdminDocumentRead`, which replaces
     `placeAdminDocumentMedia` and takes the shape from the media read, since `buildAdminDocumentRead`
     runs in a `transform()` without the registry (2026-11-16); in the Admin, `buildEditDefaults`, `emptyToNull` and `buildDocumentValue`
     (which fills `CmsBlockValue.areas` with the block's repeaters) map, and `collectFormMedia` lists.
   - **Areas:** `src/lib/document/`, `src/lib/media/`, `src/workflows/cms/steps/`,
     `src/workflows/cms/utils/build-admin-document.ts`, `src/admin/cms/`
   - **Verification:** unit tests of `listDocumentBlocks` and `mapDocumentBlocks` on a tree three levels
     deep (paths, `parentId`, a type not in the shape, an absent repeater key); the existing unit and
     step tests of every function moved pass unchanged, which is the proof this step changes nothing.

4. **P1d.4 - Read a document with its repeaters**
   - **Outcome:** `buildDocumentAreas` puts under each block each repeater of its type, from the area
     row of that name whose `parent_id` is the block's id (`findAreaRow`), `[]` when there is none, and
     marks a stale block in a repeater as in an area; `get-cms-document` keeps its query and logs at
     `warn`, once per document, the area rows no live block and not the document holds (Reading and
     writing areas); `completeAdminDocumentRead` leaves out `rank` and `area_id` at any depth. The
     snapshot, the Admin's defaults and its media follow the deeper tree with no change of their own.
   - **Areas:** `src/lib/document/build-document-areas.ts`, `src/workflows/cms/steps/get-cms-document.ts`
   - **Verification:** unit tests of `buildDocumentAreas`: a step in a step's `tips`, an empty repeater,
     a stale block in a repeater, two steps each with `tips`, an area row whose block is gone left out;
     the step test of `get-cms-document` (the warning once); HTTP test: `GET .../documents/:id` returns
     tips created through the test module's service, in order, under their step.

5. **P1d.5 - Repeaters and depth in the schema**
   - **Outcome:** `buildBlockSchema` adds each repeater of its type as an optional area schema; areas and
     repeaters check their blocks alike, `minRows` and `maxRows` at publish; a repeater past `maxDepth`
     (counted from a document's own area as level 1) takes no blocks (`Blocks cannot be nested this
     deep`). Each block type's schema is built once per depth within one call, and `buildAreaSchema`,
     `buildBlockSchema` and the shape's lookup take one context (`z`, blocks, rules, block schemas,
     `maxDepth`). `SchemaCollection` takes `maxDepth`; `findDocumentErrors` passes the registry's, the
     Admin its projection's.
   - **Areas:** `src/lib/document/build-document-schema.ts`, `src/lib/document/find-document-errors.ts`
   - **Verification:** unit tests of the schema: a tip and a step in a step's `tips` in order; a type
     the repeater does not list refused with values at `sections.0.tips.0`, passing as `{ id, block_type }`;
     a field required at publish missing at `sections.0.tips.1.text`; a repeater's `minRows` at publish
     only; a step nested past `maxDepth` 2 refused at its path; a block's `serverPublishValidation` in a
     repeater with its message.

6. **P1d.6 - Write repeaters, and remove what a block holds**
   - **Outcome:** `prepareDocumentWrite` writes each repeater key a submitted block carries as an area:
     its row found by the block's id and the repeater's name or created with the owner column and
     `parent_id` set to that id - generated first for a new block - and its blocks created, updated
     (`area_id` and `rank`) or moved from anywhere in the document; a removed block takes its
     repeaters' rows and every block and row under them at any depth into `delete`, unless the body
     moved one elsewhere; a changed type deletes the old block's tree; a stale block keeps its
     repeaters. The diff indexes the stored blocks by id in a `Map` and the kept ids in a `Set`. The
     stale-block check refuses, at any depth, a block of a type its repeater does not list unless that id
     is stored in the same repeater of the same block. Creates stay parents first: the document, then
     every area row, then every block - a block's foreign key is its area row's, and an area row's
     `parent_id` has none, so a new block's id generated in the plan is enough.
   - **Areas:** `src/lib/document/prepare-document-write.ts`, `src/workflows/cms/steps/validate-cms-document.ts`
   - **Verification:** unit tests of `prepareDocumentWrite`, each 1d row of Edge Cases: a new step with
     tips, a tip moved out of its step and back, two steps' `tips` apart, a removed step taking its
     tips' row and tips at two levels, a moved tip spared, a changed type, a stale step keeping its tips;
     step tests of invoke and compensate of the three write steps over a nested tree; module
     integration test: a compensation restores a removed step's tips but not a tip removed by an
     earlier save; HTTP test: create a recipe with a step holding a tip and a step, reorder, move, a type
     outside the repeater (400 at its path), a second save with the returned ids writing no new rows,
     then delete the outer step and its tips gone from a read and from the table.

7. **P1d.7 - Media and versions at depth**
   - **Outcome:** with P1d.3 and P1d.4 the media read, the upload at save and the snapshot already reach
     every depth; this step adds what is new: a restore leaves out a stale block at any depth, logging
     its path, through `mapDocumentBlocks`; `changed_fields` names a top area when anything inside it
     changed, as its snapshot holds the repeaters; `publish-cms-document` writes a snapshot's nested
     blocks through `prepareDocumentWrite`, so a tip added in a draft gets its id at publish.
   - **Areas:** `src/workflows/cms/steps/prepare-cms-version-snapshot.ts`, `src/workflows/cms/workflows/`
   - **Verification:** step tests of `prepare-cms-version-snapshot` (a change in a tip counts its area;
     a restored stale tip left out with its path); step test of `list-cms-document-media` with a callout
     image in a step's `tips`; workflow integration test: a tip added in a draft keeps its id through
     publish and a later save.

8. **P1d.8 - `BlocksField` in the Admin** (main spec D31)
   - **Outcome:** `BlocksField` in `src/admin/components/manager-form-fields/blocks-field/`, importing
     nothing of the CMS: a `useFieldArray` list at a form path, a collapsible card per item with its type's
     label and summary, move up and down, remove, **Add block** for the types it is given, a remove-only
     card for an item of a type not given, and the card's content from a `renderBlock({ path, type,
     index })` the form passes. `AreaField`, `BlockCard`, `BlockSummary` and `OwnError` move there first, committed alone as a rename (`R`, not `RM`), then
     lose what ties them to the CMS: `useDocumentForm`, the collection, `ComponentNode` and the place
     context. The CMS's `AreaBlocks` (`src/admin/cms/common/area-blocks/`) gives `BlocksField` an area's
     types, and its `BlockContent` draws a block's fields and sections as `BlockCard` did, then each
     repeater of its type under its label as another `AreaBlocks` at `<path>.<repeater>`, inside the
     place context, whose length gives the depth: a block at `maxDepth` shows no repeaters. The document
     form uses `AreaBlocks` for its areas. The
     version view lists a repeater's blocks under their block. The copy moves from `cms.documents.blocks`
     to `managerFormFields.blocks`.
   - **Areas:** `src/admin/components/manager-form-fields/`, `src/admin/cms/`, `src/admin/i18n/json/en.json`
   - **Verification:** `yarn typecheck:admin`, lint and format; `git status --short` shows `R` for the
     move; the user's walkthrough in the plugin's test app or the host after P1d.9: a step's tips added,
     reordered, removed, a server error at `sections.0.tips.1.text` opening both cards, no repeaters on a
     block at `maxDepth`.

9. **P1d.9 - The host's grid on repeaters**
   - **Outcome:** in the host project, `ContentBlockGridItem` becomes a block type - `area` `belongsTo`
     `ContentArea` in place of `grid`, an index on `(area_id, rank)` - `ContentArea` gains
     `block_grid_items` and its cascade, and `ContentBlockGrid` loses `items` and its cascade; the config
     replaces the grid's `lists` with `repeaters: { items: { label: "Items", blocks: ["grid_item",
     "image_text"], minRows: 1 } }` and adds `grid_item` (`label`, `value`, `repeaters: { content: {
     label: "Content", blocks: ["hero", "grid"] } }`). The table's rows are assumed throwaway, as the
     plugin never wrote lists; the migration is the user's.
   - **Areas:** the host's `src/modules/content/models/`, `src/cms/config.ts`
   - **Verification:** the host's config test and `tsc` on the changed files; **Stop:** the user
     generates and runs the migration; then the exit gate's walkthrough.

**Exit gate of 1d:** plugin unit tests, lint, typecheck, admin typecheck and format pass; the
integration tests pass in a manual run; in the host, a grid with a grid item and an image and text block
is edited and reloaded in order, a hero in a grid item's `content` edited, a block past `maxDepth` not
offered, and the grid deleted with its items gone after a reload.

### Sub-phase 1f - Media

Next after 1c, before 1d and 1e (user, 2026-11-10). The design is main spec D29 and Media above.

**Settled** (user, 2026-11-10; main spec D29):

- The provider is named explicitly, with no default; `FileMediaProvider` has no `list`, a project's own
  provider may; on S3 `FileMediaProvider` answers Medusa's signed URLs as they are.
- A media field's config says what its column holds, `stores: "id" | "url"`; a read returns the record
  in place of the value, under the column's name, and nothing about it is stored.
- The store API returns a media record whole, as `retrieve` answers it, so the provider decides what is
  public; `media.allowedFields` goes, and `fields` selects a media key but not paths inside it.
- The upload route reads the file with `multer` in memory storage, as Medusa's `/admin/uploads`,
  imported as `@medusajs/medusa` ships it, not declared by the plugin; the provider gives the size
  limit, 10 MB by default for `FileMediaProvider`, which the projection carries to the drop zone.
- `accept` on a media field, JPG, PNG and WebP when left out, checked in the picker and sent as
  `mime_type` to `list`.
- The plugin does not cache `retrieve`; a provider caches its own.
- One file on a text column, several on an `array` column with `multiple: true` and an optional `max`,
  in 1f; the CMS keeps no table of media or of links.
- 1f is built with `FileMediaProvider` only; a provider over the host project's asset module comes
  later, as its own step.
- Deferred, not in 1f: a block saved without a media key that the read holds as `null` counts as a
  change in `changed_fields`; comparing a missing key as `null` waits for a later decision.

Today a media field (`type: "media"` on a text column) is resolved by the registry, checked as a text
by the schema, and left out of the Admin form (`getEditFields`), so a save keeps it as stored;
`metadata` is checked to be a `json` column and edited nowhere. The test config's `media` is the old
`MediaTarget`.

1. **P1f.1 - Media fields in the test module**
   - **Outcome:** `TestRecipe.cover_asset_id` renamed `cover`; a `gallery` `array` column on
     `TestRecipe`; an `image` text column and `metadata` on `TestCallout`. The test config only renames
     its `cover_asset_id` field to `cover`: `gallery`, the callout's `image` and `media.provider` need the
     keys P1f.3 adds, and join the config there.
   - **Areas:** `integration-tests/modules/test-content/`
   - **Verification:** the unit tests pass on the new models. **Stop:** the user runs
     `yarn test:db:generate` and the migration before the integration tests of later steps.

2. **P1f.2 - The provider class and `FileMediaProvider`**
   - **Outcome:** `src/lib/media/` holds `AbstractCmsMediaProvider` (`constructor(container, options)`,
     `static identifier`, `static stores`, `static validateOptions`, `maxFileSize`, abstract
     `retrieve(values, by)`, `upload(file)`, `delete(media)`, optional `list(query)`), the types
     `CmsMedia`, `CmsMediaUpload` and `CmsMediaListQuery`, and `FileMediaProvider`: `stores = ["id"]`,
     `retrieve` through `retrieveFile` per key, a `NOT_FOUND` left out, `upload` through `createFiles` with
     `access: "public"` and the content in base64, as Medusa's `/admin/uploads` route passes it
     (`@medusajs/medusa` `dist/api/admin/uploads/route.js:16-17`), answering `{ id, url }`
     with the upload's own `filename`, `mime_type` and `size`, `delete` through `deleteFiles`, no
     `list`, and `maxFileSize` from `options.maxFileSize`, 10 MB when left out (user, 2026-11-10). Exported from the
     package root.
   - **Areas:** `src/lib/media/`, `src/lib/index.ts`
   - **Verification:** unit tests of `FileMediaProvider` over a File Module stub: each method's call and
     answer, an empty `retrieve` without a call, `validateOptions` refusing a `maxFileSize` that is not a
     positive number.

3. **P1f.3 - `media.provider` in the registry and the projection**
   - **Outcome:** `MediaConfig` replaces `MediaTarget`; a media field takes `stores`, `accept`, `multiple`
     and `max`. `prepareRegistry` resolves `media.provider` and applies the 1f rules of Registry
     resolution: `resolve` a subclass of `AbstractCmsMediaProvider`, its `validateOptions` run, a media
     field refused without a provider, `stores` one the provider lists, a single field on a text column
     and a `multiple` one on an `array` column, `max` a positive integer only with `multiple`. The
     registry records `media: { resolve, options, identifier, stores, searchable }`, `searchable` when
     the class has `list`. `resolveMediaProvider(container, registry)` (`src/lib/media/`) builds the
     instance. Each media `Field` carries `stores`, `accept` (JPG, PNG and WebP by default), `multiple`
     and `max`. `GET /admin/cms/collections` answers `media: { searchable, maxFileSize }` next to
     `collections`, the provider's class and options left out. The test config names
     `FileMediaProvider`, gives `cover` `stores: "id"`, and lists `gallery` (`multiple: true`, `max: 3`,
     `accept` with PNG and PDF) on the recipe and `image` on the callout.
   - **Areas:** `src/lib/config/`, `src/lib/field/`, `src/lib/registry/`, `src/lib/media/`,
     `src/workflows/cms/steps/list-cms-collections.ts`, `integration-tests/modules/test-content/`
   - **Verification:** registry unit tests, each rule refused once on a broken copy of the test config;
     the step test of `list-cms-collections`; the HTTP test `admin-cms-collections` carries `media`.

4. **P1f.4 - Media in the schema, the write and the Admin read**
   - **Outcome:** `buildDocumentSchema` checks a single media field as a text and a `multiple` one as an
     array of texts, no more than `max`. `retrieve-cms-media` (`src/workflows/cms/steps/`) collects the
     stored values of every media field in the documents it is given, blocks included, and calls
     `retrieve` once per kind of value; it runs in `create-cms-document`, `update-cms-document` and
     `validate-cms-document` on the submitted values, before `validate-cms-document`, which refuses at
     its path a value the provider did not find, and in every Admin workflow that answers a document,
     on what it answers. `buildAdminDocumentRead` puts each record in place of its value, `null` when
     not found, and a `multiple` field's records in order, without the missing ones.
   - **Areas:** `src/lib/document/`, `src/workflows/cms/steps/`, `src/workflows/cms/workflows/`,
     `src/workflows/cms/utils/build-admin-document.ts`
   - **Verification:** unit tests of the schema (a text, an array, over `max`) and of
     `buildAdminDocumentRead` (in place, `null`, order kept, a missing one left out); step tests of
     `retrieve-cms-media` (one call per kind, none without values) and of `validate-cms-document` (an
     unknown value refused at its path); the HTTP test `admin-cms-documents` saves a recipe with a file
     created through the File Module and reads it back as a record.

5. **P1f.5 - Upload and search**
   - **Outcome:** the upload route imports `multer`, the parser `@medusajs/medusa` ships for its
     `/admin/uploads`, without declaring it a dependency, with ambient types for the parts it uses in
     `src/types/multer.d.ts`, as the first host project's asset upload does (user, 2026-11-10).
     `upload-cms-media` (step and workflow: the provider's `upload`, compensated by `delete`) and
     `list-cms-media` (step and workflow: the provider's `list`, `NOT_ALLOWED` without it);
     `POST /admin/cms/media` (one `file`, memory storage, refused over `maxFileSize`) and
     `GET /admin/cms/media` (`q`, `mime_type`, `limit`, `offset`).
   - **Areas:** `src/workflows/cms/`, `src/api/admin/cms/media/`, `src/api/middlewares.ts`
   - **Verification:** step tests of `upload-cms-media` (invoke and compensate) and `list-cms-media`;
     HTTP tests on the test app's local file provider, which Medusa's `defineConfig` adds by default
     (`@medusajs/utils` `dist/common/define-config.js`): an upload answers a record whose `url` serves the
     file, a file over the limit answers 400, a search with `FileMediaProvider` answers 400.

6. **P1f.6 - The media components and the picker**
   - **Outcome:** `src/admin/components/media/` with `MediaDropzone`, `checkUploadFile`,
     `mimeTypesLabel`, `StackedModalShell`, `MediaLibraryModal`, `MediaSelectTable`, `MediaThumbnail` and
     `MediaPickerField`, as UI/UX lists them; hooks for `GET` and `POST /admin/cms/media` in
     `src/admin/hooks/api/media/`; `getEditFields` keeps media fields, the form holds each as its record
     or records and sends their `id` or `url` as `stores` says; a `multiple` field adds up to `max`
     files and moves or removes each; **Choose from library** only when `media.searchable`. The version
     view shows a media value as text. Copy under `cms.media` per `codee-ui-copy`.
   - **Areas:** `src/admin/components/media/`, `src/admin/hooks/api/media/`, `src/admin/cms/common/`,
     `src/admin/i18n/json/en.json`
   - **Verification:** unit tests of `checkUploadFile` and `mimeTypesLabel`; admin typecheck; in the test
     app, a cover and three gallery files uploaded, reordered, saved and reloaded; a fourth refused.

7. **P1f.7 - `metadata` on documents and blocks** - `dropped` from 1f (user, 2026-11-10): editing
   `metadata` is not built for now; a body still refuses it and the Admin does not show it. Kept as
   written for when it comes back.
   - **Outcome:** `metadata` in a body: an object of texts, a nested object refused at its path; the
     update step's undo sends a changed key's old value and `""` for a key the save added; the Admin
     edits it as key-value rows on a document and a block, removing a key by sending `""`.
   - **Areas:** `src/lib/document/`, `src/workflows/cms/steps/update-cms-document-content.ts`,
     `src/admin/cms/`
   - **Verification:** the Edge Cases rows on `metadata`: a schema unit test, the step test of the undo,
     the HTTP test of a removed key keeping the others.

8. **P1f.8 - The host project and the walkthrough**
   - **Outcome:** the host project names `FileMediaProvider`, gives each media field `stores`, and
     removes its read-only links for media fields; its config test passes through yalc. A provider over
     its asset module is a later step (user, 2026-11-10).
   - **Verification:** the user uploads an image into a hero and several files into a field with
     `multiple`, reloads and publishes.

9. **P1f.9 - The review of 1f** (user, 2026-11-11): names, files and duplication of the media code,
   with no change in behavior beyond the response key in P1f.9c.
   - **P1f.9a - The provider's lifecycle.** `getMediaProvider(container)` in `src/lib/registry/` in place
     of `resolveMediaProvider(container, registry)`, creating the provider with the caller's container;
     the upload limit and whether the provider can be searched are asked of an instance wherever they
     are needed, and the registry keeps only `resolve`, `options`, `identifier` and `stores` (user,
     2026-11-11: a static limit read into the registry was tried and dropped as one step too many).
     **Verification:** unit tests of `FileMediaProvider`, `prepareRegistry`, `getMediaProvider` and the
     media steps; the `admin-cms-media` HTTP test.
   - **P1f.9b - Files.** Moves only: `src/lib/media/providers/` for the provider classes and the types a
     provider author uses, the other media types apart and out of the package root;
     `validate-media-fields` into `src/lib/registry/` beside `validate-id-prefixes`, `RegistryMedia` kept
     in its domain's types as `RegistryBlock` is; `StackedModalShell` into `src/admin/components/`;
     `receiveMediaFile` into the media route's `middlewares.ts`, as only that route uses it;
     `collectFormMedia` into `src/admin/cms/common/`. **Verification:** typecheck, admin typecheck, unit tests.
   - **P1f.9c - Names.** The steps `list-cms-document-media` and `create-cms-media`;
     `get-cms-media-provider` answering `media_provider: ClientMediaProvider`, read by
     `useMediaProvider`; `buildMediaPlacement` and `MediaPlacement`, `MediaRead.placement`; `validateMediaProviderFields`;
     `CmsMediaStore`, so every public media type carries `Cms`; one name per value in the Admin
     (`accept`, `maxFileSize`, `busy`, `UploadRejection`, `MediaRecordStore`); one test file per source
     file. **Verification:** unit tests; the
     `admin-cms-collections` and `admin-cms-media` HTTP tests.
   - **P1f.9d - Duplication in `src/lib/media/`.** `MEDIA_STORES`; `listMediaSlots` in place of the
     visitor, each field's values read in one place. **Verification:** unit tests.
   - **P1f.9e - Duplication in the Admin.** One page size for the library, one query of the collection
     list, `MediaRow`, `MediaAddControls` and `MediaFileInput` shared by both media fields, one file
     check in `useMediaUpload` (the drop zone hands files on unchecked), `formats.ts` one subject per
     file. The record-value helpers stay with their one user each, as `AGENTS.md` keeps a helper in
     the file of the builder that uses it. **Verification:** unit tests,
     admin typecheck.

10. **P1f.10 - Upload at save** (user, 2026-11-11): a chosen file is uploaded when the document is
   saved, as Medusa's product media form uploads through `/admin/uploads` before it updates the product,
   so a file chosen in a form that is left unsaved is not stored.
   - **Outcome:** the form holds a chosen file as `pending:<uuid>` until the save, a text the form's
     schema takes as it takes a stored value; `useMediaRecordStore` keeps the file and its browser
     preview, built by the form and handed to `MediaRecordsProvider`; `useMediaFileCheck` checks a
     file and hands it on, so the picker and the list upload nothing; the live check sends no
     `pending:` value; the save runs `uploadPendingMedia` over the values at any depth through
     `POST /admin/cms/media`, sets the stored values in the form, and stops on a failed file, marking
     its field. The routes and workflows are unchanged.
   - **Areas:** `src/admin/cms/common/`, `src/admin/cms/document-create-form/`,
     `src/admin/cms/document-edit-form/`, `src/admin/components/media/`
   - **Verification:** unit test of `uploadPendingMedia`; admin typecheck; in the host project, a file
     chosen and the form left shows no new file in the file provider, and one chosen and saved is
     stored and held by the field.

11. **P1f.11 - Fields in the config's order** (user, 2026-11-11; main spec D30): the review of the
   Admin's form components after P1f.10, before 1d, whose list rows render fields too. Today
   `FormFields` and a block card render every `ManagerFields` field first, then the slug locks and the
   suggestions, then the dates and the media fields, so a hero's `image` shows after its other fields.
   - **P1f.11a - The live check watches the document's own fields.** `DocumentValidation` watches the
     fields the form shows, not `document` with its areas, so typing in a block no longer restarts the
     check and sets the server errors again. **Areas:** `src/admin/cms/common/document-validation/`.
     **Verification:** admin typecheck; in the host project, typing in a block sends no `validate`
     request and a field's server error stays shown.
   - **P1f.11b - The rename.** `src/admin/components/manager-fields/` becomes `manager-form-fields/`,
     `manager-fields.tsx` becomes `manager-form-fields.tsx`, with only the import paths changed, and is
     committed alone, as `AGENTS.md` asks. **Verification:** `git status --short` shows `R`; admin
     typecheck.
   - **P1f.11c - `ManagerFormFields` on the `Form` parts.** `ManagerFormField` renders one field through
     `Form.Field`, `Form.Item`, `Form.Label` (`optional` unless `required`), `Form.Hint` for the
     description, `Form.Control` and `Form.ErrorMessage`, for every type: text, textarea, number, select,
     checkbox, chip input, switch; `ManagerFormFields` maps a list to it. Every type takes `disabled`;
     an emptied number is `null`, not `0`; the select's placeholder is the dashboard's own
     `general.select`, so the component needs no key of its own in any project. The config type is
     `ManagerFormFieldConfig`, apart from the CMS config's `FieldConfig`; the props are typed and named
     after their component. `rules`, the `errors` prop and a field's `defaultValue` go: the resolver
     and `useForm` own them; the per-type input wrappers go, as each input is the `@medusajs/ui` one.
     **Areas:** `src/admin/components/manager-form-fields/`. **Verification:** admin typecheck, lint.
   - **P1f.11d - `DocumentField`.** One field by its kind: `DateField`, `MediaField` (one field each,
     from `DateFields` and `MediaFields`) or `ManagerFormField` with `buildFieldConfig`, which replaces
     `buildFieldConfigs`; the slug lock with **Unlock**, the slug fill and the taken-value check sit with
     their field. `FormFields` and the block card render their fields through it in the config's order.
     **Areas:** `src/admin/cms/common/`. **Verification:** unit test of `buildFieldConfig`; admin
     typecheck; in the host project, a hero shows `image` between `description` and `image_alt`, with
     each field's description, and the slug's lock note and suggestion under the slug.
   - **P1f.11e - A block card opens on an error without watching every change.** The card subscribes
     to its errors with the form's `subscribe` and opens when one appears, instead of `useFormState`,
     which re-renders the whole card on each change after a refused save. **Areas:**
     `src/admin/cms/common/area-field/`. **Verification:** admin typecheck; in the host project, a
     refused save opens the card holding the error.
   - **P1f.11f - Hooks.** A save, a publish and a version action refresh the version lists only, as a
     version's snapshot never changes; `useMediaList` loses the `enabled` parameter its one caller does
     not pass; `MediaRecordStore.add` says a record is kept before the field's value names it;
     `use-media-file-check` becomes one file in `src/admin/components/media/`. **Areas:**
     `src/admin/hooks/api/`, `src/admin/components/media/`, `src/admin/cms/common/media-records/`.
     **Verification:** admin typecheck, unit tests.

12. **P1f.12 - The form toolkit apart from the CMS** (user, 2026-11-11; main spec D31): the content of
   a form - its fields, the media components and the grouping of fields - in `src/admin/components/`,
   importing nothing of the CMS, so other plugins can take it. Each step leaves both forms working as
   before.
   - **P1f.12a - Media apart from the CMS.** `MediaRecord`, `MediaStore`, `MediaListQuery`,
     `MediaListPage` and `MediaSource` in `src/admin/components/media/`; `MediaFieldsProvider` hands the
     fields the source, the form's record store and whether the library stacks on a route modal.
     `useMediaRecordStore`, the pending value, `uploadPendingMedia` and `usePendingMediaUpload`, which
     now takes the upload, move there from `src/admin/cms/common/`, the moves committed alone;
     `MediaSelectTable` reads through the source; the copy moves from `cms.media` to
     `managerFormFields.media`. The CMS forms build their source from `useMediaProvider`,
     `useMediaList` and `CMS_MEDIA_PAGE_SIZE`, and upload through `useUploadMedia`. **Areas:**
     `src/admin/components/media/`, `src/admin/cms/`, `src/admin/i18n/json/en.json`.
     **Verification:** unit tests; admin typecheck; in the host project, a file chosen, previewed and
     uploaded at save, and one picked from the library.
   - **P1f.12b - `date` and `media` in `ManagerFormField`.** `ManagerFormFieldConfig` gains both types,
     a media field's settings under `media` (`store`, `accept`, `multiple`, `max`); `buildFieldConfig`
     describes every kind; `DocumentField`, `DateField` and `MediaField` go, and `FormFields` and the
     block card render `ManagerFormField`. Each type's input is a component of its own in
     `manager-form-fields/fields/` (user, 2026-11-11), handed the field's config, its binding to the form
     and what `Form.Control` passes on; `ManagerFormField` renders the label, hint and error once and
     picks the input from a map by type. `ChipInput`, the raw input of a list of texts, moves into
     `manager-form-fields/inputs/` (user, 2026-11-11). **Areas:** `src/admin/components/manager-form-fields/`,
     `src/admin/cms/common/`. **Verification:** unit test of `buildFieldConfig`; admin typecheck; in the
     host project, a hero's image where the config puts it.
   - **P1f.12c - `groupFormFields`.** In the toolkit, over any items with a `name`, returning the items
     in no group and the `main` and `side` sections; it replaces `groupFields`, and the CMS passes its
     fields and areas, a group's areas after its fields. **Areas:**
     `src/admin/components/manager-form-fields/`, `src/admin/cms/`. **Verification:** unit test of
     `groupFormFields`; in the host project, the SEO group on the side.
   - **P1f.12d - The boundary.** `no-restricted-imports` in `eslint.config.ts` refuses, in
     `src/admin/components/**`, an import from `src/lib/`, `src/api/`, `src/workflows/`,
     `src/admin/cms/` and `src/admin/hooks/api/`. **Verification:** `yarn lint`.

13. **P1f.13 - The review of `src/admin/cms/common/`** (user, 2026-11-11): what each part of the
   document forms is for, and its place and name, with no change in behavior beyond an empty number.
   - **Outcome:** `getEditFields`, which returns a config's `fields` as they are since main spec D28,
     goes; `collectFormMedia`, with one user, moves to the edit form's folder. The block both forms
     repeated - the taken columns, the server errors, the values the form wrote and the guard at the
     start of a save - becomes `useDocumentFormChecks`. `FormFields` becomes `DocumentFields`, which maps
     a section's fields to `DocumentField`: one field with its own slug lock, its slug fill and its
     taken-value check, the last two as the hooks `useSlugFill` and `useTakenValueCheck`, which do
     nothing for a field that is not theirs. Hooks have folders of their own (user, 2026-11-11): the
     document forms' in `src/admin/cms/common/hooks/`, as only the CMS's forms use them, leaving
     `src/admin/hooks/` to `api/` and hooks the whole Admin shares, and the toolkit's in
     `src/admin/components/media/hooks/`, as the toolkit takes nothing from outside it (main spec D31).
     `groupFields` and `FieldSection` become `groupDocumentFields` and `DocumentFieldSection`, apart from
     the toolkit's names.
     `DocumentValidation` says why it stays a component: in the form, its watch would re-render the
     whole form on each keystroke. An empty number starts as `null`, as an emptied number input gives
     it back, so typing and clearing a number leaves the form unchanged. The moves are committed alone
     before the content changes. `AreaField`'s four components in one file wait for 1d, whose `blocks`
     field replaces it.
   - **Areas:** `src/admin/cms/`, `src/admin/hooks/`, `src/admin/components/media/`.
   - **Verification:** unit tests (`buildFieldDefaults` on a number); admin typecheck; in the host
     project, the slug filled from the title and locked on the document page, a taken slug offered its
     free form, and a refused save stopped by a live check.

**Exit gate of 1f:** plugin unit tests, lint, typecheck, admin typecheck and format pass; the
integration tests pass in a manual run; the user's walkthrough of P1f.8.

### Order after 1d - the first host's pages

The first host project reads its pages from the CMS, each in one request with its blocks (user,
2026-11-17). That needs, in this order: **1h**, the whole of **2a** (user, 2026-11-17) and a **minimal
2b** - `filterable` on `boolean` fields only, the registry refusing it on any other type until the rest
of 2b. 1i and the rest of Phases 2 to 6 come after. Which page is the homepage was to be an exclusive
flag; it is dropped (user, 2026-11-18), and a collection's settings, to be specified, will hold it.
Decided for 2b (user, 2026-11-17), in Store API:

- 2b: a filter is a key of the registry's `storeQuery` schema, from each field's
  `store: { filterable: true }`, read from `req.filterableFields`. A
  project's own middleware on `/store/cms/*` is tested in that project; the plugin's test app is the
  plugin itself, so a middleware added there would ship in the package (user, 2026-11-18).

**Admin reads are never cached; store reads are** (user, 2026-11-17, 2026-11-18). Query caches a
`query.graph` call only when its options carry `cache` (`enable`, `key`, `ttl`, `tags`,
`computeAutomaticTags`, `autoInvalidate` or `providers`; `@medusajs/query` 2.22.7, `dist/query/cache.js`,
`isCacheEnabled`); a call without it reads the database, with the Caching Module on or off.

Medusa reads products this way too (2.22.7): `GET /store/products` calls `query.graph` with
`cache: { enable: true, tags: [TRANSLATION_LIST_CACHE_TAG], computeAutomaticTags: true }`,
`GET /admin/products` reads through `refetchEntities` without a cache, and no read workflow is shared
between them; what core workflows share is the step `useQueryGraphStep`, whose caller passes the
`options`, `cache` included (`@medusajs/medusa` `dist/api/store/products/route.js`,
`dist/api/admin/products/route.js`; `@medusajs/core-flows` `dist/common/steps/use-query-graph.d.ts`). The
CMS keeps that shape, with the cache decided by the workflow and not by its caller:

- The read steps `get-cms-document` and `list-cms-documents` take `cache?: boolean`, `false` by default,
  and pass `options.cache` only when it is `true`.
- `get-published-cms-document` and `list-published-cms-documents` - the store's reads, exported from
  `@mostrajs/cms/workflows` with the other workflows, for a project's own route,
  job or sitemap - read the cache always, with `cache?: boolean` in their input, `true` by default, to
  read past it. A cached published read is current after every write, as each write clears it
  (`clear-cms-cache`).
- The Admin's workflows and the reads inside a write - the stored document, the taken values, the flag's
  holders - have no such input and never read the cache, so the Admin cannot be cached while the store
  is not, and a write never decides from a cached row.
- Unlike Medusa's `GET /store/products/:id`, a single document is cached too: one page by its slug is the
  CMS's most common read.

### Sub-phase 1h - Store reads

What Medusa gives (2.22.7): every route under `/store` passes `ensurePublishableApiKeyMiddleware`, added
by the router (`@medusajs/framework` `dist/http/router.js`), so a store request without a valid
publishable key answers 400 before the plugin's middlewares run, and the HTTP tests send one. The cache's
tags are `<Type>:<id>` and `<Type>:list:*`, `<Type>` read from the id's prefix
(`@medusajs/caching` `dist/utils/parser.js`), and an `updated` operation adds the list tag
(`buildAffectedCacheKeys`). Query names a module's model by its DML name in PascalCase, which is the
collection's `key` ([lesson](../../lessons/a-model-key-in-medusaservice-must-match-its-dml-name.md)), so
a collection's list tag is `<key>:list:*`.

1. **P1h.1 - Cached reads in the read steps**
   - **Outcome:** the read steps read one published document by id or by slug, and a page of published
     documents, through `query.graph`, cached when asked; the Admin reads as before.
   - **Areas:** `medusa-config.ts` (the test app), `src/workflows/cms/steps/get-cms-document.ts`,
     `list-cms-documents.ts`, `src/lib/cache/build-collection-cache-tag.ts` (new; `src/lib/cache/` holds the CMS's cache rules, user, 2026-11-18).
   - **Changes:** the test app turns on `featureFlags.caching` and `[Modules.CACHING]`
     (`@medusajs/medusa/caching`), as a host project does. `get-cms-document` takes `id` or `slug`
     (exactly one), `status` (the store passes `"published"`, as `list-cms-documents` already took a
     `status`) and `cache?: boolean`; with `cache`
     it passes `{ cache: { enable: true, tags: [buildCollectionCacheTag(collection)], computeAutomaticTags: true } }`,
     so a document not found is cached under the list tag too
     ([lesson](../../lessons/an-empty-cached-query-result-carries-no-tags.md)). `list-cms-documents` reads
     through `query.graph` with `pagination: { skip, take, order }` and the count from its `metadata`,
     takes `cache` alike, and keeps `q`, `status`, `order` and its `INVALID_DATA` on an
     unknown column. `listAndCount<Plural>` goes, so there is one read path; if `q` does not reach the
     model's search through Query, the Admin list keeps `listAndCount` and this step records why.
   - **Verification:** `buildCollectionCacheTag` unit test; step tests of `get-cms-document` and
     `list-cms-documents` with the createStep harness (`codee-medusa-testing`, `steps-tests.md`):
     `options.cache` passed only with `cache: true`, holding the list tag and `computeAutomaticTags`, and
     the `status` and slug filters; the Admin's HTTP tests pass unchanged, the document list's search and order
     included; a new HTTP test reads a document through the Admin right after a save and sees the change
     with the Caching Module on. `yarn test:unit`,
     `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P1h.2 - The store's document**
   - **Outcome:** a read document becomes the store's: `{ id, published_at, updated_at, ...columns }` with
     each area under its name, at any depth.
   - **Areas:** `src/lib/document/build-store-document.ts` (new, pure),
     `src/workflows/cms/steps/prepare-cms-store-documents.ts` (new).
   - **Changes:** `buildStoreDocument(document, media)` - `media` the `MediaRead` of
     `list-cms-document-media`, which carries the placement - puts each media field's record in
     place of its value (`null` when the provider found none; a `multiple` field's records in the array's
     order, without the missing ones), as `placeMediaRecords` does for the Admin; turns rich text into its
     document through `parseRichTextValues`; answers `metadata: null` when it is empty; removes `status`,
     `created_by`, `updated_by`, `created_at`, `deleted_at` and the area rows under `areas` (with their
     `parent_id`) from the document, keeping `updated_at`, and `rank`, `area_id` and the system columns
     from each block, as the Store API answers neither system nor CMS columns; and drops
     each block `buildDocumentAreas` marked `allowed: false`. Commerce ids and option values stay as they
     are. `prepare-cms-store-documents` runs it over the documents and logs one `warn` per document that
     lost blocks, naming their ids; it is exported from `src/workflows/index.ts` with its type
     `CmsStoreDocument`.
   - **Verification:** `build-store-document.unit.spec.ts` - a media record placed, `null` and the order
     of a `multiple` field; rich text from its JSON; empty and filled `metadata`; the CMS columns gone at
     the document and at depth; a disallowed block dropped. A step test with the createStep harness for
     the warning. `yarn test:unit`.

3. **P1h.3 - `clear-cms-cache` in the writes**
   - **Outcome:** a write clears what the store cached of the document and its collection's lists before
     the workflow ends, as module events reach the cache only after it
     ([lesson](../../lessons/module-events-invalidate-the-cache-only-after-the-workflow.md)).
   - **Areas:** `src/workflows/cms/steps/clear-cms-cache.ts` (new), the workflows `create-`, `update-`
     (its draft branch), `publish-`, `unpublish-` and `delete-cms-document`.
   - **Changes:** the step takes `{ collection, write }` and clears the tags `computeTags` gives for
     every row of the write with its own operation - `created`, `updated` or `deleted` - plus
     `buildCollectionCacheTag(collection)`. Every row has its id before the write, a new one included, as
     `prepareDocumentWrite` generates them, and the document's own row is always among them, so no
     `document_id` is needed. It answers nothing and has no
     compensation: after a rollback the next read refills the cache. Each workflow runs it after its last
     write. `restore-cms-document-version` runs `update-cms-document`, so it clears through it; a draft
     save of a published document and `discard-cms-document-draft` write only versions and clear nothing.
     Without the Caching Module the step does nothing: it resolves the module with
     `allowUnregistered`, as Medusa's own routes resolve an optional module.
   - **Verification:** a step test with a cache mock that rejects a write over a live key (AGENTS.md):
     the document's, an updated block's, a deleted block's and the list tag cleared, nothing for a
     created block, nothing without the module. The step has no cache write, so the rule of a mock
     refusing a write over a live key does not apply. Workflow tests (`medusaIntegrationTestRunner` and
     `workflow.run()`, in `integration-tests/http/cms/workflows/`, which `test:integration:http` runs)
     of the five changed workflows (`write-cms-document-cache.spec.ts`): each write runs inside one test
     workflow with a cached read after it, so module events, released only when that workflow ends,
     cannot clear it, and the read answers the write only through `clear-cms-cache`. The store's view
     of the same is in P1h.4. `yarn test:unit`, `yarn test:integration:http`.

4. **P1h.4 - The store routes**
   - **Outcome:** `GET /store/cms/:collection`, `/:collection/:id` and `/:collection/slug/:slug` answer
     published documents, cached; `{ documents, count, limit, offset }` newest published first, and
     `{ document }` with its areas.
   - **Areas:** `src/workflows/cms/workflows/get-published-cms-document.ts` and
     `list-published-cms-documents.ts` (new), `src/api/store/cms/[collection]/` (`route.ts`,
     `[id]/route.ts`, `slug/[slug]/route.ts`, `middlewares.ts`), `src/api/store/middlewares.ts`,
     `src/api/middlewares.ts`, `src/api/middlewares/ensure-store-collection.ts` and
     `verify-store-query.ts` (new), `src/lib/collection/prepare-store-query.ts` (new; `prepareCollection`
     builds a collection's `storeQuery`),
     `integration-tests/utils/` (a publishable key helper).
   - **Changes:** `get-published-cms-document` takes `{ collection, id }` or `{ collection, slug }` and
     `cache?` (`true` by default), and runs `get-cms-document` (`status: "published"`, `cache`) ->
     `list-cms-document-media` -> `prepare-cms-store-documents`; `list-published-cms-documents` takes the
     collection, the pagination and `cache?` alike, and runs `list-cms-documents` (`status: "published"`, `cache`,
     order `-published_at`, no areas) -> the same two. Both are exported from `src/workflows/index.ts`.
     The three routes only read `req.queryConfig` and `req.filterableFields`, run one of the two, and
     answer its result: the list route `list-published-cms-documents`, the id and slug routes
     `get-published-cms-document`. The
     reference steps wait for 5d. `ensureStoreCollection` answers 404 for an unknown collection and one
     with `store: false`, with the same message, so the store does not tell which collections exist;
     the slug route answers 404 for a collection without a `slug` field through `get-cms-document`.
     `prepareCollection` builds each collection's `storeQuery` (Store API), in 1h a list schema of
     `limit` (default 20, at most 100) and `offset` only, and an empty single-document schema, each a
     `z.strictObject` (Zod 4); `verifyStoreQuery("list")` or `("retrieve")` hands
     the request to Medusa's `validateAndTransformQuery` with it, and the routes read `req.queryConfig`'s
     `pagination` (user, 2026-11-17). Any other key answers 400; 2a widens the schema. A draft, an
     unpublished and a deleted document answer 404.
   - **Verification:** the middlewares through the routes' HTTP tests only, as nothing under `src/api/`
     carries a test (`codee-medusa-testing`); `store: false` and a collection without a slug wait for the
     second collection of 1i, as the test app has one (user, 2026-11-18). `prepareStoreQuery` in
     `prepare-store-query.unit.spec.ts`. The HTTP tests clear the collection's cache tag before each test,
     as the runner empties the database without events. Workflow tests of `get-published-cms-document` and
     `list-published-cms-documents` in `integration-tests/http/cms/workflows/`: the store's shape, a
     draft not found, a second read served from the cache and `cache: false` reading past it. HTTP tests
     `store-cms-documents.spec.ts`: a published recipe with steps, a callout's image and rich text served
     by id, by slug and in a list, in the store's shape; a draft, an unpublished and a deleted recipe 404;
     `limit`, `offset` and the count; `limit=101` 400; an unknown key 400; no publishable key 400. Cache: an empty list
     read, then a recipe published and listed at once; a recipe unpublished and gone at once; a block
     removed and gone from the cached document; a published recipe saved as a draft and its store answer
     unchanged until the draft is published (from the closed `sub-versions-and-drafts`).
     `yarn test:unit`, `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

5. **P1h.5 - Proof in a host**
   - **Outcome:** the first host's published page is served by id, by slug and in a list.
   - **Areas:** none in the plugin; `yalc publish --push --no-scripts` into the host.
   - **Verification:** the user's walkthrough: a published page with a hero, a grid with items, an image
     and text block with rich text and an image, read with a publishable key through the three routes;
     the page saved as a draft and unchanged in the store until published; unpublished and 404.

**Exit gate of 1h:** P1h.1 to P1h.5 done; plugin unit tests, HTTP tests, typecheck, lint and format check
pass.

### Sub-phase 2a - `fields` and `order`

What Medusa gives (2.22.7, `@medusajs/framework` `dist/http/`): `validateAndTransformQuery` adds
`req.allowed` to the route's `allowed`, empties it, and calls `prepareListQuery` or
`prepareRetrieveQuery`, then `validateRelationsLimit(fields, req.storeRelationsLimit)` when the router
set the limit, which it does under `/store` only; `allowFields(...)` pushes onto `req.allowed`.
`prepareListQuery` leaves a field outside `allowed` out without an error and refuses an `order` outside
it with `INVALID_DATA` (`dist/http/utils/get-query-config.js`). The plugin does none of this itself:
`verifyStoreQuery` hands the request to `validateAndTransformQuery` with the collection's
`storeQuery` from the registry (Store API).

1. **P2a.1 - `fields` and `order` in the registry's `storeQuery`**
   - **Outcome:** each store collection's `storeQuery` takes `fields` and `order` as Medusa does, with the
     collection's `defaults` and `allowed`; the CMS adds only what Medusa leaves open, and repeats none of
     its logic (user, 2026-11-18).
   - **Areas:** `src/lib/config/types.ts` (`FieldStoreConfig`, `CollectionStoreConfig`),
     `src/lib/field/` (`store` on a projected field), `src/lib/collection/prepare-store-query.ts`,
     `prepare-collection.ts`, `src/workflows/cms/steps/list-cms-documents.ts`.
   - **Changes:** the config: `store?: false | { list?, retrieve? }` on a collection, `list` and
     `retrieve` typed as a `Pick` of Medusa's `QueryConfig` (`defaults`, `defaultLimit` on `list`,
     `storeRelationsLimit`), and `store?: { hidden?: true }` on a field of a collection or a block
     (`filterable` with 2b); the projected field carries the config's `store` as it is, so its shape stays the config's when 2b
     adds `filterable` (user, 2026-11-18).
     `prepareStoreQuery({ fields, hasMetadata, areas }, config.store, path)` builds the routes' queries:
     - the list's schema is `createFindParams({ limit: defaultLimit })` without `with_deleted`, strict,
       refined only by `limit` at most 100, which Medusa leaves open; its lower bounds stay Medusa's. A
       single document's is `createSelectParams()`, strict;
     - `allowed` is `id`, `published_at`, `updated_at`, `metadata` when the model has it, every field
       without `store: { hidden: true }`, the areas by name, and the path of each block type and each of
       its public fields under every area, through repeaters to `maxDepth` (user, 2026-11-18);
       `defaults` are the config's, or the columns and the areas' names, without the areas on a list;
     - Medusa applies them: `fields`' syntax, `id` always, and `allowed` matched exactly by its
       `AllowedFieldFilter`, so `*sections` selects an area, `sections.hero.title` a block field, and
       `sections.title`, a hidden field or an unknown one is left out without an error (user,
       2026-11-18); `order` outside `allowed` answers 400.
     The registry refuses at startup a `defaults` entry that is not public, an area among a list's
     defaults (main spec D10), and a `defaultLimit` outside 1 to 100. `order` on an allowed field that is
     no scalar column - an area, `metadata` - or that holds rich text is refused by `list-cms-documents`,
     whose column check now leaves rich text out too. An area on a list over 50 is checked in P2a.2, on
     the fields Medusa resolved, rather than by parsing `fields` again. Relations wait for 5d.
   - **Verification:** `prepare-store-query.unit.spec.ts`, running each route's schema and Medusa's
     `prepareListQuery` / `prepareRetrieveQuery` on the config: a list's and a document's defaults, the
     hidden field in neither; `title` replacing the defaults, `+*sections,-metadata`; a hidden field, an
     unknown one and `sections.heading` left out; block paths kept - `sections.step.heading`,
     `sections.step.tips.tip.text` - and a hidden block field's left out; `order` allowed and refused; `limit` over 100, an
     unknown key and `with_deleted` refused; only `fields` on a document; configured `defaults`,
     `defaultLimit` and `storeRelationsLimit` taken; each refused config; the registry building it, a
     collection with `store: false` included. `list-cms-documents` step test refusing `order` on rich
     text. The store HTTP test's unknown key is no longer `order`. `yarn test:unit`,
     `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P2a.2 - The selection in the read**
   - **Outcome:** the store routes read only the columns, areas, block types and block fields `fields`
     selects, in the `order` asked, and enforce the relations limit.
   - **Areas:** `src/lib/document/build-store-selection.ts` and `build-store-read-fields.ts` (new, pure),
     `build-store-document.ts`, the store routes, `src/workflows/cms/steps/get-cms-document.ts`,
     `list-cms-documents.ts`, `prepare-cms-store-documents.ts`,
     `src/workflows/cms/workflows/get-published-cms-document.ts`, `list-published-cms-documents.ts`; the
     test config (`notes` hidden, `store.retrieve.storeRelationsLimit: 4`).
   - **Changes:** the routes pass `req.queryConfig.fields`, and the list `req.validatedQuery.order`, to
     the workflows, whose inputs take `fields` and `order`.
     - `buildStoreSelection(registry, collection, fields)` turns the resolved fields into what the store
       answers: the document's public columns, `id` always; each area path into its block types and
       fields, a whole area or type (`sections.*`, `sections.hero.*`) expanded into every public field and
       repeater down to `maxDepth`, so a hidden field is never in it; and every other path as it is, such
       as a project's link (`campaign_page`, `campaign_page.title`, listed in full, as Medusa's
       `AllowedFieldFilter` matches exactly), which Query reads and the cache tags by its entities. A hidden
       collection field named by a project's own code is dropped, not handed on.
     - `buildStoreReadFields(registry, selection)` turns it into Query's fields: the columns, the paths,
       and when an area is selected the area rows and, per block type selected anywhere, its relation with
       only its selected columns and `id`, `rank`, `area_id`; a block type no path names is not read.
     - The read steps take `fields`; with them they read only that, and `get-cms-document` warns of no
       area row a skipped block type holds. `list-cms-documents` builds each document's areas when the
       fields name one, and answers `INVALID_DATA` to a page of more than 50 that reads areas (main spec
       D10) before reading; its column check keeps refusing an `order` that is no scalar column or holds
       rich text.
     - `prepare-cms-store-documents` takes `route` and `fields`, and builds the selection from the fields,
       or the route's defaults, so a project running a store workflow without `fields` gets what the API
       answers without them; `buildStoreDocument(document, media, selection)` picks of each document and
       block only what the selection names, a block's `id` and `block_type` always, so the CMS's own
       columns and a block's columns that are no field (its `metadata`) are not answered either.
   - **Verification:** `build-store-selection.unit.spec.ts` - columns, a block field and a field in a
     repeater, a whole type, a whole area down to `maxDepth`, a hidden column and a path the area does not
     allow left out, other paths handed on; `build-store-read-fields.unit.spec.ts` - columns and paths
     without areas, the area rows and only the selected columns of the selected types, a type not named
     not read; `build-store-document.unit.spec.ts` - the whole answer, only the columns selected, only the
     types and fields selected through a repeater, a hidden field never, a project's link handed on, media,
     `metadata`, a disallowed block; step tests of `get-cms-document` (Query's fields, no warning) and
     `list-cms-documents` (areas built, 400 over 50 before reading); `prepare-cms-store-documents` with
     defaults and with fields. HTTP tests: `fields=title`, a list with `*sections`, `sections.step.heading`,
     `sections.step.tips.tip.text`, a hidden field named, `order=title` and `-title`, `order` on rich text
     and on an area 400, an area on a list over 50 400, a block path past the relations limit 400. A path
     opened with `allowFields` cannot be tried in the test app, which is the plugin, so it is covered by the
     unit tests and the host's walkthrough. `yarn test:unit`, `yarn test:integration:http`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

3. **P2a.3 - Proof in a host**
   - **Verification:** the user's walkthrough: any page read by `slug` with `fields=title,+*sections` in
     one request.

**Exit gate of 2a:** P2a.1 to P2a.3 done; plugin unit tests, HTTP tests, typecheck, lint and format check
pass.

### Sub-phase 2b - `filterable`, a boolean first

2b starts with a boolean, and the other field types come later in it (user, 2026-11-18).

1. **P2b.1 - A filterable boolean on the store list**
   - **Outcome:** `GET /store/cms/:collection?vegan=true` lists the published documents whose `vegan` is
     `true`; a filter on any other field, or a value that is no boolean, answers 400.
   - **Areas:** `src/lib/config/types.ts` (`FieldStoreConfig.filterable`),
     `src/lib/collection/prepare-store-query.ts`, `src/workflows/cms/steps/list-cms-documents.ts`,
     `src/workflows/cms/workflows/list-published-cms-documents.ts`, the list route, the test config.
   - **Changes:** a field's `store: { filterable: true }` adds a key to the list's schema, read with
     Medusa's `booleanString` (`@medusajs/medusa/api/utils/common-validators/common`), which takes `true` or
     `false` and refuses anything else; Medusa hands it on as `req.filterableFields`, which the route
     passes to the workflow as `filters` and the list step merges into Query's filters, `status` keeping
     its own value. The registry refuses at startup a filterable field that is not a boolean (until the
     rest of 2b), a hidden one, and any block's field.
   - **Verification:** `prepare-store-query` unit tests - the key read from its text, a value that is no
     boolean and a field not filterable refused, each refused config; a `list-cms-documents` step test of
     the merged filters; HTTP tests - `vegan=true` and `vegan=false` with the count, `vegan=maybe` and
     `title=Soup` 400. `yarn test:unit`, `yarn test:integration:http`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`.

2. **P2b.2 - Proof in a host** - dropped (user, 2026-11-18): it proved the filter on the host's
   `is_homepage`, which went with the exclusive flags. P2b.1's HTTP tests prove the boolean filter; a host
   proves it when one of its fields needs it.

The rest of 2b - `text`, `enum` and options - is written when it is next.

### Sub-phase 3a - Several values on a combobox

Brought forward before 1b of `sub-admin-extension-registry` and before 1d (user, 2026-11-12): a block
picking up to three products. Built on the combobox of
[sub-admin-extension-registry](./ended/2026-11-12-sub-admin-extension-registry.md) and on what a `media`
field already does with `multiple` and `max`. Order is the order chosen; reordering waits for the
relationship picker, an addition after the registry (user, 2026-11-12).

What the dashboard gives (`@medusajs/dashboard` 2.21.2): `Combobox` takes `value: string[]`, shows the
chosen ones as chips with `displayMode: "chips"`, and an option with `disabled: true` cannot be chosen;
`useComboboxData` takes a list as `defaultValue` and fetches every stored record in one request
(`{ [defaultValueKey]: list, limit: list.length }`).

1. **P3a.1 - `multiple` and `max` on a combobox, in the config, the registry and the schema**
   - **Outcome:** `{ type: "combobox", multiple: true, max: 3, options }` on an array column passes
     `validateConfig`; a write takes a list of at most `max` values, each from the listed set or any text
     from a hook.
   - **Areas:** `src/lib/config/types.ts` (`ComboboxField`), `src/lib/field/prepare-fields.ts`
     (`FIELD_TYPES`, the combobox's column rule), `src/lib/document/build-document-schema.ts`.
   - **Changes:** `ComboboxField` gains `multiple?: true` and `max?: number`; `combobox` sits on `text`,
     `enum` or `array`. The rule a media field has moves to one function both use: one value on a text or
     an enum column, several on an array column with `multiple: true`, and `max` a positive whole number
     only with `multiple`; messages name the field's type. `prepareField` copies `multiple` and `max`
     onto the projected `Field`, which already holds both for media. In the schema, the media list's
     refinement becomes a list schema of an item schema and `max`, used by a `multiple` media field
     (`Keep at most <n> files`) and a `multiple` combobox (`Choose at most <n> options`).
   - **Verification:** `prepare-registry` unit tests - accepted on an array column with `multiple`,
     refused with `multiple` on a text column, without it on an array column, `max` without `multiple`
     or not a positive whole number; `build-document-schema` unit tests - a listed value outside the
     set and a list longer than `max` refused at their paths, any texts from a hook accepted, a text
     instead of a list refused; the media cases unchanged. `yarn test:unit`, `yarn typecheck`,
     `yarn lint`, `yarn format:check`.

2. **P3a.2 - The hook's `value` as a list**
   - **Outcome:** a hook knows every stored value, so it can fetch their labels.
   - **Areas:** `src/admin-extensions/types.ts` (`CmsOptionsHookInput`), the toolkit's `OptionsHook`
     (`src/admin/components/manager-form-fields/types.ts`), the changeset.
   - **Changes:** `value: string | string[] | null` in both, additively: a hook of one value still
     receives a text. The changeset of the combobox, not yet released, says so.
   - **Verification:** `yarn typecheck`, `yarn typecheck:admin`.

3. **P3a.3 - Chips in the Admin**
   - **Outcome:** a `multiple` combobox shows its values as chips, offers the rest, and offers nothing
     more once it holds `max`.
   - **Areas:** `src/admin/components/manager-form-fields/` (`types.ts`, `fields/combobox-field.tsx`,
     `fields/utils/limit-options.ts` new), `src/admin/cms/common/utils/build-field-config.ts`,
     `build-field-defaults.ts`.
   - **Changes:** the toolkit's config gains `multiple?: boolean` and `maxItems?: number` (its `max`
     belongs to a number field); `buildFieldConfig` passes a combobox's `multiple` and `max` as
     `maxItems`; `buildFieldDefaults` gives a `multiple` combobox its stored list or `[]`.
     `ComboboxField` reads and writes a list when `multiple`, with `displayMode: "chips"`, for listed
     options and a hook alike, the hook getting the list as its `value`. `limitOptions(options, chosen,
     maxItems)` marks every option not chosen `disabled` once `chosen` holds `maxItems`, and returns
     the options unchanged otherwise.
   - **Verification:** `limit-options.unit.spec.ts` - nothing disabled under the limit, the unchosen
     disabled at it, no limit without `maxItems`; `build-field-config` and `build-field-defaults` unit
     tests for a `multiple` combobox; `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`,
     `yarn format:check`.

4. **P3a.4 - Proof in a host**
   - **Outcome:** three products chosen, saved and shown by title after a reload.
   - **Areas:** the host: `product_ids: model.array().nullable()` on the image and text block, its
     migration generated and run by the user; `product_ids` in the block's config as
     `{ type: "combobox", label: "Products", multiple: true, max: 3, options: { hook: "products" } }` in
     its Product tab; in `create-product-options.ts`, the stored-value filters typed as a text or a
     list (`id`, `handle`), as `useComboboxData` sends a list for several values. Written by the agent at
     the user's request, the migration by the user.
   - **Verification:** the user's walkthrough under `yarn dev`: three products picked by search, a
     fourth not offered, the save and a reload showing all three by title; the host's config test and
     admin `tsc` on the changed files.

**Exit gate of 3a:** P3a.1 to P3a.4 done; plugin unit tests, typecheck, admin typecheck, lint and format
check pass.

### Sub-phase 5b - `drafts: false`

Brought forward for [sub-singletons](./ended/2026-11-18-sub-singletons.md) (user, 2026-11-18). What exists: drafts
are always on - the row's `status` and `cms_version` rows for every collection. `create-cms-document` writes
a draft row and records version 1; `update-cms-document` writes the row of a draft (`save-cms-draft`) and
only a draft version for a published document (`save-cms-published-draft`); publish, unpublish, discard,
restore and the version reads are routes of their own. `drafts: false` turns the row's draft state and the
versions off for one collection: its documents are published from their creation, a save writes the row
and is live at once, and nothing is recorded in `cms_version` (closed `sub-versions-and-drafts`, "no
versions for such a collection"). A workflow cannot read the registry while it is composed, so the flag
reaches its `when()` conditions from a step.

The events become `created`, `updated` and `deleted` first (main spec D38; user, 2026-11-18), so a save
in a collection without drafts, which changes what the store serves as a publish does, is an `updated`
with `action: "publish"`, the same signal a subscriber reads for a publish.

1. **P5b.1 - The events: `created`, `updated` and `deleted`**
   - **Outcome:** every write workflow emits one event, with `{ collection, id }` and: `cms.document.created`
     `status`; `cms.document.updated` `action` - `save`, `publish`, `unpublish`, `restore` or `discard` -
     and `status`; `cms.document.deleted` nothing more. `cms.document.published` and
     `cms.document.unpublished` are gone.
   - **Areas:** `src/lib/events.ts` (`DocumentEvents`, exported from the package root, and the data type
     of each event); `create-cms-document`, `update-cms-document` (`action` `save`, or `restore` from the
     restore workflow), `publish-cms-document` (`publish`), `unpublish-cms-document` (`unpublish`),
     `discard-cms-document-draft` (`discard`, which emits nothing today), `delete-cms-document`.
   - **Changes:** `DocumentEvents` holds `DOCUMENT_CREATED`, `DOCUMENT_UPDATED` and `DOCUMENT_DELETED`;
     each workflow's `emitEventStep` after its last write, its data built in a `transform()`. The plugin is
     not published yet, so the old names go without a bridge (user, 2026-11-18); nothing subscribes to
     them, in the plugin or in the first host.
   - **Verification:** a workflow test, `integration-tests/http/cms/workflows/document-events.spec.ts`,
     running each write workflow on a recipe with a spy on the event bus's `emit` (`Modules.EVENT_BUS`) and
     asserting the one event and its data; a failed write emits none. `yarn test:integration:http`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P5b.2 - `drafts` in the config, the registry and the projection**
   - **Outcome:** `drafts?: boolean` on a collection, `true` when left out, reaches the registry and
     `GET /admin/cms/collections`.
   - **Areas:** `src/lib/config/types.ts` (`CollectionConfig`), `src/lib/collection/prepare-collection.ts`,
     `src/lib/collection/types.ts` (`RegistryCollection`, `ClientCollection`),
     `src/workflows/cms/steps/list-cms-collections.ts`.
   - **Changes:** the key, `drafts: boolean` on the registry's collection and in the projection; a block
     has none.
   - **Verification:** `prepare-registry` unit tests - `true` by default, `false` kept; a
     `list-cms-collections` test of the key. `yarn test:unit`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`.

3. **P5b.3 - The test module's dictionary** (the user's migration)
   - **Areas:** `integration-tests/modules/test-content/models/test-tag.ts` (new) - `TestTag`, prefix
     `ttag`, `name` text, `slug` text under a unique index `where: { deleted_at: null }`, the CMS columns of
     main spec D7, and `description` text; the test config's collection `tag` with `drafts: false`, `name`
     (required always), `slug` from `name`, and `description` with `serverPublishValidation: z.string()`, so
     a rule a publish needs is checked at a create. Phase 5 relates recipes to it later.
   - **Verification:** the user's `yarn test:db:generate` and migration; `yarn test:integration:http` passes
     unchanged.

4. **P5b.4 - A create and a save live at once, without versions**
   - **Outcome:** in a `drafts: false` collection a create writes the row `published` with `published_at`
     now, checked with the `publish` schema, emits `cms.document.created` with `status: "published"` and
     records no version; a save writes the row, checked the same way, live at once, emits
     `cms.document.updated` with `action: "publish"`, and records no version; the Admin reads the
     document with `latest_version: null`. A collection with drafts is unchanged.
   - **Areas:** `src/workflows/cms/steps/get-cms-collection.ts` (new), `prepare-cms-write.ts`,
     `validate-cms-document.ts`; `src/workflows/cms/workflows/create-cms-document.ts`,
     `update-cms-document.ts`, `get-cms-document.ts`; `src/workflows/index.ts`.
   - **Changes:** `get-cms-collection` reads the registry's collection and answers `{ slug, drafts }`, so
     the workflows' `when()` conditions can use it. `prepare-cms-write` sets `status: "published"` and
     `published_at` to now in a `drafts: false` collection, for a new document and for a stored row that
     is not published, so a draft row left from before the switch is published by its next save; it, not
     `prepare-cms-document-input` as first planned, as the document's schema is a `z.strictObject` that
     refuses `status` in the values `validate-cms-document` checks (built 2026-11-18). `create-cms-document` runs
     `createCmsDocumentVersionWorkflow` under `when("record-cms-first-version")` with drafts; its `created`
     event (P5b.1) carries the row's status.
     `update-cms-document` takes the row branch (`save-cms-draft`) for a draft or for any document of a
     collection without drafts, the version branch (`save-cms-published-draft`) only for a published
     document of a collection with drafts, and records the version under `when("record-cms-saved-version")`
     with drafts; its `updated` event takes `action: "publish"` without drafts, through a `transform()`
     over `get-cms-collection`, `save` (or `restore`) with them. `validate-cms-document` picked `publish`
     from the stored row's status only, which a create has not; it now also picks it for any document of a
     collection without drafts, read from the registry it already reads, so the workflows pass no mode and
     the Admin's `validate` route checks the same way (built 2026-11-18, in place of a mode passed by each
     workflow). The versions a collection holds from before the switch stay stored and unread: the save
     takes no latest version without drafts, for its `base_version` check too, and `get-cms-document`
     answers `latest_version: null`.
   - **Verification:** unit tests of `get-cms-collection`, of `prepare-cms-write` (a new tag and a draft
     row published, a published one's status kept) and of `validate-cms-document` (a tag checked as a
     publish, new and as a draft row); a workflow test,
     `integration-tests/http/cms/workflows/drafts-off.spec.ts`, running `createCmsDocumentWorkflow` and
     `updateCmsDocumentWorkflow` on `tag` - the row published, no `cms_version` row (read through the `cms`
     module), a create without `description` refused, the create's `created` with `status: "published"`
     and the save's `updated` with `action: "publish"` seen through a spy on the event bus's `emit`
     (`Modules.EVENT_BUS`), and a recipe's create still a draft with version 1; HTTP tests on `tag` - a create answers a published document, the store lists it at once, a save
     changes the store's answer at once; the recipe tests unchanged. `yarn test:unit`,
     `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

5. **P5b.5 - Publish, unpublish and the version routes refused**
   - **Outcome:** publish, unpublish, discard, restore, the version list and a version's read answer 400
     (`NOT_ALLOWED`) in a `drafts: false` collection, with nothing written.
   - **Areas:** `src/workflows/cms/steps/validate-cms-drafts.ts` (new); `publish-`, `unpublish-cms-document`,
     `discard-cms-document-draft`, `restore-cms-document-version`, `list-cms-document-versions`,
     `get-cms-document-version`; `src/workflows/index.ts`.
   - **Changes:** the step reads the collection from the registry, as the other decision steps do, for
     its `drafts` and the label its message names, and throws
     `Drafts and versions are off for "Tags", so changes go live when saved.` (copy through
     `codee-ui-copy`) when it is `false`; each workflow runs it first (built 2026-11-18, in place of the
     `drafts` read through `get-cms-collection`, which carries no label).
   - **Verification:** a step unit test of both cases; in `drafts-off.spec.ts`, each of the six workflows
     refused on `tag` with nothing written; an HTTP test per route on `tag`, and the recipe's routes
     unchanged. Until P5b.6 the Admin's document page of a collection without drafts calls the refused
     version list; no host has such a collection before it. `yarn test:unit`, `yarn test:integration:http`, `yarn typecheck`, `yarn lint`,
     `yarn format:check`.

6. **P5b.6 - The Admin without drafts**
   - **Outcome:** a `drafts: false` collection's table has no status column; its document page has no
     status badge, no **Publish** or **Unpublish**, no history and no version view, and its live note says
     a save is live (`cms.documents.edit.liveNote` says "Changes go live when you publish." today); its
     create modal validates as a publish - a field a publish needs is required there - and creates a live
     document.
   - **Areas:** `src/admin/cms/document-list-table/columns.tsx`, `document-status-section/`,
     `document-history-section/`, `document-edit-form/` (`document-edit-header.tsx`),
     `document-create-form/config.ts` (`buildDocumentSchema` with `mode: "shape"` today),
     `src/admin/i18n/json/en.json`.
   - **Changes:** each reads `collection.drafts` from the projection; a new copy key for the save note,
     `cms.documents.edit.liveOnSaveNote`, "Changes go live when you save.", through `codee-ui-copy`, and
     **Save** in place of **Save draft**. The create form keeps `mode: "shape"`: the registry marks a field
     a publish needs `required: "always"` in a collection without drafts, which is what the Admin, holding
     no schemas, checks and labels - no "(Required to publish)" - while the server checks the schemas as a
     publish (built 2026-11-19, in place of a `publish` mode in the create form). The discard in the
     action menu shows only with unpublished changes, which a read without versions never has.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the walkthrough on the
     first host collection without drafts, the page settings of `sub-singletons` (its Phase 1b), as the
     host has none before it.

**Exit gate of 5b:** P5b.1 to P5b.6 done; plugin unit tests, HTTP tests, typecheck, admin typecheck, lint
and format check pass.

### Sub-phases 5a, 5c and 5d - relations

Moved to [sub-relations](./2026-11-22-sub-relations.md) on 2026-11-22 (user), with the decisions, the
failure scenarios and the steps of the `belongsTo` slice, reviewed here first; `manyToMany` and the
store's populated relations are its later phases.

## Short Tracker

The detail of each step is in the Implementation Plan and the commits; this tracker keeps the state, the
decisions and what broke a contract. Compacted on 2026-11-12 (user).

- `done` - Field config keys by where they work (main spec D33, user, 2026-11-12): `serverValidation`,
  `serverTransform`, and the hints under a field's `admin`; the plugin's 435 unit tests, typecheck,
  admin typecheck, lint and format check pass, and the host's config moved and passes its config test.
  Committed in `1c62d55`.
- `done` - P3a.1 to P3a.3 (2026-11-12): `multiple` and `max` on a combobox, `validateMultipleValues`
  shared with media, `buildListSchema` (`Choose at most <n> options`), the hook's `value` as a list,
  chips and `limitOptions` in the Admin, `[]` as a `multiple` combobox's default. All 451 unit tests,
  typecheck, admin typecheck, lint and format check pass. Committed in `3089946`.
- `done` - P3a.4: the host's `product_ids` (array) on the image and text block, `max: 3`, in its
  Product tab, migrated by the user; three products picked, a fourth not offered, all three shown by
  title after a reload (user's walkthrough, 2026-11-12). `useComboboxData` types `id` as a text though it
  sends a list for several values, so the host's filter keeps `id` a text and widens `handle` only.
  Sub-phase 3a done.
- `done` - **1d, repeaters and depth** (main spec D32, D26; steps approved 2026-11-16, 1e merged into
  it). The plugin: `repeaters` and `maxDepth` in the registry and the projection, `DocumentShape` with
  `listDocumentBlocks` and `mapDocumentBlocks` under the former one-level walks, the nested read, schema,
  write, media and versions, and `BlocksField` in the toolkit with `AreaBlocks` in the CMS; 579 unit
  tests, 103 HTTP tests, typecheck, admin typecheck, lint and format pass. The test module's migration
  needed the owner index added by hand, as `db:generate` does not diff a changed `where`
  ([lesson](../../lessons/db-generate-misses-a-changed-where-of-a-partial-index.md)). The host: grid
  items are the `grid_item` block in the grid's `items` repeater, migrated by the user; its config test
  passes, and its typecheck reports only `product-variants.spec.ts`, failing before 1d. The user's
  walkthrough (2026-11-16): items of two levels saved and published with their ids, `minRows` refusing
  a publish, no repeaters at `maxDepth`, the version view listing nested blocks, and the grid deleted
  with its items and repeater rows. A save of four levels was not tried in the host.
- `done` - P1h.1 (2026-11-18): the test app with the Caching Module; `buildCollectionCacheTag` in `src/lib/cache/`; `get-cms-document`
  by `id` or `slug`, with `status` and `cache`, and the Admin's `get-cms-document` workflow on its own
  input type, `GetCmsDocumentWorkflowInput`; `list-cms-documents` through `query.graph`, `q` included, so
  `listAndCount` went. 755 unit tests, 113 HTTP tests, typecheck, lint and format check pass.
  Committed in `bbffa63`.
- `done` - P1h.2 (2026-11-18): `buildStoreDocument(document, media)` and `prepare-cms-store-documents`;
  the system columns go too, `updated_at` of the document kept. 765 unit tests, typecheck, lint and
  format check pass. Committed in `401c29a`.
- `done` - P1h.3 (2026-11-18): `clear-cms-cache` after the last write of `create-`, `update-` (a
  draft's save), `publish-`, `unpublish-` and `delete-cms-document`, exported; each row cleared by its
  own operation, created rows included as their ids exist before the write. Workflow tests fail with the
  step turned off and pass with it. 768 unit tests, 118 HTTP tests, typecheck, lint and format check
  pass. Committed in `401c29a`.
- `done` - P1h.4 (2026-11-18): `get-published-` and `list-published-cms-documents`, cached by default
  and exported; the three store routes; `ensureStoreCollection` and `verifyStoreQuery` over
  `prepareStoreQuery`; `createStoreHeaders`. A workflow test proves the collection's cache tag is the one
  Medusa computes for its documents. 777 unit tests, 135 HTTP tests, typecheck, lint and format check
  pass. Committed in `e4b3664`.
- `done` - P2a.1 (2026-11-18): `store` on a collection (parts of Medusa's `QueryConfig`) and on a field
  (`hidden`); `prepareStoreQuery` on Medusa's `createFindParams` and `createSelectParams`, `limit` at
  most 100 the only rule added; `allowed` derived and matched exactly by Medusa, so `sections.title` is
  left out; `order` on rich text refused by the list step. Block paths in `allowed` (main spec D20):
  each area, block type and public block field, through repeaters to `maxDepth`, so
  `sections.step.heading` passes and `sections.heading`, a hidden block field or a path past the depth
  does not; `prepareCollection` takes the registry's blocks and `maxDepth` for them, and a single
  document defaults to the areas by name. The projected field keeps the config's `store` shape. The
  routes still read every column and fixed order until P2a.2. 789 unit tests, 135 HTTP tests,
  typecheck, admin typecheck, lint and format check pass. Committed in `8476b58`.
- `done` - P2a.2 (2026-11-18): `buildStoreSelection`, `buildStoreReadFields` and `buildStoreDocument`
  picking by the selection; the read steps take `fields`, the list `order`, and refuses areas on more
  than 50; `prepare-cms-store-documents` falls back to the route's defaults. A block's `metadata`, no
  field, is no longer answered. 806 unit tests, 144 HTTP tests, typecheck, admin typecheck, lint and
  format check pass. Committed in `5e9f539`.
- `done` - P2b.1 (2026-11-18): `store: { filterable: true }` on a boolean field, a key of the list's
  schema read with Medusa's `booleanString`, `req.filterableFields` merged into the list's filters; a
  filterable field that is not a boolean, hidden, or a block's is refused at startup. 811 unit tests,
  147 HTTP tests, typecheck, admin typecheck, lint and format check pass. Committed in `2e23606`.
- `dropped` - Phase 4 and P2b.2 (user, 2026-11-18): exclusive flags and scopes, with what was built of
  4a; the homepage moves to a collection's settings, in [sub-singletons](./ended/2026-11-18-sub-singletons.md).
- `done` - 5b, brought forward for `sub-singletons` (user, 2026-11-18), steps written
  2026-11-18. P5b.1 done (2026-11-18): `DocumentEvents` holds `created`, `updated` and `deleted` with their
  data types; create, save, restore (through the save), publish, unpublish, discard and delete each emit
  one event, discard for the first time. `document-events.spec.ts` (9 workflow tests) and
  `write-cms-document-cache.spec.ts` pass, typecheck, lint and format check pass. Committed. P5b.2 done
  (2026-11-18): `drafts` on the config, the registry (`true` when left out) and the projection; 813 unit
  tests, typecheck, admin typecheck, lint and format check pass. P5b.3 done (2026-11-18): `TestTag`, the
  `tag` collection and the user's migration; 156 HTTP tests pass. P5b.4 done (2026-11-18): a create and a
  save of a tag live at once, without versions, built as the step records; `drafts-off.spec.ts` (6) and
  `documents-without-drafts.spec.ts` (3) pass, 821 unit tests, 165 HTTP tests, typecheck, admin typecheck,
  lint and format check pass. P5b.5 done (2026-11-19): `validate-cms-drafts` first in the six workflows;
  its unit test, `drafts-off.spec.ts` (12) and the six routes' 400s in `documents-without-drafts.spec.ts`
  (9) pass, 823 unit tests, 177 HTTP tests, typecheck, lint and format check pass. P5b.6 built
  (2026-11-19): the table without the status and version columns, the document page without the status
  and history sections, the save note and **Save**, and publish-required fields required always without
  drafts; 824 unit tests, 177 HTTP tests, typecheck, admin typecheck, lint and format check pass; its
  walkthrough waits for the first host collection without drafts, the page settings of
  `sub-singletons` (its Phase 1b). P5b.1 committed in `591881f`, P5b.2 to P5b.6 in `2c9f806`. The
  relation slice of 5a and 5c follows before `sub-singletons`' Phase 3 (moved to `sub-relations`, its
  Phase 1, 2026-11-22).
- `pending` - P5b.6's walkthrough, in the host's first collection without drafts: the page settings of
  `sub-singletons`, its Phase 1b.
- `pending`, decided 2026-11-18 (user) for 2a and 2b - the Store API's config: a collection's
  `store?: false | { list?, retrieve? }`, parts of Medusa's `QueryConfig`; a field's
  `store?: { hidden?, filterable? }`, `filterable` moved there from the field's top level; `allowed`
  derived from the fields, never configured (main spec D20).
- `done` - 5a, 5c and 5d moved to `sub-relations` (2026-11-22, user), the relation slice after two reviews
  here.
- `pending` - **next**: P1h.5 and P2a.3, the user's walkthroughs of the store reads in the host (steps
  of 1h and 2a written 2026-11-17, the query moved to Medusa's `validateAndTransformQuery` and access
  the project's the same day); then 1i, the proof and the README. Not started (2026-11-21): 2c, 3b, 3c and
  Phase 6; 5a, 5c and 5d moved to `sub-relations`. Reviewed 2026-11-18 (`codee-spec-review-medusa`,
  a self-review, not independent): store workflows cached by default and exported, tests of steps and
  workflows added, middlewares tested through their routes only, a project's middleware tested in the
  project, `limit` kept at 100; rich text (1g) moved to
  [sub-rich-text](./2026-11-17-sub-rich-text.md). Phase 3 is rewritten on the
  registry of [sub-admin-extension-registry](./ended/2026-11-12-sub-admin-extension-registry.md), with no loader
  (main spec D18, 2026-11-12); 5c builds no references route (1c of that sub-spec, 2026-11-13).
- `pending`, deferred (user, 2026-11-10) - a block saved without a key the read holds as `null` counts
  as a change in `changed_fields`; comparing a missing key as `null` waits for a decision.
- `done` - Phase 0 and sub-phase 1.0: the repository, the yalc link, config types, introspection, the
  registry and the health route.
- `done` - 1a, pages in the Admin (exit gate 2026-11-09): collections and documents listed, created,
  edited, published, unpublished and deleted in **Content**, with the HTTP and workflow tests running in
  the plugin on its test module. Decided on the way: `required` per field, `always` or `publish`; a
  field's `validation` run at a save and in `POST .../validate`, which the forms call live; a taken
  unique value answered with its first free `-<n>` form; a slug filled from its source and locked on the
  document page (`lockOnEdit`, `true` by default); events named by `DocumentEvents`; the documents
  table's "Published version" column.
- `done` - 1b, versions and drafts: [sub-versions-and-drafts](./ended/2026-11-06-sub-versions-and-drafts.md) closed on 2026-11-09; its checks
  that need blocks, the store API or `drafts: false` moved to 1c, 1h and 5b.
- `done` - 1c, blocks in an area (exit gate 2026-11-10): P1c.1 to P1c.7 built, the HTTP tests passed in
  a run, the user added, reordered, removed and published blocks in the host project, and the review of
  1c was fixed. [sub-lib-cleanup](./ended/2026-11-10-sub-lib-cleanup.md) regrouped `src/lib/` between
  P1c.2 and P1c.3. Decided: the registry reads the area model from the `areas` and `area` relations
  (main spec D4, D6); it throws at the first problem through `buildConfigError`; a version's snapshot
  keeps each area as a write body holds it, so `rank`, `area_id` and timestamps are no change; a block
  of a type its area no longer allows is kept as `{ id, block_type }`, refused at publish with values,
  and left out of a restore. Breaking: `Config.area` is gone and `blocks` optional; the exported
  `delete-cms-documents` step is removed, and `create-` and `update-cms-document-content` return
  nothing.
- `done` - The form from the config (main spec D28; user, 2026-11-10): every field states its `type`
  and `label`, nothing is read from the model, and a column the config does not list is no field.
  Breaking: `FieldOverride` became `FieldConfig`, `input: "textarea"` became `type: "textarea"`,
  `hidden` is gone, and a column the database requires needs `required: "always"`.
- `done` - 1f, media (walkthrough 2026-11-10, review and follow-ups 2026-11-11): media through a
  provider class named in the config (main spec D29), `FileMediaProvider` first; upload and library
  routes; the pickers, the library and upload at save; P1f.11 fields in the config's order (D30), P1f.12
  the form toolkit apart from the CMS with a lint rule on its imports (D31), P1f.13 the review of
  `src/admin/cms/common/`. The host project renamed its `image_asset_id` columns to `image`. Breaking:
  `list-cms-collections` answers `{ collections, media }`, and the exported `MediaTarget` type changed.
  `dropped` - P1f.7, editing `metadata` (user, 2026-11-10); `TestCallout.metadata` stays unused.
- `done` - The form layout - sections, groups, rows, collapsibles and tabs - went to
  [sub-form-layout](./ended/2026-11-11-sub-form-layout.md) (2026-11-11), which renamed `admin.groups` to
  `admin.sections`; the steps above keep `admin.groups` as built.
- `done` - A block's `repeaters` became `areas` in [sub-block-areas](./2026-11-23-sub-block-areas.md)
  (2026-11-23); the steps above keep `repeaters` as built.
