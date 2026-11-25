import { buildConfigError } from "../config/build-config-error"
import { describeText } from "../config/describe-text"
import type { ClientText, LayoutBlockSectionConfig } from "../config/types"
import { validateFieldSections } from "../layout/validate-field-sections"
import { prepareLayoutTexts } from "../layout/prepare-layout-texts"
import type { RegistryField } from "../field/types"

/**
 * Checks that no section of a block card takes a `position` or `areas`, which a JS config can give: a
 * card has no columns and lays no areas out.
 *
 * @param sections - The sections, their texts prepared.
 * @param path - Where the config sits, for error messages.
 * @throws At the first section with either.
 */
const validateBlockSectionKeys = (
  sections: LayoutBlockSectionConfig<ClientText>[],
  path: string
): void => {
  for (const section of sections) {
    if ("position" in section || "areas" in section) {
      throw buildConfigError(
        `${path}: admin section "${describeText(section.label)}" of a block takes no position or areas`
      )
    }
  }
}

/**
 * Prepares a block card's sections - their texts, then the checks: fields only, since a card has no
 * columns and lays no areas out.
 *
 * @param fields - The fields of the block.
 * @param sections - Its `admin.sections`.
 * @param translationNs - The config's `admin.translationNs`.
 * @param path - Where the config sits, for error messages.
 * @returns The sections as the config lists them, their texts prepared.
 * @throws At the first section that does not fit, a JS config's `position` or `areas` included.
 */
export const prepareBlockSections = (
  fields: RegistryField[],
  sections: LayoutBlockSectionConfig[],
  translationNs: string | undefined,
  path: string
): LayoutBlockSectionConfig<ClientText>[] => {
  // A block's section keeps its label required, which the texts' walk prepares and checks.
  const prepared = prepareLayoutTexts(
    sections,
    translationNs,
    path
  ) as LayoutBlockSectionConfig<ClientText>[]

  validateBlockSectionKeys(prepared, path)
  // A block's fields may stand outside its sections, before them on its card.
  validateFieldSections(
    fields,
    [],
    [],
    prepared,
    { fields: [], areas: [] },
    path
  )

  return prepared
}
