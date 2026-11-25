/**
 * Writes a field's stored value as text, for a field that cannot draw its own input: a text as it is, a
 * list joined with commas, any other value through `String`, nothing when empty.
 *
 * @param value - The stored value.
 * @returns The value as text.
 */
export const formatStoredValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }

  return String(value)
}
