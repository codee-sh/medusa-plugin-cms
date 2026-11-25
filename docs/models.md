# Models

What the plugin expects of the data models in your content module - the module, the columns it writes, ids, content columns, `metadata`, unique values, relations and migrations; blocks and areas are in [Blocks and areas](./blocks.md), and a field's config in [Fields](./fields.md).

## The module and its service

Your content lives in a Medusa module of your own. The plugin adds no tables for it: you define every model with Medusa's DML, and the plugin reads and writes them through your module's service. The config's `module` names that module, and its service must hold every model the config registers - collections, block types and the area model - so one service writes a whole document.

```ts
// src/modules/content/index.ts
import { MedusaService, Module } from "@medusajs/framework/utils"
import { ContentCategory } from "./models/content-category"
import { ContentPage } from "./models/content-page"

class ContentModuleService extends MedusaService({
  ContentPage,
  ContentCategory,
}) {}

export const CONTENT_MODULE = "content"

export default Module(CONTENT_MODULE, { service: ContentModuleService })
```

```ts
// src/cms/config.ts
import { defineConfig } from "@codee-sh/medusa-plugin-cms"
import { CONTENT_MODULE } from "../modules/content"

export const cmsConfig = defineConfig({
  module: CONTENT_MODULE,
  collections: [/* ... */],
})
```

Each key of `MedusaService({ ... })` must be the PascalCase of the model's DML name: `model.define("content_page", ...)` is `ContentPage`. The plugin calls the methods Medusa generates from that name, such as `createContentPages`, so a service that holds the model under another key starts, and then fails at its first read or write.

Keep each model file directly in your module's `models/` folder: Medusa loads models from the top of that folder only, and a model in a subfolder fails at boot with `Entity '...' was not discovered`.

## A collection's model

A collection's model holds the document's content columns and four columns the plugin writes itself:

| Column | DML | What the plugin writes |
|---|---|---|
| `status` | `model.enum(["draft", "published"])`, default `"draft"` | `draft` or `published`, as the document is published and unpublished |
| `published_at` | `model.dateTime().nullable()` | when the document was last published; `null` while it is unpublished |
| `created_by` | `model.text().nullable()` | the id of the admin user who created the document |
| `updated_by` | `model.text().nullable()` | the id of the admin user who saved it last |

The plugin writes these on every collection, with drafts or without, so a collection without drafts has them too: its documents are written `published` at once. They are not fields: listing one in `fields` stops the start. The enum must hold exactly `draft` and `published`.

```ts
// src/modules/content/models/content-page.ts
import { model } from "@medusajs/framework/utils"
import { ContentCategory } from "./content-category"

export const ContentPage = model
  .define("content_page", {
    id: model.id({ prefix: "cntpage" }).primaryKey(),
    title: model.text().searchable().nullable(),
    slug: model.text().nullable(),
    seo_title: model.text().nullable(),
    metadata: model.json().nullable(),
    category: model
      .belongsTo(() => ContentCategory, { mappedBy: "pages" })
      .nullable(),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_content_page_slug_unique",
      on: ["slug"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
```

A block type's model has a column of its own instead, `rank`, and the area model `name` and `parent_id`; both are in [Blocks and areas](./blocks.md).

## Ids

Every model the config registers - each collection, each block type and the area model - needs an id with a prefix, `model.id({ prefix: "cntpage" })`, and no two of them may share one. The plugin generates the ids of new rows itself, from the prefix, before it writes them: a new block's id is known before its areas are written. A model without a prefix, or with a prefix another registered model uses, stops the start with an error naming both.

## Content columns

Every column you list in the config's `fields` is a field of the form. Make them nullable. A draft is saved before it is complete, and a block is added before its fields are filled, so the database must take an empty value; whether a field must be filled is the config's, in its Zod schemas: `serverValidation` for every save, `serverPublishValidation` for a publish. [Fields](./fields.md) explains both.

A column that is not nullable and has no default must be filled at every save, so the config must list it as a field whose `serverValidation` refuses `null`, such as `z.string()`; the start stops otherwise, with `"<column>" is required by its column`. A column with a default, such as `model.boolean().default(false)`, needs neither.

A field's `type` must fit its column:

| Field type | Column |
|---|---|
| `text`, `textarea`, `slug`, `url`, `richtext` | `model.text()` |
| `number` | `model.number()`, `model.float()` or `model.bigNumber()` |
| `boolean` | `model.boolean()` |
| `date` | `model.dateTime()` |
| `select` | `model.text()` or `model.enum([...])` |
| `combobox` | `model.text()` or `model.enum([...])`; `model.array()` with `multiple: true` |
| `text_list` | `model.array()` |
| `media` | `model.text()` for one file; `model.array()` with `multiple: true` for several |
| `relationship` | the foreign key of a `belongsTo`, such as `category_id` |

What else to know about content columns:

- **A column the config does not list is no field.** The Admin does not show it, a save that sends it is refused, and the store API leaves it out. Your own code may still write it through your module's service.
- **`.searchable()`** on a text column turns on the search of the collection's table in the Admin, through Medusa's free-text search. A `richtext` field cannot sit on a searchable column, as a search would match its JSON.
- **A `json` column is no field.** `metadata` is the one the plugin knows; another `json` column stays yours.
- **`created_at`, `updated_at` and `deleted_at`** are Medusa's, added to every model; none of them can be a field.

## `metadata`

A collection's model may have `metadata: model.json().nullable()`, as Medusa's own models do. It is never a field: no config lists it, and a save through the plugin that sends it is refused. Your own code writes it through your module's service, and the store API returns a document's `metadata` whole, `null` when it is empty. Use it for values that say how a document is shown rather than what it says, and keep content in columns, where a field validates it and the Admin edits it. A `metadata` column that is not `json` stops the start.

## Unique values

A column covered alone by a unique index - `.unique()` on the property, or an entry of `.indexes()` with `unique: true` over that one column - is unique to the plugin. Before a save it reads which values live documents already hold, the edited document left out, and refuses a value another live document holds with `"<value>" is used by another document` at the field, answered as `422`. In the Admin, the create and edit forms check a unique field once the editor pauses typing: a slug the form filled in moves to its first free `-2`, `-3` form, and a value the editor typed blocks the save with that form offered.

A document is live until it is deleted, a draft included; a deleted document frees its values at once. Limit the index to live rows with `where: "deleted_at IS NULL"`, as in the example above, so the database agrees with that read. In a collection with drafts, a published document's edits wait in its draft version, so their unique values are checked when it is published.

The index stays the guard against two saves racing past the read: the second fails with the database's error, a `400`. A unique index over several columns is the database's alone, and the plugin does not read it before a save.

## Relations between collections

A document points at a document of another collection, or of its own, through a `belongsTo` on its model. DML needs the other side, a `hasMany` on the target, and `mappedBy` on both:

```ts
// src/modules/content/models/content-category.ts
import { model } from "@medusajs/framework/utils"
import { ContentPage } from "./content-page"

export const ContentCategory = model.define("content_category", {
  id: model.id({ prefix: "cntcat" }).primaryKey(),
  name: model.text().searchable().nullable(),
  pages: model.hasMany(() => ContentPage, { mappedBy: "category" }),
  status: model.enum(["draft", "published"]).default("draft"),
  published_at: model.dateTime().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})
```

The `belongsTo` named `category` on the page adds the column `category_id`, which the config lists as a `relationship` field with `relationTo: "category"`. The field, what every save checks of its id, and what the start refuses are in [Fields](./fields.md#relationships).

What to know about relations at the model:

- **Make the `belongsTo` nullable**, as content columns are, so a draft can leave it empty.
- **Keep the `hasMany` out of the target's `.cascades()`.** A cascade would delete the pages with their category.
- **A model with two relations to one target, or one to itself, names each in `mappedBy`**, as DML would otherwise give both the same name.
- **A relationship field sits on a collection.** A block holds none, so give a block type's model no relation besides its `area`.

## Migrations

The plugin creates no tables for your models, and generates no migrations for them. After you add or change a model, generate your module's migration and run it:

```bash
npx medusa db:generate content
npx medusa db:migrate
```

`db:migrate` also creates the plugin's own tables, such as the one holding versions, the first time it runs.

Read each generated migration before you run it. `db:generate` compares an index declared with `where` by its name, so a change of its `where`, `on` or `unique` under the same name reaches the snapshot and not the migration; drop and recreate the index in the migration yourself, or give it a new name. And a column that becomes required, or gains a unique index, needs the rows already stored to fit it before the migration runs.

## Adding to the content model

The same steps for each kind of content. Run the migrations after each model change.

| To add | Model change | Config change |
|---|---|---|
| A collection | A new model with an id prefix of its own and `status`, `published_at`, `created_by`, `updated_by`; added to your module's service | An entry in `collections`, with `admin.sections` |
| A collection with blocks | As a collection, plus `areas: model.hasMany(...)` to the area model and `.cascades({ delete: ["areas"] })`; on the area model a nullable `belongsTo` back, the owner column in its check, and a unique index on the owner column and `name` | The entry's `areas`, each naming its block types, and each area in a section |
| A relation | A nullable `belongsTo` on the model that points, and a `hasMany` on its target | A `relationship` field on the foreign key, such as `category_id`, with `relationTo` |
| A block type | A new model with an id prefix, `rank` and `area: model.belongsTo(...)` to the area model; on the area model a `hasMany` to it, in its `.cascades()` | An entry in `blocks`, and its slug in the `blocks` of each area that takes it |
| Areas in a block | None on the block's model; on the area model, once, the unique index on `parent_id` and `name` | The block's `areas`, each naming its block types |
| A media field | A nullable `model.text()` for one file, or `model.array()` for several | A field of `type: "media"` with `stores`, `multiple: true` on an array, and `media.provider` once per config |

The area model and the block types are explained in [Blocks and areas](./blocks.md), and media providers in [Media](./media.md).
