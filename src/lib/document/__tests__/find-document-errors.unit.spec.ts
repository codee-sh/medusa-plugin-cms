import { z } from "@medusajs/framework/zod"
import { buildTestConfig } from "../../__tests__/fixtures"
import type { Config } from "../../config/types"
import { prepareRegistry } from "../../registry/prepare-registry"
import { findDocumentErrors } from "../find-document-errors"
import type { DocumentSchemaOptions } from "../types"

/** A callout's body: a rich text document of one paragraph. */
const STIR = {
  root: {
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", text: "Stir" }] },
    ],
  },
}

/** A callout's rule: an image needs a body that describes it. */
const describedImage = z
  .object({ body: z.unknown(), image: z.string().nullable() })
  .superRefine((callout, ctx) => {
    if (callout.image && !callout.body) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "Describe the image",
      })
    }
  })

/**
 * Finds the errors of a recipe under a config.
 *
 * @param config - The CMS config, its rules set by the test.
 * @param document - The submitted values, with the areas the body holds.
 * @param options - The check's mode, `partial` and `beforeFill`.
 * @returns The errors.
 */
const errorsOf = (
  config: Config,
  document: Record<string, unknown>,
  options: Partial<Omit<DocumentSchemaOptions, "schemas" | "blockSchemas">> = {}
) => {
  const registry = prepareRegistry(config)

  return findDocumentErrors(
    registry,
    registry.collections.recipe,
    document,
    options
  )
}

/**
 * Builds the test config with the callout's rule as the rule of every save or of a publish.
 *
 * @param key - The block config's key the rule sits under.
 * @returns The config.
 */
const configWithCalloutRule = (
  key: "serverValidation" | "serverPublishValidation"
): Config => {
  const config = buildTestConfig()
  config.blocks![1][key] = describedImage

  return config
}

describe("findDocumentErrors, on the rules of a model", () => {
  it("refuses a block a rule over two of its fields refuses, at the field under the block", () => {
    expect(
      errorsOf(configWithCalloutRule("serverValidation"), {
        notes: "Simmer",
        sections: [
          { block_type: "callout", body: STIR, image: "med_1" },
          { block_type: "callout", image: "med_2" },
        ],
      })
    ).toEqual([{ path: "sections.1.body", message: "Describe the image" }])
  })

  it("runs a publish rule at a publish only", () => {
    const config = configWithCalloutRule("serverPublishValidation")
    const document = {
      title: "Soup",
      notes: "Simmer",
      sections: [{ block_type: "callout", image: "med_1" }],
    }

    expect(errorsOf(config, document)).toEqual([])
    expect(errorsOf(config, document, { mode: "publish" })).toEqual([
      { path: "sections.0.body", message: "Describe the image" },
    ])
  })

  it("leaves a rule out while one of its model's fields fails its own check", () => {
    const config = buildTestConfig()
    config.collections[0].serverValidation = z
      .looseObject({})
      .refine(() => false, { path: ["notes"], message: "Never passes" })

    expect(errorsOf(config, { title: "ab", notes: "Simmer" })).toEqual([
      { path: "title", message: "Use at least 3 characters" },
    ])
  })

  it("runs a document's rule beside a block's error", () => {
    const config = configWithCalloutRule("serverValidation")
    config.collections[0].serverValidation = z
      .looseObject({})
      .refine(() => false, { path: ["notes"], message: "Never passes" })

    expect(
      errorsOf(config, {
        notes: "Simmer",
        sections: [{ block_type: "callout", body: 1 }],
      }).map(({ path }) => path)
    ).toEqual(["sections.0.body", "notes"])
  })

  it("puts an issue at no field on the document and on the block", () => {
    const config = buildTestConfig()
    const failing = z.looseObject({}).refine(() => false, "Not this way")
    config.collections[0].serverValidation = failing
    config.blocks![1].serverValidation = failing

    expect(
      errorsOf(config, {
        notes: "Simmer",
        sections: [{ block_type: "callout", body: STIR }],
      })
    ).toEqual([
      { path: "sections.0", message: "Not this way" },
      { path: "", message: "Not this way" },
    ])
  })

  it("leaves every rule out before the server fills the values, and a partial body's document rule", () => {
    const config = configWithCalloutRule("serverValidation")
    config.collections[0].serverValidation = z
      .looseObject({})
      .refine(() => false, { path: ["notes"], message: "Never passes" })
    const document = {
      notes: "Simmer",
      sections: [{ block_type: "callout", image: "med_1" }],
    }

    expect(errorsOf(config, document, { beforeFill: true })).toEqual([])
    expect(errorsOf(config, document, { partial: true })).toEqual([
      { path: "sections.0.body", message: "Describe the image" },
    ])
  })

  it("hands a rule every field, an empty value as null and a date as its ISO text", () => {
    const config = buildTestConfig()
    config.collections[0].serverValidation = z.object({
      title: z.null(),
      labels: z.null(),
      servings: z.null(),
      cooked_at: z.string().startsWith("2026"),
    })

    expect(
      errorsOf(config, {
        title: "",
        labels: [],
        notes: "Simmer",
        cooked_at: new Date("2026-11-16T10:00:00.000Z"),
      })
    ).toEqual([])
  })
})
