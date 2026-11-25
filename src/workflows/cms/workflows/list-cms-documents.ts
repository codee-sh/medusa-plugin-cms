import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type ListCmsDocumentsInput,
  listCmsDocumentsStep,
} from "../steps/list-cms-documents"
import { listCmsVersionsStep } from "../steps/list-cms-versions"
import { buildAdminListedDocument } from "../utils/build-admin-document"

/**
 * Lists one page of a collection's documents for the Admin, with the total count, each marked when a
 * draft waits to be published and given the number of its newest published version.
 *
 * Step order:
 *   1. listCmsDocumentsStep - filters by `q` and `status`, orders and pages the documents
 *   2. listCmsVersionsStep - reads the latest version of each document of the page, in one query
 *   3. listCmsVersionsStep - reads the published versions of the same documents, in one query
 *
 * The workflow only reads, so it has nothing to compensate.
 */
export const listCmsDocumentsWorkflow = createWorkflow(
  "list-cms-documents",
  (input: ListCmsDocumentsInput) => {
    const result = listCmsDocumentsStep(input)
    const ids = transform({ result }, ({ result }) =>
      result.documents.map(({ id }) => id)
    )
    const latest = listCmsVersionsStep({
      collection: input.collection,
      document_id: ids,
      latest: true,
    })
    const published = listCmsVersionsStep({
      collection: input.collection,
      document_id: ids,
      status: "published",
    }).config({ name: "list-cms-published-versions" })
    const page = transform(
      { result, latest, published },
      ({ result, latest, published }) => ({
        ...result,
        documents: result.documents.map((document) =>
          buildAdminListedDocument(
            document,
            latest.versions,
            published.versions
          )
        ),
      })
    )

    return new WorkflowResponse(page)
  }
)
