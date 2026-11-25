import { buildTestConfig } from "../../../../../lib/__tests__/fixtures"
import { prepareRegistry } from "../../../../../lib/registry/prepare-registry"
import { buildFieldDefaults } from "../build-field-defaults"

const registry = prepareRegistry(buildTestConfig())
const mediaFields = registry.collections.recipe.fields.filter(
  ({ kind }) => kind === "media"
)

/**
 * Builds a record the File Module would answer for a key.
 *
 * @param id - The file's key.
 * @returns The record.
 */
const fileOf = (id: string) => ({ id, url: `http://localhost/static/${id}` })

describe("buildFieldDefaults, on media", () => {
  it("holds each record's stored value where the read put the record", () => {
    expect(
      buildFieldDefaults(mediaFields, {
        cover: fileOf("cover.png"),
        gallery: [fileOf("a.png"), fileOf("b.pdf")],
      })
    ).toEqual({ cover: "cover.png", gallery: ["a.png", "b.pdf"] })
  })

  it("keeps a stored value as it is, and an empty field as the input's empty value", () => {
    expect(
      buildFieldDefaults(mediaFields, { cover: "cover.png", gallery: null })
    ).toEqual({ cover: "cover.png", gallery: [] })
    expect(buildFieldDefaults(mediaFields, {})).toEqual({
      cover: "",
      gallery: [],
    })
  })
})

describe("buildFieldDefaults, on a number", () => {
  const numberFields = [
    {
      name: "servings",
      kind: "number" as const,
      label: "Servings",
      searchable: false,
    },
  ]

  it("keeps an empty number as null, as its input gives it back once emptied", () => {
    expect(buildFieldDefaults(numberFields, {})).toEqual({ servings: null })
    expect(buildFieldDefaults(numberFields, { servings: 4 })).toEqual({
      servings: 4,
    })
  })
})

describe("buildFieldDefaults, on a combobox", () => {
  const config = buildTestConfig()
  config.collections[0].fields!.labels = {
    type: "combobox",
    label: "Labels",
    multiple: true,
    options: { hook: "labels" },
  }
  config.collections[0].fields!.cover = {
    type: "combobox",
    label: "Cover",
    options: { hook: "covers" },
  }
  const comboboxFields = prepareRegistry(
    config
  ).collections.recipe.fields.filter(({ kind }) => kind === "combobox")

  it("keeps the stored values, a list for several and a text for one", () => {
    expect(
      buildFieldDefaults(comboboxFields, {
        labels: ["prod_1", "prod_2"],
        cover: "prod_3",
      })
    ).toEqual({ labels: ["prod_1", "prod_2"], cover: "prod_3" })
  })

  it("gives an empty combobox of several values an empty list, and of one an empty text", () => {
    expect(
      buildFieldDefaults(comboboxFields, { labels: null, cover: null })
    ).toEqual({ labels: [], cover: "" })
  })
})

describe("buildFieldDefaults, on rich text", () => {
  const richTextFields = registry.collections.recipe.fields.filter(
    ({ kind }) => kind === "richtext"
  )
  const document = {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "a" }] },
      ],
    },
  }

  it("keeps a read document, and starts an empty field at null", () => {
    expect(buildFieldDefaults(richTextFields, { summary: document })).toEqual({
      summary: document,
    })
    expect(buildFieldDefaults(richTextFields, {})).toEqual({ summary: null })
  })
})
