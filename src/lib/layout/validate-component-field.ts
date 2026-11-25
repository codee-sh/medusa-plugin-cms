import { buildConfigError } from "../config/build-config-error"
import type { RegistryField } from "../field/types"

/**
 * The field kinds whose input carries behaviour the CMS owns, so no component draws it; a `richtext`
 * value is a document, not the plain value a component edits.
 */
const OWN_INPUT_KINDS = ["slug", "media", "richtext"]

/**
 * Checks that a component node may own a field: not a slug, a media or a `richtext` field, whose inputs
 * carry behaviour the CMS owns, and not a unique field, whose value the Admin checks against the live
 * documents as the editor types.
 *
 * @param field - The field the node names.
 * @param unique - The fields a unique index covers alone.
 * @param where - The config path and the section, which open each error message.
 * @throws When the node cannot own the field.
 */
export const validateComponentField = (
  field: RegistryField,
  unique: string[],
  where: string
): void => {
  if (OWN_INPUT_KINDS.includes(field.kind)) {
    throw buildConfigError(
      `${where}: a component node cannot own the ${field.kind} field "${field.name}", as the CMS draws its input`
    )
  }

  if (unique.includes(field.name)) {
    throw buildConfigError(
      `${where}: a component node cannot own the unique field "${field.name}", as the CMS checks its value as the editor types`
    )
  }
}
