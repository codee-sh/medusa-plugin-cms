// The Admin imports this file into its browser bundle, so it imports nothing.

/**
 * Turns a column name into a label, for a field without one and for a table header.
 *
 * @param name - The column name.
 * @returns The name in sentence case.
 */
export const formatColumnLabel = (name: string): string => {
  const words = name.replace(/_/g, " ")

  return words.charAt(0).toUpperCase() + words.slice(1)
}
