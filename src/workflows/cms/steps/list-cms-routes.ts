import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { RegistryRoute } from "../../../lib/registry/types"

/**
 * Reads the Admin's pages from the registry: every route of `admin.routes`, in the tree's order, with
 * its parent and its children.
 */
export const listCmsRoutesStep = createStep(
  "list-cms-routes",
  async (_input: void, { container }) =>
    new StepResponse<RegistryRoute[]>(getRegistry(container).routes)
)
