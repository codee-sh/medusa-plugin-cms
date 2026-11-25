import type { AnyField } from "../field/types"
import type { DocumentError } from "./types"

/**
 * Finds each relationship field whose id names no live document of its target, at the field's path.
 *
 * @param fields - The collection's fields.
 * @param document - The values checked, a body's or a version's.
 * @param related - Per relationship field, the live documents among the ids it holds, as
 * `list-cms-related-documents` read them.
 * @returns One error per such field.
 */
export const findMissingRelations = (
  fields: AnyField[],
  document: Record<string, unknown>,
  related: Record<string, string[]>
): DocumentError[] =>
  fields.flatMap(({ name, kind }) => {
    const id = document[name]

    return kind === "relationship" &&
      typeof id === "string" &&
      id &&
      !related[name]?.includes(id)
      ? [{ path: name, message: `The document "${id}" was not found` }]
      : []
  })
