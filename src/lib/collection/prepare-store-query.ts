import { productValidators } from "@medusajs/framework/utils"
import {
  createFindParams,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"
import { z } from "@medusajs/framework/zod"
import type { RegistryArea } from "../area/types"
import { buildConfigError } from "../config/build-config-error"
import type { CollectionStoreConfig } from "../config/types"
import type { RegistryField } from "../field/types"
import { listPublicFields } from "../field/list-public-fields"
import type { StoreQuery, StoreQueryInput } from "./types"

/** Documents per page of a store list, when neither the request nor the config sets one. */
const STORE_PAGE_SIZE = 20

/** The most documents a store list answers in one page. */
const STORE_PAGE_SIZE_MAX = 100

/**
 * Lists the paths a client may select under some areas, as Medusa's `AllowedFieldFilter` matches them:
 * each area, each block type it allows under it, and each of that type's public fields, then its
 * areas by the same rule, while the depth allows - `sections`, `sections.hero`,
 * `sections.hero.title`, `sections.grid.items.grid_item.title`.
 *
 * @param areas - The areas of a document or of a block type.
 * @param input - The block types and the depth.
 * @param prefix - The path of the block holding the areas, with its dot; empty for a document.
 * @param level - The level of these areas: a document's are 1.
 * @returns The paths.
 */
const listAreaPaths = (
  areas: RegistryArea[],
  input: Pick<StoreQueryInput, "blocks" | "maxDepth">,
  prefix: string,
  level: number
): string[] =>
  areas.flatMap((area) => {
    const areaPath = `${prefix}${area.name}`
    const types = area.blocks.flatMap((slug) =>
      input.blocks[slug] ? [input.blocks[slug]] : []
    )

    return [
      areaPath,
      ...types.flatMap((block) => {
        const typePath = `${areaPath}.${block.slug}`

        return [
          typePath,
          ...listPublicFields(block.fields).map(
            (name) => `${typePath}.${name}`
          ),
          ...(level < input.maxDepth
            ? listAreaPaths(block.areas, input, `${typePath}.`, level + 1)
            : []),
        ]
      }),
    ]
  })

/**
 * Checks the fields a store list filters by: a public boolean of the collection - a block's field is
 * never one, as blocks are not filterable.
 *
 * @param blocks - The block types the collection's areas reach.
 * @param filterable - The collection's fields marked filterable.
 * @param path - Where the config sits, for error messages.
 * @throws At the first filterable field that belongs to a block, is hidden or is not a boolean.
 */
const validateFilterableFields = (
  blocks: StoreQueryInput["blocks"],
  filterable: RegistryField[],
  path: string
): void => {
  for (const block of Object.values(blocks)) {
    const field = block.fields.find(({ store }) => store?.filterable)

    if (field) {
      throw buildConfigError(
        `block "${block.slug}": field "${field.name}" is filterable, and a block's field never is`
      )
    }
  }

  for (const field of filterable) {
    if (field.store?.hidden) {
      throw buildConfigError(
        `${path}: field "${field.name}" is filterable and hidden, and a hidden field cannot be filtered by`
      )
    }

    if (field.kind !== "boolean") {
      throw buildConfigError(
        `${path}: field "${field.name}" is filterable, which only a boolean field can be yet`
      )
    }
  }
}

/**
 * Lists a collection's fields a store list filters by, and checks that each may be one: a public
 * boolean of the collection - a block's field is never one, as blocks are not filterable.
 *
 * @param input - The collection's fields and the block types its areas reach.
 * @param path - Where the config sits, for error messages.
 * @returns The filterable fields.
 * @throws At the first filterable field that is hidden or not a boolean, or that belongs to a block.
 */
const prepareFilterableFields = (
  input: Pick<StoreQueryInput, "fields" | "blocks">,
  path: string
): RegistryField[] => {
  const filterable = input.fields.filter(({ store }) => store?.filterable)

  validateFilterableFields(input.blocks, filterable, path)

  return filterable
}

/**
 * Checks a collection's `store` config against what the store may answer.
 *
 * @param config - The collection's `store` config.
 * @param allowed - What a client may select.
 * @param areas - The collection's areas.
 * @param path - Where the config sits, for error messages.
 * @throws At the first default that is not public, an area or a path in one among a list's defaults,
 * or a page size outside 1 to 100.
 */
const validateStoreConfig = (
  config: CollectionStoreConfig,
  allowed: string[],
  areas: RegistryArea[],
  path: string
): void => {
  for (const [route, routeConfig] of Object.entries(config)) {
    for (const field of routeConfig?.defaults ?? []) {
      if (!allowed.includes(String(field))) {
        throw buildConfigError(
          `${path}: store.${route}.defaults names "${String(field)}", which is not a public field`
        )
      }
    }
  }

  const listArea = (config.list?.defaults ?? []).find((field) =>
    areas.some(
      ({ name }) =>
        String(field) === name || String(field).startsWith(`${name}.`)
    )
  )

  if (listArea !== undefined) {
    throw buildConfigError(
      `${path}: store.list.defaults names the area "${String(listArea)}", and a list carries no areas by default`
    )
  }

  const pageSize = config.list?.defaultLimit

  if (
    pageSize !== undefined &&
    (!Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > STORE_PAGE_SIZE_MAX)
  ) {
    throw buildConfigError(
      `${path}: store.list.defaultLimit must be a whole number from 1 to ${STORE_PAGE_SIZE_MAX}`
    )
  }
}

/**
 * Builds what a collection's store routes hand to Medusa's `validateAndTransformQuery`: the query each
 * route takes and its `QueryConfig`, as Medusa's own store routes have them.
 *
 * The schemas are Medusa's: `createFindParams` for the list, without `with_deleted`, as the store never
 * reads deleted documents, and with its `limit` kept at 100 at most, which Medusa leaves open; and
 * `createSelectParams` for a single document. Both are strict, so any other key answers 400. The list
 * takes a key per field with `store: { filterable: true }` too, a boolean read with Medusa's
 * `booleanString`, which Medusa hands on as `req.filterableFields`.
 *
 * `allowed`, what a client may select with `fields`, is the collection's store columns, as
 * `listStoreColumns` lists them, and each area with the path of every block type and public block field
 * under it (main spec D20); it is never empty, so a project's `allowFields` adds to it. `defaults` are the
 * config's, or those columns - a single document's with the areas by name. Medusa applies both, `fields`'
 * syntax included.
 *
 * @param input - The collection's fields and store columns, its areas, and the block types and the depth
 * they reach.
 * @param config - The collection's `store` config, if any.
 * @param path - Where the config sits, for error messages.
 * @returns The list's and the single document's query.
 * @throws When the `store` config names a field that is not public, or sets a page size out of range,
 * and when a field is filterable that cannot be.
 */
export const prepareStoreQuery = (
  input: StoreQueryInput,
  config: CollectionStoreConfig = {},
  path = "store"
): StoreQuery => {
  const { columns } = input
  const allowed = [...columns, ...listAreaPaths(input.areas, input, "", 1)]

  validateStoreConfig(config, allowed, input.areas, path)

  const filters = Object.fromEntries(
    prepareFilterableFields(input, path).map(({ name }) => [
      name,
      productValidators.booleanString().optional(),
    ])
  )

  const defaultLimit = config.list?.defaultLimit ?? STORE_PAGE_SIZE
  const findParams = createFindParams({ limit: defaultLimit }).omit({
    with_deleted: true,
  })

  return {
    list: {
      schema: z
        .strictObject({ ...findParams.shape, ...filters })
        .refine(({ limit }) => limit <= STORE_PAGE_SIZE_MAX, {
          path: ["limit"],
          message: `Use a limit of at most ${STORE_PAGE_SIZE_MAX}`,
        }),
      config: {
        isList: true,
        defaultLimit,
        defaults: config.list?.defaults ?? columns,
        allowed,
        storeRelationsLimit: config.list?.storeRelationsLimit,
      },
    },
    retrieve: {
      schema: z.strictObject(createSelectParams().shape),
      config: {
        defaults: config.retrieve?.defaults ?? [
          ...columns,
          ...input.areas.map(({ name }) => name),
        ],
        allowed,
        storeRelationsLimit: config.retrieve?.storeRelationsLimit,
      },
    },
  }
}
