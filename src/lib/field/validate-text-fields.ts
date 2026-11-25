import { buildConfigError } from "../config/build-config-error"
import type { ContentTypeConfig } from "../config/types"

/** The field types that hold free text and take a recommended length and a placeholder source. */
const TEXT_TYPES = ["text", "textarea"]

/**
 * Checks the hints of every text field: `recommendedLength` a positive whole number, and
 * `placeholderFrom` another text field of the same config.
 *
 * @param config - The config, whose `fields` hold the text fields.
 * @param path - Where the config sits, for error messages.
 * @throws At the first text field whose hints do not fit.
 */
export const validateTextFields = (
  config: Pick<ContentTypeConfig, "fields">,
  path: string
): void => {
  const fields = config.fields ?? {}

  for (const [name, override] of Object.entries(fields)) {
    if (override.type !== "text" && override.type !== "textarea") {
      continue
    }

    const { recommendedLength, placeholderFrom } = override.admin ?? {}

    if (
      recommendedLength !== undefined &&
      (!Number.isInteger(recommendedLength) || recommendedLength < 1)
    ) {
      throw buildConfigError(
        `${path}: field "${name}" takes admin.recommendedLength as a positive whole number`
      )
    }

    if (
      placeholderFrom !== undefined &&
      (placeholderFrom === name ||
        !TEXT_TYPES.includes(fields[placeholderFrom]?.type))
    ) {
      throw buildConfigError(
        `${path}: field "${name}" takes its placeholder from "${placeholderFrom}", which is not another text field`
      )
    }
  }
}
