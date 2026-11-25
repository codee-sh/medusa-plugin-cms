// The layout helpers' own files, not the toolkit's index, which pulls its components in.
import type { LayoutItemConfig } from "../../../components/manager-form-fields/layout/types"
import {
  type FormFieldSection,
  sectionFormFields,
} from "../../../components/manager-form-fields/layout/utils/section-form-fields"
import type { RegistryArea } from "../../../../lib/area/types"
import type { ClientCollection } from "../../../../lib/collection/types"
import type { Field } from "../../../../lib/field/types"

/** One section of the collection's form, with the fields and the areas the form shows in it. */
export type DocumentFieldSection = Omit<
  ClientCollection["admin"]["sections"][number],
  "fields" | "areas"
> & {
  /** How the section lays its fields out, without its areas. */
  layout: LayoutItemConfig[]
  areas: RegistryArea<string>[]
}

/**
 * Lays a form's fields and areas out in the collection's sections through `sectionFormFields`, which
 * hold every field and area of the collection. A section's areas go in as names after its fields, so a
 * section of areas alone is kept, and come off the top of its layout again.
 *
 * @param collection - The collection, whose `admin.sections` name the fields and areas of each section.
 * @param fields - The fields the form shows.
 * @param areas - The areas the form shows; none by default.
 * @returns The sections of the `main` and the `side` column with a field or an area the form shows,
 * each in the sections' order.
 */
export const sectionDocumentFields = (
  collection: ClientCollection,
  fields: Field[],
  areas: RegistryArea<string>[] = []
): {
  main: DocumentFieldSection[]
  side: DocumentFieldSection[]
} => {
  const { main, side } = sectionFormFields<
    Field | RegistryArea<string>,
    ClientCollection["admin"]["sections"][number]
  >(
    [...fields, ...areas],
    collection.admin.sections.map(
      ({ areas: sectionAreas = [], ...section }) => ({
        ...section,
        fields: [...section.fields, ...sectionAreas],
      })
    )
  )

  /**
   * Takes a section's areas off the top of its layout, where they follow its fields.
   *
   * @param section - The section, as `sectionFormFields` lays it out.
   * @returns The section with the layout of its fields and its areas apart.
   */
  const splitAreas = ({
    layout,
    ...section
  }: FormFieldSection<
    ClientCollection["admin"]["sections"][number]
  >): DocumentFieldSection => ({
    ...section,
    layout: layout.filter((item) => !areas.some((area) => area.name === item)),
    areas: layout.flatMap((item) => areas.filter((area) => area.name === item)),
  })

  return { main: main.map(splitAreas), side: side.map(splitAreas) }
}
