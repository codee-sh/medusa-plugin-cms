import { buildConfigError } from "../config/build-config-error"

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/

/**
 * Checks a block's or a collection's slug: snake_case, and not taken by another of its kind.
 *
 * @param slug - The slug.
 * @param taken - The entries of its kind prepared so far, by slug.
 * @param path - Where the config sits, for error messages: `block "<slug>"` or `collection "<slug>"`.
 * @throws When the slug is not snake_case, or is taken.
 */
export const validateContentTypeSlug = (
  slug: string,
  taken: Record<string, unknown>,
  path: string
): void => {
  if (!SNAKE_CASE.test(slug) || taken[slug]) {
    throw buildConfigError(`${path}: not snake_case, or repeated`)
  }
}
