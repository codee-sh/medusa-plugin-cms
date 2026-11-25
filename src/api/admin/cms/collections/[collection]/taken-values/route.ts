import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { checkCmsTakenValueWorkflow } from "../../../../../../workflows/cms/workflows/check-cms-taken-value"
import type { AdminGetCmsTakenValueParamsType } from "./validators"

/**
 * Tells whether a live document of the collection already holds a value of a unique column, and when
 * it does, suggests the first free `-<n>` form of it.
 *
 * A column that no unique index covers is never taken, as nothing keeps its values apart. With `id`,
 * the value of the document being edited is not taken.
 *
 * @param req - The request, with the collection in its params and the column, the value and the edited
 * document's `id` in its query.
 * @param res - The response.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<unknown, AdminGetCmsTakenValueParamsType>,
  res: MedusaResponse
) => {
  const { column, value, id } = req.validatedQuery
  const { result } = await checkCmsTakenValueWorkflow(req.scope).run({
    input: { collection: req.params.collection, column, value, id },
  })

  res.json(result)
}
