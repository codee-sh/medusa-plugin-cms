import { pluralize } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { listReachableBlocks } from "../../../lib/block/list-reachable-blocks"
import type { ClientBlock, RegistryBlock } from "../../../lib/block/types"
import type { ClientText } from "../../../lib/config/types"
import type {
  ClientCollection,
  RegistryCollection,
} from "../../../lib/collection/types"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { Registry } from "../../../lib/registry/types"

/**
 * A collection as the list answers it, with its number of documents. Its texts are `ClientText` as the
 * server answers them, and strings once the Admin translated them.
 */
export type CmsCollectionWithCount<TText = ClientText> =
  ClientCollection<TText> & { count: number }

type ListAndCount = (
  filters: Record<string, unknown>,
  config: { take: number; select: string[] }
) => Promise<[unknown[], number]>

/**
 * Describes a block type for the Admin: what its card shows and checks.
 *
 * @param block - The registry's block type.
 * @returns The block type as the Admin sees it.
 */
const buildClientBlock = ({
  slug,
  idPrefix,
  labels,
  fields,
  areas,
  admin,
}: RegistryBlock): ClientBlock<ClientText> => ({
  slug,
  idPrefix,
  labels,
  fields,
  areas,
  admin,
})

/**
 * Describes a collection for the Admin, with every block type its areas reach, at any depth,
 * described once, in the order the areas first name them, and the registry's `maxDepth`.
 *
 * @param collection - The registry's collection.
 * @param registry - The registry, with its block types.
 * @returns The collection as the Admin sees it.
 */
const buildClientCollection = (
  {
    slug,
    idPrefix,
    labels,
    drafts,
    singleton,
    store,
    admin,
    columns,
    unique,
    fields,
    areas,
  }: RegistryCollection,
  { blocks, maxDepth }: Registry
): ClientCollection<ClientText> => ({
  slug,
  idPrefix,
  labels,
  drafts,
  singleton,
  store,
  admin,
  columns,
  unique,
  fields,
  areas,
  blocks: listReachableBlocks(areas, blocks).map(buildClientBlock),
  maxDepth,
})

/**
 * Counts a collection's documents through the service's generated `listAndCount<Plural key>` method,
 * which leaves out soft-deleted documents and counts drafts and published ones alike; one id is read.
 *
 * @param service - The module's service.
 * @param key - The collection's service key.
 * @returns The number of documents.
 */
const countDocuments = async (
  service: Record<string, ListAndCount>,
  key: string
): Promise<number> => {
  const [, count] = await service[`listAndCount${pluralize(key)}`](
    {},
    { take: 1, select: ["id"] }
  )

  return count
}

/**
 * Lists the registered collections as the Admin sees them, each with its number of documents and every
 * block type its areas allow.
 */
export const listCmsCollectionsStep = createStep(
  "list-cms-collections",
  async (_input: void, { container }) => {
    const registry = getRegistry(container)
    const service = container.resolve<Record<string, ListAndCount>>(
      registry.module
    )
    const collections = await Promise.all(
      Object.values(registry.collections).map(async (collection) => ({
        ...buildClientCollection(collection, registry),
        count: await countDocuments(service, collection.key),
      }))
    )

    return new StepResponse<CmsCollectionWithCount[]>(collections)
  }
)
