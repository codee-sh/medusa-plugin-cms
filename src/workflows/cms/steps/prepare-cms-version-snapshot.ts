import {
  ContainerRegistrationKeys,
  deepEqualObj,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RegistryArea } from "../../../lib/area/types"
import type { SubmittedBlock } from "../../../lib/document/types"
import { buildDocumentShape } from "../../../lib/document/build-document-shape"
import { mapDocumentBlocks } from "../../../lib/document/map-document-blocks"
import { normalizeRichText } from "../../../lib/document/normalize-rich-text"
import type { RegistryField } from "../../../lib/field/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { Registry } from "../../../lib/registry/types"
import { LOG_PREFIX } from "../../../lib/log-prefix"

export type PrepareCmsVersionSnapshotInput = {
  /** The collection's slug. */
  collection: string
  /**
   * The document the version records: a body over the stored document, the rows as read after a
   * publish, or a restored snapshot.
   */
  document: Record<string, unknown>
  /**
   * What the version is compared with: the latest version's snapshot, or the stored document when there
   * is no version yet; with none, nothing counts as changed.
   */
  previous?: Record<string, unknown> | null
  /** A restored snapshot, whose keys the config no longer holds are logged as left out. */
  restored?: boolean
}

export type CmsVersionSnapshot = {
  /** The document's editable fields and its areas, as JSON stores them. */
  snapshot: Record<string, unknown>
  /** The fields and areas whose value differs from `previous`. */
  changed_fields: string[]
}

type Logger = { warn: (message: string) => void }

/**
 * Turns a value into what JSON stores, so a date read as a `Date` and one restored as text compare
 * equal.
 *
 * @param value - The value.
 * @returns The value after a JSON round trip, `null` for nothing.
 */
const normalizeStoredValue = (value: unknown): unknown =>
  value === undefined ? null : JSON.parse(JSON.stringify(value))

/**
 * Turns a field's value into what a version stores: a `richtext` value as its document, whether a body
 * sent it or a row holds its JSON, and `null` for one without text, so both compare equal.
 *
 * @param field - The field.
 * @param value - The value.
 * @returns The value as JSON stores it.
 */
const toSnapshotValue = (field: RegistryField, value: unknown): unknown =>
  normalizeStoredValue(
    field.kind === "richtext" ? normalizeRichText(value) : value
  )

/**
 * Turns a block into what a version stores: as a write body holds it, with its id when it has one, its
 * type, the values of its type's editable fields and its areas, already turned. A block of a type
 * its area does not allow keeps its id and type only, as a body may send it.
 *
 * @param registry - The resolved registry.
 * @param block - The block, as a read returns it, a body holds it or a snapshot stored it.
 * @param area - The area that holds it.
 * @returns The block as JSON stores it.
 */
const buildBlockSnapshot = (
  registry: Registry,
  block: Record<string, unknown>,
  area: RegistryArea
): Record<string, unknown> => {
  const { id, block_type } = block as SubmittedBlock
  const kept = id === undefined ? { block_type } : { id, block_type }
  const type = registry.blocks[block_type]

  if (!type || !area.blocks.includes(block_type)) {
    return kept
  }

  return {
    ...kept,
    ...Object.fromEntries(
      type.fields
        .filter(({ name }) => name in block)
        .map((field) => [field.name, toSnapshotValue(field, block[field.name])])
    ),
    ...Object.fromEntries(
      type.areas
        .filter(({ name }) => Array.isArray(block[name]))
        .map(({ name }) => [name, block[name]])
    ),
  }
}

/**
 * Builds the snapshot a version stores and the fields and areas it changed.
 *
 * The snapshot keeps the collection's fields only, every other column left out, and each area the
 * document holds, its blocks at any depth as `buildBlockSnapshot` keeps them, so a version holds what a
 * write body may hold. A restored snapshot is filtered through the current config the same way: the
 * keys it loses - a column no longer configured - and the blocks, at any depth, of a type their area no
 * longer allows are left out, each kind logged once at `warn`. Values are compared as JSON stores them,
 * whatever the order of their keys, which a `jsonb` snapshot does not keep, an area left out as an empty
 * one, so a change deep in a block's area counts its top area; a `richtext`
 * value is stored and compared as its document, `previous` being a snapshot or a row holding its JSON.
 */
export const prepareCmsVersionSnapshotStep = createStep(
  "prepare-cms-version-snapshot",
  async (input: PrepareCmsVersionSnapshotInput, { container }) => {
    const registry = getRegistry(container)
    const { collection } = getCollection(container, input.collection)
    const shape = buildDocumentShape(registry, collection)
    const names = collection.fields.map(({ name }) => name)
    const areaNames = collection.areas.map(({ name }) => name)
    const leftOutBlocks: string[] = []
    const mapped = mapDocumentBlocks(
      shape,
      input.document,
      (block, { path, area }) => {
        if (
          input.restored &&
          !area.blocks.includes(block.block_type as string)
        ) {
          leftOutBlocks.push(`${path} (${block.block_type})`)
          return null
        }

        return buildBlockSnapshot(registry, block, area)
      }
    )
    const snapshot: Record<string, unknown> = Object.fromEntries([
      ...collection.fields
        .filter(({ name }) => name in input.document)
        .map((field) => [
          field.name,
          toSnapshotValue(field, input.document[field.name]),
        ]),
      ...areaNames
        .filter((name) => name in input.document)
        .map((name) => [name, mapped[name] ?? []]),
    ])

    if (input.restored) {
      const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      const leftOut = Object.keys(input.document).filter(
        (key) => !names.includes(key) && !areaNames.includes(key)
      )

      if (leftOut.length) {
        logger.warn(
          `${LOG_PREFIX} A restored version of "${input.collection}" left out ${leftOut.join(", ")}, no longer in the config`
        )
      }

      if (leftOutBlocks.length) {
        logger.warn(
          `${LOG_PREFIX} A restored version of "${input.collection}" left out the blocks ${leftOutBlocks.join(", ")}, whose type their area no longer allows`
        )
      }
    }

    const previous = input.previous
    const previousAreas =
      previous &&
      mapDocumentBlocks(shape, previous, (block, { area }) =>
        buildBlockSnapshot(registry, block, area)
      )

    return new StepResponse<CmsVersionSnapshot>({
      snapshot,
      changed_fields:
        previous && previousAreas
          ? [
              ...collection.fields
                .filter(
                  (field) =>
                    !deepEqualObj(
                      snapshot[field.name] ?? null,
                      toSnapshotValue(field, previous[field.name])
                    )
                )
                .map(({ name }) => name),
              ...areaNames.filter(
                (name) =>
                  !deepEqualObj(snapshot[name] ?? [], previousAreas[name] ?? [])
              ),
            ]
          : [],
    })
  }
)
