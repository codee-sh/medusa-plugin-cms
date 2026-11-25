/**
 * Lists words in a sentence: `a, b and c`.
 *
 * @param words - The words, at least one.
 * @param conjunction - The word before the last one.
 * @returns The list.
 */
export const listWords = (
  words: string[],
  conjunction: "and" | "or"
): string =>
  words.length > 1
    ? `${words.slice(0, -1).join(", ")} ${conjunction} ${words[words.length - 1]}`
    : words[0]
