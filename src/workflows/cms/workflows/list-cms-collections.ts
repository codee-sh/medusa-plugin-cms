import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getCmsMediaProviderStep } from "../steps/get-cms-media-provider"
import { listCmsCollectionsStep } from "../steps/list-cms-collections"
import { listCmsRoutesStep } from "../steps/list-cms-routes"

/**
 * Lists the registered collections for the Admin, each with its number of documents, the Admin's
 * routes, and what the media picker needs of the media provider. A collection's texts are strings or
 * translations, which the Admin resolves in the editor's language.
 *
 * Step order:
 *   1. listCmsCollectionsStep - reads the registry and counts each collection's documents
 *   2. listCmsRoutesStep - reads the Admin's routes from the registry, in the tree's order
 *   3. getCmsMediaProviderStep - reads whether the provider can be searched, and its upload limit
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const listCmsCollectionsWorkflow = createWorkflow(
  "list-cms-collections",
  () => {
    const collections = listCmsCollectionsStep()
    const routes = listCmsRoutesStep()
    const mediaProvider = getCmsMediaProviderStep()

    return new WorkflowResponse({
      collections,
      routes,
      media_provider: mediaProvider,
    })
  }
)
