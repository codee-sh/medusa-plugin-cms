import { productValidators } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import type { RegistryField } from "../field/types"

/** The field kinds the Admin list filters by. */
const ADMIN_FILTER_KINDS = ["select", "relationship", "boolean"]

/** A text filter's value: one value, or a list of them, which matches any. */
const textFilter = z
  .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
  .transform((value) => (Array.isArray(value) ? value : [value]))

/**
 * Builds the schema of the Admin list's `filters`: a key per `select`, `relationship` and `boolean`
 * field of the collection, a select's or a relationship's one value or several, a boolean read with
 * Medusa's `booleanString`. It takes every such field, not only those a table names, as a table of a
 * host's own, exported by `sub-admin-blocks-export`, sends them too. It is strict, so any other key
 * answers 400.
 *
 * @param fields - The collection's fields.
 * @returns The schema, optional, as a list may filter by nothing.
 */
export const prepareAdminListFilters = (fields: RegistryField[]) =>
  z
    .strictObject(
      Object.fromEntries(
        fields
          .filter(({ kind }) => ADMIN_FILTER_KINDS.includes(kind))
          .map(({ name, kind }) => [
            name,
            (kind === "boolean"
              ? productValidators.booleanString()
              : textFilter
            ).optional(),
          ])
      )
    )
    .optional()
