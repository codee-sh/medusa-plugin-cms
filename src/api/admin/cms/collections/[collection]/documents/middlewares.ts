import type { MiddlewareRoute } from "@medusajs/framework/http"
import { ensureCollection } from "../../../../../middlewares/ensure-collection"
import { verifyAdminListQuery } from "../../../../../middlewares/verify-admin-list-query"
import { verifyDocumentBody } from "../../../../../middlewares/verify-document-body"

export const adminCmsDocumentsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/cms/collections/:collection/documents",
    methods: ["GET"],
    middlewares: [ensureCollection, verifyAdminListQuery],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents",
    methods: ["POST"],
    // A save sends the whole document, past body-parser's default of 100 KB.
    bodyParser: { sizeLimit: "2mb" },
    middlewares: [ensureCollection, verifyDocumentBody],
  },
]
