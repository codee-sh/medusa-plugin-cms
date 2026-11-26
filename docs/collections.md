# Collections, drafts and singletons

What a collection's config holds, how a collection keeps drafts and versions and what each document action does, and how a singleton holds one-of-a-kind content. How each is laid out in the Admin is in [The Admin](./admin.md), and the columns a collection's model needs are in [Models](./models.md).

## A collection's config at a glance

A collection is one entry of the config's `collections`. Its keys, and the page that explains each:

| Key | What it does | More |
|---|---|---|
| `slug` | The collection's name in the API and the Admin, in snake_case: `/store/cms/<slug>` | [Store API](./store-api.md) |
| `model` | The DML model of your module that holds its documents | [Models](./models.md) |
| `labels` | `{ singular, plural }`, the names the Admin shows; a text or a translation | [Translations](./translations.md) |
| `fields` | The model's columns the form edits, each with its type and rules | [Fields](./fields.md) |
| `serverValidation`, `serverPublishValidation` | Rules over several fields together, at every save or at a publish | [Validation](./validation.md) |
| `drafts` | `true` turns drafts and versions on; live when left out | [Drafts and versions](#drafts-and-versions) |
| `singleton` | `true` keeps the collection to one document | [Singletons](#singletons) |
| `store` | `false` keeps it out of the store API; an object sets its list and retrieve routes | [Store API](./store-api.md#a-collections-store-config) |
| `areas` | The areas of blocks a document holds | [Blocks](./blocks.md) |
| `admin.sections` | The form's sections; every field and area sits in one | [The Admin](./admin.md#a-collections-form-sections) |
| `admin.useAsTitle` | The field a document is titled by | [The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited) |
| `admin.table` | The columns, order, page size and filters of its table | [The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited) |
| `admin.edit` | Where a row is edited: `"page"`, by default, or `"drawer"` | [Editing on a page or in a drawer](#editing-on-a-page-or-in-a-drawer) |
| `admin.actions` | The buttons in its table's header | [The Admin](./admin.md#the-admins-routes-and-the-tables-buttons) |
| `admin.description` | The description its table shows under its heading | [The Admin](./admin.md#the-admins-routes-and-the-tables-buttons) |

Two keys at the config's root act on collections too:

- **`admin.routes`** places each collection on a page of the Admin: [The Admin](./admin.md#the-admins-routes-and-the-tables-buttons).
- **`versions.maxPerDocument`** caps the history: [below](#how-many-versions-a-document-keeps).

## Drafts and versions

A collection is live by default: a document is published when created, each save is live at once, and no version is recorded. `drafts: true` turns drafts and versions on, as a page's content needs:

```ts
{
  slug: "page",
  model: ContentPage,
  drafts: true,
  // ...
}
```

With drafts on:

- A save keeps a draft and records a version.
- **Publish** makes it live.
- The document's history restores an earlier version.

> [!NOTE]
> A singleton and a collection edited in a drawer take no drafts.

### A live collection

Without `drafts: true`, a document is published when it is created, and each save is live at once. So both are checked as a publish: `serverPublishValidation` runs besides `serverValidation`.

- **No history.** Nothing is recorded in a history.
- **The document's page** has no status, publish or history. Its header says changes go live when you save, and its button is **Save**.
- **Refused actions.** The server refuses a publish, an unpublish, a discard and a restore for such a collection.
- **Leaving the storefront.** A document leaves the storefront only when it is deleted.

> [!NOTE]
> Versions recorded before you turned drafts off stay stored and are not read.

### A collection with drafts

A document has a status, which the Admin shows as **Draft**, **Published** or **Published with changes**:

- **A new document** is a draft, and its creation is version 1.
- **A draft** is saved with **Save**: the save writes its row and records a version. The store API does not serve it.
- **A published document** is saved with **Save draft**. Its row, which the store API serves, stays as it is, and the save records a draft version only, checked for its shape. The fields a publish needs and the unique values are checked when it is published.

### Document actions

| Action | Where | Shown for |
|---|---|---|
| **Publish** | the status section | a draft |
| **Publish changes** | the status section | a published document with a newer draft |
| **Unpublish** | the status section | a published document |
| **Discard changes** | the action menu | a published document with a newer draft |
| **Delete** | the action menu | any document but a singleton's |

What each one does:

- **Publish** publishes the latest saved version: its content goes to the rows the store API serves. It records a published version. It is checked as a publish:
  - the fields a publish needs
  - its areas
  - the unique values against the other documents
  - its relationships
- **Publish changes** does the same, for the draft waiting to be published.
- **Unpublish** takes the document off the storefront: its status becomes draft, `published_at` is cleared, and the history records an `unpublish`. A draft waiting to be published stays what the Admin edits.
- **Discard changes** returns the document to its published content: the newest published version becomes the one the Admin edits. Nothing is deleted. The discarded drafts stay in the history, and the next save is numbered after them.
- **Delete** deletes the document with its areas and blocks, and its versions, and takes it off the storefront. The Admin cannot bring it back.

Each action asks for a confirmation. A publish takes the latest *saved* version:

- It waits while the form holds unsaved changes.
- It is refused when nothing is new to publish.

Your own code can refuse a create, a save, a publish, an unpublish or a delete in the workflows' `validate` hook, such as for a document another one points at: [Validation](./validation.md#your-own-rules-at-a-write).

### When two editors edit one document

Two editors cannot overwrite each other's work unseen. A save, a publish, a discard and a restore send the number of the version the editor's form showed.

- **Someone saved a newer version since.** The server refuses, naming that version and who saved it: `Version 7 was saved by Anna after the one you edited. Reload to see it.` The Admin offers **Reload**.

### Version history

A document's page shows its history in the side column: its versions newest first, ten at a time with **Show more**. The one being edited is marked **Current**. Each version shows:

- its number
- what made it: **Saved**, **Published**, **Unpublished**, or **Restored from version** with the number it came from
- the fields it changed
- who made it and when

Picking a version shows its content, read-only, in the main column, with **Restore this version** and **Back to latest**.

### Restoring a version

A restore saves that content as a new draft version. Nothing is overwritten, and nothing goes live until it is published; a published document keeps serving its published content meanwhile.

- **The current config applies.** The old content goes through the current config first, so a column no longer configured is left out.
- **It is checked as any save is.** A version whose relationship names a document since deleted cannot be restored.
- **Unsaved changes.** A restore waits while the form holds unsaved changes.
- **The current version.** The version being edited has nothing to restore.
- **Your `validate` hook** of the save runs for a restore too, with `change_type: "restore"`.

### How many versions a document keeps

A document keeps 50 versions. Once it records one more, the oldest beyond the limit are deleted. The latest one and the newest published one, which the Admin edits and the history restores, are never deleted. Set your own limit at the config's root:

```ts
// src/cms/config.ts
import { defineConfig } from "@mostrajs/cms"

export const cmsConfig = defineConfig({
  // ...module, collections
  versions: { maxPerDocument: 20 },
})
```

### Editing on a page or in a drawer

`admin.edit` says where a row of the collection's table is edited, and with it whether the collection can take drafts:

- **`"page"`**, by default: a row opens its document's page, with its form, its areas and, with drafts, its status and history. The collection needs a route in `admin.routes`, as each collection has by default.
- **`"drawer"`**: a row opens a drawer over the table, which saves the document's fields live, with no status, publish, history or blocks. Such a collection takes no drafts and no areas ([the start fails](#when-the-start-fails) on either). A row is deleted from the table, after a confirmation.

The table's settings and an example are in [The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited).

## Singletons

A collection with `singleton: true` holds one document, which cannot be deleted: settings, a footer. It has no drafts, as its saves are live at once, and no areas ([the start fails](#when-the-start-fails) on either). Each of its sections needs a `label`, which titles its card and drawer.

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

The Admin shows it on its route's page as its sections:

- **A card per section**, each with **Edit**, a drawer that saves that section's fields alone.
- **The first save** creates the document.
- **No `admin.edit` or `admin.table`.** A singleton takes neither, as its sections are edited from their cards.

A storefront reads it with `GET /store/cms/:collection?limit=1`.

### Your own cards on a page

A host adds its own cards to a route's page, or a document's page, with a widget in one of these zones:

| Zone | Page | Column | `data` |
|---|---|---|---|
| `cms.route.details` | a route's page | main | `CmsRouteWidgetData` |
| `cms.route.details.side` | a route's page | side | `CmsRouteWidgetData` |
| `cms.document.details` | a document's page | main | `CmsDocumentWidgetData` |
| `cms.document.details.side` | a document's page | side | `CmsDocumentWidgetData` |

Every route's page shares the zones, so a widget checks which route it is on. Its `data` holds the route and the collections it shows, a singleton's `document` among them:

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

A document's page takes widgets the same way. Its `data` holds the collection and the document:

```ts
// @mostrajs/cms/admin-extensions
type CmsDocumentWidgetData = {
  collection: { slug: string; labels: { singular: string; plural: string } }
  document: { id: string; [column: string]: unknown }
}
```

A widget follows the CMS's own cards, tables and form in its column. Customize Layout moves and hides the widgets alone: the CMS's parts stand where the config puts them.

### Typing the zones

The zones' types come with the package's root types, its `index.d.ts`. Medusa references it for every installed plugin in the generated `.medusa/types/augmentation-refs.d.ts`. A project's Admin names the zones in `defineWidgetConfig` once its `src/admin/tsconfig.json` includes that file:

```jsonc
// src/admin/tsconfig.json
{
  // ...
  "include": [".", "../../.medusa/types/augmentation-refs.d.ts"]
}
```

## When the start fails

The plugin refuses a collection at the start:

- **Edited in a drawer, with `drafts: true`.** `admin.edit: "drawer"` takes no drafts.
- **Edited in a drawer, with `areas`.** A drawer has no blocks.
- **A singleton with `drafts: true`.** Its saves are live at once.
- **A singleton with `areas`.** A singleton has no areas.
