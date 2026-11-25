import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import { listCmsDocumentsStep } from "../steps/list-cms-documents"
import { prepareCmsStoreDocumentsStep } from "../steps/prepare-cms-store-documents"

export type ListPublishedCmsDocumentsInput = {
  /** The collection's slug. */
  collection: string
  limit: number
  offset: number
  /** A public scalar column, with `-` in front for descending; the newest published first by default. */
  order?: string
  /**
   * The fields to answer, with Medusa's syntax already resolved, as `req.queryConfig.fields` holds them;
   * the collection's defaults for a list when left out.
   */
  fields?: string[]
  /**
   * Filters on the collection's filterable fields, as `req.filterableFields` holds them:
   * `{ vegan: true }`.
   */
  filters?: Record<string, unknown>
  /**
   * Read through the Caching Module; `true` by default. A cached read is current after every write of
   * the CMS, which clears it; `false` reads the database.
   */
  cache?: boolean
}

/** The newest published first. */
const STORE_ORDER = "-published_at"

/**
 * Lists one page of a collection's published documents as the store answers them, of the fields
 * selected or the collection's defaults, without their areas unless `fields` names one, with the total
 * count. The store's list route runs it, and a project may run it in its own code to get
 * the same answer.
 *
 * Step order:
 *   1. listCmsDocumentsStep - reads the page of published documents matching `filters`, in `order`,
 *      newest published first by default, only what `fields` selects when given, through the cache
 *      unless `cache` is `false`; refuses a page of more than 50 that reads areas
 *   2. listCmsDocumentMediaStep - reads the media records their fields name
 *   3. prepareCmsStoreDocumentsStep - turns them into the store's documents
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const listPublishedCmsDocumentsWorkflow = createWorkflow(
  "list-published-cms-documents",
  (input: ListPublishedCmsDocumentsInput) => {
    const read = transform({ input }, ({ input }) => ({
      collection: input.collection,
      status: "published" as const,
      order: input.order ?? STORE_ORDER,
      fields: input.fields,
      filters: input.filters,
      limit: input.limit,
      offset: input.offset,
      cache: input.cache !== false,
    }))
    const page = listCmsDocumentsStep(read)
    const media = listCmsDocumentMediaStep({
      collection: input.collection,
      documents: page.documents,
    })
    const documents = prepareCmsStoreDocumentsStep({
      collection: input.collection,
      documents: page.documents,
      media,
      route: "list",
      fields: input.fields,
    })

    return new WorkflowResponse({ documents, count: page.count })
  }
)
