import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { validateCmsDocumentWorkflow } from "../../../../../../workflows/cms/workflows/validate-cms-document"
import type { AdminValidateCmsDocumentParamsType } from "./validators"

/**
 * Checks a document of the collection as a save would, without writing it.
 *
 * Answers 200 with every problem, as `{ path, message }`, so a body that would be refused is not an
 * error here; an empty list means a save would pass these checks. With `id`, the document is the one
 * being edited, and its own unique values are not taken.
 *
 * @param req - The request, with the collection in its params, the document's columns as its body and
 * the edited document's `id` in its query.
 * @param res - The response.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<
    Record<string, unknown>,
    AdminValidateCmsDocumentParamsType
  >,
  res: MedusaResponse
) => {
  const { result } = await validateCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      actor_id: req.auth_context.actor_id,
      document: req.body,
      id: req.validatedQuery.id,
    },
  })

  res.json({ errors: result })
}
