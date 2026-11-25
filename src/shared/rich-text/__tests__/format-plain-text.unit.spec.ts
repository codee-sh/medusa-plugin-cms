import { formatPlainText } from "../format-plain-text"
import type { RichTextNode } from "../types"

/**
 * Builds a text node.
 *
 * @param text - Its text.
 * @returns The node.
 */
const buildText = (text: string): RichTextNode => ({ type: "text", text })

/**
 * Builds a list item.
 *
 * @param children - The nodes it holds.
 * @returns The item.
 */
const buildItem = (...children: RichTextNode[]): RichTextNode => ({
  type: "listitem",
  children,
})

describe("formatPlainText", () => {
  it("is empty for nothing", () => {
    expect(formatPlainText(null)).toBe("")
  })

  it("writes one line per block and per list item, nested ones included, without formatting", () => {
    const document = {
      root: {
        type: "root" as const,
        children: [
          { type: "heading", tag: "h2", children: [buildText("Title")] },
          {
            type: "paragraph",
            children: [
              { ...buildText("Bold"), format: 1 },
              buildText(" and "),
              { type: "link", url: "/", children: [buildText("a link")] },
              { type: "linebreak" },
              buildText("next line"),
            ],
          },
          { type: "paragraph", children: [] },
          { type: "quote", children: [buildText("Quoted")] },
          {
            type: "list",
            children: [
              buildItem(buildText("One")),
              buildItem({
                type: "list",
                children: [buildItem(buildText("Nested"))],
              }),
              buildItem(buildText("Two")),
            ],
          },
        ],
      },
    }

    expect(formatPlainText(document)).toBe(
      [
        "Title",
        "Bold and a link",
        "next line",
        "",
        "Quoted",
        "One",
        "Nested",
        "Two",
      ].join("\n")
    )
  })
})
