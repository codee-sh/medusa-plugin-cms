import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPublishedCmsDocumentsWorkflow } from "../../../../workflows/cms/workflows/list-published-cms-documents"

/**
 * Lists one page of the collection's published documents, of the fields, with the filters and in the
 * order the query asks, newest published first and without their areas by default.
 *
 * @param req - The request, with the collection in its params and the page Medusa read from the query.
 * @param res - The response.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { skip, take } = req.queryConfig.pagination as {
    skip: number
    take: number
  }
  const { result } = await listPublishedCmsDocumentsWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      limit: take,
      offset: skip,
      order: req.validatedQuery.order as string | undefined,
      fields: req.queryConfig.fields,
      filters: req.filterableFields,
    },
  })

  res.json({ ...result, limit: take, offset: skip })
}
