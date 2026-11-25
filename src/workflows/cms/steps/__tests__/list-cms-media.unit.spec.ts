import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config } from "../../../../lib/config/types"
import { FileMediaProvider } from "../../../../lib/media-provider/file-media-provider"
import type {
  CmsMediaList,
  CmsMediaListQuery,
} from "../../../../lib/media-provider/types"
import { CMS_MODULE } from "../../../../modules/cms"
import { listCmsMediaStep } from "../list-cms-media"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/** A provider over the File Module that can be searched, answering one record for any query. */
class SearchableProvider extends FileMediaProvider {
  static identifier = "searchable"

  /**
   * Answers one record whose name is the search text.
   *
   * @param query - The search.
   * @returns One record and its count.
   */
  async list(query: CmsMediaListQuery): Promise<CmsMediaList> {
    return {
      media: [
        { id: "a.png", url: "http://localhost/a.png", filename: query.q },
      ],
      count: 1,
    }
  }
}

/**
 * Runs the step with a container holding the CMS module. The registry is built once per process, so
 * a config other than the test config needs the step loaded afresh.
 *
 * @param query - The search.
 * @param config - The config the CMS module holds; the test config when left out.
 * @returns What the step resolves to.
 */
const runStep = (query: CmsMediaListQuery, config?: Config) => {
  let step = listCmsMediaStep

  if (config) {
    jest.isolateModules(() => {
      step = require("../list-cms-media").listCmsMediaStep
    })
  }

  const container = {
    resolve: (name: string) => {
      if (name === CMS_MODULE) {
        return { getConfig: () => config ?? buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  }
  const invoke = step as unknown as (
    input: CmsMediaListQuery,
    context: { container: typeof container }
  ) => Promise<{ output: CmsMediaList }>

  return invoke(query, { container })
}

describe("listCmsMediaStep", () => {
  it("answers the provider's page of records", async () => {
    const config = buildTestConfig()
    config.media = { provider: { resolve: SearchableProvider } }

    const { output } = await runStep(
      { q: "soup", limit: 20, offset: 0 },
      config
    )

    expect(output).toEqual({
      media: [{ id: "a.png", url: "http://localhost/a.png", filename: "soup" }],
      count: 1,
    })
  })

  it("refuses a search when the provider has no list", async () => {
    await expect(runStep({ limit: 20, offset: 0 })).rejects.toMatchObject({
      type: "not_allowed",
      message: "The file media provider cannot be searched",
    })
  })
})
