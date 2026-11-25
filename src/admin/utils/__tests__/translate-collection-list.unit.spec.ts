import type { ClientBlock } from "../../../lib/block/types"
import type { ClientText, TranslatedText } from "../../../lib/config/types"
import type { Field, RegistryLayoutSection } from "../../../lib/field/types"
import type { CmsCollectionWithCount } from "../../../workflows/cms/steps/list-cms-collections"
import {
  translateCollectionList,
  type TranslateText,
} from "../translate-collection-list"

/**
 * Stands in for i18next's `t`, showing the namespace, the key and the options it was given.
 *
 * @param key - The key.
 * @param options - The options, with the namespace.
 * @returns The namespace, the key and the options.
 */
const fakeT: TranslateText = (key, { ns, ...options }) =>
  Object.keys(options).length
    ? `${ns}:${key}${JSON.stringify(options)}`
    : `${ns}:${key}`

/**
 * Builds a translation of the test namespace, as the server answers it.
 *
 * @param key - The key.
 * @param options - i18next's options, if any.
 * @returns The translation.
 */
const tr = (
  key: string,
  options?: TranslatedText["options"]
): TranslatedText => ({
  type: "translation",
  key,
  ns: "cms-test",
  ...(options && { options }),
})

/**
 * Builds a field as far as the walk reads it.
 *
 * @param overrides - Keys to replace.
 * @returns The field.
 */
const fieldOf = (
  overrides: Partial<Field<ClientText>> = {}
): Field<ClientText> => ({
  name: "title",
  kind: "text",
  label: tr("fields.title"),
  searchable: false,
  ...overrides,
})

/**
 * Builds a block type holding a translated label, field, area and section.
 *
 * @returns The block type.
 */
const blockOf = (): ClientBlock<ClientText> => ({
  slug: "step",
  idPrefix: "tstep",
  labels: { singular: tr("step.singular"), plural: "Steps" },
  fields: [fieldOf({ name: "heading", label: tr("step.heading") })],
  areas: [{ name: "tips", label: tr("step.tips"), blocks: ["tip"] }],
  admin: {
    sections: [{ label: tr("step.main"), fields: ["heading"] }],
  },
})

/**
 * Builds a collection holding translations at every depth, beside plain texts.
 *
 * @returns The collection.
 */
const collectionOf = (): CmsCollectionWithCount<ClientText> => ({
  slug: "recipe",
  idPrefix: "trec",
  labels: { singular: tr("recipe.singular"), plural: "Recipes" },
  drafts: true,
  singleton: false,
  store: true,
  count: 2,
  admin: {
    table: {
      columns: [{ field: "title", label: tr("recipe.title") }],
    },
    description: tr("recipe.description"),
    route: "recipe",
    actions: [
      { type: "collection", collection: "tag" },
      { type: "link", label: tr("recipe.import"), to: "/import" },
      { type: "create" },
    ],
    sections: [
      {
        key: "main",
        label: "Main",
        position: "main",
        fields: [
          { type: "row", fields: ["title", "difficulty"] },
          {
            type: "tabs",
            tabs: [
              {
                label: tr("recipe.tab"),
                fields: [
                  {
                    type: "collapsible",
                    label: tr("recipe.more", { context: "short" }),
                    fields: ["title"],
                  },
                ],
              },
              { label: "Other", fields: ["difficulty"] },
            ],
          },
        ],
      },
    ],
  },
  columns: ["title"],
  unique: [],
  fields: [
    fieldOf({ description: tr("fields.titleHint") }),
    fieldOf({
      name: "difficulty",
      kind: "select",
      label: "Difficulty",
      options: [{ value: "easy", label: tr("difficulty.easy") }],
    }),
  ],
  areas: [{ name: "sections", label: tr("recipe.sections"), blocks: ["step"] }],
  blocks: [blockOf()],
  maxDepth: 4,
})

/**
 * Translates a list of one collection.
 *
 * @returns The collection as the walk returns it.
 */
const translatedOf = () =>
  translateCollectionList(
    { collections: [collectionOf()], routes: [], media_provider: null },
    fakeT
  ).collections[0]

/**
 * Reads the collection's first section, a `details` one.
 *
 * @param recipe - The translated collection.
 * @returns The section.
 */
const mainSectionOf = (recipe: ReturnType<typeof translatedOf>) =>
  recipe.admin.sections[0] as RegistryLayoutSection<string>

describe("translateCollectionList", () => {
  it("turns every translation into its text, at any depth, with its namespace and options", () => {
    const recipe = translatedOf()

    expect(recipe.labels.singular).toBe("cms-test:recipe.singular")
    expect(recipe.admin.description).toBe("cms-test:recipe.description")
    expect(recipe.admin.table?.columns[0]).toEqual({
      field: "title",
      label: "cms-test:recipe.title",
    })
    expect(recipe.admin.actions[1]).toEqual({
      type: "link",
      label: "cms-test:recipe.import",
      to: "/import",
    })
    expect(recipe.fields[0]).toMatchObject({
      label: "cms-test:fields.title",
      description: "cms-test:fields.titleHint",
    })
    expect(recipe.fields[1].options).toEqual([
      { value: "easy", label: "cms-test:difficulty.easy" },
    ])
    expect(recipe.areas[0].label).toBe("cms-test:recipe.sections")
    expect(mainSectionOf(recipe).fields[1]).toEqual({
      type: "tabs",
      tabs: [
        {
          label: "cms-test:recipe.tab",
          fields: [
            {
              type: "collapsible",
              label: 'cms-test:recipe.more{"context":"short"}',
              fields: ["title"],
            },
          ],
        },
        { label: "Other", fields: ["difficulty"] },
      ],
    })
    expect(recipe.blocks[0]).toMatchObject({
      labels: { singular: "cms-test:step.singular", plural: "Steps" },
      fields: [{ label: "cms-test:step.heading" }],
      areas: [{ name: "tips", label: "cms-test:step.tips" }],
      admin: { sections: [{ label: "cms-test:step.main" }] },
    })
  })

  it("keeps a string as written and a node's or an action's own type as it is", () => {
    const recipe = translatedOf()

    expect(recipe.labels.plural).toBe("Recipes")
    expect(recipe.fields[1].label).toBe("Difficulty")
    expect(recipe.admin.sections[0].label).toBe("Main")
    expect(mainSectionOf(recipe).fields[0]).toEqual({
      type: "row",
      fields: ["title", "difficulty"],
    })
    expect(recipe.admin.actions[0]).toEqual({
      type: "collection",
      collection: "tag",
    })
    expect(recipe.admin.actions[2]).toEqual({ type: "create" })
  })

  it("keeps the response's other keys, and translates a route's label", () => {
    const list = translateCollectionList(
      {
        collections: [collectionOf()],
        routes: [
          {
            slug: "recipes",
            label: tr("recipe.route"),
            collections: [{ collection: "recipe", key: "recipe" }],
            children: ["tags"],
          },
          {
            slug: "tags",
            label: "Tags",
            collections: [{ collection: "tag", key: "tag" }],
            parent: "recipes",
            children: [],
          },
        ],
        media_provider: { searchable: true, maxFileSize: 10 },
      },
      fakeT
    )

    expect(list.media_provider).toEqual({ searchable: true, maxFileSize: 10 })
    expect(list.routes.map(({ slug, label }) => [slug, label])).toEqual([
      ["recipes", "cms-test:recipe.route"],
      ["tags", "Tags"],
    ])
    expect(list.collections[0]).toMatchObject({
      slug: "recipe",
      count: 2,
      maxDepth: 4,
      columns: ["title"],
    })
  })
})
