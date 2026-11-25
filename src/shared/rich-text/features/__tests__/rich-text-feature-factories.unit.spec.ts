import { BlockquoteFeature } from "../blockquote-feature"
import { BoldFeature } from "../bold-feature"
import { HeadingFeature } from "../heading-feature"
import { ItalicFeature } from "../italic-feature"
import { LinkFeature } from "../link-feature"
import { OrderedListFeature } from "../ordered-list-feature"
import { RICH_TEXT_FEATURE_DEFINITIONS } from "../rich-text-feature-definitions"
import { UnorderedListFeature } from "../unordered-list-feature"

describe("rich text feature factories", () => {
  it.each([
    [BoldFeature, "bold"],
    [ItalicFeature, "italic"],
    [UnorderedListFeature, "unorderedList"],
    [OrderedListFeature, "orderedList"],
    [BlockquoteFeature, "blockquote"],
  ])("returns a feature without options under its key", (factory, key) => {
    expect(factory()).toEqual({ key, props: {} })
  })

  it("returns the heading feature with the sizes it is given", () => {
    expect(HeadingFeature({ enabledHeadingSizes: ["h2"] })).toEqual({
      key: "heading",
      props: { enabledHeadingSizes: ["h2"] },
    })
  })

  it("returns the heading and link features with no option when given none", () => {
    expect(HeadingFeature()).toEqual({ key: "heading", props: {} })
    expect(LinkFeature()).toEqual({ key: "link", props: {} })
  })

  it("returns the link feature with the policy it is given", () => {
    expect(LinkFeature({ linkPolicy: { relative: false } })).toEqual({
      key: "link",
      props: { linkPolicy: { relative: false } },
    })
  })

  it("defines every feature under its own key", () => {
    for (const [key, definition] of Object.entries(
      RICH_TEXT_FEATURE_DEFINITIONS
    )) {
      expect(definition.key).toBe(key)
    }
  })

  it("gives each list feature the list of its own listType and either list item", () => {
    const { unorderedList, orderedList } = RICH_TEXT_FEATURE_DEFINITIONS
    const bullet = { type: "list", listType: "bullet" }
    const number = { type: "list", listType: "number" }
    const item = { type: "listitem" }

    expect([bullet, number, item].map(unorderedList.ownsNode!)).toEqual([
      true,
      false,
      true,
    ])
    expect([bullet, number, item].map(orderedList.ownsNode!)).toEqual([
      false,
      true,
      true,
    ])
  })
})
