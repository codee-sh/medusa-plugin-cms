import { buildConfigError } from "../config/build-config-error"
import type { LayoutSectionConfig } from "../config/types"

/**
 * Checks the keys a collection's sections go by: each section has one, a text, once in the collection.
 *
 * @param sections - The collection's `admin.sections`.
 * @param path - Where the config sits, for error messages.
 * @throws At the first key that is missing, empty, or taken.
 */
export const validateSectionKeys = (
  sections: Pick<LayoutSectionConfig, "key">[],
  path: string
): void => {
  const keys: string[] = []

  sections.forEach(({ key }, index) => {
    // A JS config can leave the key out or give anything here, which the types do not allow.
    if (typeof key !== "string" || !key.trim()) {
      throw buildConfigError(
        `${path}: admin section [${index}] needs a "key" of text`
      )
    }

    if (keys.includes(key)) {
      throw buildConfigError(
        `${path}: admin section key "${key}" is taken by another section`
      )
    }

    keys.push(key)
  })
}
