import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type multer from "multer"
import { listCmsMediaWorkflow } from "../../../../workflows/cms/workflows/list-cms-media"
import { uploadCmsMediaWorkflow } from "../../../../workflows/cms/workflows/upload-cms-media"
import type { AdminGetCmsMediaParamsType } from "./validators"

/**
 * Searches the media provider's records, for the Admin's library.
 *
 * @param req - The request, with the validated query.
 * @param res - The response.
 * @throws `NOT_ALLOWED` when the provider cannot be searched, as a 400.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<unknown, AdminGetCmsMediaParamsType>,
  res: MedusaResponse
) => {
  const { q, mime_type, limit, offset } = req.validatedQuery
  const { result } = await listCmsMediaWorkflow(req.scope).run({
    input: { q, mime_type, limit, offset },
  })

  res.json({ ...result, limit, offset })
}

/**
 * Uploads the body's one `file` through the media provider and answers its record.
 *
 * @param req - The request, with the file `receiveMediaFile` read.
 * @param res - The response.
 * @throws `INVALID_DATA` for a body without a file, or a file over the provider's limit, as a 400.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest & { file?: multer.File },
  res: MedusaResponse
) => {
  const { file } = req

  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'The body holds no "file"'
    )
  }

  const { result } = await uploadCmsMediaWorkflow(req.scope).run({
    input: {
      filename: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer.toString("base64"),
    },
  })

  res.json({ media: result })
}
