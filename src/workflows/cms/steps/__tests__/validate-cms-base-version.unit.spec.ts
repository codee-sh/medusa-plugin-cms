import type { CmsVersionRecord } from "../list-cms-versions"
import {
  type ValidateCmsBaseVersionInput,
  validateCmsBaseVersionStep,
} from "../validate-cms-base-version"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

const invoke = validateCmsBaseVersionStep as unknown as (
  stepInput: ValidateCmsBaseVersionInput
) => Promise<unknown>

const LATEST = {
  id: "cmsver_3",
  version: 3,
  created_by: "user_2",
} as CmsVersionRecord

describe("validateCmsBaseVersionStep", () => {
  it("passes an edit of the latest version, and of a document without versions", async () => {
    await expect(
      invoke({ latest: LATEST, base_version: 3 })
    ).resolves.toBeDefined()
    await expect(
      invoke({ latest: undefined, base_version: null })
    ).resolves.toBeDefined()
  })

  it("refuses an edit of an older version, naming the newer one and its author", async () => {
    await expect(
      invoke({ latest: LATEST, base_version: 2 })
    ).rejects.toMatchObject({
      type: "not_allowed",
      message:
        "Version 3 was saved by user_2 after the one you edited. Reload to see it.",
    })
  })

  it("refuses an edit without a base where the document has versions", async () => {
    await expect(
      invoke({ latest: LATEST, base_version: undefined })
    ).rejects.toMatchObject({ type: "not_allowed" })
  })
})
