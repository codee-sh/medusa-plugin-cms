import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createCmsDocumentWorkflow } from "../../../../../../workflows/cms/workflows/create-cms-document"
import { listCmsDocumentsWorkflow } from "../../../../../../workflows/cms/workflows/list-cms-documents"
import type { AdminGetCmsDocumentsParamsType } from "./validators"

/**
 * Lists one page of a collection's documents, without their areas, the documents of the given ids
 * alone when the query names some, and those whose fields hold the values its `filters` give.
 *
 * @param req - The request, with the collection in its params and the validated query.
 * @param res - The response.
 * @throws `INVALID_DATA` for an `order` outside the model's scalar columns, as a 400.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<unknown, AdminGetCmsDocumentsParamsType>,
  res: MedusaResponse
) => {
  const { id, filters, q, status, order, limit, offset } = req.validatedQuery
  const { result } = await listCmsDocumentsWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      q,
      status,
      order,
      limit,
      offset,
      ...((id || filters) && { filters: { ...filters, ...(id && { id }) } }),
    },
  })

  res.json({ ...result, limit, offset })
}

/**
 * Creates a draft document of the collection from the columns in the body, as its first version.
 *
 * @param req - The request, with the collection in its params and the document's columns as its body.
 * @param res - The response.
 * @throws `INVALID_DATA` for a body that does not fit the collection, as a 400, and `DUPLICATE_ERROR`
 * for a unique value another document holds, as a 422.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<Record<string, unknown>>,
  res: MedusaResponse
) => {
  const { result } = await createCmsDocumentWorkflow(req.scope).run({
    input: {
      collection: req.params.collection,
      actor_id: req.auth_context.actor_id,
      document: req.body,
    },
  })

  res.json(result)
}
