import type { RegistryField } from "./types"

/**
 * Lists the names of the fields the store may answer, leaving out each one with `store: { hidden: true }`.
 * The store's `allowed` paths and what a store read selects both read it, so the two cannot disagree.
 *
 * @param fields - A collection's or a block type's fields.
 * @returns Their names, in the fields' order.
 */
export const listPublicFields = (fields: RegistryField[]): string[] =>
  fields.filter(({ store }) => !store?.hidden).map(({ name }) => name)
