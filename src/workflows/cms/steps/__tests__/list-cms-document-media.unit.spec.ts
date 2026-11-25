import { Modules } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { MediaRead } from "../../../../lib/document/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type ListCmsDocumentMediaInput,
  listCmsDocumentMediaStep,
} from "../list-cms-document-media"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Runs the step on the recipe collection, over a File Module stub that knows every key.
 *
 * @param documents - The documents whose media are read.
 * @returns The step's output and the stub's `retrieveFile`.
 */
const runStep = async (documents: ListCmsDocumentMediaInput["documents"]) => {
  const retrieveFile = jest.fn(async (id: string) => ({
    id,
    url: `http://localhost/static/${id}`,
  }))
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => buildTestConfig() },
    [Modules.FILE]: { retrieveFile },
  }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = listCmsDocumentMediaStep as unknown as (
    input: ListCmsDocumentMediaInput,
    context: { container: typeof container }
  ) => Promise<{ output: MediaRead }>

  const { output } = await invoke(
    { collection: "recipe", documents },
    { container }
  )

  return { output, retrieveFile }
}

describe("listCmsDocumentMediaStep", () => {
  it("reads the records of the documents' and their blocks' media fields", async () => {
    const { output, retrieveFile } = await runStep([
      {
        cover: "cover.jpg",
        gallery: ["a.png", "cover.jpg"],
        sections: [{ block_type: "callout", image: "callout.jpg" }],
      },
    ])

    expect(retrieveFile.mock.calls.map(([id]) => id)).toEqual([
      "cover.jpg",
      "a.png",
      "callout.jpg",
    ])
    expect(output.records.id.map(({ id }) => id)).toEqual([
      "cover.jpg",
      "a.png",
      "callout.jpg",
    ])
    expect(output.records.url).toEqual([])
    expect(output.placement.mediaFields.map(({ name }) => name)).toEqual([
      "cover",
      "gallery",
    ])
  })

  it("reads the record of a media field in a block inside a step's tips", async () => {
    const { output } = await runStep([
      {
        sections: [
          {
            block_type: "step",
            tips: [
              {
                block_type: "step",
                tips: [{ block_type: "callout", image: "deep.jpg" }],
              },
            ],
          },
        ],
      },
    ])

    expect(output.records.id.map(({ id }) => id)).toEqual(["deep.jpg"])
  })

  it("makes no call for documents without media values", async () => {
    const { output, retrieveFile } = await runStep([
      { title: "Soup", cover: null, sections: [] },
    ])

    expect(retrieveFile).not.toHaveBeenCalled()
    expect(output.records).toEqual({ id: [], url: [] })
  })
})
