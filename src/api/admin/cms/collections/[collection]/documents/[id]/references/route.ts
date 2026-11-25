import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { listCmsReferencesWorkflow } from "../../../../../../../../workflows/cms/workflows/list-cms-references"

/**
 * Lists the live rows pointing at a document, of any collection, the document itself left out.
 *
 * @param req - The request, with the collection and the document's id in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await listCmsReferencesWorkflow(req.scope).run({
    input: { collection: req.params.collection, id: req.params.id },
  })

  res.json({ references: result })
}
