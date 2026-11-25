import { buildConfigError } from "../config/build-config-error"
import type { LayoutSectionConfig } from "../config/types"
import { validateFieldSections } from "./validate-field-sections"
import { validateSectionKeys } from "./validate-section-keys"
import { prepareLayoutTexts } from "./prepare-layout-texts"
import type { RegistryField, RegistryLayoutSection } from "../field/types"

/**
 * Refuses a section that names a `type` or a `collection`, as a section lays out its own collection's
 * fields alone: another collection's table stands on a route, `admin.routes`.
 *
 * @param sections - The collection's `admin.sections`.
 * @param path - Where the config sits, for error messages.
 * @throws At the first section that names one.
 */
const validateOwnSections = (
  sections: LayoutSectionConfig[],
  path: string
): void => {
  sections.forEach((section, index) => {
    // A JS config, or one written before routes took tables, can give these; the types do not allow it.
    const { type, collection } = (section ?? {}) as Record<string, unknown>

    if (type !== undefined || collection !== undefined) {
      throw buildConfigError(
        `${path}: admin section [${index}] lays out its own fields alone: show another collection's table on a route, in admin "routes"`
      )
    }
  })
}

/**
 * Prepares a collection's form sections: their texts, then the checks, then each section's position.
 * Every field and area of the collection sits in one of them.
 *
 * @param fields - The fields of the collection.
 * @param areas - The names of its areas.
 * @param unique - The fields a unique index covers alone.
 * @param sections - Its `admin.sections`.
 * @param translationNs - The config's `admin.translationNs`.
 * @param path - Where the config sits, for error messages.
 * @returns The sections, in the main column unless placed on the side.
 * @throws When the collection has no sections, or at the first section that does not fit.
 */
export const prepareFieldSections = (
  fields: RegistryField[],
  areas: string[],
  unique: string[],
  sections: LayoutSectionConfig[],
  translationNs: string | undefined,
  path: string
): RegistryLayoutSection[] => {
  // A JS config can leave `admin` or its sections out, which the types do not allow.
  if (!Array.isArray(sections) || !sections.length) {
    throw buildConfigError(
      `${path}: admin needs "sections", at least one, that hold every field and area`
    )
  }

  validateOwnSections(sections, path)

  const prepared = prepareLayoutTexts(sections, translationNs, path, true)

  validateFieldSections(
    fields,
    areas,
    unique,
    prepared,
    { fields: fields.map(({ name }) => name), areas },
    path
  )
  validateSectionKeys(prepared, path)

  return prepared.map((section) => ({
    ...section,
    position: section.position ?? "main",
  }))
}
