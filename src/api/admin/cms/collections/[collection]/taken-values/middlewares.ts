import {
  type MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { ensureCollection } from "../../../../../middlewares/ensure-collection"
import { AdminGetCmsTakenValueParams } from "./validators"

export const adminCmsTakenValuesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/cms/collections/:collection/taken-values",
    methods: ["GET"],
    middlewares: [
      ensureCollection,
      validateAndTransformQuery(AdminGetCmsTakenValueParams, {}),
    ],
  },
]
