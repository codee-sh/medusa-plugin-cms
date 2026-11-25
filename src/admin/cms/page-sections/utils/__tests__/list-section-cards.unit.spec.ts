import { buildTestConfig } from "../../../../../lib/__tests__/fixtures"
import type { ClientCollection } from "../../../../../lib/collection/types"
import type { LayoutSectionConfig } from "../../../../../lib/config/types"
import { prepareRegistry } from "../../../../../lib/registry/prepare-registry"
import { listSectionCards } from "../list-section-cards"

/**
 * Prepares the test singleton with the given sections, as the Admin receives it.
 *
 * @param sections - The sections of its form.
 * @returns The collection.
 */
const settingsWith = (sections: LayoutSectionConfig[]): ClientCollection => {
  const config = buildTestConfig()
  const settings = config.collections.find(({ slug }) => slug === "settings")!
  // The default routes, so the links stay in reach without the settings' table section.
  delete config.admin!.routes
  settings.admin = { sections }

  return prepareRegistry(config).collections
    .settings as unknown as ClientCollection
}

/**
 * Reduces cards to what a test compares: each key, label and field names.
 *
 * @param cards - The cards.
 * @returns The cards' keys, labels and field names.
 */
const describeCards = (cards: ReturnType<typeof listSectionCards>["main"]) =>
  cards.map(({ key, label, fields }) => ({
    key,
    label,
    fields: fields.map(({ name }) => name),
  }))

describe("listSectionCards", () => {
  it("keys each section's card by its key and places it in its column", () => {
    const { main, side } = listSectionCards(
      settingsWith([
        {
          key: "note",
          label: "Note",
          fields: ["featured_note"],
          position: "side",
        },
        {
          key: "title",
          label: "Title",
          description: "The heading",
          fields: ["title", "featured_recipe_id"],
        },
      ])
    )

    expect(describeCards(main)).toEqual([
      { key: "title", label: "Title", fields: ["title", "featured_recipe_id"] },
    ])
    expect(main[0].description).toBe("The heading")
    expect(describeCards(side)).toEqual([
      { key: "note", label: "Note", fields: ["featured_note"] },
    ])
  })

  it("draws no card beyond the sections, a singleton's fields all in them", () => {
    const { main, side } = listSectionCards(
      settingsWith([
        {
          key: "main",
          label: "Settings",
          fields: ["title", "featured_note", "featured_recipe_id"],
        },
      ])
    )

    expect([...main, ...side].map(({ key }) => key)).toEqual(["main"])
  })
})
