import type { MiddlewareRoute } from "@medusajs/framework/http"
import { storeCmsDocumentsMiddlewares } from "./cms/[collection]/middlewares"

export const storeMiddlewares: MiddlewareRoute[] = [
  ...storeCmsDocumentsMiddlewares,
]
