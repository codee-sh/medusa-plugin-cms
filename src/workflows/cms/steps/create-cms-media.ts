import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CmsMedia } from "../../../lib/media-provider/types"
import { matchesMimeType } from "../../../shared/media/matches-mime-type"
import { getMediaProvider } from "../../../lib/registry/get-media-provider"

export type CreateCmsMediaInput = {
  filename: string
  mimeType: string
  /** The file's content in base64, as a workflow's input carries it; a Buffer would not survive it. */
  content: string
}

/**
 * Stores a file through the config's media provider and answers its record. Refuses a file of a type
 * outside the provider's `mimeTypes`, when it has them, and one over its `maxFileSize`, for a caller that
 * skips the route's parser.
 *
 * Compensation: the provider's `delete` removes the stored file.
 *
 * @throws `INVALID_DATA` for a file of a type the provider does not take or over the limit,
 * `NOT_ALLOWED` without a media provider.
 */
export const createCmsMediaStep = createStep(
  "create-cms-media",
  async (input: CreateCmsMediaInput, { container }) => {
    const provider = getMediaProvider(container)
    const content = Buffer.from(input.content, "base64")
    const { mimeTypes } = provider

    if (mimeTypes && !matchesMimeType(input.mimeType, mimeTypes)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The file type "${input.mimeType}" is not allowed`
      )
    }

    if (content.length > provider.maxFileSize) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The file is larger than ${provider.maxFileSize} bytes`
      )
    }

    const media = await provider.upload({
      filename: input.filename,
      mimeType: input.mimeType,
      content,
    })

    return new StepResponse<CmsMedia, CmsMedia>(media, media)
  },
  async (media, { container }) => {
    if (!media) {
      return
    }

    await getMediaProvider(container).delete(media)
  }
)
