import {
  prepareListQuery,
  prepareRetrieveQuery,
} from "@medusajs/framework/http"
import { buildTestConfig } from "../../__tests__/fixtures"
import type { Config } from "../../config/types"
import type { Field } from "../../field/types"
import { prepareRegistry } from "../../registry/prepare-registry"
import { listStoreColumns } from "../list-store-columns"
import { prepareStoreQuery } from "../prepare-store-query"
import type { StoreQueryInput } from "../types"
import type { StoreRouteQuery } from "../types"

/**
 * Builds a field as the registry projects it.
 *
 * @param name - The field's column.
 * @param hidden - Whether the store leaves it out.
 * @returns The field.
 */
const fieldOf = (name: string, hidden?: true): Field => ({
  name,
  kind: "text",
  label: name,
  searchable: false,
  ...(hidden && { store: { hidden } }),
})

/** The collection's fields: a title, a slug and a hidden note. */
const FIELDS = [fieldOf("title"), fieldOf("slug"), fieldOf("notes", true)]

/**
 * A collection of a title, a slug, a hidden note, `metadata` and an area of steps and callouts; a step
 * has a heading, a hidden note, and tips that hold tips and steps; documents nest two levels.
 */
const INPUT: StoreQueryInput = {
  fields: FIELDS,
  columns: listStoreColumns(FIELDS, true),
  areas: [{ name: "sections", label: "Sections", blocks: ["step", "callout"] }],
  blocks: {
    step: {
      slug: "step",
      fields: [fieldOf("heading"), fieldOf("note", true)],
      areas: [{ name: "tips", label: "Tips", blocks: ["tip", "step"] }],
    },
    callout: { slug: "callout", fields: [fieldOf("body")], areas: [] },
    tip: { slug: "tip", fields: [fieldOf("text")], areas: [] },
  },
  maxDepth: 2,
}

/**
 * Runs a route's query as `validateAndTransformQuery` does: its schema, then Medusa's own preparation.
 *
 * @param route - The route's query.
 * @param query - The request's query.
 * @returns The fields and the pagination Medusa prepares.
 */
const prepare = async (
  { schema, config }: StoreRouteQuery,
  query: Record<string, unknown> = {}
) => {
  const validated = schema.parse(query) as Record<string, unknown>
  const { remoteQueryConfig } = config.isList
    ? await prepareListQuery(validated, config)
    : await prepareRetrieveQuery(validated, config)

  return {
    fields: [...remoteQueryConfig.fields].sort(),
    pagination: remoteQueryConfig.pagination,
  }
}

/**
 * Builds a test config whose recipe collection has the given `store` config.
 *
 * @param store - The collection's `store` config.
 * @returns The config.
 */
const configWithStore = (store: Config["collections"][number]["store"]) => {
  const config = buildTestConfig()
  config.collections[0].store = store
  return config
}

describe("prepareStoreQuery", () => {
  const { list, retrieve } = prepareStoreQuery(INPUT)

  it("answers a list's public columns, 20 from the first, without the areas or a hidden field", async () => {
    expect(await prepare(list)).toEqual({
      fields: ["id", "metadata", "published_at", "slug", "title", "updated_at"],
      pagination: { skip: 0, take: 20, order: undefined },
    })
  })

  it("answers a single document's public columns with its areas by name", async () => {
    expect((await prepare(retrieve)).fields).toEqual([
      "id",
      "metadata",
      "published_at",
      "sections",
      "slug",
      "title",
      "updated_at",
    ])
  })

  it("lets a client select an area's blocks by type and field, through a block's areas", async () => {
    expect(
      (
        await prepare(retrieve, {
          fields:
            "sections.step.heading,sections.callout.*,sections.step.tips.tip.text",
        })
      ).fields
    ).toEqual([
      "id",
      "sections.callout.*",
      "sections.step.heading",
      "sections.step.tips.tip.text",
    ])
  })

  it("leaves out a block path without a type, a hidden block field, and one past the depth", async () => {
    expect(
      (
        await prepare(retrieve, {
          fields:
            "sections.heading,sections.step.note,sections.step.tips.step.tips.tip.text",
        })
      ).fields
    ).toEqual(["id"])
  })

  it("lets Medusa read fields: replacing, adding, removing, and an area whole", async () => {
    expect((await prepare(list, { fields: "title" })).fields).toEqual([
      "id",
      "title",
    ])
    expect(
      (await prepare(list, { fields: "+*sections,-metadata" })).fields
    ).toEqual([
      "id",
      "published_at",
      "sections.*",
      "slug",
      "title",
      "updated_at",
    ])
  })

  it("leaves out without an error a hidden field and an unknown one", async () => {
    expect(
      (await prepare(list, { fields: "title,notes,nope" })).fields
    ).toEqual(["id", "title"])
  })

  it("orders by an allowed field, and refuses any other", async () => {
    expect((await prepare(list, { order: "-title" })).pagination).toMatchObject(
      { order: { title: "DESC" } }
    )
    await expect(prepare(list, { order: "notes" })).rejects.toMatchObject({
      type: "invalid_data",
    })
  })

  it.each([
    ["a limit over 100", { limit: "101" }],
    ["a key it does not declare", { nope: "1" }],
    ["deleted documents", { with_deleted: "true" }],
  ])("refuses %s on a list", (_label, query) => {
    expect(list.schema.safeParse(query).success).toBe(false)
  })

  it("takes a filterable boolean as a list's query key, from its text", () => {
    const { list } = prepareStoreQuery({
      ...INPUT,
      fields: [
        ...INPUT.fields,
        { ...fieldOf("vegan"), kind: "boolean", store: { filterable: true } },
      ],
    })

    expect(list.schema.parse({ vegan: "true" })).toMatchObject({ vegan: true })
    expect(list.schema.parse({ vegan: "false" })).toMatchObject({
      vegan: false,
    })
    expect(list.schema.safeParse({ vegan: "maybe" }).success).toBe(false)
    expect(list.schema.safeParse({ title: "Soup" }).success).toBe(false)
  })

  it.each([
    [
      "a field that is not a boolean",
      {
        fields: [{ ...fieldOf("title"), store: { filterable: true as const } }],
      },
      /field "title" is filterable, but only a boolean field can be filterable/,
    ],
    [
      "a hidden field",
      {
        fields: [
          {
            ...fieldOf("vegan"),
            kind: "boolean" as const,
            store: { hidden: true as const, filterable: true as const },
          },
        ],
      },
      /field "vegan" is filterable and hidden/,
    ],
    [
      "a block's field",
      {
        blocks: {
          ...INPUT.blocks,
          tip: {
            slug: "tip",
            fields: [
              { ...fieldOf("text"), store: { filterable: true as const } },
            ],
            areas: [],
          },
        },
      },
      /block "tip": field "text" is filterable, and a block's field never is/,
    ],
  ])("refuses a filterable %s", (_label, input, message) => {
    expect(() => prepareStoreQuery({ ...INPUT, ...input })).toThrow(message)
  })

  it("takes only fields on a single document", () => {
    expect(retrieve.schema.safeParse({ fields: "title" }).success).toBe(true)
    expect(retrieve.schema.safeParse({ limit: "1" }).success).toBe(false)
  })

  it("takes the config's defaults, page size and relations limit", async () => {
    const configured = prepareStoreQuery(INPUT, {
      list: { defaults: ["title"], defaultLimit: 12, storeRelationsLimit: 2 },
      retrieve: { defaults: ["title", "sections"], storeRelationsLimit: 3 },
    })

    expect(await prepare(configured.list)).toEqual({
      fields: ["title"],
      pagination: { skip: 0, take: 12, order: undefined },
    })
    expect((await prepare(configured.retrieve)).fields).toEqual([
      "sections",
      "title",
    ])
    expect(configured.list.config.storeRelationsLimit).toBe(2)
    expect(configured.retrieve.config.storeRelationsLimit).toBe(3)
  })

  it.each([
    ["a hidden field", { list: { defaults: ["notes"] } }],
    ["an unknown field", { retrieve: { defaults: ["nope"] } }],
    ["an area on a list", { list: { defaults: ["title", "sections"] } }],
    [
      "a block field on a list",
      { list: { defaults: ["sections.step.heading"] } },
    ],
    ["a page size over 100", { list: { defaultLimit: 101 } }],
    ["a page size of 0", { list: { defaultLimit: 0 } }],
  ])("refuses a store config naming %s", (_label, store) => {
    expect(() =>
      prepareStoreQuery(INPUT, store, 'collection "recipe"')
    ).toThrow(/: collection "recipe": store\./)
  })

  it("builds every registered collection's query from its config", () => {
    const registry = prepareRegistry(
      configWithStore({ list: { defaultLimit: 5 } })
    )

    expect(registry.collections.recipe.storeQuery.list.config).toMatchObject({
      defaultLimit: 5,
      allowed: expect.arrayContaining([
        "title",
        "cover",
        "sections",
        "sections.step.heading",
        "sections.callout.image",
        "sections.step.tips.tip.text",
      ]),
    })
  })

  it("still builds the query of a collection kept out of the store", () => {
    const registry = prepareRegistry(configWithStore(false))

    expect(registry.collections.recipe.store).toBe(false)
    expect(registry.collections.recipe.storeQuery.list.config.isList).toBe(true)
  })
})
