import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { restoreCmsDocumentVersionWorkflow } from "../../../../../../../../../../workflows/cms/workflows/restore-cms-document-version"
import type { AdminCmsDocumentBaseVersionType } from "../../../validators"

/**
 * Brings an older version of a document back as its latest version; nothing goes live until a publish.
 *
 * @param req - The request, with the collection, the document's id and the version's id in its params,
 * and the `base_version` the editor's form showed as its body.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown document or version, as a 404; `INVALID_DATA` when the restored
 * content no longer fits the collection, and `NOT_ALLOWED` for a stale `base_version`, each as a 400.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCmsDocumentBaseVersionType>,
  res: MedusaResponse
) => {
  const { result } = await restoreCmsDocumentVersionWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      version_id: req.params.version_id,
      actor_id: req.auth_context.actor_id,
      base_version: req.validatedBody.base_version,
    },
  })

  res.json(result)
}
