import { z } from "@medusajs/framework/zod"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { Config } from "../../../../lib/config/types"
import { buildReadPlacement } from "../../../../lib/document/build-read-placement"
import { prepareRegistry } from "../../../../lib/registry/prepare-registry"
import { CMS_MODULE } from "../../../../modules/cms"
import type { CmsTakenValues } from "../list-cms-taken-values"
import {
  type ValidateCmsDocumentInput,
  validateCmsDocumentStep,
} from "../validate-cms-document"

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

/**
 * Runs the step on the recipe collection.
 *
 * @param document - The values to check.
 * @param taken - The unique values live recipes hold.
 * @param config - The CMS config; the step is loaded on its own when one is given, because the
 * registry is built once per module load.
 * @param report - Whether the step returns the problems instead of throwing.
 * @param stored - The stored document, for an edit.
 * @param mode - The schema's mode, when the caller sets it.
 * @param areas - The areas the body holds.
 * @param collection - The collection's slug; the recipes by default.
 * @returns What the step resolves to.
 */
const runStep = async (
  document: Record<string, unknown>,
  taken: CmsTakenValues = {},
  config?: Config,
  report?: boolean,
  stored?: Record<string, unknown>,
  mode?: "shape" | "publish",
  areas?: ValidateCmsDocumentInput["areas"],
  collection = "recipe"
) => {
  const container = {
    resolve: jest.fn((registrationName: string) => {
      if (registrationName === CMS_MODULE) {
        return { getConfig: () => config ?? buildTestConfig() }
      }
      throw new Error(`Unexpected dependency: ${registrationName}`)
    }),
  }
  let step = validateCmsDocumentStep

  if (config) {
    jest.isolateModules(() => {
      step = require("../validate-cms-document").validateCmsDocumentStep
    })
  }

  const invoke = step as unknown as (
    stepInput: ValidateCmsDocumentInput,
    context: { container: typeof container }
  ) => Promise<{ output: { errors: unknown[] } }>

  return invoke(
    { collection, document, taken, report, stored, mode, areas },
    { container }
  )
}

describe("validateCmsDocumentStep", () => {
  it("checks a new document of a collection without drafts as a publish", async () => {
    await expect(
      runStep(
        { name: "Spicy" },
        {},
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "tag"
      )
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: expect.stringContaining("description"),
    })
  })

  it("checks a draft row of a collection without drafts as a publish", async () => {
    await expect(
      runStep(
        { name: "Spicy" },
        {},
        undefined,
        undefined,
        { id: "ttag_1", name: "Spicy", status: "draft" },
        undefined,
        undefined,
        "tag"
      )
    ).rejects.toMatchObject({ type: "invalid_data" })
  })

  it("passes a document that fits and holds no taken value", async () => {
    const { output } = await runStep(
      { title: "Soup", slug: "soup", notes: "Simmer" },
      { slug: ["soup-2"] }
    )

    expect(output).toEqual({ errors: [] })
  })

  it("refuses a value its field's validation schema rejects", async () => {
    await expect(
      runStep({ title: "ab", notes: "Simmer" })
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: "title: Use at least 3 characters",
    })
  })

  it("reports every problem instead of throwing in report mode", async () => {
    const { output } = await runStep(
      { title: "ab", slug: "soup", notes: "Simmer" },
      { slug: ["soup"] },
      undefined,
      true
    )

    expect(output.errors).toEqual([
      { path: "title", message: "Use at least 3 characters" },
      { path: "slug", message: '"soup" is used by another document' },
    ])
  })

  it("refuses the shape with a line per problem", async () => {
    await expect(
      runStep({ notes: "Simmer", servings: "four", status: "published" })
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: expect.stringContaining("status: Unknown field"),
    })
  })

  it("refuses a slug that is not in the slug format", async () => {
    await expect(
      runStep({ notes: "Simmer", slug: "Żurek" })
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: expect.stringContaining("slug:"),
    })
  })

  it("requires a slug that its source could not fill", async () => {
    const config = buildTestConfig()
    config.collections[0].fields!.slug = {
      type: "slug",
      label: "Slug",
      from: "title",
      serverValidation: z.string(),
    }

    await expect(
      runStep({ title: "日本語", notes: "Simmer" }, {}, config)
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: "slug: Required",
    })
  })

  it("refuses a taken unique value as a duplicate", async () => {
    await expect(
      runStep({ slug: "soup", notes: "Simmer" }, { slug: ["soup"] })
    ).rejects.toMatchObject({
      type: "duplicate_error",
      message: 'slug: "soup" is used by another document',
    })
  })

  it("checks an edit over the stored values", async () => {
    const stored = {
      id: "trec_1",
      status: "draft",
      title: "Soup",
      slug: "soup",
      notes: "Simmer",
      extra: "kept",
    }

    await expect(
      runStep({ slug: "soup-pie" }, {}, undefined, false, stored)
    ).resolves.toMatchObject({ output: { errors: [] } })
    await expect(
      runStep({ notes: null }, {}, undefined, false, stored)
    ).rejects.toMatchObject({ message: "notes: Required" })
    await expect(
      runStep({ title: "ab" }, {}, undefined, false, stored)
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: "title: Use at least 3 characters",
    })
  })

  it("checks an edit over a stored rich text as its document, plain text included", async () => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = { type: "richtext", label: "Body" }
    const document = {
      root: {
        type: "root",
        children: [
          { type: "paragraph", children: [{ type: "text", text: "a" }] },
        ],
      },
    }

    for (const cover of [JSON.stringify(document), "Plain\ntext"]) {
      const stored = { id: "trec_1", status: "draft", notes: "Simmer", cover }

      await expect(
        runStep({ title: "Soup" }, {}, config, false, stored)
      ).resolves.toMatchObject({ output: { errors: [] } })
    }
  })

  it("requires the fields a publish needs for a publish", async () => {
    const stored = { id: "trec_1", status: "draft", notes: "Simmer" }

    await expect(
      runStep({}, {}, undefined, false, stored, "publish")
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: "title: Required",
    })
  })

  it("saves a draft without the fields only a publish needs", async () => {
    await expect(
      runStep({ title: null, notes: "Simmer" })
    ).resolves.toMatchObject({ output: { errors: [] } })
  })

  it("refuses an empty field with the message its schema gives", async () => {
    const config = buildTestConfig()
    config.collections[0].fields!.notes = {
      type: "textarea",
      label: "Notes",
      serverValidation: z.string({ error: "Add the notes" }),
    }

    await expect(runStep({ notes: "" }, {}, config)).rejects.toMatchObject({
      type: "invalid_data",
      message: "notes: Add the notes",
    })
  })

  it("requires the fields a publish needs on a save of a published document", async () => {
    const stored = {
      id: "trec_1",
      status: "published",
      title: "Soup",
      notes: "Simmer",
    }

    await expect(
      runStep({ title: null }, {}, undefined, false, stored)
    ).rejects.toMatchObject({ message: "title: Required" })
    await expect(
      runStep({ title: null }, {}, undefined, false, {
        ...stored,
        status: "draft",
      })
    ).resolves.toMatchObject({ output: { errors: [] } })
  })

  describe("areas", () => {
    const stored = {
      id: "trec_1",
      status: "draft",
      notes: "Simmer",
      sections: [
        { id: "tstep_1", block_type: "step", heading: "Chop" },
        { id: "tcall_1", block_type: "callout", body: "Hot" },
      ],
    }

    /**
     * Builds a config whose `sections` area allows steps only, so its callouts are stale.
     *
     * @returns The config.
     */
    const buildConfigWithoutCallouts = (): Config => {
      const config = buildTestConfig()
      config.collections[0].areas!.sections.blocks = ["step"]

      return config
    }

    it("passes the blocks of the types the area allows", async () => {
      await expect(
        runStep({}, {}, undefined, false, stored, undefined, {
          sections: [
            { id: "tstep_1", block_type: "step", heading: "Chop" },
            { block_type: "callout", body: buildRichText("New") },
          ],
        })
      ).resolves.toMatchObject({ output: { errors: [] } })
    })

    it("refuses a block's field of the wrong type at its path", async () => {
      await expect(
        runStep({}, {}, undefined, false, stored, undefined, {
          sections: [{ block_type: "step", heading: 3 }],
        })
      ).rejects.toMatchObject({
        type: "invalid_data",
        message: expect.stringContaining("sections.0.heading:"),
      })
    })

    it("refuses a publish a block's rule refuses, at the block's field", async () => {
      const config = buildTestConfig()
      config.blocks![1].serverPublishValidation = z
        .object({ body: z.string().nullable(), image: z.string().nullable() })
        .refine((callout) => !callout.image || callout.body, {
          path: ["body"],
          message: "Describe the image",
        })
      const areas = {
        sections: [{ block_type: "callout", image: "med_1" }],
      }

      await expect(
        runStep({ title: "Soup" }, {}, config, false, stored, "shape", areas)
      ).resolves.toMatchObject({ output: { errors: [] } })
      await expect(
        runStep({ title: "Soup" }, {}, config, false, stored, "publish", areas)
      ).rejects.toMatchObject({
        type: "invalid_data",
        message: "sections.0.body: Describe the image",
      })
    })

    it("keeps a stored block whose type the area no longer allows", async () => {
      await expect(
        runStep(
          {},
          {},
          buildConfigWithoutCallouts(),
          false,
          stored,
          undefined,
          {
            sections: [{ id: "tcall_1", block_type: "callout" }],
          }
        )
      ).resolves.toMatchObject({ output: { errors: [] } })
    })

    it("refuses a block of a type outside the area whose id is not stored there", async () => {
      await expect(
        runStep(
          {},
          {},
          buildConfigWithoutCallouts(),
          false,
          stored,
          undefined,
          {
            sections: [
              { id: "tstep_1", block_type: "step", heading: "Chop" },
              { id: "tcall_9", block_type: "callout" },
            ],
          }
        )
      ).rejects.toMatchObject({
        type: "invalid_data",
        message: "sections.1: This block type is not allowed here",
      })
    })

    it("refuses a block id the body sends twice, at the repeat", async () => {
      await expect(
        runStep({}, {}, undefined, false, stored, undefined, {
          sections: [
            { id: "tstep_1", block_type: "step", heading: "Chop" },
            { id: "tstep_1", block_type: "step", heading: "Stir" },
          ],
        })
      ).rejects.toMatchObject({
        type: "invalid_data",
        message: "sections.1: This block is sent more than once",
      })
    })

    it("refuses a block sent inside its own area", async () => {
      await expect(
        runStep({}, {}, undefined, false, stored, undefined, {
          sections: [
            {
              id: "tstep_1",
              block_type: "step",
              heading: "Chop",
              tips: [{ id: "tstep_1", block_type: "step", heading: "Chop" }],
            },
          ],
        })
      ).rejects.toMatchObject({
        type: "invalid_data",
        message: "sections.0.tips.0: This block is sent more than once",
      })
    })

    it("passes new blocks, which carry no id", async () => {
      await expect(
        runStep({}, {}, undefined, false, stored, undefined, {
          sections: [
            { block_type: "step", heading: "Chop" },
            { block_type: "step", heading: "Stir" },
          ],
        })
      ).resolves.toMatchObject({ output: { errors: [] } })
    })

    it("reports a repeated block id in report mode", async () => {
      await expect(
        runStep({}, {}, undefined, true, stored, undefined, {
          sections: [
            { id: "tstep_1", block_type: "step", heading: "Chop" },
            { id: "tstep_1", block_type: "step", heading: "Stir" },
          ],
        })
      ).resolves.toMatchObject({
        output: {
          errors: [
            {
              path: "sections.1",
              message: "This block is sent more than once",
            },
          ],
        },
      })
    })

    it("keeps a stale step in a step's tips only where it is stored, in the same step's tips", async () => {
      const config = buildTestConfig()
      config.blocks![0].areas!.tips.blocks = ["tip"]
      const nested = {
        id: "trec_1",
        status: "draft",
        notes: "Simmer",
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            tips: [{ id: "tstep_2", block_type: "step" }],
          },
          { id: "tstep_3", block_type: "step", tips: [] },
        ],
      }
      const keptStep = { id: "tstep_2", block_type: "step" }

      await expect(
        runStep({}, {}, config, false, nested, undefined, {
          sections: [
            { id: "tstep_1", block_type: "step", tips: [keptStep] },
            { id: "tstep_3", block_type: "step", tips: [] },
          ],
        })
      ).resolves.toMatchObject({ output: { errors: [] } })
      await expect(
        runStep({}, {}, config, false, nested, undefined, {
          sections: [
            { id: "tstep_1", block_type: "step", tips: [] },
            { id: "tstep_3", block_type: "step", tips: [keptStep] },
          ],
        })
      ).rejects.toMatchObject({
        message: "sections.1.tips.0: This block type is not allowed here",
      })
    })

    it("refuses an unknown block type sent as an id and a type", async () => {
      await expect(
        runStep({}, {}, undefined, false, stored, undefined, {
          sections: [{ id: "tstep_1", block_type: "video" }],
        })
      ).rejects.toMatchObject({
        message: "sections.0: This block type is not allowed here",
      })
    })

    it("checks the areas a document holds itself, as a publish of a snapshot sends them", async () => {
      await expect(
        runStep(
          { sections: [{ id: "tcall_9", block_type: "callout" }] },
          {},
          buildConfigWithoutCallouts(),
          false,
          stored,
          "shape"
        )
      ).rejects.toMatchObject({
        message: "sections.0: This block type is not allowed here",
      })
    })
  })
})

describe("validateCmsDocumentStep, on media", () => {
  /**
   * Runs the step on the recipe collection with the media records a read found.
   *
   * @param input - The values, the areas and what else the step takes.
   * @returns What the step resolves to.
   */
  const runMediaStep = (
    input: Pick<ValidateCmsDocumentInput, "document" | "areas" | "report">
  ) => {
    const registry = prepareRegistry(buildTestConfig())
    const container = {
      resolve: jest.fn((registrationName: string) => {
        if (registrationName === CMS_MODULE) {
          return { getConfig: () => buildTestConfig() }
        }
        throw new Error(`Unexpected dependency: ${registrationName}`)
      }),
    }
    const invoke = validateCmsDocumentStep as unknown as (
      stepInput: ValidateCmsDocumentInput,
      context: { container: typeof container }
    ) => Promise<{ output: { errors: unknown[] } }>

    return invoke(
      {
        collection: "recipe",
        taken: {},
        ...input,
        media: {
          placement: buildReadPlacement(registry, registry.collections.recipe),
          records: {
            id: [{ id: "cover.jpg", url: "http://localhost/static/cover.jpg" }],
            url: [],
          },
        },
      },
      { container }
    )
  }

  it("passes a media value the provider found", async () => {
    await expect(
      runMediaStep({ document: { notes: "Simmer", cover: "cover.jpg" } })
    ).resolves.toMatchObject({ output: { errors: [] } })
  })

  it("refuses a media value the provider did not find, at its path", async () => {
    await expect(
      runMediaStep({
        document: { notes: "Simmer", cover: "lost.jpg" },
        areas: { sections: [{ block_type: "callout", image: "gone.jpg" }] },
      })
    ).rejects.toMatchObject({
      type: "invalid_data",
      message:
        'cover: The file "lost.jpg" was not found\nsections.0.image: The file "gone.jpg" was not found',
    })
  })

  it("reports a media value the provider did not find in report mode", async () => {
    const { output } = await runMediaStep({
      document: { notes: "Simmer", gallery: ["cover.jpg", "lost.png"] },
      report: true,
    })

    expect(output.errors).toEqual([
      { path: "gallery", message: 'The file "lost.png" was not found' },
    ])
  })
})

describe("validateCmsDocumentStep, on relationships", () => {
  /**
   * Runs the step on the settings with the live documents a read found.
   *
   * @param input - The values, what the read found, and whether to report.
   * @returns What the step resolves to.
   */
  const runRelationStep = (
    input: Pick<ValidateCmsDocumentInput, "document" | "related" | "report">
  ) => {
    const container = {
      resolve: jest.fn((registrationName: string) => {
        if (registrationName === CMS_MODULE) {
          return { getConfig: () => buildTestConfig() }
        }
        throw new Error(`Unexpected dependency: ${registrationName}`)
      }),
    }
    const invoke = validateCmsDocumentStep as unknown as (
      stepInput: ValidateCmsDocumentInput,
      context: { container: typeof container }
    ) => Promise<{ output: { errors: unknown[] } }>

    return invoke(
      { collection: "settings", taken: {}, ...input },
      { container }
    )
  }

  it("passes a relationship naming a live document", async () => {
    await expect(
      runRelationStep({
        document: { featured_recipe_id: "trec_1" },
        related: { featured_recipe_id: ["trec_1"] },
      })
    ).resolves.toMatchObject({ output: { errors: [] } })
  })

  it("refuses a relationship naming no live document, at its path", async () => {
    await expect(
      runRelationStep({
        document: { featured_recipe_id: "trec_gone" },
        related: { featured_recipe_id: [] },
      })
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: 'featured_recipe_id: The document "trec_gone" was not found',
    })
  })

  it("reports a relationship naming no live document in report mode", async () => {
    const { output } = await runRelationStep({
      document: { featured_recipe_id: "trec_gone" },
      related: { featured_recipe_id: [] },
      report: true,
    })

    expect(output.errors).toEqual([
      {
        path: "featured_recipe_id",
        message: 'The document "trec_gone" was not found',
      },
    ])
  })
})
