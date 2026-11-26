# Collections, drafts and singletons

This page explains a collection's config, its drafts and versions, the document actions, and singletons, which hold one-of-a-kind content. [The Admin](./admin.md) covers how the Admin lays out each of them, and [Models](./models.md) lists the columns a collection's model needs.

## A collection's config at a glance

A collection is one entry of the config's `collections`. These are its keys, with the page that explains each:

| Key | What it does | More |
|---|---|---|
| `slug` | The collection's name in the API and the Admin, in snake_case: `/store/cms/<slug>` | [Store API](./store-api.md) |
| `model` | The DML model in your module that holds the collection's documents | [Models](./models.md) |
| `labels` | `{ singular, plural }`, the names the Admin shows, each a text or a translation | [Translations](./translations.md) |
| `fields` | The model's columns that the form edits, each with its type and rules | [Fields](./fields.md) |
| `serverValidation`, `serverPublishValidation` | Rules that check several fields together, at every save or when a document is published | [Validation](./validation.md) |
| `drafts` | `true` turns drafts and versions on, and without it the collection is live | [Drafts and versions](#drafts-and-versions) |
| `singleton` | `true` keeps the collection to one document | [Singletons](#singletons) |
| `store` | `false` keeps the collection out of the Store API, and an object sets the collection's list and retrieve routes | [Store API](./store-api.md#a-collections-store-config) |
| `areas` | The areas of blocks that a document holds | [Blocks](./blocks.md) |
| `admin.sections` | The form's sections, each field and area in one of them | [The Admin](./admin.md#a-collections-form-sections) |
| `admin.useAsTitle` | The field that titles a document | [The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited) |
| `admin.table` | The columns, order, page size, and filters of the collection's table | [The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited) |
| `admin.edit` | Where a row is edited: `"page"` (the default) or `"drawer"` | [Editing on a page or in a drawer](#editing-on-a-page-or-in-a-drawer) |
| `admin.actions` | The buttons in the header of the collection's table | [The Admin](./admin.md#the-admins-routes-and-the-tables-buttons) |
| `admin.description` | The description the table shows under its heading | [The Admin](./admin.md#the-admins-routes-and-the-tables-buttons) |

Two keys at the config's root act on collections too:

- **`admin.routes`** places each collection on a page of the Admin, as [The Admin](./admin.md#the-admins-routes-and-the-tables-buttons) explains.
- **`versions.maxPerDocument`** caps the history, as [described below](#how-many-versions-a-document-keeps).

> [!NOTE]
> When the config does not fit its models, Medusa does not start. It reports the first problem it finds as `The CMS config is invalid: <where>: <problem>`. `<where>` names the place in the config, such as `collection "page"`. The docs quote only the `<problem>` part.

## Drafts and versions

A collection is live by default. A document is published when you create it, every change you save goes live at once, and no version is recorded. Set `drafts: true` to turn drafts and versions on, as content pages need:

```ts
{
  slug: "page",
  model: ContentPage,
  drafts: true,
  // ...
}
```

With drafts on:

- Saving a document keeps a draft and records a version.
- **Publish** makes the draft live.
- You restore an earlier version from the document's history.

> [!NOTE]
> A singleton and a collection edited in a drawer cannot have drafts.

### A live collection

Without `drafts: true`, a document is published when you create it, and every change you save goes live at once. So the plugin checks creating and saving a document the way it checks publishing: `serverPublishValidation` runs in addition to `serverValidation`.

- **No history.** The plugin records no version.
- **The document's page** has no status, no publish actions, and no history. Its header says that changes go live when you save, and its button is **Save**.
- **Refused actions.** For a live collection, the server refuses to publish, unpublish, discard changes, or restore a version.
- **Leaving the storefront.** A document leaves the storefront only when you delete it.

> [!NOTE]
> If you turn drafts off, the versions recorded before stay stored, but the plugin no longer reads them.

### A collection with drafts

A document has a status, which the Admin shows as **Draft**, **Published**, or **Published with changes**:

- **A new document** is a draft. Creating it records version 1.
- **A draft** is saved with **Save**. Saving writes the document's row and records a version. The Store API does not serve a draft.
- **A published document** is saved with **Save draft**. The document's row, which the Store API serves, stays as it is. Saving records a draft version only, checked for its shape. When you publish the document, the plugin checks the fields that publishing requires and the unique values.

### Document actions

| Action | Where | Shown for |
|---|---|---|
| **Publish** | the status section | a draft |
| **Publish changes** | the status section | a published document with a newer draft |
| **Unpublish** | the status section | a published document |
| **Discard changes** | the action menu | a published document with a newer draft |
| **Delete** | the action menu | any document except a singleton |

What each action does:

- **Publish** makes the latest saved version live by writing its content to the rows the Store API serves. It also records a published version. Publishing checks:
  - the fields that publishing requires
  - the document's areas
  - the unique values against the other documents
  - the document's relationships
- **Publish changes** does the same for the draft that waits to be published.
- **Unpublish** takes the document off the storefront. The status becomes draft, `published_at` is cleared, and the history records an `unpublish`. If a draft waits to be published, the Admin keeps editing that draft.
- **Discard changes** returns the document to its published content, so the newest published version becomes the one the Admin edits. Nothing is deleted. The discarded drafts stay in the history, and the next version you save is numbered after them.
- **Delete** takes the document off the storefront and deletes it, with its areas, blocks, and versions. The Admin cannot bring it back.

Each action asks you to confirm it. Publishing takes the latest *saved* version:

- Publishing waits while the form holds unsaved changes.
- Publishing is refused when there is nothing new to publish.

In the workflows' `validate` hook, your own code can refuse to create, save, publish, unpublish, or delete a document. For example, it can refuse a write to a document that another document points at. [Validation](./validation.md#your-own-rules-at-a-write) explains how.

### When two editors edit one document

Two editors cannot overwrite each other's work without seeing it. When an editor saves, publishes, discards changes, or restores a version, the Admin sends the number of the version that the editor's form showed.

- **Someone saved a newer version since.** The server refuses the change and names that version and who saved it: `Version 7 was saved by Anna after the one you edited. Reload to see it.` The Admin offers **Reload**.

### Version history

A document's page shows the document's history in the side column. The versions are listed newest first, ten at a time, with **Show more**. The version being edited is marked **Current**. Each version shows:

- its number
- what created it: **Saved**, **Published**, **Unpublished**, or **Restored from version** with the number it came from
- the fields it changed
- who created it and when

When you pick a version, the main column shows that version's content, read-only, with **Restore this version** and **Back to latest**.

### Restoring a version

Restoring a version saves its content as a new draft version. Nothing is overwritten, and nothing goes live until you publish it. Meanwhile, a published document keeps serving its published content.

- **The current config applies.** The plugin passes the old content through the current config first, so a column that is no longer configured is left out.
- **Checked like any save.** You cannot restore a version whose relationship names a document that has since been deleted.
- **Unsaved changes.** Restoring waits while the form holds unsaved changes.
- **The current version.** The version you are editing has nothing to restore.
- **Your `validate` hook.** The hook you attach to the save workflow runs for a restore too, with `change_type: "restore"`.

### How many versions a document keeps

A document keeps 50 versions. When it records one more, the plugin deletes the oldest versions beyond the limit. It never deletes the latest version or the newest published one, which the Admin edits and the history restores. Set your own limit at the config's root:

```ts
// src/cms/config.ts
import { defineConfig } from "@mostrajs/cms"

export const cmsConfig = defineConfig({
  // ...module, collections
  versions: { maxPerDocument: 20 },
})
```

### Editing on a page or in a drawer

`admin.edit` sets where a row of the collection's table is edited. It also decides whether the collection can have drafts:

- **`"page"`** (the default) - a row opens the document's page with the form and the areas. If the collection has drafts, the page also shows the status and history. The collection needs a route in `admin.routes`, which each collection has by default.
- **`"drawer"`** - a row opens a drawer over the table. The drawer saves the document's fields live and has no status, publish actions, history, or blocks. The collection cannot have drafts or areas, and Medusa does not start if it has either ([When Medusa does not start](#when-medusa-does-not-start)). You delete a row from the table, after a confirmation.

[The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited) covers the table's settings, with an example.

## Singletons

A collection with `singleton: true` holds one document, such as settings or a footer, and that document cannot be deleted. A singleton has no drafts, as every save goes live at once, and no areas. Medusa does not start if it has either ([When Medusa does not start](#when-medusa-does-not-start)). Each section of a singleton needs a `label`, which titles the section's card and drawer.

```ts
{
  slug: "page_settings",
  model: PageSettings,
  singleton: true,
  labels: { singular: "Page settings", plural: "Page settings" },
  admin: {
    sections: [{ key: "homepage", label: "Homepage", fields: ["homepage_default_id"] }],
  },
}
```

### How the Admin shows a singleton

The Admin shows a singleton's sections on the page of its route:

- **A card per section.** Each card has **Edit**, which opens a drawer that saves only that section's fields.
- **Created on the first save.** The document exists once an editor saves it for the first time.
- **No `admin.edit` or `admin.table`.** A singleton takes neither, as editors edit its sections from their cards.

Your storefront reads a singleton with `GET /store/cms/:collection?limit=1`.

### Your own cards on a page

You add your own cards to a route's page or a document's page with a widget in one of these zones:

| Zone | Page | Column | `data` |
|---|---|---|---|
| `cms.route.details` | a route's page | main | `CmsRouteWidgetData` |
| `cms.route.details.side` | a route's page | side | `CmsRouteWidgetData` |
| `cms.document.details` | a document's page | main | `CmsDocumentWidgetData` |
| `cms.document.details.side` | a document's page | side | `CmsDocumentWidgetData` |

All route pages share these zones, so your widget checks which route it is on. The widget's `data` holds the route and the collections the route shows, including a singleton's `document`:

```ts
// @mostrajs/cms/admin-extensions
type CmsRouteWidgetData = {
  route: { slug: string; label: string }
  collections: {
    slug: string
    labels: { singular: string; plural: string }
    singleton: boolean
    // A singleton's document, null before the first save; none for a list.
    document?: { id: string; [column: string]: unknown } | null
  }[]
}
```

```tsx
// src/admin/widgets/page-settings-preview.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/framework/types"
import { Container } from "@medusajs/ui"
import type { CmsRouteWidgetData } from "@mostrajs/cms/admin-extensions"

const PageSettingsPreview = ({ data }: DetailWidgetProps<CmsRouteWidgetData>) => {
  const settings = data.collections.find(({ slug }) => slug === "page_settings")

  if (!settings) {
    return null
  }

  return <Container>...</Container>
}

export const config = defineWidgetConfig({ zone: "cms.route.details" })

export default PageSettingsPreview
```

A document's page takes widgets the same way. There, `data` holds the collection and the document:

```ts
// @mostrajs/cms/admin-extensions
type CmsDocumentWidgetData = {
  collection: { slug: string; labels: { singular: string; plural: string } }
  document: { id: string; [column: string]: unknown }
}
```

In its column, a widget follows the plugin's own cards, tables, and form. **Customize layout** moves and hides only the widgets. The plugin's own parts stay where the config puts them.

### Typing the zones

The zone types ship with the package's root types, in its `index.d.ts`. For every installed plugin, Medusa references that file in the generated `.medusa/types/augmentation-refs.d.ts`. Your Admin code can name the zones in `defineWidgetConfig` once your `src/admin/tsconfig.json` includes the generated file:

```jsonc
// src/admin/tsconfig.json
{
  // ...
  "include": [".", "../../.medusa/types/augmentation-refs.d.ts"]
}
```

## When Medusa does not start

The plugin refuses a collection, and Medusa does not start, in these cases:

- **An `admin.edit` other than `"page"` or `"drawer"`**: `admin "edit" needs "page" or "drawer"`.
- **Edited in a drawer, with `drafts: true`**: `admin "edit" "drawer" takes no "drafts: true", as a drawer shows no status and cannot publish`.
- **Edited in a drawer, with `areas`**: `admin "edit" "drawer" cannot have areas, as a drawer has no blocks`.
- **A singleton with `drafts: true`**, as every save of a singleton goes live at once: `a singleton takes no "drafts: true", as its page shows no status, publish actions, or version history`.
- **A singleton with `areas`**: `a singleton cannot have areas`.
- **A singleton with `admin.edit` or `admin.table`**: `a singleton takes no admin "edit" or "table", as its sections are edited from their cards`.
- **A singleton with `admin.actions`**: `a singleton takes no admin "actions", as its page has no header`.
- **A singleton's section without a `label`**: `a singleton's admin section [<index>] needs a "label", which titles its card and its drawer`.
