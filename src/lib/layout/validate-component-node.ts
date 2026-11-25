import { buildConfigError } from "../config/build-config-error"
import type { ClientText, LayoutComponentConfig } from "../config/types"

/**
 * Checks a component node's own shape: the name of its component, and one field or more, as a list or
 * a mapping of keys, none named twice and no key empty.
 *
 * @param node - The node.
 * @param where - The config path and the section, which open each error message.
 * @returns The names of the node's fields.
 * @throws At the first part of the node that does not fit.
 */
export const validateComponentNode = (
  node: LayoutComponentConfig<ClientText>,
  where: string
): string[] => {
  // A JS config can leave the name or the fields out, which the types do not allow.
  if (typeof node.component !== "string" || !node.component.trim()) {
    throw buildConfigError(
      `${where}: a component node needs the name of a registered component`
    )
  }

  if (typeof node.fields !== "object" || node.fields === null) {
    throw buildConfigError(
      `${where}: component "${node.component}" lists its fields as names or as keys mapped to names`
    )
  }

  // A node in a JS config's list is refused as one in any container that takes names only.
  for (const field of Array.isArray(node.fields) ? node.fields : []) {
    const nested = field as unknown as { type?: unknown }

    if (typeof nested === "object" && nested !== null) {
      const name = nested.type === "tabs" ? "tabs" : `a ${String(nested.type)}`

      throw buildConfigError(`${where}: ${name} cannot sit in a component`)
    }
  }

  const fields = Array.isArray(node.fields)
    ? node.fields.map((field) => ({ key: field, field }))
    : Object.entries(node.fields).map(([key, field]) => ({ key, field }))

  if (!fields.length) {
    throw buildConfigError(
      `${where}: component "${node.component}" lists no fields`
    )
  }

  const seen = new Set<string>()

  for (const { key, field } of fields) {
    if (!key.trim() || typeof field !== "string") {
      throw buildConfigError(
        `${where}: component "${node.component}" maps each key it reads to a field name`
      )
    }

    if (seen.has(field)) {
      throw buildConfigError(
        `${where}: component "${node.component}" names "${field}" twice`
      )
    }

    seen.add(field)
  }

  return fields.map(({ field }) => field)
}
