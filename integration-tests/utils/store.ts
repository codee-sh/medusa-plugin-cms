import type {
  IApiKeyModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Creates a publishable API key, which every route under `/store` requires.
 *
 * @param container - The test app's container.
 * @returns Request options carrying the key in its header.
 */
export const createStoreHeaders = async (container: MedusaContainer) => {
  const key = await container
    .resolve<IApiKeyModuleService>(Modules.API_KEY)
    .createApiKeys({
      title: "Store",
      type: "publishable",
      created_by: "test",
    })

  return { headers: { "x-publishable-api-key": key.token } }
}
