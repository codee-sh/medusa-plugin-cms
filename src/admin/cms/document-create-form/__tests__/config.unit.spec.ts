import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { ClientCollection } from "../../../../lib/collection/types"
import { prepareRegistry } from "../../../../lib/registry/prepare-registry"
import { collectLayoutNames } from "../../../components/manager-form-fields/layout/utils/collect-layout-names"
import type { LayoutItemConfig } from "../../../components/manager-form-fields/layout/types"
import { getCreateFields } from "../config"

/**
 * Prepares the test recipe collection with a section laying out the given items, and the recipe's other
 * fields and its area in a second section.
 *
 * @param fields - The first section's layout.
 * @returns The collection, as the Admin reads it.
 */
const collectionWith = (fields: LayoutItemConfig[]) => {
  const config = buildTestConfig()
  const recipeConfig = config.collections[0]
  const laidOut = collectLayoutNames(fields)
  recipeConfig.admin = {
    sections: [
      { key: "cooking", label: "Cooking", fields: fields as never },
      {
        key: "rest",
        label: "Rest",
        fields: Object.keys(recipeConfig.fields!).filter(
          (name) => !laidOut.includes(name)
        ),
        areas: ["sections"],
      },
    ],
  }

  return prepareRegistry(config).collections
    .recipe as unknown as ClientCollection
}

describe("getCreateFields", () => {
  it("shows the fields required always or at publish", () => {
    expect(
      getCreateFields(collectionWith(["servings"])).map(({ name }) => name)
    ).toEqual(["title", "notes"])
  })

  it("adds the other fields of a component node that edits a required one", () => {
    const names = getCreateFields(
      collectionWith([
        {
          type: "component",
          component: "pair",
          fields: { amount: "servings", text: "notes" },
        },
        { type: "component", component: "flags", fields: ["vegan", "labels"] },
      ])
    ).map(({ name }) => name)

    expect(names).toEqual(
      expect.arrayContaining(["title", "notes", "servings"])
    )
    expect(names).not.toContain("vegan")
  })
})
