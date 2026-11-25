import { parseRichText } from "../parse-rich-text"

const document = {
  root: {
    type: "root" as const,
    children: [{ type: "paragraph", children: [{ type: "text", text: "Hi" }] }],
  },
}

/**
 * Reads the text of each paragraph of a parsed document.
 *
 * @param value - The value to parse.
 * @returns Per paragraph, the texts of its nodes.
 */
const readParagraphs = (value: unknown) =>
  parseRichText(value)?.root.children.map((paragraph) =>
    (paragraph.children ?? []).map((node) => node.text)
  )

describe("parseRichText", () => {
  it.each([[null], [undefined], [""], [5], [{ text: "Hi" }]])(
    "reads %j as no document",
    (value) => {
      expect(parseRichText(value)).toBeNull()
    }
  )

  it("returns a document object as it is", () => {
    expect(parseRichText(document)).toBe(document)
  })

  it("parses a document's JSON, as the column stores it", () => {
    expect(parseRichText(JSON.stringify(document))).toEqual(document)
  })

  it("reads plain text as one paragraph per line, an empty line as an empty paragraph", () => {
    expect(readParagraphs("First\r\n\nThird")).toEqual([
      ["First"],
      [],
      ["Third"],
    ])
  })

  it.each([["123"], ['{"text":"Hi"}'], ["[1,2]"]])(
    "reads %s, JSON of no document, as plain text",
    (text) => {
      expect(readParagraphs(text)).toEqual([[text]])
    }
  )

  it("gives the paragraphs of plain text the keys Lexical serializes", () => {
    expect(parseRichText("Hi")).toEqual({
      root: {
        type: "root",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        children: [
          {
            type: "paragraph",
            version: 1,
            direction: null,
            format: "",
            indent: 0,
            textFormat: 0,
            textStyle: "",
            children: [
              {
                type: "text",
                version: 1,
                text: "Hi",
                format: 0,
                style: "",
                mode: "normal",
                detail: 0,
              },
            ],
          },
        ],
      },
    })
  })
})
