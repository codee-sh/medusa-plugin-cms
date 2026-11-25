import type { MiddlewareRoute } from "@medusajs/framework/http"
import { ensureStoreCollection } from "../../../middlewares/ensure-store-collection"
import { verifyStoreQuery } from "../../../middlewares/verify-store-query"

export const storeCmsDocumentsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/cms/:collection",
    methods: ["GET"],
    middlewares: [ensureStoreCollection, verifyStoreQuery("list")],
  },
  {
    matcher: "/store/cms/:collection/:id",
    methods: ["GET"],
    middlewares: [ensureStoreCollection, verifyStoreQuery("retrieve")],
  },
  {
    matcher: "/store/cms/:collection/slug/:slug",
    methods: ["GET"],
    middlewares: [ensureStoreCollection, verifyStoreQuery("retrieve")],
  },
]
