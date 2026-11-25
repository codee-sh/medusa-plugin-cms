import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { getCmsDocumentVersionWorkflow } from "../../../../../../../../../workflows/cms/workflows/get-cms-document-version"

/**
 * Reads one version of a document, with its snapshot.
 *
 * @param req - The request, with the collection, the document's id and the version's id in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown document or version, as a 404.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await getCmsDocumentVersionWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      version_id: req.params.version_id,
    },
  })

  res.json({ version: result })
}
