import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { listCmsDocumentVersionsWorkflow } from "../../../../../../../../workflows/cms/workflows/list-cms-document-versions"
import type { AdminGetCmsDocumentVersionsParamsType } from "../validators"

/**
 * Lists one page of a document's history, newest first, without the snapshots.
 *
 * @param req - The request, with the collection and the document's id in its params, and the page in
 * its query.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetCmsDocumentVersionsParamsType
  >,
  res: MedusaResponse
) => {
  const { limit, offset } = req.validatedQuery
  const { result } = await listCmsDocumentVersionsWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      limit,
      offset,
    },
  })

  res.json({ ...result, limit, offset })
}
