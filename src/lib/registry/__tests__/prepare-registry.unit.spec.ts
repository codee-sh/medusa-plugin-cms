import { model } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { prepareRegistry } from "../prepare-registry"
import { BoldFeature } from "../../../shared/rich-text/features/bold-feature"
import { HeadingFeature } from "../../../shared/rich-text/features/heading-feature"
import { ItalicFeature } from "../../../shared/rich-text/features/italic-feature"
import { LinkFeature } from "../../../shared/rich-text/features/link-feature"
import type {
  ResolvedRichTextFeature,
  RichTextFeature,
} from "../../../shared/rich-text/types"
import { normalizeSlug } from "../../../shared/slug/normalize-slug"
import type {
  CmsText,
  CollectionAction,
  CollectionConfig,
  LayoutBlockSectionConfig,
  Config,
  LayoutItemConfig,
  LayoutSectionConfig,
} from "../../config/types"
import { FileMediaProvider } from "../../media-provider/file-media-provider"
import { buildTestConfig, TestSection } from "../../__tests__/fixtures"

/**
 * Defines a document model holding every column the plugin writes, for configs a test breaks.
 *
 * @param name - The DML name.
 * @param overrides - Columns to replace or add, and the id's prefix.
 * @returns The model.
 */
const defineDocumentModel = (
  name: string,
  {
    prefix = "tdoc",
    columns = {},
  }: { prefix?: string; columns?: Record<string, any> } = {}
) =>
  model.define(name, {
    id: model.id(prefix ? { prefix } : {}).primaryKey(),
    title: model.text().nullable(),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
    ...columns,
  })

/**
 * Builds the test config with the recipe's model replaced, its one field the model's `title`, and
 * without the settings' relationship to the recipe, whose model it no longer is.
 *
 * @param documentModel - The model the recipe collection uses.
 * @returns The config.
 */
const configWithModel = (
  documentModel: ReturnType<typeof defineDocumentModel>
): Config => {
  const config = buildTestConfig()
  config.collections[0] = {
    slug: "recipe",
    model: documentModel,
    labels: { singular: "Recipe", plural: "Recipes" },
    fields: { title: { type: "text", label: "Title" } },
    admin: {
      sections: [{ key: "recipe", label: "Recipe", fields: ["title"] }],
    },
  }
  const settings = config.collections.find(({ slug }) => slug === "settings")!
  delete settings.fields!.featured_recipe_id
  const settingsSection = settings.admin.sections[0] as LayoutSectionConfig
  settingsSection.fields = settingsSection.fields.filter(
    (item) => item !== "featured_recipe_id"
  )

  return config
}

/**
 * Builds a section holding the test recipe's fields other than the given ones, and its area, so a test
 * that lays out a few fields in sections of its own still places every field and area in one.
 *
 * @param config - The test config.
 * @param laidOut - The fields the test's own sections lay out.
 * @returns The section.
 */
const buildRestSection = (
  config: Config,
  laidOut: string[]
): LayoutSectionConfig => ({
  key: "rest",
  label: "Rest",
  fields: Object.keys(config.collections[0].fields!).filter(
    (name) => !laidOut.includes(name)
  ),
  areas: ["sections"],
})

/**
 * Builds the admin of a collection a test adds: one section holding the given fields and areas.
 *
 * @param fields - The section's fields.
 * @param areas - The section's areas.
 * @returns The collection's `admin`.
 */
const buildOneSectionAdmin = (
  fields: string[],
  areas?: string[]
): CollectionConfig["admin"] => ({
  sections: [{ key: "main", label: "Main", fields, ...(areas && { areas }) }],
})

/**
 * Builds the registry and returns its error message.
 *
 * @param config - The config to build.
 * @returns The message, or an empty text when the build passed.
 */
const errorOf = (config: Config): string => {
  try {
    prepareRegistry(config)
    return ""
  } catch (error) {
    return (error as Error).message
  }
}

describe("prepareRegistry", () => {
  it("resolves a valid config into a frozen registry", () => {
    const registry = prepareRegistry(buildTestConfig())

    expect(Object.isFrozen(registry)).toBe(true)
    expect(registry.module).toBe("testContent")
    expect(registry.collections.recipe).toMatchObject({
      key: "TestRecipe",
      store: true,
    })
  })

  it("gives a collection no drafts when its config leaves them out", () => {
    const registry = prepareRegistry(buildTestConfig())

    expect(registry.collections.tag.drafts).toBe(false)
  })

  it("makes a field a publish needs required always in a collection without drafts", () => {
    const { tag, recipe } = prepareRegistry(buildTestConfig()).collections
    const required = (fields: typeof tag.fields, name: string) =>
      fields.find((field) => field.name === name)?.required

    expect(required(tag.fields, "description")).toBe("always")
    expect(required(recipe.fields, "title")).toBe("publish")
  })

  it("turns a collection's drafts on with drafts: true, and off with false", () => {
    const config = buildTestConfig()

    expect(prepareRegistry(config).collections.recipe.drafts).toBe(true)

    config.collections[0].drafts = false

    expect(prepareRegistry(config).collections.recipe.drafts).toBe(false)
  })

  it("keeps a collection a list when its config leaves singleton out", () => {
    const registry = prepareRegistry(buildTestConfig())

    expect(registry.collections.tag.singleton).toBe(false)
  })

  it("prepares a singleton without areas and drafts", () => {
    const registry = prepareRegistry(buildTestConfig())

    expect(registry.collections.settings.singleton).toBe(true)
  })

  it("refuses a singleton with areas", () => {
    const config = buildTestConfig()
    config.collections[0].singleton = true
    config.collections[0].drafts = false

    expect(errorOf(config)).toContain(
      'collection "recipe": a singleton cannot have areas'
    )
  })

  it("refuses a drawer for a collection with drafts", () => {
    const config = buildTestConfig()
    const link = config.collections.find(
      ({ slug }) => slug === "settings_link"
    )!
    link.drafts = true

    expect(errorOf(config)).toContain(
      'collection "settings_link": admin "edit" "drawer" takes no "drafts: true"'
    )
  })

  it("refuses a drawer for a collection with areas", () => {
    const config = buildTestConfig()
    config.collections[0].drafts = false
    config.collections[0].admin = {
      ...config.collections[0].admin,
      edit: "drawer",
    }

    expect(errorOf(config)).toContain(
      'collection "recipe": admin "edit" "drawer" cannot have areas'
    )
  })

  it("refuses an unknown edit mode", () => {
    const config = buildTestConfig()
    config.collections[1].admin = {
      ...config.collections[1].admin,
      edit: "modal" as never,
    }

    expect(errorOf(config)).toContain(
      'collection "tag": admin "edit" needs one of page, drawer'
    )
  })

  it.each([
    ["an edit mode", { edit: "drawer" as const }],
    ["a table", { table: { columns: [{ field: "title" }] } }],
  ])("refuses a singleton with %s", (_name, admin) => {
    const config = buildTestConfig()
    const settings = config.collections.find(({ slug }) => slug === "settings")!
    settings.admin = { ...settings.admin, ...admin }

    expect(errorOf(config)).toContain(
      'collection "settings": a singleton takes no admin "edit" or "table"'
    )
  })

  it("edits a collection's rows on their page and gives it the default table when the config names neither", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      useAsTitle: "title",
      sections: config.collections[0].admin.sections,
    }
    const { recipe, tag, settings } = prepareRegistry(config).collections

    expect(recipe.admin.edit).toBe("page")
    expect(recipe.admin.table).toEqual({
      columns: [
        { field: "title" },
        { system: "status" },
        { system: "updated_at" },
      ],
    })
    expect(tag.admin.table).toEqual({
      columns: [{ field: "name" }, { system: "updated_at" }],
    })
    expect(settings.admin).not.toHaveProperty("table", expect.anything())
    expect(settings.admin.edit).toBeUndefined()
  })

  it("titles the default table's rows by their id without useAsTitle", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      sections: config.collections[0].admin.sections,
    }

    expect(prepareRegistry(config).collections.recipe.admin.table).toEqual({
      columns: [
        { system: "id" },
        { system: "status" },
        { system: "updated_at" },
      ],
    })
  })

  it("keeps the config's table, its labels prepared", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      sections: config.collections[0].admin.sections,
      table: {
        columns: [
          { field: "difficulty", label: ({ t }) => t("recipe.difficulty") },
          { system: "updated_at", label: "Changed" },
        ],
        defaultSort: { column: "updated_at", direction: "desc" },
        pageSize: 50,
      },
    }

    expect(prepareRegistry(config).collections.recipe.admin.table).toEqual({
      columns: [
        {
          field: "difficulty",
          label: {
            type: "translation",
            key: "recipe.difficulty",
            ns: "cms-test",
          },
        },
        { system: "updated_at", label: "Changed" },
      ],
      defaultSort: { column: "updated_at", direction: "desc" },
      pageSize: 50,
    })
  })

  it("refuses a singleton with drafts", () => {
    const config = buildTestConfig()
    config.collections[1].singleton = true
    config.collections[1].drafts = true

    expect(errorOf(config)).toContain(
      'collection "tag": a singleton takes no "drafts: true"'
    )
  })

  it.each([
    ["title", "text"],
    ["servings", "number"],
    ["vegan", "boolean"],
    ["cooked_at", "date"],
    ["difficulty", "select"],
    ["labels", "text_list"],
    ["slug", "slug"],
    ["cover", "media"],
  ])("maps %s to the %s kind", (name, kind) => {
    const { fields } = prepareRegistry(buildTestConfig()).collections.recipe

    expect(fields.find((field) => field.name === name)?.kind).toBe(kind)
  })

  it("works out from the schemas when a field must be filled", () => {
    const { fields } = prepareRegistry(buildTestConfig()).collections.recipe
    const required = (name: string) =>
      fields.find((field) => field.name === name)?.required

    expect(required("notes")).toBe("always")
    expect(required("title")).toBe("publish")
    expect(required("servings")).toBeUndefined()
  })

  it("makes a field required always when its every-save schema refuses an empty value", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.title = {
      type: "text",
      label: "Title",
      serverValidation: z.string(),
      serverPublishValidation: z.string(),
    }

    const { fields } = prepareRegistry(config).collections.recipe

    expect(fields.find(({ name }) => name === "title")?.required).toBe("always")
  })

  it("leaves a field optional when its schema lets an empty value through", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.title = {
      type: "text",
      label: "Title",
      serverValidation: z.string().max(70).nullish(),
    }

    const { fields } = prepareRegistry(config).collections.recipe

    expect(fields.find(({ name }) => name === "title")).not.toHaveProperty(
      "required"
    )
  })

  it("accepts a validation that transforms a value of its field's type", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.notes = {
      type: "textarea",
      label: "Notes",
      serverValidation: z.string().transform((value) => value.trim()),
    }

    expect(() => prepareRegistry(config)).not.toThrow()
  })

  it("makes a nullable column required always when its field's schema says so", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.servings = {
      type: "number",
      label: "Servings",
      serverValidation: z.number(),
    }

    const { fields } = prepareRegistry(config).collections.recipe

    expect(fields.find(({ name }) => name === "servings")?.required).toBe(
      "always"
    )
  })

  it("tells a slug built by normalizeSlug from one built by its own transform", () => {
    const config = buildTestConfig()
    const slug = () =>
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "slug"
      )?.transform

    expect(slug()).toBe("default")

    config.collections[0].fields!.slug = {
      type: "slug",
      label: "Slug",
      from: "title",
      serverTransform: (text) => text,
    }

    expect(slug()).toBe("custom")
  })

  it("builds the fields the config lists, in its order", () => {
    const config = buildTestConfig()
    const { notes, ...rest } = config.collections[0].fields!
    config.collections[0].fields = { notes, ...rest }

    const names = prepareRegistry(config).collections.recipe.fields.map(
      ({ name }) => name
    )

    expect(names).toEqual([
      "notes",
      "title",
      "slug",
      "servings",
      "vegan",
      "cooked_at",
      "difficulty",
      "labels",
      "cover",
      "gallery",
      "summary",
      "related_recipe_id",
    ])
  })

  it("makes no field of a column the config does not list", () => {
    const config = buildTestConfig()
    delete config.collections[0].fields!.servings
    const recipeSection = config.collections[0].admin
      .sections[0] as LayoutSectionConfig
    recipeSection.fields = recipeSection.fields.filter(
      (item) => item !== "servings"
    )

    const names = prepareRegistry(config).collections.recipe.fields.map(
      ({ name }) => name
    )

    expect(names).not.toContain("servings")
    expect(names).not.toContain("extra")
  })

  it("accepts a json metadata column and keeps it out of the fields", () => {
    const { fields } = prepareRegistry(buildTestConfig()).collections.recipe

    expect(fields.map(({ name }) => name)).not.toContain("metadata")
  })

  it("takes each field's type, label and options from its config", () => {
    const { fields } = prepareRegistry(buildTestConfig()).collections.recipe
    const field = (name: string) => fields.find((each) => each.name === name)

    expect(field("cover")).toMatchObject({
      kind: "media",
      label: "Cover",
    })
    expect(field("notes")).toMatchObject({ kind: "text", input: "textarea" })
    expect(field("difficulty")).toMatchObject({
      kind: "select",
      options: [
        { value: "easy", label: "Easy" },
        { value: "hard", label: "Hard" },
      ],
    })
  })

  it("keeps the hook a combobox on a text column takes its options from", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "combobox",
      label: "Cover",
      options: { hook: "covers" },
    }

    expect(
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "cover"
      )
    ).toMatchObject({ kind: "combobox", options: { hook: "covers" } })
  })

  it("keeps a combobox of several values on an array column, with its max", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.labels = {
      type: "combobox",
      label: "Labels",
      multiple: true,
      max: 3,
      options: [
        { value: "red", label: "Red" },
        { value: "warm", label: "Warm" },
      ],
    }

    expect(
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "labels"
      )
    ).toMatchObject({ kind: "combobox", multiple: true, max: 3 })
  })

  it("keeps the options a combobox on an enum column lists", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.difficulty = {
      type: "combobox",
      label: "Difficulty",
      options: [{ value: "easy", label: "Easy" }],
    }

    expect(
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "difficulty"
      )
    ).toMatchObject({
      kind: "combobox",
      options: [{ value: "easy", label: "Easy" }],
    })
  })

  it("takes a field's description from its admin hints", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.servings = {
      type: "number",
      label: "Servings",
      admin: { description: "How many people it feeds" },
    }

    expect(
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "servings"
      )?.description
    ).toBe("How many people it feeds")
  })

  it("keeps a text field's recommended length and placeholder source", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.notes = {
      type: "textarea",
      label: "Notes",
      serverValidation: z.string(),
      admin: { recommendedLength: 160, placeholderFrom: "title" },
    }

    expect(
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "notes"
      )
    ).toMatchObject({ recommendedLength: 160, placeholderFrom: "title" })
  })

  it("records the scalar columns, CMS and system ones included", () => {
    const { columns } = prepareRegistry(buildTestConfig()).collections.recipe

    expect(columns).toEqual(
      expect.arrayContaining(["title", "status", "updated_at"])
    )
    for (const name of ["extra", "metadata", "labels", "areas"]) {
      expect(columns).not.toContain(name)
    }
  })

  it("accepts every system column in the documents table", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      useAsTitle: "title",
      sections: config.collections[0].admin.sections,
      table: {
        columns: [
          { system: "id" },
          { system: "status" },
          { system: "published_version" },
          { system: "created_at" },
          { system: "updated_at" },
        ],
        defaultSort: { column: "created_at", direction: "asc" },
      },
    }

    expect(errorOf(config)).toBe("")
  })

  it("records the form's sections, in the main column unless placed on the side", () => {
    const config = buildTestConfig()
    const rest = buildRestSection(config, ["servings", "cooked_at", "labels"])
    config.collections[0].admin = {
      sections: [
        { key: "cooking", label: "Cooking", fields: ["servings", "cooked_at"] },
        {
          key: "labels",
          label: "Labels",
          fields: ["labels"],
          position: "side",
        },
        rest,
      ],
    }

    expect(prepareRegistry(config).collections.recipe.admin.sections).toEqual([
      {
        key: "cooking",
        label: "Cooking",
        fields: ["servings", "cooked_at"],
        position: "main",
      },
      {
        key: "labels",
        label: "Labels",
        fields: ["labels"],
        position: "side",
      },
      { ...rest, position: "main" },
    ])
  })

  it("records a section's groups and rows as the config writes them", () => {
    const config = buildTestConfig()
    const fields: LayoutItemConfig[] = [
      { type: "row", fields: ["servings", "cooked_at"] },
      {
        type: "group",
        label: "Cover",
        description: "Shown above the recipe",
        fields: ["cover", { type: "row", fields: ["vegan", "labels"] }],
      },
    ]
    config.collections[0].admin = {
      sections: [
        { key: "cooking", label: "Cooking", fields },
        buildRestSection(config, [
          "servings",
          "cooked_at",
          "cover",
          "vegan",
          "labels",
        ]),
      ],
    }

    expect(
      prepareRegistry(config).collections.recipe.admin.sections[0]
    ).toEqual({
      key: "cooking",
      label: "Cooking",
      fields,
      position: "main",
    })
  })

  it("records a section's tabs and collapsibles as the config writes them", () => {
    const config = buildTestConfig()
    const fields: LayoutItemConfig[] = [
      {
        type: "tabs",
        tabs: [
          { label: "Basics", fields: ["servings", "cooked_at"] },
          {
            label: "Cover",
            description: "Shown above the recipe",
            fields: [
              {
                type: "collapsible",
                label: "Image",
                initCollapsed: true,
                fields: ["cover", { type: "row", fields: ["vegan", "labels"] }],
              },
            ],
          },
        ],
      },
    ]
    config.collections[0].admin = {
      sections: [
        { key: "cooking", label: "Cooking", fields },
        buildRestSection(config, [
          "servings",
          "cooked_at",
          "cover",
          "vegan",
          "labels",
        ]),
      ],
    }

    expect(
      prepareRegistry(config).collections.recipe.admin.sections[0]
    ).toEqual({
      key: "cooking",
      label: "Cooking",
      fields,
      position: "main",
    })
  })

  it("records a component node of one field, in a group, and one mapping keys to fields", () => {
    const config = buildTestConfig()
    const fields: LayoutItemConfig[] = [
      {
        type: "group",
        label: "Kitchen",
        fields: [{ type: "component", component: "swatch", fields: ["title"] }],
      },
      {
        type: "component",
        component: "pair",
        fields: { amount: "servings", plant: "vegan" },
      },
    ]
    config.collections[0].admin = {
      sections: [
        { key: "cooking", label: "Cooking", fields },
        buildRestSection(config, ["title", "servings", "vegan"]),
      ],
    }

    expect(
      prepareRegistry(config).collections.recipe.admin.sections[0]
    ).toEqual({
      key: "cooking",
      label: "Cooking",
      fields,
      position: "main",
    })
  })

  it("records a component node in a section, a tab and a collapsible as the config writes it", () => {
    const config = buildTestConfig()
    const node = (fields: string[]) =>
      ({ type: "component", component: "pair", fields }) as const
    const fields: LayoutItemConfig[] = [
      node(["title", "servings"]),
      {
        type: "tabs",
        tabs: [
          { label: "Kitchen", fields: [node(["vegan", "difficulty"])] },
          {
            label: "More",
            fields: [
              {
                type: "collapsible",
                label: "Notes",
                fields: [node(["notes", "labels"])],
              },
            ],
          },
        ],
      },
    ]
    config.collections[0].admin = {
      sections: [
        { key: "cooking", label: "Cooking", fields },
        buildRestSection(config, [
          "title",
          "servings",
          "vegan",
          "difficulty",
          "notes",
          "labels",
        ]),
      ],
    }

    expect(
      prepareRegistry(config).collections.recipe.admin.sections[0]
    ).toEqual({
      key: "cooking",
      label: "Cooking",
      fields,
      position: "main",
    })
  })

  it("locks a slug on the document page unless its field turns the lock off", () => {
    const config = buildTestConfig()
    const lockOf = () =>
      prepareRegistry(config).collections.recipe.fields.find(
        ({ name }) => name === "slug"
      )?.lockOnEdit

    expect(lockOf()).toBe(true)

    config.collections[0].fields!.slug = {
      type: "slug",
      label: "Slug",
      from: "title",
      admin: { lockOnEdit: false },
    }

    expect(lockOf()).toBe(false)
  })

  it("stops at the first problem", () => {
    const config = buildTestConfig()
    config.collections[0].fields = {
      nope: {
        type: "text",
        label: "Nope",
        serverPublishValidation: z.string(),
      },
      gone: { type: "text", label: "Gone" },
    }

    const message = errorOf(config)

    expect(message).toContain('"nope" is not a column')
    expect(message).not.toContain('"gone"')
  })

  it.each<[string, (config: Config) => void, string]>([
    [
      "a slug that is not snake_case",
      (config) => {
        config.collections[0].slug = "Bad-Slug"
      },
      "not snake_case",
    ],
    [
      "a model that is not a DML model",
      (config) => {
        config.collections[0].model = {} as never
      },
      '"model" is not a DML model',
    ],
    [
      "a useAsTitle that is not a field",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          useAsTitle: "nope",
        }
      },
      'admin "useAsTitle" "nope" is not a field',
    ],
    [
      "a table column naming no field",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [{ field: "created_at" }] },
        }
      },
      'admin "table" column [0] "field" "created_at" is not a field',
    ],
    [
      "a table column holding an array",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [{ field: "labels" }] },
        }
      },
      'admin "table" column [0] "field" "labels" is not a scalar column',
    ],
    [
      "an unknown system column",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [{ system: "deleted_at" as never }] },
        }
      },
      'admin "table" column [0] needs a "field" or a "system" of id, status, published_version, created_at, updated_at',
    ],
    [
      "a table with no columns",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [] },
        }
      },
      'admin "table" needs a list of columns',
    ],
    [
      "a column shown twice",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [{ field: "title" }, { field: "title" }] },
        }
      },
      'admin "table" shows "title" more than once',
    ],
    [
      "a first order by a column the table lacks",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: {
            columns: [{ field: "title" }],
            defaultSort: { column: "slug", direction: "asc" },
          },
        }
      },
      'admin "table" defaultSort "slug" is no sortable column of the table',
    ],
    [
      "a first order by a column that does not sort",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: {
            columns: [{ field: "title", sortable: false }, { system: "id" }],
            defaultSort: { column: "title", direction: "asc" },
          },
        }
      },
      'admin "table" defaultSort "title" is no sortable column of the table',
    ],
    [
      "a first order with an unknown direction",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: {
            columns: [{ field: "title" }],
            defaultSort: { column: "title", direction: "up" as never },
          },
        }
      },
      'admin "table" defaultSort needs a direction of asc or desc',
    ],
    [
      "a page size out of range",
      (config) => {
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [{ field: "title" }], pageSize: 500 },
        }
      },
      'admin "table" pageSize needs a whole number from 1 to 100',
    ],
    [
      "a section naming a hidden field",
      (config) => {
        config.collections[0].admin = {
          sections: [{ key: "extra", label: "Extra", fields: ["extra"] }],
        }
      },
      'admin section "Extra" names "extra", which is not an editable field',
    ],
    [
      "a field in two sections",
      (config) => {
        config.collections[0].admin = {
          sections: [
            { key: "cooking", label: "Cooking", fields: ["servings"] },
            { key: "serving", label: "Serving", fields: ["servings"] },
          ],
        }
      },
      '"servings" is in more than one admin section',
    ],
    [
      "a section without fields",
      (config) => {
        config.collections[0].admin = {
          sections: [{ key: "empty", label: "Empty", fields: [] }],
        }
      },
      'admin section "Empty" lists no fields',
    ],
    [
      "a group in a group",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "group",
                  label: "Outer",
                  fields: [
                    { type: "group", label: "Inner", fields: ["servings"] },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a group cannot sit in a group',
    ],
    [
      "a group in a row",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "row",
                  fields: [
                    "servings",
                    { type: "group", label: "Inner", fields: ["vegan"] },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a group cannot sit in a row',
    ],
    [
      "a row of one field",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [{ type: "row", fields: ["servings"] }],
            },
          ],
        }
      },
      'admin section "Cooking": a row needs at least two fields',
    ],
    [
      "a group without fields",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [{ type: "group", label: "Cover", fields: [] }],
            },
          ],
        }
      },
      'admin section "Cooking": a group "Cover" lists no fields',
    ],
    [
      "a JS config's row without fields",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [{ type: "row" }] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a row needs at least two fields',
    ],
    [
      "a JS config's group without fields",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cover",
              label: "Cover",
              fields: [
                { type: "group", label: "Image" },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cover": a group "Image" lists no fields',
    ],
    [
      "tabs in tabs",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "tabs",
                  tabs: [
                    {
                      label: "A",
                      fields: [
                        {
                          type: "tabs",
                          tabs: [
                            { label: "C", fields: ["servings"] },
                            { label: "D", fields: ["vegan"] },
                          ],
                        },
                      ],
                    },
                    { label: "B", fields: ["cooked_at"] },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": tabs cannot sit in a tab',
    ],
    [
      "a collapsible in a collapsible",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "collapsible",
                  label: "Outer",
                  fields: [
                    {
                      type: "collapsible",
                      label: "Inner",
                      fields: ["servings"],
                    },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a collapsible cannot sit in a collapsible',
    ],
    [
      "tabs in a group",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "group",
                  label: "Cover",
                  fields: [
                    {
                      type: "tabs",
                      tabs: [
                        { label: "A", fields: ["servings"] },
                        { label: "B", fields: ["vegan"] },
                      ],
                    },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": tabs cannot sit in a group',
    ],
    [
      "a component node in a row",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "row",
                  fields: [
                    "title",
                    {
                      type: "component",
                      component: "pair",
                      fields: ["servings", "vegan"],
                    },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a component cannot sit in a row',
    ],
    [
      "a group in a component node",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: [
                    "servings",
                    { type: "group", label: "Inner", fields: ["vegan"] },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a group cannot sit in a component',
    ],
    [
      "a component node in a component node",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: [
                    "title",
                    {
                      type: "component",
                      component: "inner",
                      fields: ["servings", "vegan"],
                    },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a component cannot sit in a component',
    ],
    [
      "a component node mapping an empty key",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: { " ": "servings" },
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": component "pair" maps each key it reads to a field name',
    ],
    [
      "a component node naming a field twice",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: ["servings", "servings"],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": component "pair" names "servings" twice',
    ],
    [
      "a component node with no fields",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                { type: "component", component: "pair", fields: [] },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": component "pair" lists no fields',
    ],
    [
      "a component node mapping a field not of the model",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: { amount: "portions" },
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking" names "portions", which is not an editable field',
    ],
    [
      "a component node with an empty name",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: " ",
                  fields: ["servings", "vegan"],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a component node needs the name of a registered component',
    ],
    [
      "a component node owning a slug",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: ["title", "slug"],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a component node cannot own the slug field "slug", as the CMS draws its input',
    ],
    [
      "a component node owning a media field",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "component",
                  component: "pair",
                  fields: ["title", "cover"],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a component node cannot own the media field "cover", as the CMS draws its input',
    ],
    [
      "tabs of one tab",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                { type: "tabs", tabs: [{ label: "A", fields: ["servings"] }] },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": tabs need at least two tabs',
    ],
    [
      "a JS config's tabs without tabs",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [{ type: "tabs" }] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": tabs need at least two tabs',
    ],
    [
      "a tab without fields",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "tabs",
                  tabs: [
                    { label: "A", fields: ["servings"] },
                    { label: "Empty", fields: [] },
                  ],
                },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a tab "Empty" lists no fields',
    ],
    [
      "a collapsible without fields",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                { type: "collapsible", label: "Image", fields: [] },
              ] as unknown as LayoutItemConfig[],
            },
          ],
        }
      },
      'admin section "Cooking": a collapsible "Image" lists no fields',
    ],
    [
      "a tab naming a hidden field",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                {
                  type: "tabs",
                  tabs: [
                    { label: "A", fields: ["servings"] },
                    { label: "B", fields: ["extra"] },
                  ],
                },
              ],
            },
          ],
        }
      },
      'admin section "Cooking" names "extra", which is not an editable field',
    ],
    [
      "a group naming a hidden field",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [{ type: "group", label: "Cover", fields: ["extra"] }],
            },
          ],
        }
      },
      'admin section "Cooking" names "extra", which is not an editable field',
    ],
    [
      "a field in a row and outside it",
      (config) => {
        config.collections[0].admin = {
          sections: [
            {
              key: "cooking",
              label: "Cooking",
              fields: [
                "servings",
                { type: "row", fields: ["servings", "cooked_at"] },
              ],
            },
          ],
        }
      },
      '"servings" is in more than one admin section',
    ],
    [
      "a json column listed as a field",
      (config) => {
        config.collections[0].fields!.extra = { type: "text", label: "Extra" }
      },
      'field "extra" of type "text" cannot sit on a json column',
    ],
    [
      "a field without a label",
      (config) => {
        config.collections[0].fields!.servings = { type: "number" } as never
      },
      'field "servings" needs a label',
    ],
    [
      "a field of an unknown type",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "stepper",
          label: "Servings",
        } as never
      },
      'field "servings" has the type "stepper", which is not a field type',
    ],
    [
      "a field type on a column of another kind",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "text",
          label: "Servings",
        }
      },
      'field "servings" of type "text" cannot sit on a number column',
    ],
    [
      "a select without options",
      (config) => {
        config.collections[0].fields!.difficulty = {
          type: "select",
          label: "Difficulty",
          options: [],
        }
      },
      'select "difficulty" needs options',
    ],
    [
      "a select repeating an option",
      (config) => {
        config.collections[0].fields!.difficulty = {
          type: "select",
          label: "Difficulty",
          options: [
            { value: "easy", label: "Easy" },
            { value: "easy", label: "Simple" },
          ],
        }
      },
      'select "difficulty" repeats an option',
    ],
    [
      "a select offering a value its enum column does not allow",
      (config) => {
        config.collections[0].fields!.difficulty = {
          type: "select",
          label: "Difficulty",
          options: [{ value: "medium", label: "Medium" }],
        }
      },
      'select "difficulty" offers "medium", which its column does not allow',
    ],
    [
      "a select taking its options from a hook",
      (config) => {
        config.collections[0].fields!.cover = {
          type: "select",
          label: "Cover",
          options: { hook: "covers" },
        } as never
      },
      'select "cover" lists its options; options from a hook need type "combobox"',
    ],
    [
      "a combobox without options",
      (config) => {
        config.collections[0].fields!.cover = {
          type: "combobox",
          label: "Cover",
          options: [],
        }
      },
      'combobox "cover" needs options',
    ],
    [
      "a combobox naming an empty hook",
      (config) => {
        config.collections[0].fields!.cover = {
          type: "combobox",
          label: "Cover",
          options: { hook: " " },
        }
      },
      'combobox "cover" needs a hook name',
    ],
    [
      "a combobox taking its options from a hook on an enum column",
      (config) => {
        config.collections[0].fields!.difficulty = {
          type: "combobox",
          label: "Difficulty",
          options: { hook: "difficulties" },
        }
      },
      'combobox "difficulty" takes its options from a hook, so its column must be text, not an enum',
    ],
    [
      "a combobox of several values on a text column",
      (config) => {
        config.collections[0].fields!.cover = {
          type: "combobox",
          label: "Cover",
          multiple: true,
          options: { hook: "covers" },
        }
      },
      'combobox "cover" holds several values only on an array column, with multiple: true, and one value on a text or an enum column',
    ],
    [
      "a combobox of one value on an array column",
      (config) => {
        config.collections[0].fields!.labels = {
          type: "combobox",
          label: "Labels",
          options: { hook: "labels" },
        }
      },
      'combobox "labels" holds several values only on an array column, with multiple: true, and one value on a text or an enum column',
    ],
    [
      "a combobox with max but not multiple",
      (config) => {
        config.collections[0].fields!.cover = {
          type: "combobox",
          label: "Cover",
          max: 3,
          options: { hook: "covers" },
        }
      },
      'combobox "cover" takes max as a positive whole number, only with multiple: true',
    ],
    [
      "a combobox with a max that is not a positive whole number",
      (config) => {
        config.collections[0].fields!.labels = {
          type: "combobox",
          label: "Labels",
          multiple: true,
          max: 0,
          options: { hook: "labels" },
        }
      },
      'combobox "labels" takes max as a positive whole number, only with multiple: true',
    ],
    [
      "a CMS column listed as a field",
      (config) => {
        config.collections[0].fields!.status = { type: "text", label: "Status" }
      },
      '"status" is managed by the CMS, so it cannot be a field',
    ],
    [
      "metadata listed as a field",
      (config) => {
        config.collections[0].fields!.metadata = {
          type: "text",
          label: "Metadata",
        }
      },
      '"metadata" is managed by the CMS, so it cannot be a field',
    ],
    [
      "a column the model requires that the config leaves out",
      (config) => {
        delete config.collections[0].fields!.notes
      },
      '"notes" is required by its column, so the config must list it in fields',
    ],
    [
      "a slug field on a column that is not text",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "slug",
          label: "Slug",
          from: "title",
        }
      },
      'slug "servings" needs a text column',
    ],
    [
      "a slug built from a column that is not text",
      (config) => {
        config.collections[0].fields!.slug = {
          type: "slug",
          label: "Slug",
          from: "servings",
        }
      },
      'slug "slug" is built from "servings", which is not a text column',
    ],
    [
      "a column the database requires with a field required only at a publish",
      (config) => {
        config.collections[0].fields!.notes = {
          type: "textarea",
          label: "Notes",
          serverPublishValidation: z.string(),
        }
      },
      '"notes" is required by its column, so its field\'s "serverValidation" must refuse an empty value',
    ],
    [
      "a column the database requires with a schema that lets an empty value through",
      (config) => {
        config.collections[0].fields!.notes = {
          type: "textarea",
          label: "Notes",
          serverValidation: z.string().nullish(),
        }
      },
      '"notes" is required by its column, so its field\'s "serverValidation" must refuse an empty value',
    ],
    [
      "a required key, which the schemas replaced",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "number",
          label: "Servings",
          required: "always",
        } as never
      },
      'field "servings" takes no "required": its "serverValidation" or "serverPublishValidation" says whether it must be filled',
    ],
    [
      "a publish schema that is not a Zod schema",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "number",
          label: "Servings",
          serverPublishValidation: { min: 1 } as never,
        }
      },
      '"servings" has a "serverPublishValidation" that is not a Zod schema',
    ],
    [
      "a validation that is not a Zod schema",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "number",
          label: "Servings",
          serverValidation: { min: 1 } as never,
        }
      },
      '"servings" has a "serverValidation" that is not a Zod schema',
    ],
    [
      "a validation of another type than its field",
      (config) => {
        config.collections[0].fields!.servings = {
          type: "number",
          label: "Servings",
          serverValidation: z.string(),
        }
      },
      '"servings" is a number field, so its "serverValidation" must describe a number',
    ],
    [
      "a date's validation describing a Date, which reaches it as text",
      (config) => {
        config.collections[0].fields!.cooked_at = {
          type: "date",
          label: "Cooked at",
          serverValidation: z.date(),
        }
      },
      '"cooked_at" is a date field, so its "serverValidation" must describe a string',
    ],
    [
      "a list's validation describing one value",
      (config) => {
        config.collections[0].fields!.gallery = {
          type: "media",
          label: "Gallery",
          stores: "id",
          multiple: true,
          serverPublishValidation: z.string(),
        }
      },
      '"gallery" is a media field, so its "serverPublishValidation" must describe an array',
    ],
    [
      "a validation transforming another type than its field",
      (config) => {
        config.collections[0].fields!.notes = {
          type: "textarea",
          label: "Notes",
          serverValidation: z.number().transform(String),
        }
      },
      '"notes" is a text field, so its "serverValidation" must describe a string',
    ],
    [
      "a collection without labels, as a JS config can leave them out",
      (config) => {
        delete (config.collections[0] as { labels?: unknown }).labels
      },
      'collection "recipe": "labels" needs a singular and a plural',
    ],
    [
      "a block type without labels, as a JS config can leave them out",
      (config) => {
        delete (config.blocks![0] as { labels?: unknown }).labels
      },
      'block "step": "labels" needs a singular and a plural',
    ],
    [
      "a transform that is not a function",
      (config) => {
        config.collections[0].fields!.slug = {
          type: "slug",
          label: "Slug",
          from: "title",
          serverTransform: "kebab" as never,
        }
      },
      'slug "slug" has a "serverTransform" that is not a function',
    ],
    [
      "a recommended length that is not a positive whole number",
      (config) => {
        config.collections[0].fields!.notes = {
          type: "textarea",
          label: "Notes",
          serverValidation: z.string(),
          admin: { recommendedLength: 0 },
        }
      },
      'field "notes" takes admin.recommendedLength as a positive whole number',
    ],
    [
      "a placeholder taken from a field that is not text",
      (config) => {
        config.collections[0].fields!.notes = {
          type: "textarea",
          label: "Notes",
          serverValidation: z.string(),
          admin: { placeholderFrom: "servings" },
        }
      },
      'field "notes" takes its placeholder from "servings", which is not another text field',
    ],
    [
      "a placeholder taken from the field itself",
      (config) => {
        config.collections[0].fields!.notes = {
          type: "textarea",
          label: "Notes",
          serverValidation: z.string(),
          admin: { placeholderFrom: "notes" },
        }
      },
      'field "notes" takes its placeholder from "notes", which is not another text field',
    ],
    [
      "an id prefix used by another collection",
      (config) => {
        config.collections.push({
          slug: "dish",
          model: defineDocumentModel("test_dish", { prefix: "trec" }),
          labels: { singular: "Dish", plural: "Dishes" },
          fields: { title: { type: "text", label: "Title" } },
          admin: buildOneSectionAdmin(["title"]),
        })
      },
      'collection "dish": id prefix "trec" is already used by collection "recipe"',
    ],
    [
      "a model's rule that is not a Zod schema",
      (config) => {
        config.collections[0].serverValidation = { title: "required" } as never
      },
      'collection "recipe": "serverValidation" is not a Zod schema',
    ],
    [
      "a model's rule that does not describe an object",
      (config) => {
        config.collections[0].serverPublishValidation = z.string()
      },
      'collection "recipe": "serverPublishValidation" must describe an object of the model\'s fields',
    ],
    [
      "a model's rule naming a key that is no field",
      (config) => {
        config.collections[0].serverValidation = z.object({
          titel: z.string().nullable(),
        })
      },
      'collection "recipe": "serverValidation" names "titel", which is no field of the model',
    ],
    [
      "a block's rule naming a key that is no field",
      (config) => {
        config.blocks![1].serverPublishValidation = z.object({
          caption: z.string().nullable(),
        })
      },
      'block "callout": "serverPublishValidation" names "caption", which is no field of the model',
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = buildTestConfig()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })
})

describe("prepareRegistry, on the columns the plugin writes", () => {
  it("accepts a model holding them all", () => {
    expect(errorOf(configWithModel(defineDocumentModel("test_doc")))).toBe("")
  })

  it("builds a slug with normalizeSlug unless the field brings its own transform", () => {
    const custom = (text: string) => `custom-${text.length}`
    const config = buildTestConfig()

    expect(prepareRegistry(config).collections.recipe.slugTransforms).toEqual({
      slug: normalizeSlug,
    })

    config.collections[0].fields!.slug = {
      type: "slug",
      label: "Slug",
      from: "title",
      serverTransform: custom,
    }

    expect(prepareRegistry(config).collections.recipe.slugTransforms.slug).toBe(
      custom
    )
  })

  it("records a model's rules beside its fields' schemas", () => {
    const config = buildTestConfig()
    const save = z.object({ title: z.string().nullable() })
    const publish = z.looseObject({})
    config.collections[0].serverValidation = save
    config.blocks![1].serverPublishValidation = publish

    const { collections, blocks } = prepareRegistry(config)

    expect(collections.recipe.schemas.model).toEqual({
      save,
      publish: undefined,
    })
    expect(blocks.callout.schemas.model).toEqual({ save: undefined, publish })
  })

  it("accepts a model's rule that transforms an object of its fields", () => {
    const config = buildTestConfig()
    config.collections[0].serverValidation = z
      .object({ title: z.string().nullable() })
      .transform(({ title }) => ({ title: title?.trim() ?? null }))

    expect(() => prepareRegistry(config)).not.toThrow()
  })

  it("records each field's validation schema apart from the fields", () => {
    const { recipe } = prepareRegistry(buildTestConfig()).collections

    expect(recipe.schemas.fields.title.save?.safeParse("ab").success).toBe(
      false
    )
    expect(recipe.schemas.fields.title.publish?.safeParse(null).success).toBe(
      false
    )
    expect(
      recipe.fields.find(({ name }) => name === "title")
    ).not.toHaveProperty("schemas")
  })

  it.each([
    ["servings", z.number().int().min(1)],
    ["labels", z.array(z.string()).max(3)],
    ["slug", z.string().max(60)],
    ["title", z.string().max(70).nullish()],
    ["vegan", z.boolean()],
    ["cooked_at", z.iso.datetime()],
    ["difficulty", z.enum(["easy", "hard"])],
    ["cover", z.string()],
    ["gallery", z.array(z.string()).min(1)],
    ["servings", z.number().nullable()],
  ])("accepts a validation describing the type of %s", (name, validation) => {
    const config = buildTestConfig()
    config.collections[0].fields![name] = {
      ...config.collections[0].fields![name],
      serverValidation: validation,
    } as never

    expect(errorOf(config)).toBe("")
  })

  it("records the id prefix and the unique columns", () => {
    const { recipe } = prepareRegistry(buildTestConfig()).collections

    expect(recipe.idPrefix).toBe("trec")
    expect(recipe.unique).toEqual(["slug"])
  })

  it("refuses a component node owning a unique field", () => {
    const config = configWithModel(
      defineDocumentModel("test_unique_doc", {
        columns: {
          code: model.text().unique().nullable(),
          note: model.text().nullable(),
        },
      })
    )
    config.collections[0].fields = {
      code: { type: "text", label: "Code" },
      note: { type: "text", label: "Note" },
    }
    config.collections[0].admin = {
      sections: [
        {
          key: "main",
          label: "Main",
          fields: [
            { type: "component", component: "pair", fields: ["code", "note"] },
          ],
        },
      ],
    }

    expect(errorOf(config)).toContain(
      'admin section "Main": a component node cannot own the unique field "code", as the CMS checks its value as the editor types'
    )
  })

  it.each(["status", "published_at", "created_by", "updated_by"])(
    "refuses a model without %s",
    (name) => {
      const documentModel = defineDocumentModel("test_doc", {
        columns: { [name]: model.number().nullable() },
      })

      expect(errorOf(configWithModel(documentModel))).toContain(
        `needs a "${name}"`
      )
    }
  )

  it("refuses a status with other choices", () => {
    const documentModel = defineDocumentModel("test_doc", {
      columns: { status: model.enum(["draft", "live"]).default("draft") },
    })

    expect(errorOf(configWithModel(documentModel))).toContain(
      '"status" must be an enum of draft and published'
    )
  })

  it("refuses a metadata column that is not json", () => {
    const documentModel = defineDocumentModel("test_doc", {
      columns: { metadata: model.text().nullable() },
    })

    expect(errorOf(configWithModel(documentModel))).toContain(
      '"metadata" must be a json column'
    )
  })

  it("refuses an id without a prefix", () => {
    const documentModel = defineDocumentModel("test_doc", { prefix: "" })

    expect(errorOf(configWithModel(documentModel))).toContain(
      'collection "recipe": the id of TestDoc needs a prefix'
    )
  })
})

/**
 * Defines a document, an area model and a block type tied to each other, for configs a test breaks
 * in one relation.
 *
 * @param options - What to break: the document's or the area's cascade, the owner's nullability, the
 * check, the block's id prefix, or the area model's `name` and `parent_id`.
 * @returns The three models.
 */
const defineKitModels = ({
  cascadeAreas = true,
  cascadeBlocks = true,
  nullableOwner = true,
  check = "num_nonnulls(kit_id) = 1",
  blockPrefix = "tkblk",
  areaName = true,
  areaParent = true,
}: {
  cascadeAreas?: boolean
  cascadeBlocks?: boolean
  nullableOwner?: boolean
  check?: string
  blockPrefix?: string
  areaName?: boolean
  areaParent?: boolean
} = {}) => {
  // The model's columns are typed loosely, so its relation names are unknown to `cascades`.
  const Kit = defineDocumentModel("test_kit", {
    prefix: "tkit",
    columns: { areas: model.hasMany(() => KitArea, { mappedBy: "kit" }) },
  }).cascades({ delete: (cascadeAreas ? ["areas"] : []) as never[] })
  const owner = model.belongsTo(() => Kit, { mappedBy: "areas" })
  const KitArea = model
    .define("test_kit_area", {
      id: model.id({ prefix: "tkarea" }).primaryKey(),
      ...(areaName ? { name: model.text() } : {}),
      ...(areaParent ? { parent_id: model.text().nullable() } : {}),
      kit: nullableOwner ? owner.nullable() : owner,
      blocks: model.hasMany(() => KitBlock, { mappedBy: "area" }),
    })
    .cascades({ delete: cascadeBlocks ? ["blocks"] : [] })
    .checks([{ name: "CHK_kit_owner", expression: check }])
  const KitBlock = model.define("test_kit_block", {
    id: model.id({ prefix: blockPrefix }).primaryKey(),
    body: model.text().nullable(),
    area: model.belongsTo(() => KitArea, { mappedBy: "blocks" }),
    rank: model.number().default(0),
  })

  return { Kit, KitArea, KitBlock }
}

/**
 * Builds a config over the kit models: one collection with one area of one block type.
 *
 * @param models - The models from `defineKitModels`.
 * @returns The config.
 */
const kitConfig = ({
  Kit,
  KitBlock,
}: ReturnType<typeof defineKitModels>): Config => ({
  module: "testContent",
  collections: [
    {
      slug: "kit",
      model: Kit,
      labels: { singular: "Kit", plural: "Kits" },
      admin: buildOneSectionAdmin([], ["content"]),
      areas: { content: { label: "Content", blocks: ["kit_block"] } },
    },
  ],
  blocks: [
    {
      slug: "kit_block",
      model: KitBlock,
      labels: { singular: "Kit block", plural: "Kit blocks" },
    },
  ],
})

describe("prepareRegistry, on blocks and areas", () => {
  it("finds the area model through the relations, and records each block type with its relation", () => {
    const registry = prepareRegistry(buildTestConfig())

    expect(registry.area).toEqual({ key: "TestSection", idPrefix: "tsec" })
    expect(registry.blocks.step).toMatchObject({
      key: "TestStep",
      slug: "step",
      idPrefix: "tstep",
      relation: "steps",
    })
    expect(registry.blocks.callout).toMatchObject({
      key: "TestCallout",
      relation: "callouts",
    })
  })

  it("records a block's areas, a type allowed inside itself included", () => {
    const { step, callout } = prepareRegistry(buildTestConfig()).blocks

    expect(step.areas).toEqual([
      { name: "tips", label: "Tips", blocks: ["tip", "step"] },
    ])
    expect(callout.areas).toEqual([])
  })

  it("records maxDepth, 4 when left out", () => {
    const config = buildTestConfig()

    expect(prepareRegistry(config).maxDepth).toBe(4)

    config.maxDepth = 2

    expect(prepareRegistry(config).maxDepth).toBe(2)
  })

  it("leaves rank and the area out of a block's fields", () => {
    const names = prepareRegistry(buildTestConfig()).blocks.step.fields.map(
      ({ name }) => name
    )

    expect(names).toEqual(["heading"])
  })

  it("records a collection's areas and how its documents reach them", () => {
    const { recipe } = prepareRegistry(buildTestConfig()).collections

    expect(recipe.areas).toEqual([
      { name: "sections", label: "Sections", blocks: ["step", "callout"] },
    ])
    expect(recipe.areaLink).toEqual({ ownerColumn: "recipe_id" })
  })

  it("leaves a collection without areas without an area link", () => {
    const config = configWithModel(defineDocumentModel("test_doc"))

    expect(prepareRegistry(config).collections.recipe).toMatchObject({
      areas: [],
      areaLink: undefined,
    })
  })

  it("needs no area model for a config without areas or blocks", () => {
    const config = configWithModel(defineDocumentModel("test_doc"))
    delete config.blocks

    expect(prepareRegistry(config)).toMatchObject({
      area: undefined,
      blocks: {},
    })
  })

  it("accepts a section that lays out an area and no field", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      sections: [
        { key: "steps", label: "Steps", fields: [], areas: ["sections"] },
        {
          key: "rest",
          label: "Rest",
          fields: Object.keys(config.collections[0].fields!),
        },
      ],
    }

    expect(
      prepareRegistry(config).collections.recipe.admin.sections[0]
    ).toEqual({
      key: "steps",
      label: "Steps",
      fields: [],
      areas: ["sections"],
      position: "main",
    })
  })

  it("records a block's validation and slug function, as a collection's", () => {
    const config = buildTestConfig()
    const validation = z.string().min(2)
    config.blocks![0].fields = {
      heading: {
        type: "slug",
        label: "Slug",
        from: "heading",
        serverValidation: validation,
      },
    }

    const { step } = prepareRegistry(config).blocks

    expect(step.schemas).toEqual({
      fields: { heading: { save: validation, publish: undefined } },
      model: { save: undefined, publish: undefined },
    })
    expect(step.slugTransforms).toEqual({ heading: normalizeSlug })
  })

  it("records a block section's group as the config writes it", () => {
    const config = buildTestConfig()
    const fields: LayoutItemConfig[] = [
      { type: "group", label: "Image", fields: ["image", "body"] },
    ]
    config.blocks![1].admin = { sections: [{ label: "Media", fields }] }

    expect(prepareRegistry(config).blocks.callout.admin.sections).toEqual([
      { label: "Media", fields },
    ])
  })

  it("records a block's sections as the config lists them", () => {
    const config = buildTestConfig()
    config.blocks![0].admin = {
      sections: [{ label: "Text", fields: ["heading"] }],
    }

    expect(prepareRegistry(config).blocks.step.admin.sections).toEqual([
      { label: "Text", fields: ["heading"] },
    ])
  })

  it("accepts a kit whose models are tied as the plugin expects", () => {
    expect(errorOf(kitConfig(defineKitModels()))).toBe("")
  })

  it.each<[string, (config: Config) => void, string]>([
    [
      "a block whose area relation points at another model",
      (config) => {
        config.blocks![1].model = defineKitModels().KitBlock
      },
      'area: the "areas" and "area" relations point at more than one model: TestSection, TestKitArea',
    ],
    [
      "a block slug that is not snake_case",
      (config) => {
        config.blocks![1].slug = "Call-Out"
      },
      'block "Call-Out": not snake_case, or repeated',
    ],
    [
      "a block model that is not a DML model",
      (config) => {
        config.blocks![1].model = {} as never
      },
      'block "callout": "model" is not a DML model',
    ],
    [
      "a block without a rank column",
      (config) => {
        config.blocks![1].model = defineDocumentModel("test_loose", {
          prefix: "tloose",
          columns: {
            area: model.belongsTo(() => TestSection, { mappedBy: "loose" }),
          },
        })
      },
      'block "callout": needs a "rank" number column',
    ],
    [
      "a block without an area relation",
      (config) => {
        config.blocks![1].model = defineDocumentModel("test_loose", {
          prefix: "tloose",
        })
      },
      'block "callout": needs an "area" belongsTo to the area model',
    ],
    [
      "a block the area model has no hasMany to",
      (config) => {
        config.blocks![1].model = defineDocumentModel("test_loose", {
          prefix: "tloose",
          columns: {
            body: model.text().nullable(),
            image: model.text().nullable(),
            rank: model.number().default(0),
            area: model.belongsTo(() => TestSection, { mappedBy: "loose" }),
          },
        })
      },
      "area: TestSection needs a hasMany to TestLoose",
    ],
    [
      "a block slug field on a column that is not text",
      (config) => {
        config.blocks![0].fields = {
          rank: { type: "slug", label: "Slug", from: "heading" },
        }
      },
      'block "step": slug "rank" needs a text column',
    ],
    [
      "a block slug built from a column that is not text",
      (config) => {
        config.blocks![0].fields = {
          heading: { type: "slug", label: "Slug", from: "rank" },
        }
      },
      'block "step": slug "heading" is built from "rank", which is not a text column',
    ],
    [
      "a block field validation of another type",
      (config) => {
        config.blocks![0].fields = {
          heading: {
            type: "text",
            label: "Heading",
            serverValidation: z.number(),
          },
        }
      },
      'block "step": "heading" is a text field, so its "serverValidation" must describe a string',
    ],
    [
      "a block section naming a field the block does not have",
      (config) => {
        config.blocks![0].admin = {
          sections: [{ label: "Text", fields: ["nope"] }],
        }
      },
      'block "step": admin section "Text" names "nope", which is not an editable field',
    ],
    [
      "a block section placed in a column",
      (config) => {
        config.blocks![0].admin = {
          sections: [
            { label: "Text", fields: ["heading"], position: "side" },
          ] as unknown as LayoutBlockSectionConfig[],
        }
      },
      'block "step": admin section "Text" of a block takes no position or areas',
    ],
    [
      "a block section laying out an area",
      (config) => {
        config.blocks![0].admin = {
          sections: [
            { label: "Text", fields: ["heading"], areas: ["sections"] },
          ] as unknown as LayoutBlockSectionConfig[],
        }
      },
      'block "step": admin section "Text" of a block takes no position or areas',
    ],
    [
      "an area allowing a block that is not configured",
      (config) => {
        config.collections[0].areas!.sections.blocks.push("nope")
      },
      'collection "recipe": area "sections" allows "nope", which is not a configured block',
    ],
    [
      "an area named areas",
      (config) => {
        config.collections[0].areas = {
          areas: { label: "Areas", blocks: ["step"] },
        }
      },
      'collection "recipe": area "areas" is reserved for the area rows',
    ],
    [
      "an area with the name of a column",
      (config) => {
        config.collections[0].areas = {
          title: { label: "Title", blocks: ["step"] },
        }
      },
      'collection "recipe": area "title" has the name of a column',
    ],
    [
      "a collection with areas and no areas relation",
      (config) => {
        config.collections.push({
          slug: "dish",
          model: defineDocumentModel("test_dish", { prefix: "tdish" }),
          labels: { singular: "Dish", plural: "Dishes" },
          admin: buildOneSectionAdmin([], ["sections"]),
          areas: { sections: { label: "Sections", blocks: ["step"] } },
        })
      },
      'collection "dish": needs an "areas" hasMany to the area model',
    ],
    [
      "a collection with areas the area model has no belongsTo to",
      (config) => {
        config.collections.push({
          slug: "dish",
          model: defineDocumentModel("test_dish", {
            prefix: "tdish",
            columns: {
              areas: model.hasMany(() => TestSection, { mappedBy: "dish" }),
            },
          }).cascades({ delete: ["areas"] as never[] }),
          labels: { singular: "Dish", plural: "Dishes" },
          admin: buildOneSectionAdmin([], ["sections"]),
          areas: { sections: { label: "Sections", blocks: ["step"] } },
        })
      },
      "area: TestSection needs a belongsTo to TestDish",
    ],
    [
      "a section naming an area the collection does not have",
      (config) => {
        config.collections[0].admin = {
          sections: [
            { key: "more", label: "More", fields: [], areas: ["nope"] },
          ],
        }
      },
      'collection "recipe": admin section "More" names "nope", which is not an area',
    ],
    [
      "an area in two sections",
      (config) => {
        config.collections[0].admin = {
          sections: [
            { key: "steps", label: "Steps", fields: [], areas: ["sections"] },
            { key: "more", label: "More", fields: [], areas: ["sections"] },
          ],
        }
      },
      'collection "recipe": area "sections" is in more than one admin section',
    ],
    [
      "a section without fields or areas",
      (config) => {
        config.collections[0].admin = {
          sections: [{ key: "empty", label: "Empty", fields: [], areas: [] }],
        }
      },
      'collection "recipe": admin section "Empty" lists no fields or areas',
    ],
    [
      "a block area allowing a block that is not configured",
      (config) => {
        config.blocks![0].areas!.tips.blocks.push("nope")
      },
      'block "step": area "tips" allows "nope", which is not a configured block',
    ],
    [
      "a block area with the name of a column",
      (config) => {
        config.blocks![0].areas = {
          heading: { label: "Heading", blocks: ["tip"] },
        }
      },
      'block "step": area "heading" has the name of a column',
    ],
    [
      "a block area named areas",
      (config) => {
        config.blocks![0].areas = {
          areas: { label: "Areas", blocks: ["tip"] },
        }
      },
      'block "step": area "areas" is reserved for the area rows',
    ],
    [
      "a block that declares its areas under the old key",
      (config) => {
        Object.assign(config.blocks![0], { repeaters: {} })
      },
      'block "step": "repeaters" is now "areas"',
    ],
    [
      "a maxDepth of 0",
      (config) => {
        config.maxDepth = 0
      },
      "maxDepth: needs a positive whole number",
    ],
    [
      "a maxDepth that is not whole",
      (config) => {
        config.maxDepth = 1.5
      },
      "maxDepth: needs a positive whole number",
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = buildTestConfig()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })

  it.each<[string, Parameters<typeof defineKitModels>[0], string]>([
    [
      "a collection that does not cascade to its areas",
      { cascadeAreas: false },
      'collection "kit": must cascade its delete to "areas"',
    ],
    [
      "an area model that does not cascade to a block type",
      { cascadeBlocks: false },
      'area: TestKitArea must cascade its delete to "blocks"',
    ],
    [
      "an owner belongsTo that is not nullable",
      { nullableOwner: false },
      'area: the belongsTo "kit" of TestKitArea must be nullable',
    ],
    [
      "a check that does not name the owner column",
      { check: "num_nonnulls(kitten_id) = 1" },
      'area: a check of TestKitArea must name its owner column "kit_id"',
    ],
    [
      "an area model without a name column",
      { areaName: false },
      'area: needs a "name" text column',
    ],
    [
      "an area model without a parent_id column",
      { areaParent: false },
      'area: needs a nullable "parent_id" text column',
    ],
    [
      "a block without an id prefix",
      { blockPrefix: "" },
      'block "kit_block": the id of TestKitBlock needs a prefix',
    ],
    [
      "a block id prefix used by the collection",
      { blockPrefix: "tkit" },
      'block "kit_block": id prefix "tkit" is already used by collection "kit"',
    ],
  ])("refuses %s", (_name, options, expected) => {
    expect(errorOf(kitConfig(defineKitModels(options)))).toContain(expected)
  })
})

/**
 * Drops the test recipe's media section, which holds only its cover and gallery, for a test that
 * removes those fields.
 *
 * @param config - The config, changed in place.
 */
const removeMediaSection = (config: Config): void => {
  config.collections[0].admin.sections =
    config.collections[0].admin.sections.filter(({ key }) => key !== "media")
}

describe("prepareRegistry, on media", () => {
  /**
   * Gives a field of the recipe new settings.
   *
   * @param config - The config to change.
   * @param name - The field's name.
   * @param settings - The settings to add or replace.
   */
  const setRecipeField = (
    config: Config,
    name: string,
    settings: Record<string, unknown>
  ) => {
    const fields = config.collections[0].fields!
    fields[name] = { ...fields[name], ...settings } as never
  }

  it("records the provider and what its fields may store", () => {
    const { media } = prepareRegistry(buildTestConfig())

    expect(media).toMatchObject({
      resolve: FileMediaProvider,
      options: {},
      identifier: "file",
      stores: ["id"],
    })
  })

  it("describes a media field with its settings, JPG, PNG and WebP its picker's types by default", () => {
    const { fields } = prepareRegistry(buildTestConfig()).collections.recipe
    const field = (name: string) => fields.find((each) => each.name === name)

    expect(field("cover")).toMatchObject({
      kind: "media",
      stores: "id",
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      multiple: false,
      max: undefined,
    })
    expect(field("gallery")).toMatchObject({
      kind: "media",
      stores: "id",
      mimeTypes: ["image/png", "application/pdf"],
      multiple: true,
      max: 3,
    })
  })

  it("takes a wildcard among a media field's types", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "media",
      label: "Cover",
      stores: "id",
      admin: { mimeTypes: ["image/*"] },
    }

    const { fields } = prepareRegistry(config).collections.recipe

    expect(fields.find(({ name }) => name === "cover")?.mimeTypes).toEqual([
      "image/*",
    ])
  })

  it.each<[string, Record<string, unknown>, string]>([
    [
      "accept, which admin.mimeTypes replaced",
      { accept: ["image/png"] },
      'media "cover" takes no "accept": its picker\'s types are admin.mimeTypes',
    ],
    [
      "an empty list of types",
      { admin: { mimeTypes: [] } },
      'media "cover" takes admin.mimeTypes as a list of MIME types',
    ],
    [
      "a type that is no MIME type",
      { admin: { mimeTypes: ["png"] } },
      'media "cover" takes admin.mimeTypes as a list of MIME types',
    ],
  ])("refuses a media field with %s", (_label, settings, message) => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "media",
      label: "Cover",
      stores: "id",
      ...settings,
    } as never

    expect(() => prepareRegistry(config)).toThrow(message)
  })

  it("needs no provider for a config without media fields", () => {
    const config = buildTestConfig()
    delete config.media
    delete config.collections[0].fields!.cover
    delete config.collections[0].fields!.gallery
    removeMediaSection(config)
    delete config.blocks![1].fields!.image

    expect(errorOf(config)).toBe("")
  })

  it.each<[string, (config: Config) => void, string]>([
    [
      "a media field in a config without a provider",
      (config) => {
        delete config.media
      },
      'collection "recipe": media "cover" needs media.provider in the config',
    ],
    [
      "a block's media field in a config without a provider",
      (config) => {
        delete config.media
        delete config.collections[0].fields!.cover
        delete config.collections[0].fields!.gallery
        removeMediaSection(config)
      },
      'block "callout": media "image" needs media.provider in the config',
    ],
    [
      "a resolve that is not a provider class",
      (config) => {
        config.media = { provider: { resolve: {} as never } }
      },
      "media.provider: resolve must be a class extending AbstractCmsMediaProvider",
    ],
    [
      "a provider without an identifier",
      (config) => {
        class NamelessProvider extends FileMediaProvider {
          static identifier = ""
        }
        config.media = { provider: { resolve: NamelessProvider } }
      },
      "media.provider: the provider needs a static identifier",
    ],
    [
      "a provider that stores nothing",
      (config) => {
        class StorelessProvider extends FileMediaProvider {
          static stores = []
        }
        config.media = { provider: { resolve: StorelessProvider } }
      },
      'media.provider: file needs static stores of "id", "url" or both',
    ],
    [
      "options its validateOptions refuses",
      (config) => {
        config.media = {
          provider: { resolve: FileMediaProvider, options: { maxFileSize: 0 } },
        }
      },
      'media.provider: file media provider: "maxFileSize" must be a positive number of bytes',
    ],
    [
      "a field without stores",
      (config) => {
        setRecipeField(config, "cover", { stores: undefined })
      },
      'media "cover" needs stores: "id" or "url"',
    ],
    [
      "a field storing what the provider cannot read",
      (config) => {
        setRecipeField(config, "cover", { stores: "url" })
      },
      'media "cover" stores "url", which file cannot read',
    ],
    [
      "several files on a text column",
      (config) => {
        setRecipeField(config, "cover", { multiple: true })
      },
      'media "cover" holds several files only on an array column',
    ],
    [
      "one file on an array column",
      (config) => {
        setRecipeField(config, "gallery", { multiple: false, max: undefined })
      },
      'media "gallery" holds several files only on an array column',
    ],
    [
      "max without multiple",
      (config) => {
        setRecipeField(config, "cover", { max: 2 })
      },
      'media "cover" takes max as a positive whole number, only with multiple: true',
    ],
    [
      "a max that is not a positive whole number",
      (config) => {
        setRecipeField(config, "gallery", { max: 0 })
      },
      'media "gallery" takes max as a positive whole number, only with multiple: true',
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = buildTestConfig()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })
})

describe("prepareRegistry, on links", () => {
  /**
   * Builds the test config with the recipe's cover, a text column, as a `url` field.
   *
   * @param linkPolicy - The field's own links.
   * @returns The config.
   */
  const buildLinkConfig = (linkPolicy?: Record<string, unknown>): Config => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "url",
      label: "Link",
      ...(linkPolicy && { linkPolicy }),
    }

    return config
  }

  /**
   * Reads the resolved links of the recipe's `url` field.
   *
   * @param config - The config.
   * @returns The links.
   */
  const linksOf = (config: Config) =>
    prepareRegistry(config).collections.recipe.fields.find(
      ({ name }) => name === "cover"
    )?.linkPolicy

  it("gives a url field the default links, then the config's, then its own over them", () => {
    expect(linksOf(buildLinkConfig())).toEqual({
      protocols: ["http", "https", "mailto", "tel"],
      relative: true,
    })

    const withConfigLinks = buildLinkConfig()
    withConfigLinks.linkPolicy = { protocols: ["https"] }

    expect(linksOf(withConfigLinks)).toEqual({
      protocols: ["https"],
      relative: true,
    })

    const withOwnLinks = buildLinkConfig({ relative: false })
    withOwnLinks.linkPolicy = { protocols: ["https"] }

    expect(linksOf(withOwnLinks)).toEqual({
      protocols: ["https"],
      relative: false,
    })
  })

  it("gives no links to a field of a type other than url", () => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = { type: "richtext", label: "Body" }
    const registry = prepareRegistry(config)

    expect(
      registry.collections.recipe.fields.some(
        ({ kind, linkPolicy }) => kind !== "url" && linkPolicy
      )
    ).toBe(false)
  })

  it.each([
    [
      "a config's links with a scheme that runs code",
      (config: Config) => {
        config.linkPolicy = { protocols: ["https", "javascript"] }
      },
      'config: linkPolicy "javascript" can run code or embed content, so no link may use it',
    ],
    [
      "a field's links that allow no link",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "url",
          label: "Link",
          linkPolicy: { protocols: [], relative: false },
        }
      },
      'collection "recipe": field "cover": linkPolicy allows no link: list a protocol or set relative to true',
    ],
    [
      "a field's links whose protocols are no list",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "url",
          label: "Link",
          linkPolicy: { protocols: "https" as unknown as string[] },
        }
      },
      'collection "recipe": field "cover": linkPolicy takes "protocols" as a list and "relative" as true or false',
    ],
    [
      "a field's protocol that is not a scheme name",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "url",
          label: "Link",
          linkPolicy: { protocols: ["https:"] },
        }
      },
      'linkPolicy "https:" is not a lowercase scheme name, such as "https"',
    ],
    [
      "a url field on a column that is not text",
      (config: Config) => {
        config.collections[0].fields!.gallery = { type: "url", label: "Links" }
      },
      'field "gallery" of type "url" cannot sit on a array column',
    ],
    [
      "a slug built from a url field",
      (config: Config) => {
        config.collections[0].fields!.title = {
          type: "url",
          label: "Link",
        }
      },
      'slug "slug" is built from "title", a url field, whose links make no slug',
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = buildTestConfig()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })
})

describe("prepareRegistry, on rich text", () => {
  /**
   * Builds the test config with the recipe's cover, a text column, as a `richtext` field.
   *
   * @param overrides - The field's own keys.
   * @returns The config.
   */
  const buildRichTextConfig = (
    overrides: Record<string, unknown> = {}
  ): Config => {
    const config = buildTestConfig()
    config.collections[0].fields!.cover = {
      type: "richtext",
      label: "Body",
      ...overrides,
    }

    return config
  }

  /**
   * Reads the resolved recipe's `richtext` field.
   *
   * @param config - The config.
   * @returns The field.
   */
  const fieldOf = (config: Config) =>
    prepareRegistry(config).collections.recipe.fields.find(
      ({ name }) => name === "cover"
    )

  /** The built-in features, resolved over the default link policy. */
  const DEFAULT_FEATURES = [
    { key: "bold", props: {} },
    { key: "italic", props: {} },
    { key: "heading", props: { enabledHeadingSizes: ["h2", "h3", "h4"] } },
    { key: "unorderedList", props: {} },
    { key: "orderedList", props: {} },
    { key: "blockquote", props: {} },
    {
      key: "link",
      props: {
        linkPolicy: {
          protocols: ["http", "https", "mailto", "tel"],
          relative: true,
        },
      },
    },
  ]

  it("gives a richtext field the built-in features, headings h2 to h4 and the default links", () => {
    const field = fieldOf(buildRichTextConfig())

    expect(field).toMatchObject({
      kind: "richtext",
      features: DEFAULT_FEATURES,
    })
    expect(field).not.toHaveProperty("headings")
    expect(field).not.toHaveProperty("linkPolicy")
  })

  it("gives it the config's features, which its own list replaces whole", () => {
    const withConfig = buildRichTextConfig()
    withConfig.richText = {
      features: [
        BoldFeature(),
        LinkFeature({ linkPolicy: { relative: false } }),
      ],
    }

    expect(fieldOf(withConfig)?.features).toEqual([
      { key: "bold", props: {} },
      {
        key: "link",
        props: {
          linkPolicy: {
            protocols: ["http", "https", "mailto", "tel"],
            relative: false,
          },
        },
      },
    ])

    const withOwn = buildRichTextConfig({ features: [ItalicFeature()] })
    withOwn.richText = { features: [BoldFeature()] }

    expect(fieldOf(withOwn)?.features).toEqual([{ key: "italic", props: {} }])
  })

  it("resolves a link feature's policy over the default one, leaving the config's to url fields", () => {
    const config = buildRichTextConfig({
      features: [LinkFeature({ linkPolicy: { protocols: ["https"] } })],
    })
    config.linkPolicy = { protocols: ["mailto"], relative: false }

    expect(fieldOf(config)?.features).toEqual([
      {
        key: "link",
        props: { linkPolicy: { protocols: ["https"], relative: true } },
      },
    ])

    const withoutOwn = buildRichTextConfig()
    withoutOwn.linkPolicy = { protocols: ["mailto"], relative: false }

    expect(fieldOf(withoutOwn)?.features).toEqual(DEFAULT_FEATURES)
  })

  it("gives the config's features function the built-in features", () => {
    const config = buildRichTextConfig()
    config.richText = {
      features: ({ defaultFeatures }) =>
        defaultFeatures.filter((feature) => feature.key !== "link"),
    }

    expect(fieldOf(config)?.features).toEqual(DEFAULT_FEATURES.slice(0, -1))
  })

  it("runs a field's features function once, with a copy of the config's features", () => {
    const features = jest.fn(
      ({
        defaultFeatures,
        rootFeatures,
      }: {
        defaultFeatures: ResolvedRichTextFeature[]
        rootFeatures: ResolvedRichTextFeature[]
      }) => {
        rootFeatures.push(ItalicFeature() as ResolvedRichTextFeature)

        return rootFeatures.filter((feature) => feature.key !== "heading")
      }
    )
    const config = buildRichTextConfig({ features })
    config.richText = {
      features: [
        HeadingFeature({ enabledHeadingSizes: ["h2"] }),
        BoldFeature(),
      ],
    }

    const fields = prepareRegistry(config).collections.recipe.fields

    expect(fields.find(({ name }) => name === "cover")?.features).toEqual([
      { key: "bold", props: {} },
      { key: "italic", props: {} },
    ])
    expect(features).toHaveBeenCalledTimes(1)
    // The summary sets no features, so it takes the config's, which the function's push left alone.
    expect(fields.find(({ name }) => name === "summary")?.features).toEqual([
      { key: "heading", props: { enabledHeadingSizes: ["h2"] } },
      { key: "bold", props: {} },
    ])
  })

  it("keeps the last of two features with one key, at its own position", () => {
    const config = buildRichTextConfig({
      features: ({ rootFeatures }: { rootFeatures: RichTextFeature[] }) => [
        ...rootFeatures,
        HeadingFeature({ enabledHeadingSizes: ["h3"] }),
      ],
    })

    expect(fieldOf(config)?.features?.map((feature) => feature.key)).toEqual([
      "bold",
      "italic",
      "unorderedList",
      "orderedList",
      "blockquote",
      "link",
      "heading",
    ])
    expect(
      fieldOf(config)?.features?.find((feature) => feature.key === "heading")
    ).toEqual({ key: "heading", props: { enabledHeadingSizes: ["h3"] } })
  })

  it("gives a heading feature without sizes h1 to h6, and sorts the sizes it is given", () => {
    const all = buildRichTextConfig({ features: [HeadingFeature()] })
    const some = buildRichTextConfig({
      features: [HeadingFeature({ enabledHeadingSizes: ["h4", "h2", "h4"] })],
    })

    expect(fieldOf(all)?.features).toEqual([
      {
        key: "heading",
        props: { enabledHeadingSizes: ["h1", "h2", "h3", "h4", "h5", "h6"] },
      },
    ])
    expect(fieldOf(some)?.features).toEqual([
      { key: "heading", props: { enabledHeadingSizes: ["h2", "h4"] } },
    ])
  })

  it("takes a heading feature with no size, which offers no heading", () => {
    const config = buildRichTextConfig({
      features: [HeadingFeature({ enabledHeadingSizes: [] })],
    })

    expect(fieldOf(config)?.features).toEqual([
      { key: "heading", props: { enabledHeadingSizes: [] } },
    ])
  })

  it("accepts a schema describing an object, which a richtext field's value is", () => {
    const config = buildRichTextConfig({ serverValidation: z.looseObject({}) })

    expect(errorOf(config)).toBe("")
  })

  it.each([
    [
      "a config's feature that is not built in",
      (config: Config) => {
        config.richText = {
          features: [
            BoldFeature(),
            { key: "table" } as unknown as RichTextFeature,
          ],
        }
      },
      'config: richText: "features" must hold the plugin\'s features, such as BoldFeature(); their keys are bold, italic, heading, unorderedList, orderedList, blockquote, link',
    ],
    [
      "features that are no list",
      (config: Config) => {
        config.richText = {
          features: BoldFeature() as unknown as RichTextFeature[],
        }
      },
      'config: richText: "features" must be a list of features, such as [BoldFeature(), LinkFeature()]',
    ],
    [
      "a word in place of a feature",
      (config: Config) => {
        config.richText = { features: ["bold" as unknown as RichTextFeature] }
      },
      'config: richText: "features" must hold the plugin\'s features',
    ],
    [
      "props that are not an object",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
          features: [{ key: "bold", props: [] as unknown as {} }],
        }
      },
      'collection "recipe": field "cover": the "bold" feature: its props must be an object',
    ],
    [
      "a field's heading level outside h1 to h6",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
          features: [HeadingFeature({ enabledHeadingSizes: ["h7" as "h1"] })],
        }
      },
      'collection "recipe": field "cover": the "heading" feature: "enabledHeadingSizes" must be a list of h1 to h6',
    ],
    [
      "a link feature's policy with javascript",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
          features: [
            LinkFeature({ linkPolicy: { protocols: ["https", "javascript"] } }),
          ],
        }
      },
      'collection "recipe": field "cover": the "link" feature: linkPolicy "javascript" can run code or embed content, so no link may use it',
    ],
    [
      "a features function that throws",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
          features: () => {
            throw new Error("boom")
          },
        }
      },
      'field "cover": the "features" function threw: boom',
    ],
    [
      "a features function that returns no list",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
          features: () => "bold" as unknown as [],
        }
      },
      'field "cover": "features" must be a list of',
    ],
    [
      "a schema of a richtext field describing a text",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
          serverPublishValidation: z.string(),
        }
      },
      '"cover" is a richtext field, so its "serverPublishValidation" must describe an object',
    ],
    [
      "a richtext field on a column that is not text",
      (config: Config) => {
        config.collections[0].fields!.gallery = {
          type: "richtext",
          label: "Body",
        }
      },
      'field "gallery" of type "richtext" cannot sit on a array column',
    ],
    [
      "a slug built from a richtext field",
      (config: Config) => {
        config.collections[0].fields!.title = {
          type: "richtext",
          label: "Title",
        }
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
        }
      },
      'slug "slug" is built from "title", a richtext field, whose document makes no slug',
    ],
    [
      "a richtext field as the table's title",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
        }
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          useAsTitle: "cover",
        }
      },
      'admin "useAsTitle" "cover" is a richtext field, whose document the table cannot show as text',
    ],
    [
      "a richtext field among the table's columns",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
        }
        config.collections[0].admin = {
          sections: config.collections[0].admin.sections,
          table: { columns: [{ field: "slug" }, { field: "cover" }] },
        }
      },
      'admin "table" column [1] "field" "cover" is a richtext field, whose document the table cannot show as text',
    ],
    [
      "a richtext field in a component node",
      (config: Config) => {
        config.collections[0].fields!.cover = {
          type: "richtext",
          label: "Body",
        }
        config.collections[0].admin = {
          sections: [
            {
              key: "main",
              label: "Main",
              fields: [
                { type: "component", component: "box", fields: ["cover"] },
              ],
            },
          ],
        }
      },
      'a component node cannot own the richtext field "cover"',
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = buildTestConfig()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })

  it("refuses a richtext field on a searchable column", () => {
    const config = configWithModel(
      defineDocumentModel("test_searchable_body", {
        columns: { body: model.text().searchable().nullable() },
      })
    )
    config.collections[0].fields = {
      body: { type: "richtext", label: "Body" },
    }

    expect(errorOf(config)).toContain(
      'richtext "body" cannot sit on a searchable column, as a search would match the JSON of its document'
    )
  })
})

/**
 * Builds a text of the config that names a key of the config's namespace.
 *
 * @param key - The key.
 * @returns The text's function.
 */
const textOf =
  (key: string): CmsText =>
  ({ t }) =>
    t(key)

/**
 * Builds a translation of the test namespace, as the registry keeps it.
 *
 * @param key - The key.
 * @returns The translation.
 */
const translationOf = (key: string) => ({
  type: "translation",
  key,
  ns: "cms-test",
})

describe("prepareRegistry, on the Admin's texts", () => {
  it("keeps the namespace of the config's texts, none when left out", () => {
    expect(prepareRegistry(buildTestConfig()).translationNs).toBe("cms-test")

    const config = buildTestConfig()
    delete config.admin
    config.collections[0].fields!.servings.label = "Servings"
    config.collections[0].fields!.cooked_at.label = "Cooked at"

    expect(prepareRegistry(config).translationNs).toBeUndefined()
  })

  it("keeps a string as written and prepares a function as its translation, in the config's namespace or the one it names", () => {
    const fields = prepareRegistry(buildTestConfig()).collections.recipe.fields

    expect(fields.find(({ name }) => name === "title")?.label).toBe("Title")
    expect(fields.find(({ name }) => name === "servings")?.label).toEqual(
      translationOf("recipe.servings")
    )
    expect(fields.find(({ name }) => name === "cooked_at")?.label).toEqual({
      type: "translation",
      key: "fields.cookedAt",
      ns: "translation",
      options: { context: "short" },
    })
  })

  it("prepares every text of a collection and a block type", () => {
    const config = buildTestConfig()
    const [recipe] = config.collections
    const step = config.blocks!.find(({ slug }) => slug === "step")!

    recipe.labels = { singular: textOf("recipe.singular"), plural: "Recipes" }
    recipe.fields!.title.admin = { description: textOf("fields.titleHint") }
    recipe.fields!.difficulty = {
      type: "select",
      label: "Difficulty",
      options: [
        { value: "easy", label: textOf("difficulty.easy") },
        { value: "hard", label: "Hard" },
      ],
    }
    recipe.areas!.sections.label = textOf("recipe.sections")
    recipe.admin = {
      ...recipe.admin,
      description: textOf("recipe.description"),
      actions: ({ defaultActions }) => [
        ...defaultActions,
        { type: "link", label: textOf("recipe.import"), to: "/import" },
      ],
      sections: [
        {
          key: "main",
          label: textOf("recipe.main"),
          fields: [
            {
              type: "tabs",
              tabs: [
                { label: textOf("recipe.tab"), fields: ["title"] },
                {
                  label: "Other",
                  fields: [
                    {
                      type: "group",
                      label: textOf("recipe.group"),
                      description: textOf("recipe.groupHint"),
                      fields: ["slug"],
                    },
                  ],
                },
              ],
            },
          ],
        },
        buildRestSection(config, ["title", "slug"]),
      ],
    }
    step.labels = { singular: textOf("step.singular"), plural: "Steps" }
    step.areas!.tips.label = textOf("step.tips")
    step.admin = {
      sections: [{ label: textOf("step.main"), fields: ["heading"] }],
    }

    const registry = prepareRegistry(config)
    const prepared = registry.collections.recipe

    expect(prepared.labels).toEqual({
      singular: translationOf("recipe.singular"),
      plural: "Recipes",
    })
    expect(prepared.admin.description).toEqual(
      translationOf("recipe.description")
    )
    expect(prepared.admin.actions.at(-1)).toEqual({
      type: "link",
      label: translationOf("recipe.import"),
      to: "/import",
    })
    expect(
      prepared.fields.find(({ name }) => name === "title")?.description
    ).toEqual(translationOf("fields.titleHint"))
    expect(
      prepared.fields.find(({ name }) => name === "difficulty")?.options
    ).toEqual([
      { value: "easy", label: translationOf("difficulty.easy") },
      { value: "hard", label: "Hard" },
    ])
    expect(prepared.areas[0].label).toEqual(translationOf("recipe.sections"))
    expect(prepared.admin.sections[0]).toMatchObject({
      label: translationOf("recipe.main"),
      fields: [
        {
          type: "tabs",
          tabs: [
            { label: translationOf("recipe.tab"), fields: ["title"] },
            {
              label: "Other",
              fields: [
                {
                  type: "group",
                  label: translationOf("recipe.group"),
                  description: translationOf("recipe.groupHint"),
                  fields: ["slug"],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(registry.blocks.step).toMatchObject({
      labels: { singular: translationOf("step.singular"), plural: "Steps" },
      areas: [{ name: "tips", label: translationOf("step.tips") }],
      admin: { sections: [{ label: translationOf("step.main") }] },
    })
  })

  it("quotes a translation's key in a startup error", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      ...config.collections[0].admin,
      sections: [{ key: "main", label: textOf("recipe.main"), fields: [] }],
    }

    expect(errorOf(config)).toContain(
      'collection "recipe": admin section "recipe.main" lists no fields or areas'
    )
  })

  it("refuses a translation that names no namespace when the config sets none", () => {
    const config = buildTestConfig()
    delete config.admin

    expect(errorOf(config)).toContain(
      'collection "recipe": field "servings" label: the translation "recipe.servings" names no namespace'
    )
  })

  it.each(["", "translation", "medusa-plugin-cms", "manager-form-fields"])(
    'refuses the namespace "%s"',
    (translationNs) => {
      const config = buildTestConfig()
      config.admin = { translationNs }

      expect(errorOf(config)).toContain(
        `admin: "translationNs" needs a namespace of the project's own, not "${translationNs}"`
      )
    }
  )
})

/**
 * Puts the test tag's route under the recipe's in the test config's routes.
 *
 * @param config - The config, changed in place.
 */
const putTagUnderRecipe = (config: Config): void => {
  config.admin = {
    ...config.admin,
    routes: [
      {
        slug: "recipes",
        collections: ["recipe"],
        children: [{ slug: "tags", collections: ["tag"] }],
      },
      {
        slug: "settings",
        label: "Settings",
        collections: ["settings", "settings_link"],
      },
    ],
  }
}

describe("prepareRegistry, on header actions", () => {
  it("gives a list collection a button per child of its route, then create, and a singleton none", () => {
    const config = buildTestConfig()
    putTagUnderRecipe(config)

    const { recipe, tag, settings, settings_link } =
      prepareRegistry(config).collections

    expect(recipe.admin.actions).toEqual([
      { type: "route", route: "tags" },
      { type: "create" },
    ])
    expect(tag.admin.actions).toEqual([{ type: "create" }])
    expect(settings.admin.actions).toEqual([])
    expect(settings_link.admin.actions).toEqual([{ type: "create" }])
  })

  it("runs an actions function once, on a copy of the defaults, keeping what it returns", () => {
    const config = buildTestConfig()
    putTagUnderRecipe(config)
    const actions = jest.fn(
      ({ defaultActions }: { defaultActions: CollectionAction[] }) => {
        defaultActions.push({ type: "link", label: "Import", to: "/import" })

        return [defaultActions[2], defaultActions[1]]
      }
    )
    config.collections[0].admin = { ...config.collections[0].admin, actions }

    expect(prepareRegistry(config).collections.recipe.admin.actions).toEqual([
      { type: "link", label: "Import", to: "/import" },
      { type: "create" },
    ])
    expect(actions).toHaveBeenCalledTimes(1)
  })

  it("takes a list in place of the defaults", () => {
    const config = buildTestConfig()
    config.collections[0].admin = {
      ...config.collections[0].admin,
      actions: [{ type: "collection", collection: "settings" }],
    }

    expect(prepareRegistry(config).collections.recipe.admin.actions).toEqual([
      { type: "collection", collection: "settings" },
    ])
  })

  it.each([
    [
      "actions on a singleton",
      (config: Config) => {
        config.collections[2].admin = {
          ...config.collections[2].admin,
          actions: [{ type: "create" }],
        }
      },
      'collection "settings": a singleton takes no admin "actions", as its page has no header',
    ],
    [
      "a function that throws",
      (config: Config) => {
        config.collections[0].admin!.actions = () => {
          throw new Error("no import yet")
        }
      },
      'collection "recipe": the admin "actions" function threw: no import yet',
    ],
    [
      "a function that returns no list",
      (config: Config) => {
        config.collections[0].admin!.actions = (() =>
          "create") as unknown as () => CollectionAction[]
      },
      'collection "recipe": admin "actions" must be a list of actions',
    ],
    [
      "an action of an unknown type",
      (config: Config) => {
        config.collections[0].admin!.actions = [
          { type: "delete" } as unknown as CollectionAction,
        ]
      },
      'collection "recipe": admin "actions" [0]: needs a type of create, collection, route, link',
    ],
    [
      "an action naming no route",
      (config: Config) => {
        config.collections[0].admin!.actions = [
          { type: "route", route: "gone" },
        ]
      },
      'collection "recipe": admin "actions" [0]: "route" "gone" is no route',
    ],
    [
      "an action naming no collection",
      (config: Config) => {
        config.collections[0].admin!.actions = [
          { type: "create" },
          { type: "collection", collection: "gone" },
        ]
      },
      'collection "recipe": admin "actions" [1]: "collection" "gone" is no collection on a route',
    ],
    [
      "a link without a label",
      (config: Config) => {
        config.collections[0].admin!.actions = [
          { type: "link", label: " ", to: "/import" },
        ]
      },
      'collection "recipe": admin "actions" [0]: a link needs a "label" and a "to" starting with "/"',
    ],
    [
      "a link outside the Admin's paths",
      (config: Config) => {
        config.collections[0].admin!.actions = [
          { type: "link", label: "Docs", to: "https://example.com" },
        ]
      },
      'collection "recipe": admin "actions" [0]: a link needs a "label" and a "to" starting with "/"',
    ],
    [
      "create twice",
      (config: Config) => {
        config.collections[0].admin!.actions = [
          { type: "create" },
          { type: "create" },
        ]
      },
      'collection "recipe": admin "actions" holds "create" twice',
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = buildTestConfig()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })
})

describe("prepareRegistry, on relationships", () => {
  const RelTarget = defineDocumentModel("test_rel_target", {
    prefix: "trt",
    columns: {
      referred_by: model.hasMany(() => RelReferrer, { mappedBy: "target" }),
      required_by: model.hasMany(() => RelRequired, { mappedBy: "target" }),
    },
  })
  const RelReferrer = defineDocumentModel("test_rel_referrer", {
    prefix: "trr",
    columns: {
      target: model
        .belongsTo(() => RelTarget, { mappedBy: "referred_by" })
        .nullable(),
    },
  })
  const RelRequired = defineDocumentModel("test_rel_required", {
    prefix: "trq",
    columns: {
      target: model.belongsTo(() => RelTarget, { mappedBy: "required_by" }),
    },
  })

  /**
   * Builds the test config with a target collection and a collection pointing at it.
   *
   * @returns The config, the referrer's collection last.
   */
  const configWithRelation = (): Config => {
    const config = buildTestConfig()
    config.collections.push(
      {
        slug: "rel_target",
        model: RelTarget,
        labels: { singular: "Target", plural: "Targets" },
        fields: { title: { type: "text", label: "Title" } },
        admin: buildOneSectionAdmin(["title"]),
      },
      {
        slug: "rel_referrer",
        model: RelReferrer,
        labels: { singular: "Referrer", plural: "Referrers" },
        admin: buildOneSectionAdmin(["target_id"]),
        fields: {
          target_id: {
            type: "relationship",
            relationTo: "rel_target",
            label: "Target",
            options: { hook: "targets" },
          },
        },
      }
    )

    return config
  }

  it("prepares a relationship on a belongsTo's key, with its target and hook", () => {
    const referrer =
      prepareRegistry(configWithRelation()).collections.rel_referrer

    expect(referrer.fields).toEqual([
      expect.objectContaining({
        name: "target_id",
        kind: "relationship",
        relationTo: "rel_target",
        options: { hook: "targets" },
      }),
    ])
    expect(referrer.columns).toContain("target_id")
  })

  it("lets the table show a relationship's key", () => {
    const config = configWithRelation()
    config.collections.at(-1)!.admin = {
      ...config.collections.at(-1)!.admin,
      useAsTitle: "target_id",
      table: { columns: [{ field: "target_id" }] },
    }

    expect(errorOf(config)).toBe("")
  })

  it("takes a required relationship whose schema refuses null", () => {
    const config = configWithRelation()
    config.collections.push({
      slug: "rel_required",
      model: RelRequired,
      labels: { singular: "Required", plural: "Required" },
      admin: buildOneSectionAdmin(["target_id"]),
      fields: {
        target_id: {
          type: "relationship",
          relationTo: "rel_target",
          label: "Target",
          serverValidation: z.string(),
        },
      },
    })

    expect(
      prepareRegistry(config).collections.rel_required.fields[0].required
    ).toBe("always")
  })

  it.each<[string, (config: Config) => void, string]>([
    [
      "a relationship on a column that is no belongsTo's key",
      (config) => {
        config.collections.at(-1)!.fields!.title = {
          type: "relationship",
          relationTo: "rel_target",
          label: "Title",
        }
      },
      'collection "rel_referrer": relationship "title" must sit on the foreign key of a belongsTo',
    ],
    [
      "a relationship without its relationTo",
      (config) => {
        config.collections.at(-1)!.fields!.target_id = {
          type: "relationship",
          relationTo: " ",
          label: "Target",
        }
      },
      'relationship "target_id" needs the collection it points at, its "relationTo"',
    ],
    [
      "a relationship to no collection",
      (config) => {
        config.collections.at(-1)!.fields!.target_id = {
          type: "relationship",
          relationTo: "nowhere",
          label: "Target",
        }
      },
      'relationship "target_id": "relationTo" "nowhere" is not a collection',
    ],
    [
      "a relationship to a block",
      (config) => {
        config.collections.at(-1)!.fields!.target_id = {
          type: "relationship",
          relationTo: "step",
          label: "Target",
        }
      },
      'relationship "target_id" points at the block "step"; a relation points at a collection',
    ],
    [
      "a relationship to a collection of another model",
      (config) => {
        config.collections.at(-1)!.fields!.target_id = {
          type: "relationship",
          relationTo: "tag",
          label: "Target",
        }
      },
      '"relationTo" "tag" is registered for TestTag, but the relation "target" points at TestRelTarget',
    ],
    [
      "another field type on a belongsTo's key",
      (config) => {
        config.collections.at(-1)!.fields!.target_id = {
          type: "text",
          label: "Target",
        }
      },
      '"target_id" is the key of the relation "target", so its field must be a relationship',
    ],
    [
      "a relationship naming an empty hook",
      (config) => {
        config.collections.at(-1)!.fields!.target_id = {
          type: "relationship",
          relationTo: "rel_target",
          label: "Target",
          options: { hook: " " },
        }
      },
      'relationship "target_id" needs a hook name',
    ],
    [
      "a required belongsTo the config does not list",
      (config) => {
        config.collections.push({
          slug: "rel_required",
          model: RelRequired,
          labels: { singular: "Required", plural: "Required" },
          // A field of its own, so the relation's key is the one thing the config leaves out.
          fields: { title: { type: "text", label: "Title" } },
          admin: buildOneSectionAdmin(["title"]),
        })
      },
      'collection "rel_required": "target_id" is required by the relation "target", so the config must list it as a relationship field',
    ],
    [
      "a required relationship whose schema lets null through",
      (config) => {
        config.collections.push({
          slug: "rel_required",
          model: RelRequired,
          labels: { singular: "Required", plural: "Required" },
          admin: buildOneSectionAdmin(["target_id"]),
          fields: {
            target_id: {
              type: "relationship",
              relationTo: "rel_target",
              label: "Target",
            },
          },
        })
      },
      '"target_id" is required by its column, so its field\'s "serverValidation" must refuse an empty value',
    ],
    [
      "a relationship on a block",
      (config) => {
        config.blocks![0].fields = {
          ...config.blocks![0].fields,
          title: { type: "relationship", relationTo: "recipe", label: "Title" },
        }
      },
      'field "title" is a relationship, which a block cannot hold',
    ],
  ])("refuses %s", (_name, breakConfig, expected) => {
    const config = configWithRelation()
    breakConfig(config)

    expect(errorOf(config)).toContain(expected)
  })
})
