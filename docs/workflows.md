# Workflows and events

This page shows how your backend code uses the plugin. It covers the workflows and steps you run, the events you subscribe to, the hook that refuses a write, and the cache that writes clear. What the Store API answers over HTTP is in [Store API](./store-api.md). Drafts and versions are explained in [Collections, drafts and singletons](./collections.md#drafts-and-versions).

## What `@mostrajs/cms/workflows` exports

`@mostrajs/cms/workflows` exports every workflow that the plugin's own routes run, and the steps those workflows are built from. The Admin and the Store API run the same workflows. So a document that your code writes gets the same checks, version, and event as one an editor writes.

Each workflow that works on a collection's documents takes the collection's slug as `collection`. It refuses an unknown slug with `NOT_FOUND`.

### Writing documents

| Workflow | Input | What it does |
|---|---|---|
| `createCmsDocumentWorkflow` | `{ collection, actor_id, document }` | Creates a document from its fields and areas. In a collection with drafts, the document starts as a draft with version 1. Without drafts, it is published at once. |
| `updateCmsDocumentWorkflow` | `{ collection, id, actor_id, document, base_version? }` | Saves the fields and areas in `document`. A field you leave out keeps its value. See [What a save changes](#what-a-save-changes). |
| `publishCmsDocumentWorkflow` | `{ collection, id, actor_id, base_version? }` | Checks the latest version as publishing requires, then publishes it. |
| `unpublishCmsDocumentWorkflow` | `{ collection, id, actor_id }` | Turns a published document back into a draft. |
| `discardCmsDocumentDraftWorkflow` | `{ collection, id, base_version? }` | Drops the unpublished changes of a published document. Nothing is deleted: the drafts stay in the history. |
| `restoreCmsDocumentVersionWorkflow` | `{ collection, id, version_id, actor_id, base_version? }` | Brings an older version back as a new version, and saves it the way `updateCmsDocumentWorkflow` does. |
| `deleteCmsDocumentWorkflow` | `{ collection, id }` | Soft-deletes the document, its blocks, and its versions, then returns the document's id. |

[What a write takes](#what-a-write-takes) explains these inputs.

### What a save changes

What `updateCmsDocumentWorkflow` writes depends on the document:

- **A draft** - the workflow writes the draft's rows.
- **A published document** - the Store API keeps serving the published content. The changes wait in a draft version until the document is published.
- **A document in a collection without drafts** - the changes are live at once.

### What a write returns

The create, update, publish, unpublish, discard, and restore workflows return:

```ts
{ document, latest_version }
```

- **`document`** - the document's row as stored, with `has_unpublished_changes`.
- **`latest_version`** - the version that an editor now edits, or `null` in a collection without drafts.

### When a write is refused

- **Creating a document in a singleton that already holds its document** - `createCmsDocumentWorkflow` refuses it.
- **Deleting the document of a singleton** - `deleteCmsDocumentWorkflow` refuses it.
- **Publishing a document with nothing new to publish** - `publishCmsDocumentWorkflow` refuses it.
- **Unpublishing a document that is not published** - `unpublishCmsDocumentWorkflow` refuses it.
- **Working with versions in a collection without drafts** - the collection has no versions. The publish, unpublish, discard, and restore workflows refuse it, as do the workflows that read versions.
- **A `base_version` that is not the latest version** - see [What a write takes](#what-a-write-takes).

[When a workflow refuses](#when-a-workflow-refuses) explains how a refusal reaches your route, and with which HTTP status.

### Reading documents

| Workflow | Input | What it returns |
|---|---|---|
| `getPublishedCmsDocumentWorkflow` | `{ collection, id }` or `{ collection, slug }`, with `fields?` and `cache?` | `{ document }`, as the Store API answers it. A draft, a deleted document, or an unknown document gives `NOT_FOUND`. |
| `listPublishedCmsDocumentsWorkflow` | `{ collection, limit, offset, order?, fields?, filters?, cache? }` | `{ documents, count }`, as the Store API answers a list, newest published first by default. When `fields` reads areas, a page holds at most 50 documents. |
| `getCmsDocumentWorkflow` | `{ collection, id }` | `{ document, latest_version }`, as the Admin reads a document, drafts included. |
| `listCmsDocumentsWorkflow` | `{ collection, limit, offset, q?, status?, order?, filters? }` | `{ documents, count }`, as the Admin's table lists them, drafts included. Each document has `has_unpublished_changes` and `published_version`. |
| `listCmsDocumentVersionsWorkflow` | `{ collection, id, limit, offset }` | `{ versions, count }`, newest first, without the snapshots. |
| `getCmsDocumentVersionWorkflow` | `{ collection, id, version_id }` | One version with its snapshot. |
| `listCmsReferencesWorkflow` | `{ collection, id }` | The live rows whose relationship fields point at the document, each as `{ collection, field, id }`. |

### The published reads

The two published reads return exactly what the Store API routes answer. So your own route can serve a document in the same shape.

- **`fields`** takes the fields as Medusa resolves them into `req.queryConfig.fields`. Leave it out to get the collection's default fields.
- **`filters`** filters by the collection's fields, for example `{ featured: true }`.
- **`cache`** decides whether the read goes through the cache. See [The cache](#the-cache).

> [!WARNING]
> Neither workflow checks whether a collection has `store: false`. That check belongs to the Store API routes, so your own route decides what it exposes.

### Other workflows

| Workflow | Input | What it does |
|---|---|---|
| `listCmsCollectionsWorkflow` | none | Returns `{ collections, routes, media_provider }`: the registered collections with their document counts, the Admin's routes, and what the media picker needs. |
| `validateCmsDocumentWorkflow` | `{ collection, actor_id, document, id? }` | Checks a document as saving it would, and returns every problem without writing anything. |
| `checkCmsTakenValueWorkflow` | `{ collection, column, value, id? }` | Returns `{ taken, suggestion? }` for a unique column: whether a live document holds the value, and the first free `-<n>` form of the value. |
| `uploadCmsMediaWorkflow` | `{ filename, mimeType, content }` | Stores a file through the config's media provider and returns the file's record. `content` holds the file's content in base64. See [Media](./media.md). |
| `listCmsMediaWorkflow` | `{ q?, mime_type?, limit, offset }` | Searches the media provider's records. If the provider has no search, the workflow refuses. |
| `createCmsDocumentVersionWorkflow` | `{ collection, document_id, document, previous, status, change_type, actor_id }` | Records a version and keeps the document within `versions.maxPerDocument`. The write workflows run it after they write, so you do not run it on its own. |

### Steps

The workflows are built from these steps, and you can use them in a workflow of your own:

- **Reads:** `getCmsDocumentStep`, `listCmsDocumentsStep`, `listCmsVersionsStep`, `getCmsVersionStep`, `listCmsReferencesStep`, `listCmsRelatedDocumentsStep`, `listCmsTakenValuesStep`, `listCmsDocumentMediaStep`, `getCmsCollectionStep`, `listCmsCollectionsStep`, `listCmsMediaStep`, `getCmsMediaProviderStep`.
- **Checks:** `validateCmsDocumentStep`, `validateCmsBaseVersionStep`, `validateCmsDraftsStep`, `validateCmsSingletonStep`.
- **Decisions:** `prepareCmsDocumentInputStep`, `prepareCmsWriteStep`, `prepareCmsPublishStep`, `prepareCmsUnpublishStep`, `prepareCmsDiscardStep`, `prepareCmsDeleteStep`, `prepareCmsOldVersionsStep`, `prepareCmsVersionSnapshotStep`, `prepareCmsStoreDocumentsStep`.
- **Writes:** `createCmsDocumentContentStep`, `updateCmsDocumentContentStep`, `deleteCmsDocumentContentStep`, `createCmsVersionStep`, `deleteCmsVersionsStep`, `updateCmsLatestVersionStep`, `createCmsMediaStep`, `clearCmsCacheStep`.

Use the read steps freely. To change a document, run a write workflow rather than the write steps, because the workflow is what:

- checks the document
- records the version
- clears the cache
- runs your hook
- emits the event

This example workflow reads a page and the rows that point at it:

```ts
// src/workflows/get-page-usage.ts
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  getCmsDocumentStep,
  listCmsReferencesStep,
} from "@mostrajs/cms/workflows"

type GetPageUsageInput = { id: string }

export const getPageUsageWorkflow = createWorkflow(
  "get-page-usage",
  (input: GetPageUsageInput) => {
    const page = getCmsDocumentStep({
      collection: "page",
      id: input.id,
      with_areas: false,
    })
    const references = listCmsReferencesStep({ collection: "page", id: input.id })

    return new WorkflowResponse({ page, references })
  }
)
```

## Running a workflow from your own route

Run a workflow with the request's container, `req.scope`, as Medusa's own routes do.

### Reading from a route

This store route returns the three newest published posts in the Store API's shape:

```ts
// src/api/store/blog/latest/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPublishedCmsDocumentsWorkflow } from "@mostrajs/cms/workflows"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await listPublishedCmsDocumentsWorkflow(req.scope).run({
    input: {
      collection: "post",
      limit: 3,
      offset: 0,
    },
  })

  res.json({ posts: result.documents, count: result.count })
}
```

### Writing from a route

Writing uses the same call. This Admin route creates a post in a collection with drafts, then publishes it at once:

```ts
// src/api/admin/blog/import/route.ts
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  createCmsDocumentWorkflow,
  publishCmsDocumentWorkflow,
} from "@mostrajs/cms/workflows"

type ImportPostBody = { title: string; excerpt: string }

export const POST = async (
  req: AuthenticatedMedusaRequest<ImportPostBody>,
  res: MedusaResponse
) => {
  const actor_id = req.auth_context.actor_id
  const { result: created } = await createCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: "post",
      actor_id,
      document: { title: req.body.title, excerpt: req.body.excerpt },
    },
  })
  const { result: published } = await publishCmsDocumentWorkflow(
    req.scope
  ).run({
    input: {
      collection: "post",
      id: created.document.id,
      actor_id,
      base_version: created.latest_version?.version ?? null,
    },
  })

  res.json(published)
}
```

### What a write takes

| Input | Type | Description |
|---|---|---|
| `document` | `Record<string, unknown>` | The document's fields by name, as the Admin sends them. The workflow checks them. |
| `actor_id` | `string` | Who made the change. |
| `base_version` | `number \| null` | The number of the version you edited. |

**The workflow checks `document`** against the collection's config, whatever route the document comes through:

- a value that does not fit is refused
- a taken unique value is refused
- an empty slug is filled from its source

The values a field takes are in [Fields](./fields.md), and the blocks of an area are in [Blocks](./blocks.md).

**`actor_id` is who made the change.** The workflow stores it as the document's `created_by` and `updated_by`, and as the author of the version. In an Admin route, pass `req.auth_context.actor_id`. When no admin user makes the write, as in an import script, pass an id of your own choosing.

**`base_version` is the version you edited.** If a document has versions, the update, publish, discard, and restore workflows refuse the write unless `base_version` is the number of the latest version. So your code never overwrites an editor's newer work without seeing it.

- Read it from `latest_version.version` in the result of `getCmsDocumentWorkflow`, or in the result of the previous write, as in the example above.
- A document without versions takes `null`.

### When a workflow refuses

A workflow refuses by throwing an error. `run` throws the workflow's `MedusaError`, and Medusa's error handler answers the request with it:

- **`NOT_FOUND`** - answered as `404`.
- **`INVALID_DATA` and `NOT_ALLOWED`** - answered as `400`.
- **A taken unique value** - answered as `422`.

When a workflow fails, it undoes the writes it made.

## Document events

Every write workflow emits one event after its last write. This way, your subscribers learn of every change. That includes the changes made in the Admin, since the Admin writes through the same workflows.

| Event | Data | Emitted by |
|---|---|---|
| `cms.document.created` | `{ collection, id, status }` | creating a document |
| `cms.document.updated` | `{ collection, id, action, status }` | saving, publishing, unpublishing, discarding, or restoring a document |
| `cms.document.deleted` | `{ collection, id }` | deleting a document |

### The event data

The package root exports the event names as `DocumentEvents`, and the data types as `DocumentCreatedEventData`, `DocumentUpdatedEventData`, and `DocumentDeletedEventData`:

```ts
// Exported from "@mostrajs/cms"
const DocumentEvents = {
  DOCUMENT_CREATED: "cms.document.created",
  DOCUMENT_UPDATED: "cms.document.updated",
  DOCUMENT_DELETED: "cms.document.deleted",
} as const

type DocumentCreatedEventData = {
  collection: string
  id: string
  status: "draft" | "published"
}

type DocumentUpdatedEventData = {
  collection: string
  id: string
  action: "save" | "publish" | "unpublish" | "restore" | "discard"
  status: "draft" | "published"
}

type DocumentDeletedEventData = {
  collection: string
  id: string
}
```

- **`action`** says what the update did: `save`, `publish`, `unpublish`, `restore` or `discard`. Only `publish` and `unpublish` change what the Store API serves. In a collection without drafts, saving a document gives `publish`, as the change is live at once.
- **`status`** is the document's status after the write, `draft` or `published`.
  - Creating a document in a collection without drafts gives `published`.
  - Saving a published document in a collection with drafts gives `published`, as the draft waits beside the live content.
- **The data carries ids only.** Read the document itself in your subscriber. Use `getPublishedCmsDocumentWorkflow` to read what the Store API now serves.

> [!NOTE]
> The event follows a successful write. Medusa releases the events of a workflow when the workflow completes. So if a write fails, or a `validate` hook refuses it, the workflow emits no event.

### Subscribing to a change

A subscriber is the place for a side effect after a write, such as telling your storefront to refresh a page. This subscriber reacts when a page goes live or is taken down:

```ts
// src/subscribers/cms-page-changed.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  DocumentEvents,
  type DocumentUpdatedEventData,
} from "@mostrajs/cms"

export default async function cmsPageChanged({
  event: { data },
  container,
}: SubscriberArgs<DocumentUpdatedEventData>) {
  if (data.collection !== "page") {
    return
  }

  if (data.action !== "publish" && data.action !== "unpublish") {
    return
  }

  const logger = container.resolve("logger")

  logger.info(`Page ${data.id} is now ${data.status}`)
}

export const config: SubscriberConfig = {
  event: DocumentEvents.DOCUMENT_UPDATED,
}
```

## The `validate` hook

The plugin exposes one workflow hook, `validate`, on these workflows:

- `createCmsDocumentWorkflow`
- `updateCmsDocumentWorkflow`
- `publishCmsDocumentWorkflow`
- `unpublishCmsDocumentWorkflow`
- `deleteCmsDocumentWorkflow`

Restoring a version runs the hook of `updateCmsDocumentWorkflow`, with `input.change_type` set to `"restore"`.

Your handler runs after the plugin's own checks and before the first write. To refuse the write, the handler throws an error. Use the hook for a rule that reads other records, such as keeping a page that is in use from being unpublished.

[Validation](./validation.md#your-own-rules-at-a-write) explains what the handler receives, when it runs, and how its error reaches the editor.

## The cache

When your project runs Medusa's Caching Module, the two published reads use it by default: `getPublishedCmsDocumentWorkflow` and `listPublishedCmsDocumentsWorkflow`. Without the Caching Module, there is nothing to clear and every read goes to the database.

Before a write workflow returns, it clears the cached reads that its write changed, including the collection's lists. So a read right after the write returns the new content.

- **Pass `cache: false`** to a published read that must come from the database.
- **Write through the workflows.** If you write to the plugin's models straight through their module service, Medusa's own events clear the cache only after your workflow ends. Until then, a cached read may return the old content.
- **The Admin's reads are never cached**, and neither are the reads inside a write.
