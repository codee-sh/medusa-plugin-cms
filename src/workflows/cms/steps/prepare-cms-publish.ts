import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { prepareDocumentWrite } from "../../../lib/document/prepare-document-write"
import { splitDocumentAreas } from "../../../lib/document/split-document-areas"
import type { DocumentWrite } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { CmsDocument } from "./list-cms-documents"
import type { CmsVersionRecord } from "./list-cms-versions"

export type PrepareCmsPublishInput = {
  /** The collection's slug. */
  collection: string
  /** The document as stored, with its areas as `get-cms-document` reads them. */
  stored: CmsDocument
  /** Its latest version, with its snapshot, if it has one. */
  latest?: CmsVersionRecord
}

/**
 * Decides the calls that publish a document, through `prepareDocumentWrite`: an update of its row with
 * the latest version's fields, its status set to `published` and `published_at` to now, and its areas
 * written as the snapshot holds them, so a block added in a draft is created and one removed is
 * deleted. The editor stored on the row is kept.
 *
 * A document without versions publishes its row as it is. The time and the ids of new rows are taken
 * here, so a retry of the workflow writes the same ones.
 *
 * @throws `NOT_ALLOWED` for a published document whose latest version is published too: there is
 * nothing new to publish.
 */
export const prepareCmsPublishStep = createStep(
  "prepare-cms-publish",
  async (input: PrepareCmsPublishInput, { container }) => {
    const { collection } = getCollection(container, input.collection)

    if (
      input.stored.status === "published" &&
      input.latest?.status !== "draft"
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Document "${input.stored.id}" is already published`
      )
    }

    const { values, areas } = splitDocumentAreas(
      collection,
      input.latest?.snapshot ?? {}
    )

    return new StepResponse<DocumentWrite>(
      prepareDocumentWrite(
        getRegistry(container),
        collection,
        input.stored.id,
        input.stored,
        {
          values: { ...values, status: "published", published_at: new Date() },
          areas,
        }
      )
    )
  }
)
