import {
  type MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { ensureCollection } from "../../../../../../middlewares/ensure-collection"
import { verifyDocumentBody } from "../../../../../../middlewares/verify-document-body"
import {
  AdminCmsDocumentBaseVersion,
  AdminGetCmsDocumentVersionsParams,
} from "./validators"

export const adminCmsDocumentMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/cms/collections/:collection/documents/:id",
    methods: ["GET", "DELETE"],
    middlewares: [ensureCollection],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents/:id",
    methods: ["POST"],
    // A save sends the whole document, past body-parser's default of 100 KB.
    bodyParser: { sizeLimit: "2mb" },
    middlewares: [ensureCollection, verifyDocumentBody],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents/:id/publish",
    methods: ["POST"],
    middlewares: [
      ensureCollection,
      validateAndTransformBody(AdminCmsDocumentBaseVersion),
    ],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents/:id/unpublish",
    methods: ["POST"],
    middlewares: [ensureCollection],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents/:id/discard",
    methods: ["POST"],
    middlewares: [
      ensureCollection,
      validateAndTransformBody(AdminCmsDocumentBaseVersion),
    ],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents/:id/references",
    methods: ["GET"],
    middlewares: [ensureCollection],
  },
  {
    matcher: "/admin/cms/collections/:collection/documents/:id/versions",
    methods: ["GET"],
    middlewares: [
      ensureCollection,
      validateAndTransformQuery(AdminGetCmsDocumentVersionsParams, {}),
    ],
  },
  {
    matcher:
      "/admin/cms/collections/:collection/documents/:id/versions/:version_id",
    methods: ["GET"],
    middlewares: [ensureCollection],
  },
  {
    matcher:
      "/admin/cms/collections/:collection/documents/:id/versions/:version_id/restore",
    methods: ["POST"],
    middlewares: [
      ensureCollection,
      validateAndTransformBody(AdminCmsDocumentBaseVersion),
    ],
  },
]
