import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { StoreQuery } from "../../../lib/collection/types"
import { buildReadDocument } from "../../../lib/document/build-read-document"
import { buildStoreDocument } from "../../../lib/document/build-store-document"
import { buildStoreSelection } from "../../../lib/document/build-store-selection"
import { listDocumentBlocks } from "../../../lib/document/list-document-blocks"
import { LOG_PREFIX } from "../../../lib/log-prefix"
import type { MediaRead } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"

type Logger = { warn: (message: string) => void }

/** A published document as the store answers it. */
export type CmsStoreDocument = {
  id: string
  [column: string]: unknown
}

export type PrepareCmsStoreDocumentsInput = {
  /** The collection's slug, for the log. */
  collection: string
  /** The published documents, as `get-cms-document` or `list-cms-documents` reads them. */
  documents: Record<string, unknown>[]
  /** Where the documents hold media, rich text and blocks, and the records `list-cms-document-media` found. */
  media: MediaRead
  /** The store route whose default fields apply when `fields` is left out: a list or one document. */
  route: keyof StoreQuery
  /** The fields Medusa resolved for the request; the route's defaults when left out. */
  fields?: string[]
}

/**
 * Turns published documents into what the store answers, through `buildStoreDocument`: the columns,
 * areas, block types and block fields `fields` select, or the route's defaults, with media records and
 * rich text documents in place of their values. A project running a store workflow without `fields` so
 * gets what the API answers without them.
 *
 * A block of a type its area no longer allows is left out of the answer, and logged once per document at
 * `warn` with the ids it left out, so a config change that hides content shows in the logs.
 */
export const prepareCmsStoreDocumentsStep = createStep(
  "prepare-cms-store-documents",
  async (input: PrepareCmsStoreDocumentsInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const { collection } = getCollection(container, input.collection)
    const selection = buildStoreSelection(
      getRegistry(container),
      collection,
      input.fields ??
        (collection.storeQuery[input.route].config.defaults ?? []).map(String)
    )

    for (const document of input.documents) {
      const left = listDocumentBlocks(input.media.placement, document).filter(
        ({ block }) => block.allowed === false
      )

      if (left.length) {
        logger.warn(
          `${LOG_PREFIX} Document "${document.id}" of "${input.collection}" holds blocks of types its areas no longer allow, left out of the store: ${left.map(({ block }) => block.id).join(", ")}`
        )
      }
    }

    return new StepResponse<CmsStoreDocument[]>(
      input.documents.map(
        (document) =>
          buildStoreDocument(
            buildReadDocument(document, input.media),
            selection
          ) as CmsStoreDocument
      )
    )
  }
)
