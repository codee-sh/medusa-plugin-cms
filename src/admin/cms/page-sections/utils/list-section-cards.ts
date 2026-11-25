import type { LayoutItemConfig } from "../../../components/manager-form-fields/layout/types"
import { collectLayoutNames } from "../../../components/manager-form-fields/layout/utils/collect-layout-names"
import type { ClientCollection } from "../../../../lib/collection/types"
import type { Field } from "../../../../lib/field/types"
import {
  type DocumentFieldSection,
  sectionDocumentFields,
} from "../../common/utils/section-document-fields"

/**
 * One card of a page: a `details` section of a collection's form, and the fields it shows in order. A
 * singleton's page draws it read-only, and a row's drawer edits it.
 */
export type SectionCard = {
  /** The section's `key`. */
  key: string
  /** The section's heading: always a singleton's; a row's section may have none. */
  label?: string
  description?: string
  fields: Field[]
  /** How the section lays its fields out. */
  layout: LayoutItemConfig[]
}

/**
 * Lays a collection's fields out as cards, one per `details` section of its form, each in its column.
 *
 * @param collection - The collection.
 * @returns The cards of the main column and of the side column, in the sections' order.
 */
export const listSectionCards = (
  collection: ClientCollection
): { main: SectionCard[]; side: SectionCard[] } => {
  const { main, side } = sectionDocumentFields(collection, collection.fields)

  /**
   * Turns a section of the form into its card, with the fields its layout holds, in the order shown.
   *
   * @param section - The section.
   * @returns The card.
   */
  const toCard = (section: DocumentFieldSection): SectionCard => ({
    key: section.key,
    label: section.label,
    description: section.description,
    fields: collectLayoutNames(section.layout).flatMap((name) =>
      collection.fields.filter((field) => field.name === name)
    ),
    layout: section.layout,
  })

  return { main: main.map(toCard), side: side.map(toCard) }
}
