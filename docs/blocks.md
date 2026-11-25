# Blocks and areas

How a document holds page-builder content - ordered lists of blocks in named areas, nested inside blocks - from the models to the config, the Admin and the store API; the columns every model needs are in [Models](./models.md), and a block's fields in [Fields](./fields.md).

## How it fits together

An **area** is a named, ordered list of blocks: a page's `sections`, a grid's `items`. A **block** is a row of a block type, such as a hero or a grid, with fields of its own, and a block type may hold areas of its own, so blocks nest.

Each block type is a model of your module, and one more model, the **area model**, ties them to documents. It has a row for every area a document or a block holds, and each block row points at the area row it sits in, ordered by `rank`:

```text
content_area
id  | page_id | parent_id | name
a1  | p1      | null      | sections   <- the page's own area
a2  | p1      | grid_1    | items      <- an area of the block grid_1

content_hero                       content_grid
id     | area_id | rank             id     | area_id | rank
hero_1 | a1      | 0                grid_1 | a1      | 1
hero_2 | a2      | 0
```

Every area row points at its document, at any depth, through the owner column (`page_id`); `parent_id` is the block it sits in, `null` for the document's own areas. The config does not name the area model: the plugin finds it as the target of each collection's `areas` relation and each block's `area` relation, and refuses a config whose relations point at two models.

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

What the plugin checks at start, and what each part is for:

| Part | Why |
|---|---|
| `name`, a text column | The area's name, which the plugin writes. |
| `parent_id`, a nullable text column | The block an area sits in, `null` for a document's own area; the plugin writes it. It is a plain column, not a relation. |
| A nullable `belongsTo` to each collection with areas | Its foreign key, here `page_id`, is the owner column the plugin fills on every area row of the document, nested ones included. Its name is yours. |
| A check naming each owner column | It keeps every area row tied to exactly one document. With several collections, it names all of them. |
| A `hasMany` to each block type, in `.cascades()` | A read follows it to the blocks, and deleting an area row deletes its blocks. Its name is yours. |

The two unique indexes are not checked by the plugin, but keep the data sound: a document holds one row per area name, and a block one row per area of its own. Keep `parent_id IS NULL` in the owner's index, since a block's area rows carry the document's id too and would collide with the document's own areas without it.

## A collection with areas

A collection's model holds its areas through a `hasMany` named exactly `areas`, and cascades its delete to them:

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

The collection's config names its areas under `areas`, each with a `label` and the `blocks` it takes, and places each area in one of its `admin.sections`, after the section's fields:

```ts
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

An area takes these keys:

| Key | What it does |
|---|---|
| `label` | The area's heading in the Admin; a text or a translation. |
| `blocks` | The slugs of the block types the area takes, each one of the config's `blocks`. |
| `minRows` | The fewest blocks a publish takes, with `Add at least <n> blocks`. |
| `maxRows` | The most blocks a publish takes, with `Keep at most <n> blocks`. |

`minRows` and `maxRows` are checked at a publish, so a draft may hold fewer or more; in a collection without drafts every save is a publish. The section layout itself is in [The Admin](./admin.md#a-collections-form-sections).

### Areas on a second collection

The area model holds the areas of every collection. A second collection with areas adds its own nullable `belongsTo` on the area model, its owner column to the check, and an index of its own:

```ts
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

`ContentPost` then has its own `areas: model.hasMany(() => ContentArea, { mappedBy: "post" })` and `.cascades({ delete: ["areas"] })`.

## Block types

A block type is a model of your module with three things the plugin needs: an id with a prefix of its own, a `belongsTo` named exactly `area` to the area model, whose column is `area_id`, and a `rank` number column, the block's position in its area, which the plugin writes:

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

`ContentGrid` and `ContentGridItem` are written the same way, each with its own prefix (`cntgrid`, `cntgitem`), its content columns, `area` and `rank`. The index on `area_id` and `rank` is yours to add, for the reads that order an area's blocks. The area model needs a `hasMany` to the block type, in its `.cascades()`, and your module's service holds the model like any other.

The config lists each block type under `blocks`, at its root:

```ts
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

A block's `slug` is its `block_type`, the name the Admin and the store API know it by. Its `fields` are configured as a collection's are, and its content columns are nullable for the same reason: a block is added before its fields are filled. A block holds no `relationship` field, as a relation points from a document.

A block's card in the Admin may divide its fields into `admin.sections`, each with a `label` and the `fields` it shows; a field in no section shows before them, so a small block needs none. A block's section takes no `key`, `position` or `areas`.

## Areas inside a block

A block type holds areas of its own through `areas` in its config, with the keys a collection's area takes:

```ts
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

The block's model gets no relation for them: each is an area row whose `parent_id` is the block's id, so the model stays as it is. Add the unique index on `parent_id` and `name` to the area model once, as in the example above. Do not add a relation from a block to its area rows: the area model already cascades to the block, and a cascade back would make a loop, and Medusa refuses every soft delete of models that cascade in a loop.

A block type may take itself, directly or through another type, as a grid in a grid item. `maxDepth`, at the config's root, bounds how deep areas nest, `4` when left out: a document's own areas are the first level, the areas of a block in them the second, and so on. A block at the last level shows no areas in the Admin, a save refuses blocks past it with `Blocks cannot be nested this deep`, and the store API reads no deeper.

```ts
export const cmsConfig = defineConfig({
  module: "content",
  collections: [/* ... */],
  blocks: [/* ... */],
  maxDepth: 3,
})
```

## Names, and what the start refuses

Each relation the plugin follows has a fixed name: a collection's `areas` and a block's `area`. The area model's relations are named as you like. The start stops, with a message naming the model or the config entry at fault, on:

- a collection with `areas` whose model has no `areas` hasMany, or does not cascade its delete to it;
- a block type whose model has no `area` belongsTo, or no `rank` number column;
- an area model without a text `name` or a nullable text `parent_id`, without a nullable `belongsTo` to each collection with areas, without a check naming each owner column, or without a cascading `hasMany` to each block type;
- an area named after a column of what holds it, as the store API returns areas beside the columns, or named `areas`;
- an area naming a block type the config does not have;
- a block's areas written under `repeaters`, their earlier key: `"repeaters" is now "areas"`;
- a singleton, or a collection edited in a drawer, with areas: their saves have no blocks.

## Deleting

Deleting a document soft-deletes its row, and the cascades carry it through: the collection's `areas` to every area row of the document, nested ones included, as each carries the owner column, and the area model's `hasMany` relations to every block in them. A block removed in a save is soft-deleted by the plugin with everything it held, its area rows and their blocks at any depth, since no cascade leads from a block to its areas.

## In the Admin

A document's areas are edited on its page, in the sections that name them; the create form holds its fields only, so a new document gets its blocks once it is created. Each area shows its label and its blocks as cards, in order, or `No blocks yet`:

- **Add block** appends a block: of the area's one type at once, or of the type picked from a menu when the area takes several. A new block opens with its fields empty and its areas empty.
- **Move up** and **Move down**, in a card's menu, reorder the blocks; the order is the `rank` a save writes.
- **Remove**, in a card's menu, takes the block out with everything it holds, when the document is saved.
- **Show fields** and **Hide fields** open and close a card. Its header shows the block type and the value of its first text field, so a closed card still says which it is. A card opens by itself for a new block and for one a save refused.

An open card draws the block's fields in no section, then its sections, then each of its areas under its label, as cards of their own. Nothing is written until the document is saved: a save sends each area the editor changed, and an area left as it opened is kept as stored. In a collection with drafts, a published document's block changes wait in its draft version, and reach the rows the store API serves when it is published.

A block whose type its area no longer takes, as the config changed, stays in place with `This block type is no longer allowed here. You can only remove it.` Nothing disappears unless the editor removes it; the store API leaves such a block out.

## In the store API

The store API serves a published document's areas as the rows hold them: each area under its name, as a list of its blocks in their `rank` order, each block with its `id`, its `block_type`, its public fields and its own areas under their names, down to `maxDepth`. `rank`, `area_id` and the area rows stay out of the answer, and so does a block of a type its area no longer takes. A single document answers its areas by default; a list answers them only when `fields` names one. [Store API](./store-api.md#choosing-fields) shows a document with areas, and how `fields` selects an area, a block type or one field of it, such as `sections.grid.items.grid_item.label`.

## Writing areas from your own code

A save through the Admin API or the [workflows](./workflows.md) carries each area under its name as a list of blocks, `{ id?, block_type, ...fields, ...areas }`, in their order. The plugin compares ids, never values:

- a block with the id of a stored block of the document is updated, at any depth, and may move to another area of the same document;
- a block without a known id is created, with an id from its model's prefix;
- a stored block the area no longer carries is deleted, with everything it held;
- an area the body leaves out is kept as stored; an area the body holds is replaced whole.

A block of a type its area no longer takes passes only as `{ id, block_type }` with the id it has in that area, which keeps it in place.
