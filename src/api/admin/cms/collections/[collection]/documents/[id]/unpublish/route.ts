import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { unpublishCmsDocumentWorkflow } from "../../../../../../../../workflows/cms/workflows/unpublish-cms-document"

/**
 * Turns a published document of the collection back into a draft.
 *
 * @param req - The request, with the collection and the document's id in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404, and `NOT_ALLOWED` for a document
 * that is not published, as a 400.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await unpublishCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      actor_id: req.auth_context.actor_id,
    },
  })

  res.json(result)
}
