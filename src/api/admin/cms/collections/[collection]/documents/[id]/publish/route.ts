import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { publishCmsDocumentWorkflow } from "../../../../../../../../workflows/cms/workflows/publish-cms-document"
import type { AdminCmsDocumentBaseVersionType } from "../validators"

/**
 * Publishes the latest version of a document of the collection.
 *
 * @param req - The request, with the collection and the document's id in its params, and the
 * `base_version` the editor's form showed as its body.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404; `INVALID_DATA` with a line per
 * field the publish needs, `NOT_ALLOWED` for a document with nothing new to publish or a stale
 * `base_version`, each as a 400; `DUPLICATE_ERROR` for a unique value another document holds, as a 422.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCmsDocumentBaseVersionType>,
  res: MedusaResponse
) => {
  const { result } = await publishCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      actor_id: req.auth_context.actor_id,
      base_version: req.validatedBody.base_version,
    },
  })

  res.json(result)
}
