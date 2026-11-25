import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getCmsDocumentStep } from "../steps/get-cms-document"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import { prepareCmsStoreDocumentsStep } from "../steps/prepare-cms-store-documents"

export type GetPublishedCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /**
   * Read through the Caching Module; `true` by default. A cached read is current after every write of
   * the CMS, which clears it; `false` reads the database.
   */
  cache?: boolean
  /**
   * The fields to answer, with Medusa's syntax already resolved, as `req.queryConfig.fields` holds them;
   * the collection's defaults for a single document when left out.
   */
  fields?: string[]
} & (
  | {
      /** The document's id. */
      id: string
      slug?: never
    }
  | {
      /** The value of the collection's slug field. */
      slug: string
      id?: never
    }
)

/**
 * Reads one published document of a collection by its id or its slug, with its areas, as the store
 * answers it. The store's id and slug routes run it, and a project may run it in its own code to get the
 * same answer.
 *
 * Step order:
 *   1. getCmsDocumentStep - reads the published document, only what `fields` selects when given,
 *      through the cache unless `cache` is `false`, or throws `NOT_FOUND` for a draft, a deleted or an
 *      unknown document
 *   2. listCmsDocumentMediaStep - reads the media records its fields name, blocks included
 *   3. prepareCmsStoreDocumentsStep - turns it into the store's document, of the fields selected or
 *      the collection's defaults
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const getPublishedCmsDocumentWorkflow = createWorkflow(
  "get-published-cms-document",
  (input: GetPublishedCmsDocumentInput) => {
    const read = transform({ input }, ({ input }) => ({
      ...input,
      status: "published" as const,
      cache: input.cache !== false,
    }))
    const document = getCmsDocumentStep(read)
    const documents = transform({ document }, ({ document }) => [document])
    const media = listCmsDocumentMediaStep({
      collection: input.collection,
      documents,
    })
    const published = prepareCmsStoreDocumentsStep({
      collection: input.collection,
      documents,
      media,
      route: "retrieve",
      fields: input.fields,
    })

    return new WorkflowResponse(
      transform({ published }, ({ published }) => ({ document: published[0] }))
    )
  }
)
