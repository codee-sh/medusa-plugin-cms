import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { formatDocumentErrors } from "../../lib/document/document-errors"
import { findDocumentErrors } from "../../lib/document/find-document-errors"
import { getCollection } from "../../lib/registry/get-collection"
import { getRegistry } from "../../lib/registry/get-registry"

/**
 * Lets a document body through only when it fits its collection's shape, its areas included.
 *
 * Checks what needs no read; unique values and the rest are the workflow's. A field the workflow fills
 * from its `from` column is not required here, since the workflow checks it once filled. On a route
 * with `:id` the body edits a stored document and may leave fields out, so only the required fields
 * whose keys it holds are required, and `base_version`, the version the editor's form showed, travels
 * beside the columns as a whole number or `null`; the workflow checks the document as it will be. Runs
 * after
 * `ensureCollection`, so the collection is known.
 *
 * @param req - The request, whose body is checked against the `:collection` param.
 * @param _res - The response; the error handler writes it.
 * @param next - Continues the chain, or hands it a 400 with one `<path>: <message>` line per problem.
 */
export const verifyDocumentBody = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    const { collection } = getCollection(req.scope, req.params.collection)
    const { base_version: baseVersion, ...document } = (req.body ??
      {}) as Record<string, unknown>

    if (
      req.params.id &&
      baseVersion !== undefined &&
      baseVersion !== null &&
      !Number.isInteger(baseVersion)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "base_version: Expected a whole number or null"
      )
    }

    const errors = findDocumentErrors(
      getRegistry(req.scope),
      collection,
      req.params.id ? document : req.body,
      { beforeFill: true, partial: Boolean(req.params.id) }
    )

    if (errors.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        formatDocumentErrors(errors)
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}
