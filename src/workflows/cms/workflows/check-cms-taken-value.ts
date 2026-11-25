import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { listCmsTakenValuesStep } from "../steps/list-cms-taken-values"
import { findFreeValue } from "../utils/find-free-value"

export type CheckCmsTakenValueInput = {
  /** The collection's slug. */
  collection: string
  /** The unique column the value is meant for. */
  column: string
  value: string
  /** The document being edited, whose own value is not taken. */
  id?: string
}

export type CheckCmsTakenValueOutput = {
  taken: boolean
  /** The first free `-<n>` form of the value; only when the value is taken. */
  suggestion?: string
}

/**
 * Tells whether a live document of the collection already holds a value of a unique column, and when
 * it does, suggests the first free `-<n>` form of it, for the Admin to tell an editor before a save.
 *
 * Step order:
 *   1. listCmsTakenValuesStep - reads the taken values among the value and its suffixed forms
 *
 * A column that no unique index covers is never taken. The workflow only reads, so it has nothing to
 * compensate.
 */
export const checkCmsTakenValueWorkflow = createWorkflow(
  "check-cms-taken-value",
  (input: CheckCmsTakenValueInput) => {
    const document = transform({ input }, ({ input }) => ({
      [input.column]: input.value,
    }))
    const takenValues = listCmsTakenValuesStep({
      collection: input.collection,
      document,
      id: input.id,
    })
    const result = transform(
      { input, takenValues },
      ({ input, takenValues }): CheckCmsTakenValueOutput => {
        const values = takenValues[input.column] ?? []

        return values.includes(input.value)
          ? { taken: true, suggestion: findFreeValue(input.value, values) }
          : { taken: false }
      }
    )

    return new WorkflowResponse(result)
  }
)
