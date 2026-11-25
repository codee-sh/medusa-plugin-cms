import { listReachableBlocks } from "../block/list-reachable-blocks"
import type { RegistryCollection } from "../collection/types"
import type { RegistryField } from "../field/types"
import type { Registry } from "../registry/types"
import type { ReadPlacement } from "./types"

/**
 * Tells whether a field holds media.
 *
 * @param field - The field.
 * @returns Whether its kind is `media`.
 */
const isMediaField = ({ kind }: RegistryField): boolean => kind === "media"

/**
 * Tells whether a field holds rich text.
 *
 * @param field - The field.
 * @returns Whether its kind is `richtext`.
 */
const isRichTextField = ({ kind }: RegistryField): boolean =>
  kind === "richtext"

/**
 * Lists where a collection's documents hold what a read turns: the collection's media and `richtext`
 * fields, its areas, and every block type they reach, at any depth, with its areas and its
 * media and `richtext` fields. A type without such fields is kept, as its areas may hold blocks that
 * have some.
 *
 * @param registry - The registry.
 * @param collection - The collection.
 * @returns The placement, with no fields when the collection holds neither media nor rich text.
 */
export const buildReadPlacement = (
  registry: Registry,
  collection: RegistryCollection
): ReadPlacement => ({
  mediaFields: collection.fields.filter(isMediaField),
  richTextFields: collection.fields.filter(isRichTextField),
  areas: collection.areas,
  // Only the plain keys: the placement travels between steps, and a registry block holds functions.
  blocks: listReachableBlocks(collection.areas, registry.blocks).map(
    ({ slug, areas, fields }) => ({
      slug,
      areas,
      mediaFields: fields.filter(isMediaField),
      richTextFields: fields.filter(isRichTextField),
    })
  ),
})
