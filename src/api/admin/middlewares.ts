import type { MiddlewareRoute } from "@medusajs/framework/http"
import { adminCmsDocumentMiddlewares } from "./cms/collections/[collection]/documents/[id]/middlewares"
import { adminCmsDocumentsMiddlewares } from "./cms/collections/[collection]/documents/middlewares"
import { adminCmsTakenValuesMiddlewares } from "./cms/collections/[collection]/taken-values/middlewares"
import { adminCmsValidateMiddlewares } from "./cms/collections/[collection]/validate/middlewares"
import { adminCmsMediaMiddlewares } from "./cms/media/middlewares"

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminCmsDocumentsMiddlewares,
  ...adminCmsDocumentMiddlewares,
  ...adminCmsTakenValuesMiddlewares,
  ...adminCmsValidateMiddlewares,
  ...adminCmsMediaMiddlewares,
]
