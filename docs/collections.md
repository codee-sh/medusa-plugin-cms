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

Two keys at the config's root act on collections too: `admin.routes` places each collection on a page of the Admin ([The Admin](./admin.md#the-admins-routes-and-the-tables-buttons)), and `versions.maxPerDocument` caps the history ([below](#how-many-versions-a-document-keeps)).

## Drafts and versions

A collection is live by default: a document is published when created, each save is live at once, and no version is recorded. `drafts: true` turns drafts and versions on, as a page's content needs: a save keeps a draft and records a version, **Publish** makes it live, and the document's history restores an earlier version. A singleton and a collection edited in a drawer take no drafts.

```ts
{
  slug: "page",
  model: ContentPage,
  drafts: true,
  // ...
}
```

### A live collection

Without `drafts: true` a document is published when it is created, and each save is live at once, so both are checked as a publish: `serverPublishValidation` runs besides `serverValidation`. Nothing is recorded in a history. The document's page has no status, publish or history: its header says changes go live when you save, and its button is **Save**. The server refuses a publish, an unpublish, a discard and a restore for such a collection; a document leaves the storefront only when it is deleted. Versions recorded before you turned drafts off stay stored and are not read.

### A collection with drafts

A document has a status, which the Admin shows as **Draft**, **Published** or **Published with changes**:

- **A new document** is a draft, and its creation is version 1.
- **A draft** is saved with **Save**: the save writes its row and records a version. The store API does not serve it.
- **A published document** is saved with **Save draft**: its row, which the store API serves, stays as it is, and the save records a draft version only, checked for its shape. The fields a publish needs and the unique values are checked when it is published.

### Document actions

| Action | Where | What it does |
|---|---|---|
| **Publish** | the status section, for a draft | Publishes the latest saved version: its content goes to the rows the store API serves, checked as a publish - the fields a publish needs, its areas, the unique values against the other documents, and its relationships. It records a published version. |
| **Publish changes** | the status section, for a published document with a newer draft | The same, for the draft waiting to be published. |
| **Unpublish** | the status section, for a published document | Takes the document off the storefront: its status becomes draft, `published_at` is cleared, and the history records an `unpublish`. A draft waiting to be published stays what the Admin edits. |
| **Discard changes** | the action menu, for a published document with a newer draft | Returns the document to its published content: the newest published version becomes the one the Admin edits. Nothing is deleted; the discarded drafts stay in the history, and the next save is numbered after them. |
| **Delete** | the action menu, for any document but a singleton's | Deletes the document with its areas and blocks, and its versions, and takes it off the storefront. The Admin cannot bring it back. |

Each action asks for a confirmation. A publish takes the latest *saved* version, so it waits while the form holds unsaved changes, and it is refused when nothing is new to publish.

Two editors cannot overwrite each other's work unseen. A save, a publish, a discard and a restore send the number of the version the editor's form showed; when someone saved a newer one since, the server refuses, naming that version and who saved it - `Version 7 was saved by Anna after the one you edited. Reload to see it.` - and the Admin offers **Reload**.

Your own code can refuse a create, a save, a publish, an unpublish or a delete in the workflows' `validate` hook, such as for a document another one points at: [Validation](./validation.md#your-own-rules-at-a-write).

### Version history

A document's page shows its history in the side column: its versions newest first, ten at a time with **Show more**, the one being edited marked **Current**. Each version shows its number, what made it - **Saved**, **Published**, **Unpublished**, or **Restored from version** with the number it came from - the fields it changed, who made it and when.

Picking a version shows its content, read-only, in the main column, with **Restore this version** and **Back to latest**. A restore saves that content as a new draft version, so nothing is overwritten and nothing goes live until it is published; a published document keeps serving its published content meanwhile. The old content goes through the current config first, so a column no longer configured is left out, and it is checked as any save is: a version whose relationship names a document since deleted cannot be restored. A restore waits while the form holds unsaved changes, and the version being edited has nothing to restore. Your `validate` hook of the save runs for a restore too, with `change_type: "restore"`.

### How many versions a document keeps

A document keeps 50 versions. Once it records one more, the oldest beyond the limit are deleted, never the latest one nor the newest published one, which the Admin edits and the history restores. Set your own limit at the config's root:

```ts
// src/cms/config.ts
import { defineConfig } from "@codee-sh/medusa-plugin-cms"

export const cmsConfig = defineConfig({
  // ...module, collections
  versions: { maxPerDocument: 20 },
})
```

### Editing on a page or in a drawer

`admin.edit` says where a row of the collection's table is edited, and with it whether the collection can take drafts:

- **`"page"`**, by default: a row opens its document's page, with its form, its areas and, with drafts, its status and history. The collection needs a route in `admin.routes`, as each collection has by default.
- **`"drawer"`**: a row opens a drawer over the table, which saves the document's fields live, with no status, publish, history or blocks. Such a collection takes no drafts and no areas: the start fails on `drafts: true` or `areas` with a drawer. A row is deleted from the table, after a confirmation.

The table's settings and an example are in [The Admin](./admin.md#a-collections-table-and-how-its-rows-are-edited).

## Singletons

A collection with `singleton: true` holds one document, which cannot be deleted: settings, a footer. It has no drafts, as its saves are live at once, and no areas; the start fails on either. Each of its sections needs a `label`, which titles its card and drawer.

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

The Admin shows it on its route's page as its sections: a card per section, each with **Edit**, a drawer that saves that section's fields alone; the first save creates the document. A singleton takes neither `admin.edit` nor `admin.table`, as its sections are edited from their cards. A storefront reads it with `GET /store/cms/:collection?limit=1`.

A host adds its own cards to a route's page with a widget in `cms.route.details`, or `cms.route.details.side` for the side column. Every route's page shares the zones, so a widget checks which route it is on; its `data`, `CmsRouteWidgetData`, holds the route and the collections it shows, a singleton's `document` among them, `null` before the first save:

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps } from "@medusajs/framework/types"
import type { CmsRouteWidgetData } from "@codee-sh/medusa-plugin-cms/admin-extensions"

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

A document's page takes widgets the same way, in `cms.document.details` and `cms.document.details.side`, whose `data` is `CmsDocumentWidgetData` (the collection and the document). A widget follows the CMS's own cards, tables and form in its column, and Customize Layout moves and hides the widgets alone: the CMS's parts stand where the config puts them.

The zones' types come with the package's root types, its `index.d.ts`, which Medusa references for every installed plugin in the generated `.medusa/types/augmentation-refs.d.ts`. A project's Admin names the zones in `defineWidgetConfig` once its `src/admin/tsconfig.json` includes that file:

```json
"include": [".", "../../.medusa/types/augmentation-refs.d.ts"]
```
