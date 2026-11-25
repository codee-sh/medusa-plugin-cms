import { findRichTextFeature } from "../find-rich-text-feature"
import type { ResolvedRichTextFeature } from "../types"

const features: ResolvedRichTextFeature[] = [
  { key: "bold", props: {} },
  { key: "heading", props: { enabledHeadingSizes: ["h2"] } },
]

describe("findRichTextFeature", () => {
  it("returns the field's feature of a key, with its options", () => {
    expect(findRichTextFeature(features, "heading")).toEqual({
      key: "heading",
      props: { enabledHeadingSizes: ["h2"] },
    })
  })

  it("returns nothing for a feature the field lacks", () => {
    expect(findRichTextFeature(features, "link")).toBeUndefined()
  })
})
