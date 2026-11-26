# Models

This page explains what the plugin expects of the data models in your content module. It covers the module, the columns the plugin writes, ids, content columns, `metadata`, unique values, relations, and migrations. [Blocks and areas](./blocks.md) explains blocks and areas, and [Fields](./fields.md) explains the config of a field.

## The module and its service

Your content lives in a Medusa module of your own. The plugin adds no tables for your content. You define every data model with Medusa's DML, and the plugin reads and writes the models through your module's service.

The `module` option of the config names that module. Your module's service must hold every model that the config registers, so that one service writes a whole document:

- each collection's model
- each block type's model
- the area model

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
import { defineConfig } from "@mostrajs/cms"
import { CONTENT_MODULE } from "../modules/content"

export const cmsConfig = defineConfig({
  module: CONTENT_MODULE,
  collections: [/* ... */],
})
```

### Naming the service's keys

Each key of `MedusaService({ ... })` must be the DML name of the model in PascalCase. For example, `model.define("content_page", ...)` takes the key `ContentPage`. The plugin calls the methods that Medusa generates from that name, such as `createContentPages`.

> [!WARNING]
> If the service holds a model under another key, the service still starts. The first read or write of that model then fails.

### Where the model files go

Keep each model file directly in your module's `models/` folder. Medusa loads models only from the top of that folder. If a model sits in a subfolder, Medusa fails at boot with `Entity '...' was not discovered`.

## A collection's model

The model of a collection holds the content columns of its documents and four columns that the plugin writes itself:

| Column | DML | What the plugin writes |
|---|---|---|
| `status` | `model.enum(["draft", "published"])`, default `"draft"` | `draft` or `published`, as you publish and unpublish the document |
| `published_at` | `model.dateTime().nullable()` | When the document was last published, or `null` while it is unpublished |
| `created_by` | `model.text().nullable()` | The id of the admin user who created the document |
| `updated_by` | `model.text().nullable()` | The id of the admin user who last saved the document |

What to know about these columns:

- **Every collection has them, with drafts or without.** In a collection without drafts, the plugin writes each document as `published` right away.
- **They are not fields.** If you list one of them in `fields`, Medusa does not start.
- **The enum must hold exactly `draft` and `published`.**

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

The model of a block type has a column of its own instead, `rank`. The area model has `name` and `parent_id`. [Blocks and areas](./blocks.md) explains both.

## Ids

Every model that the config registers needs an id with a prefix, such as `model.id({ prefix: "cntpage" })`. No two of these models may share a prefix. This covers the model of each collection, the model of each block type, and the area model.

The plugin generates the id of each new row from the prefix, before it writes the row. So the plugin knows the id of a new block before it writes the areas of that block.

### When Medusa does not start

- **A model has no prefix** - Medusa does not start.
- **Two registered models use the same prefix** - Medusa does not start, and the error names both models.

## Content columns

Every column that you list in the `fields` of the config is a field of the form. Make these columns nullable:

- An editor saves a draft before it is complete.
- An editor adds a block before filling in its fields.

So the database must accept an empty value. The config decides whether a field must be filled, in the Zod schemas of the field. `serverValidation` runs whenever a document is saved, and `serverPublishValidation` runs when it is published. [Fields](./fields.md) explains both.

### Required columns

A column that is not nullable and has no default must be filled every time a document is saved. The config must list it as a field whose `serverValidation` refuses `null`, such as `z.string()`. Otherwise Medusa does not start:

- **The config does not list the column** - the error is `"<column>" is required by its column, so the config must list it in fields`.
- **The field of the column accepts an empty value** - the error is `"<column>" is required by its column, so its field's "serverValidation" must refuse an empty value`.

A column with a default, such as `model.boolean().default(false)`, needs neither.

### A field's type and its column

The `type` of a field must fit its column:

| Field type | Column |
|---|---|
| `text`, `textarea`, `slug`, `url`, `richtext` | `model.text()` |
| `number` | `model.number()`, `model.float()` or `model.bigNumber()` |
| `boolean` | `model.boolean()` |
| `date` | `model.dateTime()` |
| `select` | `model.text()` or `model.enum([...])` |
| `combobox` | `model.text()` or `model.enum([...])`, or `model.array()` with `multiple: true` |
| `text_list` | `model.array()` |
| `media` | `model.text()` for one file, or `model.array()` with `multiple: true` for several |
| `relationship` | The foreign key of a `belongsTo`, such as `category_id` |

### What else to know

- **A column that the config does not list is not a field.** The Admin does not show it, and the Store API leaves it out. The plugin refuses a save that sends it. Your own code can still write it through your module's service.
- **`.searchable()`** on a text column turns on search in the collection's table in the Admin. The search uses Medusa's free-text search. A `richtext` field cannot sit on a searchable column, because search would then match the JSON that the field stores.
- **A `json` column is not a field.** `metadata` is the only `json` column the plugin knows. Any other `json` column stays yours.
- **`created_at`, `updated_at`, and `deleted_at`** are Medusa's own columns, added to every model. None of them can be a field.

## `metadata`

The model of a collection may have a `metadata` column, as Medusa's own models do:

```ts
// src/modules/content/models/content-page.ts
// ...
metadata: model.json().nullable(),
// ...
```

What to know about it:

- **It is never a field.** No config lists it, and the plugin refuses a save that sends it.
- **Your own code writes it** through your module's service.
- **The Store API returns the whole `metadata` of a document**, or `null` when it is empty.
- **If the `metadata` column is not `json`**, Medusa does not start.

Use `metadata` for values that say how a document is shown, not what it says. Keep content in columns, where a field validates it and an editor edits it in the Admin.

## Unique values

The plugin treats a column as unique when a unique index covers that column alone. Either of these declares such an index:

- `.unique()` on the property
- an entry of `.indexes()` with `unique: true` over that one column

Before the plugin saves a document, it reads the values that the other live documents already hold.

### When a value is taken

- **Another live document holds the value** - the plugin refuses the save and shows `"<value>" is used by another document` at the field, with the status `422`.
- **Two requests save the same value at once** - both pass the read, but the unique index still guards the column. The second save fails with the database error, as a `400`.

### In the Admin

The create and edit forms check a unique field once the editor pauses typing:

- **A slug that the form filled in** changes to its first free variant: `-2`, `-3`, and so on.
- **A value that the editor typed** blocks saving, and the form offers that free variant.

### Live documents and drafts

A document is live until it is deleted, and a draft counts as live. When a document is deleted, its values are free at once. Limit the index to live rows with `where: "deleted_at IS NULL"`, as in the example above. The database and the plugin then agree on which values are taken.

In a collection with drafts, the edits to a published document wait in its draft version. So the plugin checks their unique values when the document is published.

> [!NOTE]
> Only the database guards a unique index over several columns. The plugin does not read such an index before it saves a document.

## Relations between collections

A document points at a document of another collection, or of its own collection, through a `belongsTo` on its model. DML also needs the other side, a `hasMany` on the target model, with `mappedBy` on both sides:

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

On the page, the `belongsTo` named `category` adds the column `category_id`. The config lists that column as a `relationship` field with `relationTo: "category"`. [Fields](./fields.md#relationships) explains the field, how the plugin checks the id whenever a document is saved, and which configs stop Medusa from starting.

What to know about relations in the model:

- **Make the `belongsTo` nullable**, as content columns are, so a draft can leave it empty.
- **Keep the `hasMany` out of the target's `.cascades()`.** A cascade would delete the pages along with their category.
- **When a model has two relations to one target, or a relation to itself, name each in `mappedBy`.** Otherwise DML gives both relations the same name.
- **A relationship field sits on a collection.** A block holds no relationship field. Give the model of a block type no relation other than its `area`.

## Migrations

The plugin creates no tables for your models and generates no migrations for them. After you add or change a model, generate the migration of your module and run it:

```bash
npx medusa db:generate content
npx medusa db:migrate
```

The first time it runs, `db:migrate` also creates the plugin's own tables, such as the table that holds versions.

### Before you run a migration

Read each generated migration before you run it:

- **An index declared with `where` that you changed** - `db:generate` compares such an index by its name. If you change its `where`, `on`, or `unique` and keep the name, the change reaches the snapshot but not the migration. Drop and recreate the index in the migration yourself, or give the index a new name.
- **A column that becomes required, or gains a unique index** - the rows already stored must fit the new rule before the migration runs.

## Adding to the content model

Each kind of content below lists what changes in the model and in the config. After each change to a model, run the migrations.

### A collection

- **Model:** Add a new model with an id prefix of its own and the columns `status`, `published_at`, `created_by`, and `updated_by`. Add the model to your module's service.
- **Config:** Add an entry to `collections`, with `admin.sections`.

### A collection with blocks

- **Model:** Add the model as for a collection, plus `areas: model.hasMany(...)` to the area model and `.cascades({ delete: ["areas"] })`. On the area model, add a nullable `belongsTo` back to the collection. Its foreign key is the owner column. Name the owner column in the check of the area model, and add a unique index on the owner column and `name`.
- **Config:** Add `areas` to the entry, each area naming its block types, and place each area in a section.

### A relation

- **Model:** Add a nullable `belongsTo` on the model that points, and a `hasMany` on its target.
- **Config:** Add a `relationship` field on the foreign key, such as `category_id`, with `relationTo`.

### A block type

- **Model:** Add a new model with an id prefix, `rank`, and `area: model.belongsTo(...)` to the area model. On the area model, add a `hasMany` to the new model and list it in `.cascades()`.
- **Config:** Add an entry to `blocks`, and add its slug to the `blocks` of each area that takes the block type.

### Areas in a block

- **Model:** The model of the block needs no change. On the area model, add the unique index on `parent_id` and `name`. You add this index only once.
- **Config:** Add `areas` to the block, each area naming its block types.

### A media field

- **Model:** Add a nullable `model.text()` for one file, or a `model.array()` for several.
- **Config:** Add a field of `type: "media"` with `stores`, and `multiple: true` on an array. Set `media.provider` once per config.

[Blocks and areas](./blocks.md) explains the area model and the block types, and [Media](./media.md) explains media providers.
