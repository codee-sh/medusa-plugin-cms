/**
 * Builds the query keys of one resource, the way the Medusa dashboard does.
 *
 * @param globalKey - The resource's key, shared by all its queries.
 * @returns The keys of the resource, its lists and its details.
 */
export const queryKeysFactory = <
  T,
  TListQuery = unknown,
  TDetailQuery = string,
>(
  globalKey: T
) => {
  const keys = {
    all: [globalKey] as const,
    lists: () => [...keys.all, "list"] as const,
    list: (query?: TListQuery) => [...keys.lists(), { query }] as const,
    details: () => [...keys.all, "detail"] as const,
    detail: (id: TDetailQuery, query?: TListQuery) =>
      [...keys.details(), id, { query }] as const,
  }

  return keys
}
