import { isRichTextEmpty } from "../is-rich-text-empty"
import type { RichTextDocument, RichTextNode } from "../types"

/**
 * Builds a document of blocks.
 *
 * @param blocks - The root's children.
 * @returns The document.
 */
const buildDocument = (...blocks: RichTextNode[]): RichTextDocument => ({
  root: { type: "root", children: blocks },
})

describe("isRichTextEmpty", () => {
  it.each([
    ["nothing", null],
    ["a root without blocks", buildDocument()],
    ["an empty paragraph", buildDocument({ type: "paragraph", children: [] })],
    [
      "line breaks and empty texts",
      buildDocument({
        type: "paragraph",
        children: [{ type: "linebreak" }, { type: "text", text: "" }],
      }),
    ],
  ])("is true for %s", (_name, document) => {
    expect(isRichTextEmpty(document)).toBe(true)
  })

  it("is false for a text deep in a list's link", () => {
    const document = buildDocument({
      type: "list",
      children: [
        {
          type: "listitem",
          children: [{ type: "link", children: [{ type: "text", text: "a" }] }],
        },
      ],
    })

    expect(isRichTextEmpty(document)).toBe(false)
  })

  it("is false for a single space, which an editor typed", () => {
    const document = buildDocument({
      type: "paragraph",
      children: [{ type: "text", text: " " }],
    })

    expect(isRichTextEmpty(document)).toBe(false)
  })
})
