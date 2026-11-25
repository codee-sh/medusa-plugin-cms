import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config } from "../../../../lib/config/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CmsVersionSnapshot,
  type PrepareCmsVersionSnapshotInput,
  prepareCmsVersionSnapshotStep,
} from "../prepare-cms-version-snapshot"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (_nameOrConfig: unknown, invoke: unknown) => invoke,
  }
})

/**
 * Builds a rich text document of one paragraph, as a callout's body holds it.
 *
 * @param text - The paragraph's text.
 * @returns The document.
 */
const buildRichText = (text: string) => ({
  root: {
    type: "root",
    children: [{ type: "paragraph", children: [{ type: "text", text }] }],
  },
})

const HOT = buildRichText("Hot")

/**
 * Runs the step on the recipe collection.
 *
 * @param input - The step's input, past the collection.
 * @param config - The CMS config; the step is loaded on its own when one is given, because the
 * registry is built once per module load.
 * @returns The step's output and the logger it warned through.
 */
const runStep = async (
  input: Omit<PrepareCmsVersionSnapshotInput, "collection">,
  config?: Config
) => {
  const logger = { warn: jest.fn() }
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => config ?? buildTestConfig() }
      }
      if (registrationName === ContainerRegistrationKeys.LOGGER) {
        return logger
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  let step = prepareCmsVersionSnapshotStep

  if (config) {
    jest.isolateModules(() => {
      step =
        require("../prepare-cms-version-snapshot").prepareCmsVersionSnapshotStep
    })
  }

  const invoke = step as unknown as (
    stepInput: PrepareCmsVersionSnapshotInput,
    context: { container: typeof container }
  ) => Promise<{ output: CmsVersionSnapshot }>

  const { output } = await invoke(
    { collection: "recipe", ...input },
    { container }
  )

  return { ...output, logger }
}

describe("prepareCmsVersionSnapshotStep", () => {
  it("keeps the editable fields only, a date as JSON stores it", async () => {
    const { snapshot } = await runStep({
      document: {
        id: "trec_1",
        status: "published",
        created_at: new Date(),
        title: "Soup",
        extra: { hidden: true },
        cooked_at: new Date("2026-11-09T10:00:00.000Z"),
      },
    })

    expect(snapshot).toEqual({
      title: "Soup",
      cooked_at: "2026-11-09T10:00:00.000Z",
    })
  })

  it("names the fields that differ from the previous version, a date read back equal", async () => {
    const { changed_fields } = await runStep({
      document: {
        title: "Bean stew",
        notes: "Simmer",
        cooked_at: new Date("2026-11-09T10:00:00.000Z"),
      },
      previous: {
        title: "Soup",
        notes: "Simmer",
        cooked_at: "2026-11-09T10:00:00.000Z",
        servings: 4,
      },
    })

    expect(changed_fields).toEqual(["title", "servings"])
  })

  it("counts nothing as changed without a previous version", async () => {
    const { changed_fields } = await runStep({ document: { title: "Soup" } })

    expect(changed_fields).toEqual([])
  })

  it("logs the keys a restored snapshot loses to the current config", async () => {
    const { snapshot, logger } = await runStep({
      document: { title: "Soup", subtitle: "Old" },
      restored: true,
    })

    expect(snapshot).toEqual({ title: "Soup" })
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("left out subtitle")
    )
  })

  describe("areas", () => {
    const stored = {
      title: "Soup",
      sections: [
        {
          id: "tstep_1",
          block_type: "step",
          heading: "Chop",
          rank: 0,
          area_id: "tsec_1",
          created_at: new Date(),
        },
        {
          id: "tcall_1",
          block_type: "callout",
          body: JSON.stringify(HOT),
          rank: 1,
          area_id: "tsec_1",
          allowed: false,
        },
      ],
    }

    it("keeps each block as a body holds it, without its rank, area and timestamps", async () => {
      const { snapshot } = await runStep({ document: stored })

      expect(snapshot.sections).toEqual([
        { id: "tstep_1", block_type: "step", heading: "Chop" },
        { id: "tcall_1", block_type: "callout", body: HOT },
      ])
    })

    it("keeps a block a draft added without an id", async () => {
      const { snapshot } = await runStep({
        document: { sections: [{ block_type: "step", heading: "Serve" }] },
      })

      expect(snapshot.sections).toEqual([
        { block_type: "step", heading: "Serve" },
      ])
    })

    it("counts an area as changed when its blocks differ, and not when they match", async () => {
      const changed = await runStep({
        document: {
          title: "Soup",
          sections: [
            { id: "tcall_1", block_type: "callout", body: HOT },
            { id: "tstep_1", block_type: "step", heading: "Chop" },
          ],
        },
        previous: stored,
      })
      const unchanged = await runStep({
        document: {
          title: "Soup",
          sections: [
            { id: "tstep_1", block_type: "step", heading: "Chop" },
            { id: "tcall_1", block_type: "callout", body: HOT },
          ],
        },
        previous: stored,
      })

      expect(changed.changed_fields).toEqual(["sections"])
      expect(unchanged.changed_fields).toEqual([])
    })

    it("leaves out of a restored snapshot a block whose type its area no longer allows, logged once", async () => {
      const { snapshot, logger } = await runStep({
        document: {
          title: "Soup",
          sections: [
            { id: "tvid_1", block_type: "video", url: "x" },
            { id: "tstep_1", block_type: "step", heading: "Chop" },
            { id: "tvid_2", block_type: "video", url: "y" },
          ],
        },
        restored: true,
      })

      expect(snapshot.sections).toEqual([
        { id: "tstep_1", block_type: "step", heading: "Chop" },
      ])
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("sections.0 (video), sections.2 (video)")
      )
    })

    it("keeps a step's tips as a body holds them, and counts the area when a tip changes", async () => {
      const step = (text: string) => ({
        id: "tstep_1",
        block_type: "step",
        heading: "Chop",
        rank: 0,
        area_id: "tsec_1",
        tips: [
          { id: "ttip_1", block_type: "tip", text, rank: 0, area_id: "tsec_2" },
        ],
      })

      const { snapshot, changed_fields } = await runStep({
        document: { title: "Soup", sections: [step("Blunt")] },
        previous: { title: "Soup", sections: [step("Sharp")] },
      })

      expect(snapshot.sections).toEqual([
        {
          id: "tstep_1",
          block_type: "step",
          heading: "Chop",
          tips: [{ id: "ttip_1", block_type: "tip", text: "Blunt" }],
        },
      ])
      expect(changed_fields).toEqual(["sections"])
    })

    it("leaves out of a restored snapshot a block its area no longer allows, at its path", async () => {
      const { snapshot, logger } = await runStep({
        document: {
          sections: [
            {
              id: "tstep_1",
              block_type: "step",
              tips: [
                { id: "tcall_1", block_type: "callout", body: HOT },
                { id: "ttip_1", block_type: "tip", text: "Sharp" },
              ],
            },
          ],
        },
        restored: true,
      })

      expect(snapshot.sections).toEqual([
        {
          id: "tstep_1",
          block_type: "step",
          tips: [{ id: "ttip_1", block_type: "tip", text: "Sharp" }],
        },
      ])
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("sections.0.tips.0 (callout)")
      )
    })
  })
})

describe("prepareCmsVersionSnapshotStep, on rich text", () => {
  const config = buildTestConfig()
  config.collections[0].fields!.cover = { type: "richtext", label: "Body" }
  config.blocks!.find(({ slug }) => slug === "callout")!.fields!.body = {
    type: "richtext",
    label: "Body",
  }
  const document = {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Hot" }] },
      ],
    },
  }
  const empty = {
    root: { type: "root", children: [{ type: "paragraph", children: [] }] },
  }

  it("stores a rich text as its document, a row's JSON parsed and an empty one as null", async () => {
    const { snapshot } = await runStep(
      {
        document: {
          title: "Soup",
          cover: JSON.stringify(document),
          sections: [{ id: "tcall_1", block_type: "callout", body: empty }],
        },
      },
      config
    )

    expect(snapshot).toEqual({
      title: "Soup",
      cover: document,
      sections: [{ id: "tcall_1", block_type: "callout", body: null }],
    })
  })

  it("counts no change when a body sends the document a stored row holds as JSON", async () => {
    const { changed_fields } = await runStep(
      {
        document: {
          title: "Soup",
          cover: document,
          sections: [{ id: "tcall_1", block_type: "callout", body: document }],
        },
        previous: {
          title: "Soup",
          cover: JSON.stringify(document),
          sections: [
            {
              id: "tcall_1",
              block_type: "callout",
              body: JSON.stringify(document),
            },
          ],
        },
      },
      config
    )

    expect(changed_fields).toEqual([])
  })

  it("counts an empty document as no change from null, and a new text as one", async () => {
    const { changed_fields } = await runStep(
      {
        document: { title: "Soup", cover: empty },
        previous: { title: "Soup", cover: null },
      },
      config
    )
    const changed = await runStep(
      {
        document: { title: "Soup", cover: document },
        previous: { title: "Soup", cover: null },
      },
      config
    )

    expect(changed_fields).toEqual([])
    expect(changed.changed_fields).toEqual(["cover"])
  })
})

describe("prepareCmsVersionSnapshotStep, on the order of keys", () => {
  it("counts no change when a previous snapshot holds a document's keys in another order, as jsonb gives them", async () => {
    const document = {
      root: {
        type: "root",
        children: [
          { type: "paragraph", children: [{ type: "text", text: "a" }] },
        ],
      },
    }
    const reordered = {
      root: {
        children: [
          { children: [{ text: "a", type: "text" }], type: "paragraph" },
        ],
        type: "root",
      },
    }

    const { changed_fields } = await runStep({
      document: {
        title: "Soup",
        summary: document,
        sections: [{ id: "tcall_1", block_type: "callout", body: document }],
      },
      previous: {
        title: "Soup",
        summary: reordered,
        sections: [{ id: "tcall_1", block_type: "callout", body: reordered }],
      },
    })

    expect(changed_fields).toEqual([])
  })
})
