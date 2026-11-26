# Blocks and areas

How a document holds page-builder content, from the data models to the config, the Admin, and the Store API. The content is ordered lists of blocks in named areas, and a block can hold areas of its own. The columns every model needs are in [Models](./models.md), and a block's fields in [Fields](./fields.md).

## How it fits together

- **An area** is a named, ordered list of blocks, such as a page's `sections` or a grid's `items`.
- **A block** is a row of a block type, such as a hero or a grid, with its own fields. A block type can hold its own areas, so blocks nest.
- **The area model** ties blocks to documents. Each block type is a data model of your module, and the area model is one more.

### An example

A page holds a hero and a grid in its `sections`, and the grid holds two items. The area model keeps one row per area:

| `content_area.id` | `page_id` | `parent_id` | `name` | The area |
|---|---|---|---|---|
| `area_1` | `page_1` | `null` | `sections` | The page's own area |
| `area_2` | `page_1` | `grid_1` | `items` | An area of the block `grid_1` |

Each block is a row in the table of its block type. The `area_id` column names the area the block sits in, and `rank` orders the blocks within one area:

| Table | `id` | `area_id` | `rank` |
|---|---|---|---|
| `content_hero` | `hero_1` | `area_1` | `0` |
| `content_grid` | `grid_1` | `area_1` | `1` |
| `content_grid_item` | `item_1` | `area_2` | `0` |
| `content_grid_item` | `item_2` | `area_2` | `1` |

The page shows the hero, then the grid, and the grid shows its two items in order.

Every area row has two columns that place it:

- **`page_id`** - the owner column, which points at the document however deep the area is nested
- **`parent_id`** - the block the area sits in, or `null` for the document's own areas

> [!NOTE]
> The config does not name the area model. The plugin finds it as the target of each collection's `areas` relation and each block type's `area` relation. The plugin refuses a config whose relations point at two different models.

## The area model

One area model serves every collection with areas and every block type:

```ts
// src/modules/content/models/content-area.ts
import { model } from "@medusajs/framework/utils"
import { ContentGrid } from "./content-grid"
import { ContentGridItem } from "./content-grid-item"
import { ContentHero } from "./content-hero"
import { ContentPage } from "./content-page"

export const ContentArea = model
  .define("content_area", {
    id: model.id({ prefix: "cntarea" }).primaryKey(),
    name: model.text(),
    parent_id: model.text().nullable(),
    page: model.belongsTo(() => ContentPage, { mappedBy: "areas" }).nullable(),
    heroes: model.hasMany(() => ContentHero, { mappedBy: "area" }),
    grids: model.hasMany(() => ContentGrid, { mappedBy: "area" }),
    grid_items: model.hasMany(() => ContentGridItem, { mappedBy: "area" }),
  })
  .cascades({ delete: ["heroes", "grids", "grid_items"] })
  .checks([
    { name: "CHK_content_area_owner", expression: "num_nonnulls(page_id) = 1" },
  ])
  .indexes([
    {
      name: "IDX_content_area_page_id_name_unique",
      on: ["page_id", "name"],
      unique: true,
      where: "page_id IS NOT NULL AND parent_id IS NULL AND deleted_at IS NULL",
    },
    {
      name: "IDX_content_area_parent_id_name_unique",
      on: ["parent_id", "name"],
      unique: true,
      where: "parent_id IS NOT NULL AND deleted_at IS NULL",
    },
  ])
```

### What the plugin checks

When Medusa starts, the plugin checks these parts of the area model. The table says what each part is for:

| Part | Why |
|---|---|
| `name`, a text column | The name of the area, which the plugin writes. |
| `parent_id`, a nullable text column | The block the area sits in, or `null` for a document's own area. The plugin writes the value. `parent_id` is a plain column, not a relation. |
| A nullable `belongsTo` to each collection with areas | The foreign key of this relation, here `page_id`, is the owner column. The plugin fills it on every area row of the document, nested ones included. You choose the relation's name. |
| A check naming each owner column | The check keeps every area row tied to exactly one document. If several collections have areas, the check names all their owner columns. |
| A `hasMany` to each block type, in `.cascades()` | The plugin follows this relation to read the blocks, and deleting an area row deletes the blocks in it. You choose the relation's name. |

### The unique indexes

The plugin does not check the two unique indexes, but they keep the data sound:

- **`IDX_content_area_page_id_name_unique`** - a document holds one area row per area name.
- **`IDX_content_area_parent_id_name_unique`** - a block holds one area row per area of its own.

> [!WARNING]
> Keep `parent_id IS NULL` in the index on the owner column. The area rows of a block carry the document's id too. Without that condition, they would collide with the document's own areas.

## A collection with areas

A collection's model holds its areas through a `hasMany` named exactly `areas`. The model also cascades its deletes to them:

```ts
// src/modules/content/models/content-page.ts
import { model } from "@medusajs/framework/utils"
import { ContentArea } from "./content-area"

export const ContentPage = model
  .define("content_page", {
    id: model.id({ prefix: "cntpage" }).primaryKey(),
    title: model.text().searchable().nullable(),
    slug: model.text().nullable(),
    areas: model.hasMany(() => ContentArea, { mappedBy: "page" }),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .cascades({ delete: ["areas"] })
```

### The collection's config

The collection's config lists its areas under `areas`, each with a `label` and the `blocks` it takes. You place each area in one of the collection's `admin.sections`, where it shows after the section's fields:

```ts
// src/cms/config.ts, in collections
{
  slug: "page",
  model: ContentPage,
  drafts: true,
  labels: { singular: "Page", plural: "Pages" },
  admin: {
    useAsTitle: "title",
    sections: [
      { key: "page", label: "Page", fields: ["title", "slug"] },
      { key: "content", label: "Content", fields: [], areas: ["sections"] },
    ],
  },
  fields: {
    title: { type: "text", label: "Title", serverValidation: z.string() },
    slug: { type: "slug", label: "Slug", from: "title" },
  },
  areas: {
    sections: { label: "Sections", blocks: ["hero", "grid"] },
  },
}
```

The layout of the sections is explained in [The Admin](./admin.md#a-collections-form-sections).

### An area's keys

An area, typed as `AreaConfig`, takes these keys:

| Option | Type | Default | Description |
|---|---|---|---|
| `label` | `CmsText` | required | The heading of the area in the Admin, as a text or a translation. |
| `blocks` | `string[]` | required | The slugs of the block types the area takes, each one from the config's `blocks`. |
| `minRows` | `number` | - | The fewest blocks the area must hold when the document is published, or publishing fails with `Add at least <n> blocks` (`block` when `<n>` is 1). |
| `maxRows` | `number` | - | The most blocks the area may hold when the document is published, or publishing fails with `Keep at most <n> blocks` (`block` when `<n>` is 1). |

The plugin checks `minRows` and `maxRows` when a document is published, so a draft may hold fewer or more blocks. In a collection without drafts, every save publishes the document.

### Areas on a second collection

The area model holds the areas of every collection. For a second collection with areas, add three things to the area model:

- a nullable `belongsTo` of its own to the collection
- the collection's owner column in the check
- an index of its own for the collection

```ts
// src/modules/content/models/content-area.ts
post: model.belongsTo(() => ContentPost, { mappedBy: "areas" }).nullable(),
// ...
.checks([
  { name: "CHK_content_area_owner", expression: "num_nonnulls(page_id, post_id) = 1" },
])
// and in .indexes([...]):
{
  name: "IDX_content_area_post_id_name_unique",
  on: ["post_id", "name"],
  unique: true,
  where: "post_id IS NOT NULL AND parent_id IS NULL AND deleted_at IS NULL",
},
```

The `ContentPost` model then gets its own `areas: model.hasMany(() => ContentArea, { mappedBy: "post" })` and `.cascades({ delete: ["areas"] })`.

## Block types

A block type is a data model of your module. The plugin needs three things from it:

- **An id** with its own prefix
- **A `belongsTo` named exactly `area`** to the area model, with the column `area_id`
- **A `rank` number column** for the block's position in its area, which the plugin writes

```ts
// src/modules/content/models/content-hero.ts
import { model } from "@medusajs/framework/utils"
import { ContentArea } from "./content-area"

export const ContentHero = model
  .define("content_hero", {
    id: model.id({ prefix: "cnthero" }).primaryKey(),
    title: model.text().nullable(),
    image: model.text().nullable(),
    area: model.belongsTo(() => ContentArea, { mappedBy: "heroes" }),
    rank: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_content_hero_area_id_rank",
      on: ["area_id", "rank"],
      where: "deleted_at IS NULL",
    },
  ])
```

You write `ContentGrid` and `ContentGridItem` the same way. Each has its own prefix (`cntgrid` and `cntgitem`), its content columns, `area`, and `rank`.

- **The index on `area_id` and `rank`** is yours to add. It serves the reads that order the blocks of an area.
- **The area model** needs a `hasMany` to the block type, listed in the area model's `.cascades()`.
- **Your module's service** holds the block type's model like any other model.

### A block type's config

The config lists each block type under `blocks`, at the root of the config:

```ts
// src/cms/config.ts, at the config's root
blocks: [
  {
    slug: "hero",
    model: ContentHero,
    labels: { singular: "Hero", plural: "Heroes" },
    fields: {
      title: { type: "text", label: "Title", serverPublishValidation: z.string() },
      image: { type: "text", label: "Image URL" },
    },
  },
],
```

A block type, typed as `BlockConfig`, takes these keys of its own:

| Option | Type | Default | Description |
|---|---|---|---|
| `slug` | `string` | required | The block's `block_type`, the name the Admin and the Store API use for it. |
| `fields` | `Record<string, FieldConfig>` | - | The block's fields, configured like the fields of a collection. |
| `admin.sections` | `LayoutBlockSectionConfig[]` | - | The sections of the block's card in the Admin, described in [Sections of a block's card](#sections-of-a-blocks-card). |
| `areas` | `Record<string, AreaConfig>` | - | The block's own areas, described in [Areas inside a block](#areas-inside-a-block). |

A block's content columns are nullable, as a collection's are, because an editor adds a block before filling in its fields. A block holds no `relationship` field, because a relation points from a document.

### Sections of a block's card

In the Admin, a block's card can divide the block's fields into `admin.sections`, each with a `label` and the `fields` it shows. A field outside every section shows before the sections, so a small block needs no sections. A section of a block takes no `key`, `position`, or `areas`.

## Areas inside a block

A block type holds its own areas through `areas` in its config. Each area takes the same keys as an area of a collection:

```ts
// src/cms/config.ts, in blocks
{
  slug: "grid",
  model: ContentGrid,
  labels: { singular: "Grid", plural: "Grids" },
  fields: { title: { type: "text", label: "Title" } },
  areas: {
    items: { label: "Items", blocks: ["grid_item", "hero"], minRows: 1, maxRows: 6 },
  },
},
{
  slug: "grid_item",
  model: ContentGridItem,
  labels: { singular: "Grid item", plural: "Grid items" },
  admin: {
    sections: [{ label: "Item", fields: ["label", "value"] }],
  },
  fields: {
    label: { type: "text", label: "Label" },
    value: { type: "text", label: "Value" },
  },
},
```

The block's model gets no relation for these areas. Each one is an area row whose `parent_id` is the block's id, so the block's model stays as it is. Add the unique index on `parent_id` and `name` to the area model once, as shown in [The area model](#the-area-model).

> [!WARNING]
> Do not add a relation from a block to its area rows. The area model already cascades to the block, so a cascade back would make a loop. Medusa refuses every soft delete of models that cascade in a loop.

### How deep areas nest

A block type can take itself, directly or through another type, such as a grid inside a grid item. `maxDepth`, at the root of the config, limits how deep areas nest:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxDepth` | `number` | `4` | How many levels of areas a document can nest. |

A document's own areas are the first level. The areas of a block in them are the second level, and so on.

```ts
// src/cms/config.ts
export const cmsConfig = defineConfig({
  module: "content",
  collections: [/* ... */],
  blocks: [/* ... */],
  maxDepth: 3,
})
```

At the last level of nesting:

- a block shows no areas in the Admin
- saving refuses any block past that level, with `Blocks cannot be nested this deep`
- the Store API reads no deeper

## Startup checks

Two relations the plugin follows have fixed names: `areas` on a collection's model and `area` on a block type's model. You name the relations of the area model as you like.

### When Medusa does not start

Medusa does not start in these cases, and the message names the model or the config entry at fault:

- a collection with `areas` whose model has no `hasMany` named `areas`, or does not cascade its deletes to it
- a block type whose model has no `belongsTo` named `area`, or no `rank` number column
- an area model without a text `name`, or without a nullable text `parent_id`
- an area model without a nullable `belongsTo` to each collection with areas
- an area model without a check naming each owner column
- an area model without a cascading `hasMany` to each block type
- an area named after a column of the model that holds it, because the Store API returns areas beside the columns
- an area named `areas`
- an area that names a block type the config does not have
- a block type's areas written under `repeaters`, the earlier name of the key, with `"repeaters" is now "areas"`
- a singleton with areas, or a collection with areas that is edited in a drawer, because their forms save no blocks

## Deleting

Deleting a document soft-deletes the document's row, and the cascades carry the delete further:

- **The collection's `areas`** carry the delete to every area row of the document, nested ones included, because each area row holds the owner column.
- **The area model's `hasMany` relations** carry the delete to every block in those areas.

When you save an area without one of its stored blocks, the plugin soft-deletes that block with everything it held. That includes the block's area rows and their blocks, at any depth. The plugin does this itself, because no cascade leads from a block to its areas.

## In the Admin

An editor edits a document's areas on the document's page, in the sections that name them. The create form holds only the fields, so a new document gets its blocks after it is created.

### The block cards

Each area shows its label and its blocks as cards, in order. An area without blocks shows `No blocks yet`. The cards have these controls:

- **Add block** appends a block of the area's block type, or of a type picked from a menu when the area takes several. A new block opens with empty fields and empty areas.
- **Move up** and **Move down**, in a card's menu, reorder the blocks. Saving the document writes the new order as `rank`.
- **Remove**, in a card's menu, takes the block out with everything it holds. The block goes when the document is saved.
- **Show fields** and **Hide fields** open and close a card.

A card's header shows the block type and the value of the block's first text field. That way, a closed card still shows which block it holds. A card opens by itself for a new block, and for a block that failed validation on save.

An open card shows, in order:

1. the block's fields that are in no section
2. the block's sections
3. each of the block's areas under its label, with the area's blocks as cards of their own

### Saving the blocks

Nothing is written until the editor saves the document. When an editor saves, the Admin sends each area they changed. An area left as it opened is kept as stored.

If the collection has drafts, the block changes of a published document wait in the document's draft version. They reach the rows the Store API serves when the document is published.

### When an area no longer takes a block type

When you remove a block type from an area's `blocks`, the blocks of that type stay in place and show `This block type is no longer allowed here. You can only remove it.` Nothing disappears unless the editor removes it. The Store API leaves such a block out.

## In the Store API

The Store API serves a published document's areas as the rows hold them. Each area comes under its name, as a list of the area's blocks in `rank` order. Each block holds:

- its `id` and its `block_type`
- its public fields
- its own areas under their names, down to `maxDepth`

The response leaves out:

- `rank`, `area_id`, and the area rows
- a block of a type its area no longer takes

A request for a single document returns its areas by default. A list returns them only when `fields` names an area. [Store API](./store-api.md#choosing-fields) shows a document with areas. That page also shows how `fields` selects an area, a block type, or one field of a block type, such as `sections.grid.items.grid_item.label`.

## Writing areas from your own code

When you save a document through the Admin API or the [workflows](./workflows.md), send each area under its name. The area is a list of blocks, in their order. Each block has this shape:

```ts
{
  id?: string
  block_type: string
  // ...its fields, by name
  // ...its own areas, by name, each a list of blocks
}
```

For the page above, the document you save may hold:

```json
{
  "title": "About us",
  "sections": [
    { "id": "cnthero_01JD8Q5B", "block_type": "hero", "title": "Who we are" },
    {
      "block_type": "grid",
      "title": "Numbers",
      "items": [{ "block_type": "grid_item", "label": "Founded", "value": "1998" }]
    }
  ]
}
```

To match the blocks of the body with the stored ones, the plugin compares ids, never values:

- **A block with the id of a stored block** of the document is updated, at any depth. The block may move to another area of the same document.
- **A block without a known id** is created, with an id built from the prefix of its model.
- **A stored block the area no longer carries** is deleted, with everything it held.
- **An area the body leaves out** is kept as stored. An area the body holds is replaced whole.

> [!NOTE]
> A block of a type its area no longer takes is accepted only as `{ id, block_type }`, with the id the block has in that area. Sent that way, the block stays in place.

### When the plugin refuses a block

The plugin reports each error at the block's path in the document:

- **A block of a type its area does not take** fails with `This block type is not allowed here`, unless it is a stored block of that area with its stored type.
- **A block id the body holds more than once**, at any depth, fails at each repeat with `This block is sent more than once`. A new block, sent without an id, is never a repeat.
