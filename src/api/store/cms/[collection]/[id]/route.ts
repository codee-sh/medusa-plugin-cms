import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPublishedCmsDocumentWorkflow } from "../../../../../workflows/cms/workflows/get-published-cms-document"

/**
 * Reads one published document of the collection by its id, with its areas.
 *
 * @param req - The request, with the collection and the document's id in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for a draft, a deleted or an unknown document, as a 404.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await getPublishedCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      fields: req.queryConfig.fields,
    },
  })

  res.json(result)
}
