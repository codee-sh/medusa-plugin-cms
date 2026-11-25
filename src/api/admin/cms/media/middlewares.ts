import {
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
// The multipart parser Medusa uses for its own `/admin/uploads`; it ships with `@medusajs/medusa`.
import multer from "multer"
import { getMediaProvider } from "../../../../lib/registry/get-media-provider"
import { listCmsMediaQueryConfig } from "./query-config"
import { AdminGetCmsMediaParams } from "./validators"

/**
 * Reads the one file of a multipart body into memory, as `req.file`, as Medusa's upload route does,
 * and refuses a file larger than the media provider's `maxFileSize`. The limit is the provider's, so
 * the parser is set up per request.
 *
 * @param req - The request, whose `file` field is read.
 * @param res - The response.
 * @param next - Continues the chain, or hands it the error: `NOT_ALLOWED` without a media provider,
 * `INVALID_DATA` for a file over the limit or a body the parser refuses.
 */
const receiveMediaFile = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  let maxFileSize: number

  try {
    maxFileSize = getMediaProvider(req.scope).maxFileSize
  } catch (error) {
    return next(error)
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize, files: 1 },
  }).single("file")

  upload(req, res, (error?: unknown) => {
    if (!error) {
      return next()
    }

    const code = (error as { code?: string }).code

    next(
      new MedusaError(
        MedusaError.Types.INVALID_DATA,
        code === "LIMIT_FILE_SIZE"
          ? `The file is larger than ${maxFileSize} bytes`
          : `The file could not be read: ${(error as Error).message}`
      )
    )
  })
}

export const adminCmsMediaMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/cms/media",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCmsMediaParams,
        listCmsMediaQueryConfig
      ),
    ],
  },
  {
    matcher: "/admin/cms/media",
    methods: ["POST"],
    // The multipart body is read by `multer`, not by the JSON body parser.
    bodyParser: false,
    middlewares: [receiveMediaFile],
  },
]
