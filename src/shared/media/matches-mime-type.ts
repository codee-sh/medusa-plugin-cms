/**
 * Tells whether a file's MIME type is one of some patterns: the type itself, or its `type/*`. Case does
 * not matter, as MIME types are case-insensitive.
 *
 * @param type - The file's MIME type, such as `image/png`.
 * @param patterns - The types taken, exact or `type/*`.
 * @returns Whether a pattern matches.
 */
export const matchesMimeType = (type: string, patterns: string[]): boolean => {
  const [mainType, subtype] = type.toLowerCase().split("/")

  return (
    subtype !== undefined &&
    patterns.some((pattern) => {
      const normalized = pattern.toLowerCase()

      return (
        normalized === `${mainType}/${subtype}` ||
        normalized === `${mainType}/*`
      )
    })
  )
}
