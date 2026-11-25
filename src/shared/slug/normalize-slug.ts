/** Letters that Unicode does not decompose into a base letter and a mark. */
const LETTER_REPLACEMENTS: Record<string, string> = {
  ł: "l",
  ß: "ss",
  æ: "ae",
  ø: "o",
  đ: "d",
}

const REPLACED_LETTERS = new RegExp(
  `[${Object.keys(LETTER_REPLACEMENTS).join("")}]`,
  "g"
)

/** The format every slug must have: lowercase ASCII letters and digits, in groups joined by single hyphens. */
export const SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Builds a slug from a text: lowercase ASCII letters, digits and single hyphens.
 *
 * Diacritics are dropped, so an accented letter becomes its base letter, unlike Medusa's `toHandle`,
 * which keeps every letter and so would build slugs the slug format refuses.
 *
 * @param text - The source text, such as a title.
 * @returns The slug, or an empty text when nothing in the source can be kept.
 */
export const normalizeSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(REPLACED_LETTERS, (letter) => LETTER_REPLACEMENTS[letter])
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
