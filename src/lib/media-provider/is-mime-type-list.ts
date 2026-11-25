import { isMimeTypePattern } from "../../shared/media/is-mime-type-pattern"

/**
 * Tells whether a value is a list of MIME types a config may give: not empty, each a type such as
 * `image/png` or `image/*` for every subtype.
 *
 * @param value - The value.
 * @returns Whether it is one.
 */
export const isMimeTypeList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isMimeTypePattern)
