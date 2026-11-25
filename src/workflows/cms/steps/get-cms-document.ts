import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { buildCollectionCacheTag } from "../../../lib/cache/build-collection-cache-tag"
import type { RegistryCollection } from "../../../lib/collection/types"
import { buildDocumentAreas } from "../../../lib/document/build-document-areas"
import { buildDocumentShape } from "../../../lib/document/build-document-shape"
import { buildStoreReadFields } from "../../../lib/document/build-store-read-fields"
import { buildStoreSelection } from "../../../lib/document/build-store-selection"
import { formatEntityName } from "../../../lib/model/format-entity-name"
import { listDocumentBlocks } from "../../../lib/document/list-document-blocks"
import type { DocumentAreaRow } from "../../../lib/document/types"
import { LOG_PREFIX } from "../../../lib/log-prefix"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { CmsDocument, CmsDocumentStatus } from "./list-cms-documents"

type Logger = { warn: (message: string) => void }

export type GetCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /**
   * Read the areas with their blocks; `true` by default. A caller that needs only the document's own
   * columns, such as a check that it exists, leaves them out.
   */
  with_areas?: boolean
  /** Only a document in this status is found, as the store reads published ones only. */
  status?: CmsDocumentStatus
  /**
   * Read through the Caching Module; `false` by default. Only the store's reads set it: the Admin and a
   * write read the database.
   */
  cache?: boolean
  /**
   * The store's selection, the fields Medusa resolved for the request: only the columns, areas, block
   * types and block fields they name are read. The Admin and a write leave it out and read everything.
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
 * Finds the column of a collection's slug field.
 *
 * @param collection - The collection.
 * @param slug - The collection's slug, for the message.
 * @returns The column.
 * @throws `NOT_FOUND` when the collection has no slug field.
 */
const findSlugColumn = (
  collection: RegistryCollection,
  slug: string
): string => {
  const field = collection.fields.find(({ kind }) => kind === "slug")

  if (!field) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Collection "${slug}" has no slug field`
    )
  }

  return field.name
}

/**
 * Reads one document of a collection by its id or its slug, with its own columns, its area rows under
 * `areas` with their `id`, `name` and `parent_id` only, which a save needs, and its areas under their
 * names, as `buildDocumentAreas` builds them, so each block is held once.
 *
 * Reads the database unless `cache` is set. A cached read is tagged with the collection's list tag
 * beside the tags of what it found, so a document not found yet is cleared once one is written.
 *
 * Reads through `query.graph`, which leaves out soft-deleted rows, so a deleted document is not found
 * either; the area rows, a block's areas included, as every area points at its document, are
 * followed through every configured block type's relation. With `with_areas` set to `false`, only the
 * document's own columns are read. With `fields`, only what they select is read, through
 * `buildStoreSelection` and `buildStoreReadFields`, and `with_areas` is theirs to say.
 *
 * An area row whose `parent_id` names no block the read holds - one left behind by a row deleted
 * outside the plugin, of a block type no longer configured, or past `maxDepth` - is left out, and logged
 * once at `warn`; a read of selected fields leaves such rows out without a word, as the block types it
 * does not read hold some.
 *
 * @throws `NOT_FOUND` for an unknown collection, a slug read of a collection without a slug field, and
 * an unknown or deleted document, or one not in the `status` asked for.
 */
export const getCmsDocumentStep = createStep(
  "get-cms-document",
  async (input: GetCmsDocumentInput, { container }) => {
    const registry = getRegistry(container)
    const { collection } = getCollection(container, input.collection)
    const entity = formatEntityName(collection.key)
    const selection =
      input.fields && buildStoreSelection(registry, collection, input.fields)
    const withAreas = selection
      ? Object.keys(selection.areas).length > 0
      : input.with_areas !== false && collection.areas.length > 0
    const fields = selection ? buildStoreReadFields(registry, selection) : ["*"]

    if (withAreas && !selection) {
      fields.push("areas.*")

      for (const block of Object.values(registry.blocks)) {
        fields.push(`areas.${block.relation}.*`)
      }
    }

    const filters = {
      ...(input.slug !== undefined
        ? { [findSlugColumn(collection, input.collection)]: input.slug }
        : { id: input.id }),
      ...(input.status ? { status: input.status } : {}),
    }
    const { data } = await container
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph(
        { entity, fields, filters },
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
    const [document] = data

    if (!document) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        input.slug !== undefined
          ? `Document with slug "${input.slug}" was not found in collection "${input.collection}"`
          : `Document "${input.id}" was not found in collection "${input.collection}"`
      )
    }

    if (!withAreas) {
      return new StepResponse<CmsDocument>(document)
    }

    const read: CmsDocument = {
      ...document,
      areas: (document.areas as DocumentAreaRow[]).map(
        ({ id, name, parent_id }) => ({ id, name, parent_id })
      ),
      ...buildDocumentAreas(registry, collection, document),
    }
    const heldIds = new Set(
      listDocumentBlocks(buildDocumentShape(registry, collection), read).map(
        ({ block }) => block.id
      )
    )
    const unheld = (read.areas as DocumentAreaRow[]).filter(
      ({ parent_id }) => parent_id !== null && !heldIds.has(parent_id)
    )

    if (unheld.length && !selection) {
      container
        .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
        .warn(
          `${LOG_PREFIX} Document "${document.id}" of "${input.collection}" has area rows no block it reads holds: ${unheld.map(({ id }) => id).join(", ")}`
        )
    }

    return new StepResponse<CmsDocument>(read)
  }
)
