import {
  type MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { ensureCollection } from "../../../../../middlewares/ensure-collection"
import { AdminValidateCmsDocumentParams } from "./validators"

export const adminCmsValidateMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/cms/collections/:collection/validate",
    methods: ["POST"],
    // The Admin sends the whole document, as a save does.
    bodyParser: { sizeLimit: "2mb" },
    middlewares: [
      ensureCollection,
      validateAndTransformQuery(AdminValidateCmsDocumentParams, {}),
    ],
  },
]
