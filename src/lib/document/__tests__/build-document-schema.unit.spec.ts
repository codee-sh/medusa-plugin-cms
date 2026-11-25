import { z } from "zod"
import { buildDocumentSchema } from "../build-document-schema"
import { CONTROL_CHARACTERS_MESSAGE } from "../../../shared/sanitize/build-text-schema"
import { BoldFeature } from "../../../shared/rich-text/features/bold-feature"
import { LinkFeature } from "../../../shared/rich-text/features/link-feature"
import { prepareRegistry } from "../../registry/prepare-registry"
import { buildDocumentErrors } from "../build-document-errors"
import { buildTestConfig } from "../../__tests__/fixtures"
import type { Config } from "../../config/types"
import type { FieldSchemas } from "../../field/types"
import type {
  DocumentSchemaMode,
  DocumentSchemaOptions,
  DocumentError,
} from "../types"

/** A callout's body: a rich text document of one paragraph. */
const HOT = {
  root: {
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", text: "Hot" }] },
    ],
  },
}

// The schema reads a collection's fields only.
const { fields } = prepareRegistry(buildTestConfig()).collections.recipe
const recipe = { fields }

/**
 * Validates a document of the test recipe collection.
 *
 * @param document - The submitted document.
 * @param mode - The schema's mode, `shape` by default.
 * @returns The errors, empty when the document is valid.
 */
const errorsOf = (
  document: unknown,
  mode: DocumentSchemaMode = "shape"
): DocumentError[] => {
  const result = buildDocumentSchema(z, recipe, { mode }).safeParse(document)

  return result.success ? [] : buildDocumentErrors(result.error.issues)
}

/**
 * Validates a document of the test recipe collection with schemas, as the server does.
 *
 * @param document - The submitted document.
 * @param fieldSchemas - Per field, its schemas.
 * @param mode - The schema's mode, `shape` by default.
 * @returns The errors, empty when the document is valid.
 */
const schemaErrorsOf = (
  document: unknown,
  fieldSchemas: Record<string, FieldSchemas>,
  mode: DocumentSchemaMode = "shape"
): DocumentError[] => {
  const result = buildDocumentSchema(z, recipe, {
    mode,
    schemas: { fields: fieldSchemas, model: {} },
  }).safeParse(document)

  return result.success ? [] : buildDocumentErrors(result.error.issues)
}

/**
 * Lists the paths of the errors.
 *
 * @param errors - The errors.
 * @returns Their paths.
 */
const pathsOf = (errors: DocumentError[]) => errors.map(({ path }) => path)

describe("buildDocumentSchema", () => {
  it("takes a relationship's id or null, never an empty id", () => {
    const schema = buildDocumentSchema(
      z,
      {
        fields: [
          {
            name: "target_id",
            kind: "relationship",
            label: "Target",
            searchable: false,
            relationTo: "recipe",
          },
        ],
      },
      { mode: "shape" }
    )

    expect(schema.safeParse({ target_id: "trec_1" }).success).toBe(true)
    expect(schema.safeParse({ target_id: null }).success).toBe(true)
    expect(schema.safeParse({ target_id: "" }).success).toBe(false)
  })

  it("accepts a document with every field kind of the collection", () => {
    expect(
      errorsOf({
        title: "Soup",
        slug: "tomato-soup",
        servings: 4,
        vegan: true,
        cooked_at: "2026-11-08T10:00:00.000Z",
        difficulty: "hard",
        labels: ["red", "warm"],
        cover: "asset_1",
        notes: "Simmer",
      })
    ).toEqual([])
  })

  it.each([
    ["title", 1],
    ["slug", "Tomato Soup"],
    ["servings", "four"],
    ["vegan", "yes"],
    ["cooked_at", "yesterday"],
    ["difficulty", "medium"],
    ["labels", "red"],
    ["cover", 7],
    ["cover", ["a.jpg"]],
    ["gallery", "a.png"],
  ])("refuses a wrong value of %s", (name, value) => {
    expect(pathsOf(errorsOf({ notes: "Simmer", [name]: value }))).toEqual([
      name,
    ])
  })

  it("refuses a file of a media list that is not a text, at its place", () => {
    expect(pathsOf(errorsOf({ notes: "Simmer", gallery: [7] }))).toEqual([
      "gallery.0",
    ])
  })

  it("accepts one file as a text and several as a list of texts", () => {
    expect(
      errorsOf({ notes: "Simmer", cover: "a.jpg", gallery: ["b.png", "c.pdf"] })
    ).toEqual([])
  })

  it("refuses more files than a media field's max", () => {
    expect(
      errorsOf({
        notes: "Simmer",
        gallery: ["a.png", "b.png", "c.png", "d.png"],
      })
    ).toEqual([{ path: "gallery", message: "Keep at most 3 files" }])
  })

  it("accepts null for an optional field", () => {
    expect(errorsOf({ notes: "Simmer", servings: null })).toEqual([])
  })

  describe("with comboboxes", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "combobox",
      label: "Cover",
      options: { hook: "covers" },
    }
    config.collections[0].fields!.difficulty = {
      type: "combobox",
      label: "Difficulty",
      options: [
        { value: "easy", label: "Easy" },
        { value: "hard", label: "Hard" },
      ],
    }
    const comboboxRecipe = {
      fields: prepareRegistry(config).collections.recipe.fields,
    }

    /**
     * Validates a document of the recipe collection whose cover takes its options from a hook and whose
     * difficulty lists them.
     *
     * @param document - The submitted document.
     * @returns The errors, empty when the document is valid.
     */
    const comboboxErrorsOf = (document: unknown): DocumentError[] => {
      const result = buildDocumentSchema(z, comboboxRecipe, {
        mode: "shape",
      }).safeParse(document)

      return result.success ? [] : buildDocumentErrors(result.error.issues)
    }

    it("accepts any text from a hook, as no list is known on the server", () => {
      expect(comboboxErrorsOf({ notes: "Simmer", cover: "prod_01" })).toEqual(
        []
      )
    })

    it("refuses a value from a hook with a control character", () => {
      expect(
        comboboxErrorsOf({ notes: "Simmer", cover: "prod_01\u0000" })
      ).toEqual([{ path: "cover", message: CONTROL_CHARACTERS_MESSAGE }])
    })

    it("refuses a value from a hook that is not a text", () => {
      expect(pathsOf(comboboxErrorsOf({ notes: "Simmer", cover: 7 }))).toEqual([
        "cover",
      ])
    })

    it("refuses a value the listed options do not hold", () => {
      expect(
        pathsOf(comboboxErrorsOf({ notes: "Simmer", difficulty: "medium" }))
      ).toEqual(["difficulty"])
    })
  })

  describe("with comboboxes of several values", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.labels = {
      type: "combobox",
      label: "Labels",
      multiple: true,
      max: 2,
      options: { hook: "labels" },
    }
    config.collections[0].fields!.gallery = {
      type: "combobox",
      label: "Gallery",
      multiple: true,
      options: [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ],
    }
    const multipleRecipe = {
      fields: prepareRegistry(config).collections.recipe.fields,
    }

    /**
     * Validates a document of the recipe collection whose labels come from a hook, at most two, and
     * whose gallery lists its options.
     *
     * @param document - The submitted document.
     * @returns The errors, empty when the document is valid.
     */
    const multipleErrorsOf = (document: unknown): DocumentError[] => {
      const result = buildDocumentSchema(z, multipleRecipe, {
        mode: "shape",
      }).safeParse(document)

      return result.success ? [] : buildDocumentErrors(result.error.issues)
    }

    it("accepts texts from a hook up to max, and listed values", () => {
      expect(
        multipleErrorsOf({
          notes: "Simmer",
          labels: ["prod_1", "prod_2"],
          gallery: ["a", "b"],
        })
      ).toEqual([])
    })

    it("refuses more values than max with one message", () => {
      expect(
        multipleErrorsOf({ notes: "Simmer", labels: ["1", "2", "3"] })
      ).toEqual([{ path: "labels", message: "Choose at most 2 options" }])
    })

    it("refuses a text in place of a list once, as a wrong type", () => {
      expect(
        pathsOf(multipleErrorsOf({ notes: "Simmer", labels: "prod_1" }))
      ).toEqual(["labels"])
    })

    it("refuses a listed value the options do not hold, at its place", () => {
      expect(
        pathsOf(multipleErrorsOf({ notes: "Simmer", gallery: ["a", "c"] }))
      ).toEqual(["gallery.1"])
    })
  })

  it("refuses unknown keys, system and CMS columns among them", () => {
    expect(
      errorsOf({ notes: "Simmer", id: "trec_1", status: "published" })
    ).toEqual([
      { path: "id", message: "Unknown field" },
      { path: "status", message: "Unknown field" },
    ])
  })

  it("refuses a column the config lists as no field as unknown", () => {
    const withoutServings: typeof recipe = {
      ...recipe,
      fields: recipe.fields.filter(({ name }) => name !== "servings"),
    }
    const result = buildDocumentSchema(z, withoutServings, {
      mode: "shape",
    }).safeParse({ notes: "Simmer", servings: 2 })

    expect(result.success).toBe(false)
  })

  it("requires a field that is always required in every mode", () => {
    expect(errorsOf({ title: "Soup" })).toEqual([
      { path: "notes", message: "Required" },
    ])
  })

  it("requires the publish fields only at publish, an empty text included", () => {
    expect(errorsOf({ notes: "Simmer" })).toEqual([])
    expect(errorsOf({ notes: "Simmer", title: "" }, "publish")).toEqual([
      { path: "title", message: "Required" },
    ])
  })

  it("requires a field filled from its source only once it is filled", () => {
    const withSlug: typeof recipe = {
      ...recipe,
      fields: recipe.fields.map((field) =>
        field.name === "slug" ? { ...field, required: "always" } : field
      ),
    }
    const pathsWith = (beforeFill: boolean) =>
      pathsOf(
        buildDocumentErrors(
          buildDocumentSchema(z, withSlug, {
            mode: "shape",
            beforeFill,
          }).safeParse({ notes: "Simmer" }).error?.issues ?? []
        )
      )

    expect(pathsWith(true)).toEqual([])
    expect(pathsWith(false)).toEqual(["slug"])
  })

  it("requires in a partial body only the fields whose keys it holds", () => {
    const partialErrorsOf = (document: Record<string, unknown>) =>
      buildDocumentErrors(
        buildDocumentSchema(z, recipe, {
          mode: "shape",
          partial: true,
        }).safeParse(document).error?.issues ?? []
      )

    expect(partialErrorsOf({ title: "Soup" })).toEqual([])
    expect(partialErrorsOf({ notes: null })).toEqual([
      { path: "notes", message: "Required" },
    ])
    expect(partialErrorsOf({ notes: "" })).toEqual([
      { path: "notes", message: "Required" },
    ])
  })

  it("applies a field's schema to a filled value with its own message", () => {
    const schemas = {
      title: { save: z.string().min(3, "Use at least 3 characters") },
    }

    expect(schemaErrorsOf({ notes: "Simmer", title: "ab" }, schemas)).toEqual([
      { path: "title", message: "Use at least 3 characters" },
    ])
    expect(schemaErrorsOf({ notes: "Simmer", title: "Soup" }, schemas)).toEqual(
      []
    )
  })

  it("keeps a filled value's message of the schema when the schema gives none", () => {
    const [error] = schemaErrorsOf(
      { notes: "Simmer", title: "ab" },
      { title: { save: z.string().min(3) } }
    )

    expect(error.path).toBe("title")
    expect(error.message).not.toBe("Required")
  })

  it("refuses an empty value its schema needs with Required, an empty text and null alike", () => {
    const schemas = { notes: { save: z.string().min(3, "Too short") } }

    expect(schemaErrorsOf({ notes: "" }, schemas)).toEqual([
      { path: "notes", message: "Required" },
    ])
    expect(schemaErrorsOf({ notes: null }, schemas)).toEqual([
      { path: "notes", message: "Required" },
    ])
  })

  it("gives the schema's own message for an empty value when it has one", () => {
    expect(
      schemaErrorsOf(
        { notes: "" },
        { notes: { save: z.string({ error: "Add the notes" }) } }
      )
    ).toEqual([{ path: "notes", message: "Add the notes" }])
  })

  it("lets an empty value through a schema that allows one, and a field with no schema", () => {
    expect(
      schemaErrorsOf(
        { notes: null },
        { notes: { save: z.string().max(70).nullish() } }
      )
    ).toEqual([])
    expect(schemaErrorsOf({ notes: "Simmer", servings: null }, {})).toEqual([])
  })

  it("runs the schema of a publish at a publish only", () => {
    const schemas = { notes: { publish: z.string() } }

    expect(schemaErrorsOf({ notes: "" }, schemas)).toEqual([])
    expect(schemaErrorsOf({ notes: "" }, schemas, "publish")).toEqual([
      { path: "notes", message: "Required" },
    ])
  })

  it("refuses an empty list its schema needs", () => {
    expect(
      schemaErrorsOf(
        { notes: "Simmer", labels: [] },
        { labels: { save: z.array(z.string()) } }
      )
    ).toEqual([{ path: "labels", message: "Required" }])
  })

  it("hands a date to its schema as its ISO text", () => {
    const schemas = { cooked_at: { save: z.string().startsWith("2026") } }

    expect(
      schemaErrorsOf(
        { notes: "Simmer", cooked_at: new Date("2026-11-08T10:00:00.000Z") },
        schemas
      )
    ).toEqual([])
  })

  it("leaves a wrong type to its own error, apart from the schema", () => {
    expect(
      pathsOf(
        schemaErrorsOf(
          { notes: "Simmer", title: 1 },
          { title: { save: z.string().min(3) } }
        )
      )
    ).toEqual(["title"])
  })

  it("checks a field's word in place of the schemas the Admin does not have", () => {
    expect(errorsOf({ title: "Soup", notes: "" })).toEqual([
      { path: "notes", message: "Required" },
    ])
    expect(errorsOf({ notes: "Simmer" }, "publish")).toEqual([
      { path: "title", message: "Required" },
    ])
  })

  it("reports a missing value next to the type errors", () => {
    expect(pathsOf(errorsOf({ servings: "four" }))).toEqual([
      "servings",
      "notes",
    ])
  })

  it("refuses a body that is not an object", () => {
    expect(pathsOf(errorsOf("soup"))).toEqual([""])
  })
})

/**
 * Validates a recipe with its areas, as the server will check it.
 *
 * @param document - The submitted document.
 * @param options - The schema's options; `shape` when no mode is given.
 * @param configure - Changes the test config before the registry is built.
 * @returns The errors, empty when the document is valid.
 */
const areaErrorsOf = (
  document: unknown,
  options: Partial<DocumentSchemaOptions> = {},
  configure: (config: Config) => void = () => {}
): DocumentError[] => {
  const config = buildTestConfig()
  configure(config)
  const registry = prepareRegistry(config)
  const result = buildDocumentSchema(
    z,
    {
      ...registry.collections.recipe,
      blocks: Object.values(registry.blocks),
      maxDepth: registry.maxDepth,
    },
    { mode: "shape", ...options }
  ).safeParse(document)

  return result.success ? [] : buildDocumentErrors(result.error.issues)
}

describe("buildDocumentSchema, on control characters", () => {
  it("refuses one in a text, a list's item and a media value, at each path", () => {
    expect(
      errorsOf({
        notes: "Simmer",
        title: "Soup\u0000",
        labels: ["hot", "spicy\u001b"],
        cover: "file_01\u0000",
        gallery: ["file_02", "file_03\u007f"],
      })
    ).toEqual([
      { path: "title", message: CONTROL_CHARACTERS_MESSAGE },
      { path: "labels.1", message: CONTROL_CHARACTERS_MESSAGE },
      { path: "cover", message: CONTROL_CHARACTERS_MESSAGE },
      { path: "gallery.1", message: CONTROL_CHARACTERS_MESSAGE },
    ])
  })

  it("keeps a textarea's line breaks and tabs, and refuses them in a one-line text", () => {
    expect(errorsOf({ notes: "Chop\r\n\tthen simmer" })).toEqual([])
    expect(
      pathsOf(errorsOf({ notes: "Simmer", title: "Soup\nof the day" }))
    ).toEqual(["title"])
  })

  it("takes a text with markup and symbols as it is", () => {
    expect(
      errorsOf({ notes: "a < b & <b>c</b>", title: "Zupa – gorąca ✓" })
    ).toEqual([])
  })
})

describe("buildDocumentSchema, on links", () => {
  const REFUSED =
    "Use a link starting with http://, https://, mailto:, tel: or /"

  /**
   * Validates a recipe whose cover, a text column, is a `url` field.
   *
   * @param document - The submitted document.
   * @param linkPolicy - The field's own links.
   * @returns The errors, empty when the document is valid.
   */
  const linkErrorsOf = (
    document: Record<string, unknown>,
    linkPolicy?: { protocols?: string[]; relative?: boolean }
  ): DocumentError[] => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "url",
      label: "Link",
      ...(linkPolicy && { linkPolicy }),
    }
    const result = buildDocumentSchema(
      z,
      { fields: prepareRegistry(config).collections.recipe.fields },
      { mode: "shape" }
    ).safeParse({ notes: "Simmer", ...document })

    return result.success ? [] : buildDocumentErrors(result.error.issues)
  }

  it.each(["/about", "#faq", "https://example.com", "mailto:hi@example.com"])(
    "takes %s as it is",
    (cover) => {
      expect(linkErrorsOf({ cover })).toEqual([])
    }
  )

  it.each(["javascript:alert(1)", "//evil.example", "example.com"])(
    "refuses %s at the field, naming the allowed forms",
    (cover) => {
      expect(linkErrorsOf({ cover })).toEqual([
        { path: "cover", message: REFUSED },
      ])
    }
  )

  it("follows the field's own links", () => {
    expect(
      linkErrorsOf(
        { cover: "/about" },
        { protocols: ["https"], relative: false }
      )
    ).toEqual([{ path: "cover", message: "Use a link starting with https://" }])
  })

  it("reports a control character once, without the link's message", () => {
    expect(linkErrorsOf({ cover: "/about\u0000" })).toEqual([
      { path: "cover", message: CONTROL_CHARACTERS_MESSAGE },
    ])
  })
})

describe("buildDocumentSchema, on rich text", () => {
  /**
   * Builds a document of one paragraph.
   *
   * @param children - The paragraph's nodes.
   * @returns The document.
   */
  const buildRichText = (...children: Record<string, unknown>[]) => ({
    root: {
      type: "root",
      children: [{ type: "paragraph", children }],
    },
  })

  const EMPTY = buildRichText()

  /**
   * Validates a recipe whose cover, a text column, is a `richtext` field, with its schemas, as the
   * server does.
   *
   * @param document - The submitted document.
   * @param field - The field's own keys.
   * @returns The errors, empty when the document is valid.
   */
  const richTextErrorsOf = (
    document: Record<string, unknown>,
    field: Record<string, unknown> = {}
  ): DocumentError[] => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "richtext",
      label: "Body",
      ...field,
    }
    const { fields, schemas } = prepareRegistry(config).collections.recipe
    const result = buildDocumentSchema(
      z,
      { fields },
      { mode: "shape", schemas }
    ).safeParse({ notes: "Simmer", ...document })

    return result.success ? [] : buildDocumentErrors(result.error.issues)
  }

  it("takes a document its features allow, and nothing", () => {
    expect(
      richTextErrorsOf({
        cover: buildRichText({ type: "text", text: "Hot", format: 1 }),
      })
    ).toEqual([])
    expect(richTextErrorsOf({ cover: null })).toEqual([])
  })

  it.each([
    ["a text", "Hot", "This value is not a rich text document"],
    [
      "an unknown node",
      buildRichText({ type: "image", src: "/a.png" }),
      'Remove the "image" element: this field does not allow it',
    ],
    [
      "a javascript link",
      buildRichText({
        type: "link",
        url: "javascript:alert(1)",
        children: [{ type: "text", text: "a" }],
      }),
      "Use a link starting with http://, https://, mailto:, tel: or /",
    ],
  ])("refuses %s at the field", (_name, cover, message) => {
    expect(richTextErrorsOf({ cover })).toEqual([{ path: "cover", message }])
  })

  it("refuses a heading the field does not allow", () => {
    expect(
      richTextErrorsOf(
        {
          cover: {
            root: {
              type: "root",
              children: [{ type: "heading", tag: "h2", children: [] }],
            },
          },
        },
        { features: [BoldFeature()] }
      )
    ).toEqual([
      {
        path: "cover",
        message: "Remove the headings: this field does not allow them",
      },
    ])
  })

  it("refuses a link its link feature's policy refuses, though the config's allows it", () => {
    expect(
      richTextErrorsOf(
        {
          cover: buildRichText({
            type: "link",
            url: "/about",
            children: [{ type: "text", text: "a" }],
          }),
        },
        { features: [LinkFeature({ linkPolicy: { relative: false } })] }
      )
    ).toEqual([
      {
        path: "cover",
        message: "Use a link starting with http://, https://, mailto: or tel:",
      },
    ])
  })

  it("counts a document without text as empty: required by a schema refusing null, null to an optional one", () => {
    expect(
      richTextErrorsOf(
        { cover: EMPTY },
        { serverValidation: z.looseObject({}) }
      )
    ).toEqual([{ path: "cover", message: "Required" }])
    expect(
      richTextErrorsOf(
        { cover: EMPTY },
        { serverValidation: z.looseObject({}).nullish() }
      )
    ).toEqual([])
  })

  it("hands a filled document to the field's schema", () => {
    const serverValidation = z.looseObject({
      root: z.looseObject({ children: z.array(z.unknown()).max(1) }),
    })
    const cover = {
      root: {
        type: "root",
        children: [
          { type: "paragraph", children: [{ type: "text", text: "a" }] },
          { type: "paragraph", children: [{ type: "text", text: "b" }] },
        ],
      },
    }

    expect(richTextErrorsOf({ cover }, { serverValidation })).toHaveLength(1)
  })

  it("marks an empty document of a required field in the Admin, without schemas", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "richtext",
      label: "Body",
      serverValidation: z.looseObject({}),
    }
    const { fields } = prepareRegistry(config).collections.recipe
    const result = buildDocumentSchema(
      z,
      { fields },
      { mode: "shape" }
    ).safeParse({ notes: "Simmer", cover: EMPTY })

    expect(
      result.success ? [] : buildDocumentErrors(result.error.issues)
    ).toEqual([{ path: "cover", message: "Required" }])
  })

  it("refuses a block's document at its path", () => {
    expect(
      areaErrorsOf(
        {
          notes: "Simmer",
          sections: [
            {
              block_type: "callout",
              body: buildRichText({
                type: "text",
                text: "a",
                style: "color: red",
              }),
            },
          ],
        },
        {},
        (config) => {
          config.blocks!.find(({ slug }) => slug === "callout")!.fields!.body =
            { type: "richtext", label: "Body" }
        }
      )
    ).toEqual([
      {
        path: "sections.0.body",
        message: "Remove the inline styles from the text",
      },
    ])
  })
})

describe("buildDocumentSchema, on areas", () => {
  it("accepts blocks of the area's types, in any order, with or without an id", () => {
    expect(
      areaErrorsOf({
        notes: "Simmer",
        sections: [
          { block_type: "step", heading: "Chop" },
          { id: "tcall_1", block_type: "callout", body: HOT },
          { block_type: "step", heading: null },
        ],
      })
    ).toEqual([])
  })

  it("accepts a type the area does not allow only as its id and type", () => {
    const onlySteps = (config: Config) => {
      config.collections[0].areas!.sections.blocks = ["step"]
    }

    expect(
      areaErrorsOf(
        {
          notes: "Simmer",
          sections: [{ id: "tcall_1", block_type: "callout" }],
        },
        {},
        onlySteps
      )
    ).toEqual([])
    expect(
      areaErrorsOf(
        {
          notes: "Simmer",
          sections: [
            { id: "tcall_1", block_type: "callout", body: HOT },
            { block_type: "banner" },
          ],
        },
        {},
        onlySteps
      )
    ).toEqual([
      { path: "sections.0.body", message: "Unknown field" },
      { path: "sections.1.id", message: expect.any(String) },
    ])
  })

  it("refuses a block without a type and an unknown key on a block", () => {
    expect(
      pathsOf(
        areaErrorsOf({
          notes: "Simmer",
          sections: [{ heading: "Chop" }, { block_type: "step", nope: 1 }],
        })
      )
    ).toEqual(["sections.0.block_type", "sections.1.nope"])
  })

  it("requires a block's publish fields at their path only at publish", () => {
    const document = {
      title: "Soup",
      notes: "Simmer",
      sections: [{ block_type: "step" }],
    }

    expect(areaErrorsOf(document)).toEqual([])
    expect(areaErrorsOf(document, { mode: "publish" })).toEqual([
      { path: "sections.0.heading", message: "Required" },
    ])
  })

  it("checks an area's minRows and maxRows only at publish", () => {
    const bounded = (config: Config) => {
      config.collections[0].areas!.sections.minRows = 1
      config.collections[0].areas!.sections.maxRows = 2
    }
    const callout = { block_type: "callout", body: HOT }

    expect(
      areaErrorsOf({ notes: "Simmer", sections: [] }, {}, bounded)
    ).toEqual([])
    expect(
      areaErrorsOf(
        { title: "Soup", notes: "Simmer", sections: [] },
        { mode: "publish" },
        bounded
      )
    ).toEqual([{ path: "sections", message: "Add at least 1 block" }])
    expect(
      areaErrorsOf(
        {
          title: "Soup",
          notes: "Simmer",
          sections: [callout, callout, callout],
        },
        { mode: "publish" },
        bounded
      )
    ).toEqual([{ path: "sections", message: "Keep at most 2 blocks" }])
  })

  it("applies a block field's validation with its own message", () => {
    expect(
      areaErrorsOf(
        { notes: "Simmer", sections: [{ block_type: "step", heading: "Go" }] },
        {
          blockSchemas: {
            step: {
              fields: {
                heading: {
                  save: z.string().min(3, "Use at least 3 characters"),
                },
              },
              model: {},
            },
          },
        }
      )
    ).toEqual([
      { path: "sections.0.heading", message: "Use at least 3 characters" },
    ])
  })

  it("leaves an area key absent from a partial body unchecked, and checks a present one whole", () => {
    expect(
      areaErrorsOf({ title: "Soup" }, { mode: "publish", partial: true })
    ).toEqual([])
    expect(
      areaErrorsOf(
        { sections: [{ block_type: "step" }] },
        { mode: "publish", partial: true }
      )
    ).toEqual([{ path: "sections.0.heading", message: "Required" }])
  })
})

describe("buildDocumentSchema, on areas", () => {
  it("refuses a block's link at any depth, at its path", () => {
    expect(
      areaErrorsOf(
        {
          notes: "Simmer",
          sections: [
            {
              block_type: "step",
              heading: "Chop",
              tips: [{ block_type: "tip", text: "javascript:alert(1)" }],
            },
          ],
        },
        {},
        (config) => {
          config.blocks!.find(({ slug }) => slug === "tip")!.fields!.text = {
            type: "url",
            label: "Link",
          }
        }
      )
    ).toEqual([
      {
        path: "sections.0.tips.0.text",
        message:
          "Use a link starting with http://, https://, mailto:, tel: or /",
      },
    ])
  })

  it("refuses a control character in a block's field at any depth, at its path", () => {
    expect(
      areaErrorsOf({
        notes: "Simmer",
        sections: [
          {
            block_type: "step",
            heading: "Chop",
            tips: [{ block_type: "tip", text: "Sharp\u0000" }],
          },
        ],
      })
    ).toEqual([
      { path: "sections.0.tips.0.text", message: CONTROL_CHARACTERS_MESSAGE },
    ])
  })

  it("accepts a tip and a step in a step's tips, in any order, an area left out included", () => {
    expect(
      areaErrorsOf({
        notes: "Simmer",
        sections: [
          {
            block_type: "step",
            heading: "Chop",
            tips: [
              { block_type: "step", heading: "Halve" },
              { id: "ttip_1", block_type: "tip", text: "Sharp knife" },
            ],
          },
          { block_type: "step", heading: "Cook" },
        ],
      })
    ).toEqual([])
  })

  it("refuses a type the area does not list with values, and accepts it as its id and type", () => {
    const withCallout = (callout: Record<string, unknown>) =>
      areaErrorsOf({
        notes: "Simmer",
        sections: [{ block_type: "step", tips: [callout] }],
      })

    expect(pathsOf(withCallout({ block_type: "callout", body: HOT }))).toEqual([
      "sections.0.tips.0.id",
      "sections.0.tips.0.body",
    ])
    expect(withCallout({ id: "tcall_1", block_type: "callout" })).toEqual([])
  })

  it("requires a tip's text to publish, at its path", () => {
    const errors = areaErrorsOf(
      {
        title: "Soup",
        notes: "Simmer",
        sections: [
          {
            block_type: "step",
            heading: "Chop",
            tips: [{ block_type: "tip", text: "Sharp" }, { block_type: "tip" }],
          },
        ],
      },
      { mode: "publish" }
    )

    expect(pathsOf(errors)).toEqual(["sections.0.tips.1.text"])
  })

  it("checks a block area's minRows and maxRows at a publish only", () => {
    const bounded = (config: Config) => {
      config.blocks![0].areas!.tips.minRows = 1
      config.blocks![0].areas!.tips.maxRows = 1
    }
    const document = (tips: unknown[]) => ({
      title: "Soup",
      notes: "Simmer",
      sections: [{ block_type: "step", heading: "Chop", tips }],
    })
    const twoTips = [
      { block_type: "tip", text: "Sharp" },
      { block_type: "tip", text: "Hot" },
    ]

    expect(areaErrorsOf(document([]), {}, bounded)).toEqual([])
    expect(areaErrorsOf(document([]), { mode: "publish" }, bounded)).toEqual([
      { path: "sections.0.tips", message: "Add at least 1 block" },
    ])
    expect(
      areaErrorsOf(document(twoTips), { mode: "publish" }, bounded)
    ).toEqual([{ path: "sections.0.tips", message: "Keep at most 1 block" }])
  })

  it("refuses a block nested past maxDepth, at the area that goes too deep", () => {
    const shallow = (config: Config) => {
      config.maxDepth = 2
    }

    expect(
      areaErrorsOf(
        {
          notes: "Simmer",
          sections: [
            {
              block_type: "step",
              tips: [{ block_type: "step", tips: [] }],
            },
          ],
        },
        {},
        shallow
      )
    ).toEqual([])
    expect(
      areaErrorsOf(
        {
          notes: "Simmer",
          sections: [
            {
              block_type: "step",
              tips: [
                {
                  block_type: "step",
                  tips: [{ block_type: "tip", text: "Too deep" }],
                },
              ],
            },
          ],
        },
        {},
        shallow
      )
    ).toEqual([
      {
        path: "sections.0.tips.0.tips",
        message: "Blocks cannot be nested this deep",
      },
    ])
  })

  it("checks only the document's own areas when maxDepth is left out", () => {
    const config = buildTestConfig()
    const registry = prepareRegistry(config)
    const result = buildDocumentSchema(
      z,
      {
        ...registry.collections.recipe,
        blocks: Object.values(registry.blocks),
      },
      { mode: "shape" }
    ).safeParse({
      notes: "Simmer",
      sections: [{ block_type: "step", tips: [{ block_type: "tip" }] }],
    })

    expect(
      result.success ? [] : pathsOf(buildDocumentErrors(result.error.issues))
    ).toEqual(["sections.0.tips"])
  })
})
