/**
 * Whether a value is a plain object: made by `{}` or with no prototype, not a date, a list or a class.
 *
 * @param value - The value.
 * @returns Whether it is a plain object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

/**
 * Compares two values by content: primitives as they are, dates by their time, lists item by item and
 * plain objects key by key.
 *
 * @param a - One value.
 * @param b - The other.
 * @returns Whether they hold the same content.
 */
export const isSameValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((item, index) => isSameValue(item, b[index]))
    )
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a)

    return (
      keys.length === Object.keys(b).length &&
      keys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(b, key) &&
          isSameValue(a[key], b[key])
      )
    )
  }

  return false
}
