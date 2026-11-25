import { formatEntityName } from "../model/format-entity-name"
import type { RowIds } from "./types"

/**
 * Finds the rows a restore brought back that were not live before the delete. A generated `restore`
 * walks the cascades and revives every row under a root, whenever it was deleted, so a compensation
 * soft-deletes these again.
 *
 * A model `live` does not list is left out: its rows stay restored.
 *
 * @param restored - What a generated `restore` answered: the ids it brought back, per linkable key.
 * @param live - Per model, the ids that were live before the delete; a model with no live row is listed
 * with no ids, so every row of it that came back is found.
 * @returns Per model, the ids to soft-delete again; a model with none is left out.
 */
export const listRevivedRows = (
  restored: Record<string, string[]>,
  live: RowIds
): RowIds =>
  live
    .map(({ key, ids }) => ({
      key,
      // A restore answers by linkable key: `test_step_id` for `TestStep`.
      ids: (restored[`${formatEntityName(key)}_id`] ?? []).filter(
        (id) => !ids.includes(id)
      ),
    }))
    .filter(({ ids }) => ids.length)
