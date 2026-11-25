import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPublishedCmsDocumentWorkflow } from "../../../../../../workflows/cms/workflows/get-published-cms-document"

/**
 * Reads one published document of the collection by the value of its slug field, with its areas.
 *
 * @param req - The request, with the collection and the slug in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for a draft, a deleted or an unknown document, and for a collection without a slug
 * field, as a 404.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await getPublishedCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      slug: req.params.slug,
      fields: req.queryConfig.fields,
    },
  })

  res.json(result)
}
