import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { formatStaleVersionMessage } from "../../../lib/document/stale-version"
import type { CmsVersionRecord } from "./list-cms-versions"

export type ValidateCmsBaseVersionInput = {
  /** The document's latest version, or none for a document saved before versions. */
  latest: CmsVersionRecord | undefined
  /** The number of the version the editor's form shows; `null` for a document without versions. */
  base_version: number | null | undefined
}

/**
 * Refuses a save or a publish made from a version that is no longer the latest, so an editor never
 * writes over a colleague's newer work without seeing it.
 *
 * A document without versions takes a `null` base. `NOT_ALLOWED` is used rather than `CONFLICT`,
 * whose message Medusa's error handler replaces.
 *
 * @throws `NOT_ALLOWED` naming the newer version and who saved it.
 */
export const validateCmsBaseVersionStep = createStep(
  "validate-cms-base-version",
  async (input: ValidateCmsBaseVersionInput) => {
    const latestNumber = input.latest?.version ?? null

    if ((input.base_version ?? null) !== latestNumber) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        formatStaleVersionMessage(latestNumber, input.latest?.created_by)
      )
    }

    return new StepResponse<void>(undefined)
  }
)
