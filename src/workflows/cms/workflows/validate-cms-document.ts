import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { listCmsTakenValuesStep } from "../steps/list-cms-taken-values"
import { prepareCmsDocumentInputStep } from "../steps/prepare-cms-document-input"
import { listCmsDocumentMediaStep } from "../steps/list-cms-document-media"
import { listCmsRelatedDocumentsStep } from "../steps/list-cms-related-documents"
import { validateCmsDocumentStep } from "../steps/validate-cms-document"

export type ValidateCmsDocumentWorkflowInput = {
  /** The collection's slug. */
  collection: string
  /** The admin user who edits the document. */
  actor_id: string
  /** The document's columns, as the editor has them so far. */
  document: Record<string, unknown>
  /** The document being edited, whose own unique values are not taken. */
  id?: string
}

/**
 * Checks a document as a save would, without writing it, and returns every problem, so the Admin can
 * show the server's rules - the fields' `serverValidation` schemas among them - while the editor types.
 *
 * Step order:
 *   1. listCmsTakenValuesStep - reads the unique values live documents already hold
 *   2. prepareCmsDocumentInputStep - fills empty slugs, as a save would
 *   3. listCmsDocumentMediaStep - reads the media records the submitted values name
 *   4. listCmsRelatedDocumentsStep - reads the live documents the submitted relationships name
 *   5. validateCmsDocumentStep - lists the problems of the shape, the media values without a record, the
 *      relationships naming no live document and the taken values
 *
 * It runs no write step, so it has nothing to compensate.
 */
export const validateCmsDocumentWorkflow = createWorkflow(
  "validate-cms-document",
  (input: ValidateCmsDocumentWorkflowInput) => {
    const taken = listCmsTakenValuesStep({
      collection: input.collection,
      document: input.document,
      id: input.id,
    })
    const prepared = prepareCmsDocumentInputStep({
      collection: input.collection,
      actor_id: input.actor_id,
      document: input.document,
      taken,
    })
    const media = listCmsDocumentMediaStep({
      collection: input.collection,
      documents: transform({ prepared }, ({ prepared }) => [
        { ...prepared.values, ...prepared.areas },
      ]),
    })
    const related = listCmsRelatedDocumentsStep({
      collection: input.collection,
      document: prepared.values,
    })
    const result = validateCmsDocumentStep({
      collection: input.collection,
      document: prepared.values,
      areas: prepared.areas,
      taken,
      report: true,
      media,
      related,
    })
    const errors = transform({ result }, ({ result }) => result.errors)

    return new WorkflowResponse(errors)
  }
)
