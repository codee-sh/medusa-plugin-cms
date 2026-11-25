import { DEFAULT_LINK_POLICY } from "../../../sanitize/link-policy"
import { DEFAULT_RICH_TEXT_FEATURES } from "../default-rich-text-features"

describe("DEFAULT_RICH_TEXT_FEATURES", () => {
  it("lists every built-in feature once, in the toolbar's order", () => {
    expect(DEFAULT_RICH_TEXT_FEATURES.map((feature) => feature.key)).toEqual([
      "bold",
      "italic",
      "heading",
      "unorderedList",
      "orderedList",
      "blockquote",
      "link",
    ])
  })

  it("offers headings h2 to h4 and links by the default policy", () => {
    expect(DEFAULT_RICH_TEXT_FEATURES).toContainEqual({
      key: "heading",
      props: { enabledHeadingSizes: ["h2", "h3", "h4"] },
    })
    expect(DEFAULT_RICH_TEXT_FEATURES).toContainEqual({
      key: "link",
      props: { linkPolicy: DEFAULT_LINK_POLICY },
    })
  })
})
