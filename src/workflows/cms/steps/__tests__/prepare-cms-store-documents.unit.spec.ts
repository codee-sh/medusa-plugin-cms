import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { buildReadPlacement } from "../../../../lib/document/build-read-placement"
import type { MediaRead } from "../../../../lib/document/types"
import { prepareRegistry } from "../../../../lib/registry/prepare-registry"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsStoreDocument,
  type PrepareCmsStoreDocumentsInput,
  prepareCmsStoreDocumentsStep,
} from "../prepare-cms-store-documents"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

const registry = prepareRegistry(buildTestConfig())

const media: MediaRead = {
  placement: buildReadPlacement(registry, registry.collections.recipe),
  records: { id: [], url: [] },
}

/**
 * Runs the step.
 *
 * @param documents - The documents read.
 * @param logger - The logger.
 * @param input - The rest of the step's input: the route, and the fields.
 * @returns The step's output.
 */
const runStep = async (
  documents: Record<string, unknown>[],
  logger = { warn: jest.fn() },
  input: Pick<PrepareCmsStoreDocumentsInput, "route" | "fields"> = {
    route: "list",
  }
): Promise<CmsStoreDocument[]> => {
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => buildTestConfig() },
    [ContainerRegistrationKeys.LOGGER]: logger,
  }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName in dependencies) {
        return dependencies[registrationName]
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  const invoke = prepareCmsStoreDocumentsStep as unknown as (
    stepInput: PrepareCmsStoreDocumentsInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsStoreDocument[] }>

  return (
    await invoke(
      { collection: "recipe", documents, media, ...input },
      { container }
    )
  ).output
}

describe("prepareCmsStoreDocumentsStep", () => {
  it("answers each document with the list's defaults when no fields are given, in order", async () => {
    const documents = await runStep([
      { id: "trec_1", status: "published", title: "Soup", notes: "Hot" },
      { id: "trec_2", status: "published", title: "Stew", notes: "Slow" },
    ])

    expect(documents).toEqual([
      { id: "trec_1", title: "Soup" },
      { id: "trec_2", title: "Stew" },
    ])
  })

  it("answers only the fields given", async () => {
    const documents = await runStep(
      [{ id: "trec_1", title: "Soup", slug: "soup" }],
      undefined,
      { route: "retrieve", fields: ["slug"] }
    )

    expect(documents).toEqual([{ id: "trec_1", slug: "soup" }])
  })

  it("logs once per document the blocks it left out, naming them", async () => {
    const logger = { warn: jest.fn() }

    await runStep(
      [
        {
          id: "trec_1",
          sections: [
            { id: "tstep_1", block_type: "step", allowed: false },
            { id: "tcall_1", block_type: "callout", allowed: false },
          ],
        },
        { id: "trec_2", sections: [{ id: "tstep_2", block_type: "step" }] },
      ],
      logger
    )

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"trec_1" of "recipe"')
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("tstep_1, tcall_1")
    )
  })
})
