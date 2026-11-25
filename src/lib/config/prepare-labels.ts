import { buildConfigError } from "./build-config-error"
import { prepareCmsText } from "./prepare-cms-text"
import type { ClientText, Labels } from "./types"

/**
 * Checks that the config gives a labels object, which a JS config can leave out and the types do not.
 *
 * @param labels - The labels, as the config gives them.
 * @param path - Where the config sits, for error messages.
 * @throws When they are no object.
 */
const validateLabels = (labels: unknown, path: string): void => {
  if (typeof labels !== "object" || labels === null) {
    throw buildConfigError(`${path}: "labels" needs a singular and a plural`)
  }
}

/**
 * Prepares a collection's or a block type's labels.
 *
 * @param labels - The labels, as the config gives them.
 * @param translationNs - The config's `admin.translationNs`.
 * @param path - Where the config sits, for error messages.
 * @returns The labels, each prepared.
 * @throws When the config gives no labels object.
 */
export const prepareLabels = (
  labels: Labels,
  translationNs: string | undefined,
  path: string
): Labels<ClientText> => {
  validateLabels(labels, path)

  return {
    singular: prepareCmsText(
      labels.singular,
      translationNs,
      `${path}: labels.singular`
    ),
    plural: prepareCmsText(
      labels.plural,
      translationNs,
      `${path}: labels.plural`
    ),
  }
}
