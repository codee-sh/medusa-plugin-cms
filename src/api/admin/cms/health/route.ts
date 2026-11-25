import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRegistry } from "../../../../lib/registry/get-registry"

/**
 * Tells that the project's config resolves into a registry.
 *
 * @param req - The request.
 * @param res - The response.
 * @throws The problems found in the config, as a 500.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  getRegistry(req.scope)

  res.json({ registry: "resolved" })
}
