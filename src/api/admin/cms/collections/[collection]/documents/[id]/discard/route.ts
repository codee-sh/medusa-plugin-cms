import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { discardCmsDocumentDraftWorkflow } from "../../../../../../../../workflows/cms/workflows/discard-cms-document-draft"
import type { AdminCmsDocumentBaseVersionType } from "../validators"

/**
 * Returns a published document with unpublished changes to its published content; the drafts stay in
 * its history.
 *
 * @param req - The request, with the collection and the document's id in its params, and the
 * `base_version` the editor's form showed as its body.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404; `NOT_ALLOWED` for a document with
 * nothing to discard or a stale `base_version`, as a 400.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCmsDocumentBaseVersionType>,
  res: MedusaResponse
) => {
  const { result } = await discardCmsDocumentDraftWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      base_version: req.validatedBody.base_version,
    },
  })

  res.json(result)
}
