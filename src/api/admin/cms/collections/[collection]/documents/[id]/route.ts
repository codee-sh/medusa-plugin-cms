import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { deleteCmsDocumentWorkflow } from "../../../../../../../workflows/cms/workflows/delete-cms-document"
import { getCmsDocumentWorkflow } from "../../../../../../../workflows/cms/workflows/get-cms-document"
import { updateCmsDocumentWorkflow } from "../../../../../../../workflows/cms/workflows/update-cms-document"

/**
 * Reads one document of the collection: its row, and its latest version apart.
 *
 * @param req - The request, with the collection and the document's id in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await getCmsDocumentWorkflow(req.scope).run({
    input: { collection: req.params.collection, id: req.params.id },
  })

  res.json(result)
}

/**
 * Saves the columns in the body to a document of the collection as its latest version; a column left
 * out stays as it was. A draft's row is written too; a published document's row waits for a publish.
 *
 * @param req - The request, with the collection and the document's id in its params and the changed
 * columns, with `base_version`, as its body.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404; `INVALID_DATA` for a body or a
 * resulting document that does not fit the collection, as a 400; and `DUPLICATE_ERROR` for a unique
 * value another document holds, as a 422; `NOT_ALLOWED` for a `base_version` that is no longer the
 * latest, as a 400.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<Record<string, unknown>>,
  res: MedusaResponse
) => {
  const { base_version, ...document } = req.body
  const { result } = await updateCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      id: req.params.id,
      actor_id: req.auth_context.actor_id,
      document,
      base_version: base_version as number | null | undefined,
    },
  })

  res.json(result)
}

/**
 * Deletes a document of the collection, published or not.
 *
 * @param req - The request, with the collection and the document's id in its params.
 * @param res - The response.
 * @throws `NOT_FOUND` for an unknown or deleted document, as a 404.
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await deleteCmsDocumentWorkflow(req.scope).run({
    input: { collection: req.params.collection, id: req.params.id },
  })

  res.json({ id: result, object: "cms_document", deleted: true })
}
