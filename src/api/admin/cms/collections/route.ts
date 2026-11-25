import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listCmsCollectionsWorkflow } from "../../../../workflows/cms/workflows/list-cms-collections"

/**
 * Lists the registered collections with their fields and document counts, the Admin's routes, and what
 * the media picker needs of the media provider.
 *
 * @param req - The request.
 * @param res - The response.
 * @throws The problems found in the config, as a 500.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await listCmsCollectionsWorkflow(req.scope).run()

  res.json(result)
}
