import type { ClientCollection } from "../../../../lib/collection/types"
import { buildUpdatePayload } from "../config"

const collection = {
  areas: [{ name: "sections" }, { name: "sidebar" }],
} as unknown as ClientCollection

const defaults = {
  title: "Soup",
  sections: [{ id: "block_1", block_type: "step", heading: "Cut" }],
  sidebar: [],
}

describe("buildUpdatePayload", () => {
  it("leaves out the areas left as they opened and sends the changed ones with the version", () => {
    const current = {
      ...defaults,
      title: "Stew",
      sidebar: [{ block_type: "callout", text: "Hot" }],
    }

    expect(
      buildUpdatePayload(collection, current, current, defaults, 3)
    ).toEqual({
      title: "Stew",
      sidebar: [{ block_type: "callout", text: "Hot" }],
      base_version: 3,
    })
  })

  it("compares the form's values, not the uploaded ones, and sends no version for a document without versions", () => {
    const current = { ...defaults, cover: { file: "chosen" } }
    const values = { ...defaults, cover: "cover.png" }

    expect(
      buildUpdatePayload(collection, values, current, defaults, null)
    ).toEqual({
      title: "Soup",
      cover: "cover.png",
      base_version: null,
    })
  })
})
