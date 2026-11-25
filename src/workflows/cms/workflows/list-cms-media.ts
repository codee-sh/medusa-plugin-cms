import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { CmsMediaListQuery } from "../../../lib/media-provider/types"
import { listCmsMediaStep } from "../steps/list-cms-media"

/**
 * Searches the media provider's records for the Admin's library.
 *
 * Step order:
 *   1. listCmsMediaStep - runs the provider's `list`, or refuses a provider without one
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const listCmsMediaWorkflow = createWorkflow(
  "list-cms-media",
  (input: CmsMediaListQuery) => {
    const page = listCmsMediaStep(input)

    return new WorkflowResponse(page)
  }
)
