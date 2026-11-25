import { useCallback, useMemo } from "react"
import type { RegistryArea } from "../../../../lib/area/types"
import type { ClientBlock } from "../../../../lib/block/types"
import {
  BlocksField,
  type BlocksFieldRenderBlock,
  type BlocksFieldType,
} from "../../../components/manager-form-fields"
import { useDocumentForm } from "../document-form-provider"
import { buildFieldDefaults } from "../utils/build-field-defaults"
import { findSummaryField } from "../utils/find-summary-field"
import { BlockContent } from "./block-content"

type AreaBlocksProps = {
  /** An area of the document or of a block. */
  area: RegistryArea<string>
  /** The form path of its blocks: `document.<area>`, or `<block's path>.<area>`. */
  name: string
  /** Show the area's label above its blocks. */
  showLabel?: boolean
}

/**
 * Edits the blocks of an area, the document's or a block's, as a `BlocksField`: the types it
 * offers are those the area allows, a new block starts with each field's empty value and each of its
 * areas empty, and an open card draws the block's `BlockContent`. A block whose type is no longer
 * allowed keeps its type's label, or its `block_type` for a type the config dropped.
 *
 * It sits inside the form's `DocumentFormProvider`, which hands it the form and the collection.
 *
 * @param props - The area, its form path, and whether to show its label.
 */
export const AreaBlocks = ({
  area,
  name,
  showLabel = false,
}: AreaBlocksProps) => {
  const { form, collection } = useDocumentForm()
  const types = useMemo<BlocksFieldType[]>(
    () =>
      area.blocks.flatMap((slug) =>
        collection.blocks
          .filter((block) => block.slug === slug)
          .map((block) => ({
            slug,
            label: block.labels.singular,
            summaryField: findSummaryField(block)?.name,
          }))
      ),
    [area, collection]
  )

  /**
   * Finds a block type of the collection.
   *
   * @param slug - The type's slug.
   * @returns The block type, or nothing for one the config no longer has.
   */
  const findBlock = useCallback(
    (slug: string): ClientBlock | undefined =>
      collection.blocks.find((block) => block.slug === slug),
    [collection]
  )

  /**
   * Names a block type, the label of one the area no longer allows included.
   *
   * @param slug - The type's slug.
   * @returns Its label, or the slug for a type the config no longer has.
   */
  const labelOf = useCallback(
    (slug: string) => findBlock(slug)?.labels.singular ?? slug,
    [findBlock]
  )

  /**
   * Gives a new block's values: each field's empty value and each area empty.
   *
   * @param type - The block's type.
   * @returns The values.
   */
  const newItem = useCallback(
    ({ slug }: BlocksFieldType) => {
      const block = findBlock(slug)

      return {
        ...buildFieldDefaults(block?.fields ?? []),
        ...Object.fromEntries(
          (block?.areas ?? []).map((blockArea) => [blockArea.name, []])
        ),
      }
    },
    [findBlock]
  )

  /**
   * Draws an open card's content.
   *
   * @param props - The block's path, type and index.
   * @returns The block's `BlockContent`.
   */
  const renderBlock = useCallback<BlocksFieldRenderBlock>(
    ({ path, type, index }) => {
      const block = findBlock(type.slug)

      return (
        block && (
          <BlockContent path={path} block={block} area={area} index={index} />
        )
      )
    },
    [findBlock, area]
  )

  return (
    <BlocksField
      form={form}
      name={name}
      label={showLabel ? area.label : undefined}
      types={types}
      labelOf={labelOf}
      newItem={newItem}
      renderBlock={renderBlock}
    />
  )
}
