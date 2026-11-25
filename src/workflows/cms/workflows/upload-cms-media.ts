import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type CreateCmsMediaInput,
  createCmsMediaStep,
} from "../steps/create-cms-media"

/**
 * Uploads a file through the config's media provider and returns its record. The Admin uploads a
 * document's chosen files when the document is saved, before sending it; a field then holds the
 * file's id or URL.
 *
 * Step order:
 *   1. createCmsMediaStep - stores the file
 *
 * createCmsMediaStep deletes the file during compensation.
 */
export const uploadCmsMediaWorkflow = createWorkflow(
  "upload-cms-media",
  (input: CreateCmsMediaInput) => {
    const media = createCmsMediaStep(input)

    return new WorkflowResponse(media)
  }
)
