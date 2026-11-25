import { useContext, useMemo } from "react"
import { getCmsBlockPlaceContext } from "../../../../admin-extensions/registry"
import type { RegistryArea } from "../../../../lib/area/types"
import type { ClientBlock } from "../../../../lib/block/types"
import {
  FormLayout,
  LayoutHeading,
  ManagerFormField,
  sectionFormFields,
} from "../../../components/manager-form-fields"
import { ComponentNode } from "../component-node"
import { useDocumentForm } from "../document-form-provider"
import { buildFieldConfig } from "../utils/build-field-config"
import { AreaBlocks } from "./area-blocks"

type BlockContentProps = {
  /** The block's form path. */
  path: string
  block: ClientBlock
  /** The area the block sits in. */
  area: RegistryArea<string>
  /** The block's index in it. */
  index: number
}

/**
 * Draws an open block card's content: the fields in no section of the block type, each of its sections
 * under its label and description in the section's layout, then each of its areas under its label,
 * as the blocks of another `AreaBlocks`. A block at the collection's `maxDepth` shows no areas, as
 * the server keeps none past it.
 *
 * It hands the block's place, its parent's with its own area and index added, to the components inside
 * it through the context `useBlockPlace` reads; the place's length is the block's level.
 *
 * @param props - The block's path and type, its area and its index.
 */
export const BlockContent = ({
  path,
  block,
  area,
  index,
}: BlockContentProps) => {
  const { form, collection } = useDocumentForm()
  const BlockPlaceContext = getCmsBlockPlaceContext()
  const parentPlace = useContext(BlockPlaceContext)
  const place = useMemo(
    () => [...(parentPlace ?? []), { area: area.name, index }],
    [parentPlace, area.name, index]
  )
  const { unsectioned, main: sections } = useMemo(
    () => sectionFormFields(block.fields, block.admin.sections),
    [block]
  )
  const blockAreas = place.length < collection.maxDepth ? block.areas : []

  return (
    <BlockPlaceContext.Provider value={place}>
      {unsectioned.map((field) => (
        <ManagerFormField
          key={field.name}
          form={form}
          name={path}
          field={buildFieldConfig(field)}
        />
      ))}
      {sections.map((section) => (
        <div
          key={section.label}
          // A section that opens the card sits under the card's own line, so it draws none.
          className="flex flex-col gap-y-4 border-t pt-4 first:border-t-0 first:pt-0"
        >
          <LayoutHeading
            label={section.label}
            description={section.description}
          />
          <FormLayout
            form={form}
            name={path}
            layout={section.layout}
            items={block.fields}
            renderItem={(field) => (
              <ManagerFormField
                form={form}
                name={path}
                field={buildFieldConfig(field)}
              />
            )}
            renderComponent={(node, nodeFields) => (
              <ComponentNode
                form={form}
                name={path}
                node={node}
                fields={nodeFields}
              />
            )}
          />
        </div>
      ))}
      {blockAreas.map((blockArea) => (
        <div
          key={blockArea.name}
          className="border-t pt-4 first:border-t-0 first:pt-0"
        >
          <AreaBlocks
            area={blockArea}
            name={`${path}.${blockArea.name}`}
            showLabel
          />
        </div>
      ))}
    </BlockPlaceContext.Provider>
  )
}
