import {
  ADMIN_EXTENSIONS_STORE_KEY,
  defineCmsOptionsHook,
} from "../../../../../admin-extensions/registry"
import type { CmsOptionsHook } from "../../../../../admin-extensions/types"
import type { Field } from "../../../../../lib/field/types"
import type { ResolvedRichTextFeature } from "../../../../../shared/rich-text/types"
import { buildFieldConfig } from "../build-field-config"

afterEach(() => {
  delete (globalThis as unknown as Record<symbol, unknown>)[
    ADMIN_EXTENSIONS_STORE_KEY
  ]
})

/**
 * Builds a field with the keys every field has.
 *
 * @param overrides - The keys the test sets.
 * @returns The field.
 */
const fieldOf = (overrides: Partial<Field>): Field => ({
  name: "title",
  kind: "text",
  label: "Title",
  searchable: false,
  ...overrides,
})

describe("buildFieldConfig", () => {
  it("describes a text field with its label and description", () => {
    expect(
      buildFieldConfig(
        fieldOf({ description: "The line above the title", required: "always" })
      )
    ).toEqual({
      type: "text",
      name: "title",
      label: "Title",
      description: "The line above the title",
      required: "always",
      options: undefined,
    })
  })

  it("passes a text field's recommended length and placeholder source", () => {
    expect(
      buildFieldConfig(
        fieldOf({ recommendedLength: 60, placeholderFrom: "headline" })
      )
    ).toMatchObject({ recommendedLength: 60, placeholderFrom: "headline" })
  })

  it("passes when a field must be filled as its word, and none for an optional field", () => {
    expect(buildFieldConfig(fieldOf({ required: "always" })).required).toBe(
      "always"
    )
    expect(buildFieldConfig(fieldOf({ required: "publish" })).required).toBe(
      "publish"
    )
    expect(buildFieldConfig(fieldOf({})).required).toBeUndefined()
  })

  it("renders a textarea input as a textarea and each kind as its type", () => {
    expect(buildFieldConfig(fieldOf({ input: "textarea" })).type).toBe(
      "textarea"
    )
    expect(buildFieldConfig(fieldOf({ kind: "slug" })).type).toBe("text")
    expect(buildFieldConfig(fieldOf({ kind: "number" })).type).toBe("number")
    expect(buildFieldConfig(fieldOf({ kind: "boolean" })).type).toBe("switch")
    expect(buildFieldConfig(fieldOf({ kind: "text_list" })).type).toBe(
      "chip-input"
    )
  })

  it("gives a select its options as the select names them", () => {
    expect(
      buildFieldConfig(
        fieldOf({
          kind: "select",
          options: [{ value: "left", label: "Left" }],
        })
      ).options
    ).toEqual([{ value: "left", name: "Left" }])
  })

  it("gives a combobox whose options a hook gives the hook registered under its name", () => {
    const useProducts: CmsOptionsHook = () => ({
      options: [{ value: "prod_1", label: "Shirt" }],
      isPending: false,
      isError: false,
    })
    defineCmsOptionsHook("products", useProducts)

    expect(
      buildFieldConfig(
        fieldOf({ kind: "combobox", options: { hook: "products" } })
      )
    ).toMatchObject({
      type: "combobox",
      options: undefined,
      optionsSource: "products",
      optionsHook: useProducts,
    })
  })

  it("leaves a combobox without a hook when no one registered its name", () => {
    const config = buildFieldConfig(
      fieldOf({ kind: "combobox", options: { hook: "products" } })
    )

    expect(config).toMatchObject({
      type: "combobox",
      optionsSource: "products",
    })
    expect(config.optionsHook).toBeUndefined()
  })

  it("gives a combobox with listed options those options and no source", () => {
    const config = buildFieldConfig(
      fieldOf({
        kind: "combobox",
        options: [{ value: "left", label: "Left" }],
      })
    )

    expect(config).toMatchObject({
      type: "combobox",
      options: [{ value: "left", name: "Left" }],
    })
    expect(config.optionsSource).toBeUndefined()
    expect(config.optionsHook).toBeUndefined()
  })

  it("gives a combobox of several values its multiple and its max as maxItems", () => {
    expect(
      buildFieldConfig(
        fieldOf({
          kind: "combobox",
          options: { hook: "products" },
          multiple: true,
          max: 3,
        })
      )
    ).toMatchObject({ type: "combobox", multiple: true, maxItems: 3 })
  })

  it("gives a combobox of one value neither multiple nor maxItems", () => {
    const config = buildFieldConfig(
      fieldOf({
        kind: "combobox",
        options: { hook: "products" },
        multiple: false,
      })
    )

    expect(config.multiple).toBeUndefined()
    expect(config.maxItems).toBeUndefined()
  })

  it("describes a date field as a date", () => {
    expect(buildFieldConfig(fieldOf({ kind: "date" })).type).toBe("date")
  })

  it("gives a media field what it stores, its types and how many files it holds", () => {
    expect(
      buildFieldConfig(
        fieldOf({
          kind: "media",
          stores: "id",
          mimeTypes: ["image/png"],
          multiple: true,
          max: 3,
        })
      )
    ).toMatchObject({
      type: "media",
      media: { store: "id", accept: ["image/png"], multiple: true, max: 3 },
    })
  })

  it("gives no media settings to another kind", () => {
    expect(buildFieldConfig(fieldOf({})).media).toBeUndefined()
  })

  it("gives a richtext field its features, each with its options", () => {
    const features: ResolvedRichTextFeature[] = [
      { key: "bold", props: {} },
      {
        key: "link",
        props: { linkPolicy: { protocols: ["https"], relative: false } },
      },
    ]

    expect(
      buildFieldConfig(fieldOf({ kind: "richtext", features }))
    ).toMatchObject({ type: "richtext", richText: { features } })
  })

  it("gives no rich text settings to another kind", () => {
    expect(buildFieldConfig(fieldOf({})).richText).toBeUndefined()
  })
})
