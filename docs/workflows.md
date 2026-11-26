# Workflows and events

How to use the CMS from your own backend code: the workflows and steps you run, the events you subscribe to, the hook you refuse a write from, and the cache the writes clear; what the store answers over HTTP is in [The store API](./store-api.md), and drafts and versions themselves are in [Collections, drafts and singletons](./collections.md#drafts-and-versions).

## What `@mostrajs/cms/workflows` exports

Every workflow the plugin's own routes run, and the steps they are built from. The Admin and the store go through the same workflows, so a document your code writes is checked, versioned and announced exactly as an editor's is. A workflow of a collection's documents takes the collection's slug as `collection`, and refuses an unknown one with `NOT_FOUND`.

### Writing documents

| Workflow | Input | What it does |
|---|---|---|
| `createCmsDocumentWorkflow` | `{ collection, actor_id, document }` | Creates a document from its fields and areas. With drafts it is a draft and gets version 1; without drafts it is published at once. A singleton that already holds its document refuses it. |
| `updateCmsDocumentWorkflow` | `{ collection, id, actor_id, document, base_version? }` | Saves the fields and areas in `document`; a field left out stays as it was. A draft's rows are written. A published document keeps serving its published content: the save is recorded as a draft version until it is published. Without drafts the save is live at once. |
| `publishCmsDocumentWorkflow` | `{ collection, id, actor_id, base_version? }` | Publishes the latest version, checked as a publish. Refuses a document with nothing new to publish. |
| `unpublishCmsDocumentWorkflow` | `{ collection, id, actor_id }` | Turns a published document back into a draft. Refuses a document that is not published. |
| `discardCmsDocumentDraftWorkflow` | `{ collection, id, base_version? }` | Drops the changes waiting over a published document's content. Nothing is deleted: the drafts stay in the history. |
| `restoreCmsDocumentVersionWorkflow` | `{ collection, id, version_id, actor_id, base_version? }` | Brings an older version back as a new version, saved as `updateCmsDocumentWorkflow` saves it. |
| `deleteCmsDocumentWorkflow` | `{ collection, id }` | Soft-deletes the document with its blocks and its versions, and returns its id. A singleton refuses it. |

Create, update, publish, unpublish, discard and restore return `{ document, latest_version }`: the document's row as stored, with `has_unpublished_changes`, and the version an editor now edits, `null` in a collection without drafts. Publish, unpublish, discard, restore and reading the versions refuse a collection without drafts, which has no versions.

### Reading documents

| Workflow | Input | What it returns |
|---|---|---|
| `getPublishedCmsDocumentWorkflow` | `{ collection, id }` or `{ collection, slug }`, with `fields?` and `cache?` | `{ document }`, as the store answers it; `NOT_FOUND` for a draft, a deleted or an unknown document. |
| `listPublishedCmsDocumentsWorkflow` | `{ collection, limit, offset, order?, fields?, filters?, cache? }` | `{ documents, count }`, as the store answers a list, newest published first by default; a page whose `fields` read areas holds at most 50. |
| `getCmsDocumentWorkflow` | `{ collection, id }` | `{ document, latest_version }`, as the Admin reads a document, a draft included. |
| `listCmsDocumentsWorkflow` | `{ collection, limit, offset, q?, status?, order?, filters? }` | `{ documents, count }`, as the Admin's table lists them, drafts included, each with `has_unpublished_changes` and `published_version`. |
| `listCmsDocumentVersionsWorkflow` | `{ collection, id, limit, offset }` | `{ versions, count }`, newest first, without their snapshots. |
| `getCmsDocumentVersionWorkflow` | `{ collection, id, version_id }` | One version with its snapshot. |
| `listCmsReferencesWorkflow` | `{ collection, id }` | The live rows whose relationship fields point at the document, each `{ collection, field, id }`. |

The two published reads answer exactly what the store's routes answer, so your own route can serve a document in the same shape. `fields` takes the fields as Medusa resolves them into `req.queryConfig.fields`; leave it out for the collection's defaults. `filters` filters by the collection's fields, as `{ featured: true }`. Neither workflow checks a collection's `store: false`: that check belongs to the store's routes, so your route decides what it exposes.

### Other workflows

| Workflow | Input | What it does |
|---|---|---|
| `listCmsCollectionsWorkflow` | none | Returns `{ collections, routes, media_provider }`: the registered collections with their document counts, the Admin's routes, and what the media picker needs. |
| `validateCmsDocumentWorkflow` | `{ collection, actor_id, document, id? }` | Checks a document as a save would, writes nothing, and returns every problem. |
| `checkCmsTakenValueWorkflow` | `{ collection, column, value, id? }` | Returns `{ taken, suggestion? }` for a unique column: whether a live document holds the value, and the first free `-<n>` form of it. |
| `uploadCmsMediaWorkflow` | `{ filename, mimeType, content }` | Stores a file, its content in base64, through the config's media provider, and returns its record. See [Media](./media.md). |
| `listCmsMediaWorkflow` | `{ q?, mime_type?, limit, offset }` | Searches the media provider's records; refused by a provider without search. |
| `createCmsDocumentVersionWorkflow` | `{ collection, document_id, document, previous, status, change_type, actor_id }` | Records a version and keeps the document within `versions.maxPerDocument`. The write workflows run it after their writes; you do not run it on its own. |

### Steps

The steps are the parts the workflows are built from, for a workflow of your own:

- **Reads:** `getCmsDocumentStep`, `listCmsDocumentsStep`, `listCmsVersionsStep`, `getCmsVersionStep`, `listCmsReferencesStep`, `listCmsRelatedDocumentsStep`, `listCmsTakenValuesStep`, `listCmsDocumentMediaStep`, `getCmsCollectionStep`, `listCmsCollectionsStep`, `listCmsMediaStep`, `getCmsMediaProviderStep`.
- **Checks:** `validateCmsDocumentStep`, `validateCmsBaseVersionStep`, `validateCmsDraftsStep`, `validateCmsSingletonStep`.
- **Decisions:** `prepareCmsDocumentInputStep`, `prepareCmsWriteStep`, `prepareCmsPublishStep`, `prepareCmsUnpublishStep`, `prepareCmsDiscardStep`, `prepareCmsDeleteStep`, `prepareCmsOldVersionsStep`, `prepareCmsVersionSnapshotStep`, `prepareCmsStoreDocumentsStep`.
- **Writes:** `createCmsDocumentContentStep`, `updateCmsDocumentContentStep`, `deleteCmsDocumentContentStep`, `createCmsVersionStep`, `deleteCmsVersionsStep`, `updateCmsLatestVersionStep`, `createCmsMediaStep`, `clearCmsCacheStep`.

Read with the steps freely. To change a document, run a write workflow rather than the write steps: the workflow is what checks the document, records the version, clears the cache, runs your hook and emits the event.

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

Run a workflow with the request's container, `req.scope`, as Medusa's own routes do. This store route answers the three newest published posts in the store's shape:

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

A write takes the same call. This Admin route creates a post in a collection with drafts and publishes it at once:

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

- **`document` is checked by the workflow.** It is the document's fields by name, as the Admin sends them, and the workflow checks it against the collection's config whatever route it came through: a value that does not fit is refused, a taken unique value too, and an empty slug is filled from its source. The fields' values are in [Fields](./fields.md) and the areas' blocks in [Blocks](./blocks.md).
- **`actor_id` is who made the change.** The workflow stores it as the document's `created_by` and `updated_by` and as the version's author. In an Admin route it is `req.auth_context.actor_id`; for a write no admin user makes, such as an import script, pass an id of your own choosing.
- **`base_version` is the version you edited.** An update, publish, discard or restore of a document with versions is refused unless `base_version` is the number of its latest version, so your code never writes over an editor's newer work unseen. Read it from `latest_version.version` of the document you got from `getCmsDocumentWorkflow` or from the previous write, as above; a document without versions takes `null`.
- **A refusal is an error.** `run` throws the workflow's `MedusaError`, and Medusa's error handler answers your route with it: `NOT_FOUND` as `404`, `INVALID_DATA` and `NOT_ALLOWED` as `400`, a taken unique value as `422`. A workflow that fails undoes the writes it made.

## Document events

Every write workflow emits one event after its last write. Your subscribers learn of every change this way, the Admin's included, since the Admin writes through the same workflows.

| Event | Data | Emitted by |
|---|---|---|
| `cms.document.created` | `{ collection, id, status }` | a create |
| `cms.document.updated` | `{ collection, id, action, status }` | a save, a publish, an unpublish, a discard, a restore |
| `cms.document.deleted` | `{ collection, id }` | a delete |

- **`action`** says what the update did: `save`, `publish`, `unpublish`, `restore` or `discard`. Only `publish` and `unpublish` change what the store serves. A save in a collection without drafts is a `publish`, as it is live at once.
- **`status`** is the document's status after the write, `draft` or `published`. A create in a collection without drafts is `published`; a save of a published document with drafts stays `published`, as its draft waits beside the live content.
- **The data carries ids only.** Read the document itself in your subscriber, with `getPublishedCmsDocumentWorkflow` for what the store now serves.
- **The event follows a successful write.** Medusa releases a workflow's events when the workflow completes, so a write that fails or a `validate` hook that refuses it emits nothing.

The names are exported from the package root as `DocumentEvents` (`DOCUMENT_CREATED`, `DOCUMENT_UPDATED`, `DOCUMENT_DELETED`), the data types as `DocumentCreatedEventData`, `DocumentUpdatedEventData` and `DocumentDeletedEventData`. This subscriber reacts when a page goes live or is taken down:

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

A subscriber is the place for a side effect after a write, such as telling your storefront to refresh a page.

## The `validate` hook

The plugin exposes one workflow hook, `validate`, on `createCmsDocumentWorkflow`, `updateCmsDocumentWorkflow`, `publishCmsDocumentWorkflow`, `unpublishCmsDocumentWorkflow` and `deleteCmsDocumentWorkflow`. Your handler runs after the plugin's own checks and before the first write, and refuses the write by throwing. It is the place for a rule that reads other records, such as keeping a page in use from being unpublished. What it gets, when it runs and how its error reaches the editor are in [Validation](./validation.md#your-own-rules-at-a-write).

## The cache

When your project runs Medusa's Caching Module, the published reads, `getPublishedCmsDocumentWorkflow` and `listPublishedCmsDocumentsWorkflow`, read through it by default. Each write workflow clears the cached reads its write changed, the collection's lists among them, before it returns, so a read right after the write answers the new content. Without the Caching Module there is nothing to clear and every read goes to the database.

- **Pass `cache: false`** to a published read that must come from the database.
- **Write through the workflows.** A write of your own straight to the CMS's models through their module service is cleared by Medusa's own events only after your workflow ends; until then a cached read may answer the old content.
- **The Admin's reads are never cached**, nor are the reads inside a write.
