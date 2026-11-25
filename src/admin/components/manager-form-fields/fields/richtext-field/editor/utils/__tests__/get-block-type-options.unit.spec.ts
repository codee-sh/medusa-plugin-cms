import type { ResolvedRichTextFeature } from "../../../../../../../../shared/rich-text/types"
import { getBlockTypeOptions } from "../get-block-type-options"

const BOLD: ResolvedRichTextFeature = { key: "bold", props: {} }
const QUOTE: ResolvedRichTextFeature = { key: "blockquote", props: {} }

/**
 * Builds a heading feature of the given levels.
 *
 * @param sizes - The levels.
 * @returns The feature.
 */
const headingOf = (
  ...sizes: ("h1" | "h2" | "h3" | "h4")[]
): ResolvedRichTextFeature => ({
  key: "heading",
  props: { enabledHeadingSizes: sizes },
})

describe("getBlockTypeOptions", () => {
  it("offers a paragraph, the heading feature's sizes and a quote, in that order", () => {
    expect(
      getBlockTypeOptions([BOLD, headingOf("h2", "h3"), QUOTE], "paragraph")
    ).toEqual({ options: ["paragraph", "h2", "h3", "quote"], visible: true })
  })

  it("leaves out what the field lacks, and shows with quotes alone", () => {
    expect(getBlockTypeOptions([QUOTE], "paragraph")).toEqual({
      options: ["paragraph", "quote"],
      visible: true,
    })
  })

  it("hides in a field without headings and quotes, or whose heading feature has no size", () => {
    const lists: ResolvedRichTextFeature[] = [
      BOLD,
      { key: "unorderedList", props: {} },
    ]

    expect(getBlockTypeOptions(lists, "paragraph")).toEqual({
      options: ["paragraph"],
      visible: false,
    })
    expect(getBlockTypeOptions([headingOf()], "paragraph").visible).toBe(false)
    expect(getBlockTypeOptions([BOLD], "list").visible).toBe(false)
    expect(getBlockTypeOptions([BOLD], null).visible).toBe(false)
  })

  it("shows while the selection sits in a block the field does not allow, offering a paragraph", () => {
    expect(getBlockTypeOptions([BOLD], "h2")).toEqual({
      options: ["paragraph"],
      visible: true,
    })
    expect(getBlockTypeOptions([headingOf("h2")], "h4")).toEqual({
      options: ["paragraph", "h2"],
      visible: true,
    })
  })
})
