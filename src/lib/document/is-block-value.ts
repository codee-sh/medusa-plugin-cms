/**
 * Tells whether an item of an area is an object a walk can read as a block. A body that breaks its
 * shape may hold anything there, which the schema reports.
 *
 * @param value - The item.
 * @returns Whether it is an object.
 */
export const isBlockValue = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
