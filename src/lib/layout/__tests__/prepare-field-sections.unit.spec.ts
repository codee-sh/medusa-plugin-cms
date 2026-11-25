import { buildTestConfig } from "../../__tests__/fixtures"
import type {
  CollectionConfig,
  Config,
  LayoutSectionConfig,
} from "../../config/types"
import { prepareRegistry } from "../../registry/prepare-registry"

/**
 * Builds the test config with the recipe's config changed.
 *
 * @param change - Changes the recipe's config in place.
 * @returns The config.
 */
const configWithRecipe = (
  change: (recipe: CollectionConfig) => void
): Config => {
  const config = buildTestConfig()
  change(config.collections.find(({ slug }) => slug === "recipe")!)

  return config
}

/**
 * Builds the registry and returns its error message.
 *
 * @param config - The config.
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

describe("prepareFieldSections", () => {
  it("keeps each section's key, its position filled in", () => {
    const { sections } =
      prepareRegistry(buildTestConfig()).collections.recipe.admin

    expect(sections.map(({ key, position }) => ({ key, position }))).toEqual([
      { key: "recipe", position: "main" },
      { key: "media", position: "side" },
      { key: "content", position: "main" },
    ])
  })

  it("keeps a section without a label, which draws no heading", () => {
    const config = configWithRecipe((recipe) => {
      delete recipe.admin.sections[0].label
    })

    expect(
      prepareRegistry(config).collections.recipe.admin.sections[0]
    ).toMatchObject({ key: "recipe", label: undefined })
  })

  it("refuses a singleton's section without a label, which titles its card", () => {
    const config = buildTestConfig()
    const settings = config.collections.find(({ slug }) => slug === "settings")!
    delete settings.admin.sections[0].label

    expect(errorOf(config)).toContain(
      `collection "settings": a singleton's admin section [0] needs a "label"`
    )
  })

  it("names a section without a label by its place in an error", () => {
    const config = configWithRecipe((recipe) => {
      const [section] = recipe.admin.sections as LayoutSectionConfig[]
      delete section.label
      section.fields = [...section.fields, "nope"]
    })

    expect(errorOf(config)).toContain(
      'collection "recipe": admin section [0] names "nope", which is not an editable field'
    )
  })

  it.each<[string, (recipe: CollectionConfig) => void, string]>([
    [
      "a collection without sections",
      (recipe) => {
        recipe.admin = { ...recipe.admin, sections: [] }
      },
      'collection "recipe": admin needs "sections", at least one',
    ],
    [
      "a collection whose config leaves admin out",
      (recipe) => {
        delete (recipe as { admin?: unknown }).admin
      },
      'collection "recipe": admin needs "sections", at least one',
    ],
    [
      "fields no section holds",
      (recipe) => {
        ;(recipe.admin.sections[0] as LayoutSectionConfig).fields = [
          "title",
          "slug",
        ]
      },
      'collection "recipe": "servings", "vegan", "cooked_at", "difficulty", "labels", "notes", "summary", "related_recipe_id" sit in no admin section',
    ],
    [
      "an area no section holds",
      (recipe) => {
        recipe.admin.sections = recipe.admin.sections.filter(
          ({ key }) => key !== "content"
        )
      },
      'collection "recipe": area "sections" sit in no admin section',
    ],
  ])("refuses %s", (_name, change, message) => {
    expect(errorOf(configWithRecipe(change))).toContain(message)
  })
})
