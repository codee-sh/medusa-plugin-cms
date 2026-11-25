import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { buildCollectionCacheTag } from "../../../lib/cache/build-collection-cache-tag"
import { buildDocumentAreas } from "../../../lib/document/build-document-areas"
import { buildStoreReadFields } from "../../../lib/document/build-store-read-fields"
import { buildStoreSelection } from "../../../lib/document/build-store-selection"
import { formatEntityName } from "../../../lib/model/format-entity-name"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"

export type CmsDocumentStatus = "draft" | "published"

/** A document as a list returns it: the row's columns, without relations or areas. */
export type CmsDocument = {
  id: string
  status: CmsDocumentStatus
  updated_at: string | Date
  [column: string]: unknown
}

export type ListCmsDocumentsInput = {
  /** The collection's slug. */
  collection: string
  /** Free text matched against the model's searchable columns. */
  q?: string
  status?: CmsDocumentStatus
  /** A scalar column, with `-` in front for descending, as in Medusa's `order`. */
  order?: string
  limit: number
  offset: number
  /**
   * Read through the Caching Module; `false` by default. Only the store's reads set it: the Admin and a
   * write read the database.
   */
  cache?: boolean
  /**
   * The store's selection, the fields Medusa resolved for the request: only the columns, areas, block
   * types and block fields they name are read. The Admin leaves it out and reads the columns.
   */
  fields?: string[]
  /** The store's filters on its filterable fields, as Medusa validated them: `{ vegan: true }`. */
  filters?: Record<string, unknown>
}

export type ListCmsDocumentsOutput = {
  documents: CmsDocument[]
  count: number
}

/** Newest edits first, when the caller sends no `order`. */
const DEFAULT_ORDER = "-updated_at"

/** The most documents a page that reads areas holds (main spec D10). */
const AREAS_PAGE_SIZE_MAX = 50

/**
 * Lists one page of a collection's documents, with the total count.
 *
 * Reads through Query, which leaves out soft-deleted documents; it loads no relations. `q` reaches the
 * model's generated list method, Medusa's free-text search over the columns marked `.searchable()`; on a
 * model without any it filters nothing. Reads the database unless `cache` is set; a cached read is
 * tagged with the collection's list tag too, as an empty page gets no tag of its own.
 *
 * With `fields`, reads only what they select, through `buildStoreSelection` and `buildStoreReadFields`,
 * and builds each document's areas when they name one, as `get-cms-document` does.
 *
 * @throws `NOT_FOUND` for an unknown collection, and `INVALID_DATA` for an `order` that is not a
 * scalar column of its model, or that holds rich text, and for `fields` naming an area on a page of more
 * than 50.
 */
export const listCmsDocumentsStep = createStep(
  "list-cms-documents",
  async (input: ListCmsDocumentsInput, { container }) => {
    const registry = getRegistry(container)
    const { collection } = getCollection(container, input.collection)
    const selection =
      input.fields && buildStoreSelection(registry, collection, input.fields)
    const withAreas = Boolean(selection && Object.keys(selection.areas).length)
    const order = input.order ?? DEFAULT_ORDER
    const column = order.replace(/^-/, "")

    if (!collection.columns.includes(column)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order field ${column} is not a column of ${collection.slug}`
      )
    }

    // A rich text column holds a document as JSON, whose text says nothing of its order.
    if (
      collection.fields.some(
        ({ name, kind }) => name === column && kind === "richtext"
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order field ${column} holds rich text, which cannot be ordered`
      )
    }

    if (withAreas && input.limit > AREAS_PAGE_SIZE_MAX) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A list that reads areas takes at most ${AREAS_PAGE_SIZE_MAX} documents`
      )
    }

    const { data, metadata } = await container
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph(
        {
          entity: formatEntityName(collection.key),
          fields: selection ? buildStoreReadFields(registry, selection) : ["*"],
          filters: {
            ...input.filters,
            ...(input.q ? { q: input.q } : {}),
            ...(input.status ? { status: input.status } : {}),
          },
          pagination: {
            skip: input.offset,
            take: input.limit,
            order: { [column]: order.startsWith("-") ? "DESC" : "ASC" },
          },
        },
        input.cache
          ? {
              cache: {
                enable: true,
                tags: [buildCollectionCacheTag(collection)],
                computeAutomaticTags: true,
              },
            }
          : {}
      )

    return new StepResponse<ListCmsDocumentsOutput>({
      documents: withAreas
        ? data.map((document) => ({
            ...document,
            ...buildDocumentAreas(registry, collection, document),
          }))
        : data,
      count: metadata?.count ?? data.length,
    })
  }
)
