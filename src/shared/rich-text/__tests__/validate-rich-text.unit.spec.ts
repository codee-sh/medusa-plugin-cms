import { DEFAULT_LINK_POLICY } from "../../sanitize/link-policy"
import type {
  ResolvedRichTextFeature,
  RichTextNode,
  RichTextSettings,
} from "../types"
import { NOT_A_DOCUMENT_MESSAGE, validateRichText } from "../validate-rich-text"

/** Every built-in feature, resolved as the registry resolves the defaults. */
const FEATURES: ResolvedRichTextFeature[] = [
  { key: "bold", props: {} },
  { key: "italic", props: {} },
  { key: "heading", props: { enabledHeadingSizes: ["h2", "h3", "h4"] } },
  { key: "unorderedList", props: {} },
  { key: "orderedList", props: {} },
  { key: "blockquote", props: {} },
  { key: "link", props: { linkPolicy: DEFAULT_LINK_POLICY } },
]

const settings: RichTextSettings = { features: FEATURES }

/**
 * Builds the settings of a field with the built-in features but some.
 *
 * @param keys - The keys of the features the field lacks.
 * @returns The settings.
 */
const settingsWithout = (
  ...keys: ResolvedRichTextFeature["key"][]
): RichTextSettings => ({
  features: FEATURES.filter((feature) => !keys.includes(feature.key)),
})

/**
 * Builds a text node.
 *
 * @param text - Its text.
 * @param overrides - Keys replacing the defaults.
 * @returns The node.
 */
const buildText = (
  text: string,
  overrides: Partial<RichTextNode> = {}
): RichTextNode => ({
  type: "text",
  version: 1,
  text,
  format: 0,
  style: "",
  mode: "normal",
  detail: 0,
  ...overrides,
})

/**
 * Builds an element node.
 *
 * @param type - Its type.
 * @param children - The nodes it holds.
 * @param overrides - Keys replacing the defaults.
 * @returns The node.
 */
const buildElement = (
  type: string,
  children: RichTextNode[],
  overrides: Partial<RichTextNode> = {}
): RichTextNode => ({
  type,
  version: 1,
  direction: null,
  format: "",
  indent: 0,
  children,
  ...overrides,
})

/**
 * Builds a document of blocks.
 *
 * @param blocks - The root's children.
 * @returns The document.
 */
const buildDocument = (...blocks: RichTextNode[]) => ({
  root: { ...buildElement("root", blocks), type: "root" as const },
})

/**
 * Builds a document of one paragraph.
 *
 * @param children - The paragraph's nodes.
 * @param overrides - Keys of the paragraph replacing the defaults.
 * @returns The document.
 */
const buildParagraphDocument = (
  children: RichTextNode[],
  overrides: Partial<RichTextNode> = {}
) =>
  buildDocument(
    buildElement("paragraph", children, {
      textFormat: 0,
      textStyle: "",
      ...overrides,
    })
  )

const FIRST_TEXT = ["root", "children", 0, "children", 0]

describe("validateRichText", () => {
  it("takes a document using every built-in feature, a nested list item's indent included", () => {
    const document = buildDocument(
      buildElement("heading", [buildText("Title")], { tag: "h2" }),
      buildElement(
        "paragraph",
        [
          buildText("Bold and italic", { format: 3 }),
          { type: "linebreak", version: 1 },
          buildElement("link", [buildText("a link")], {
            url: "https://example.com",
            target: "_blank",
            rel: "noopener",
          }),
          buildElement("autolink", [buildText("example.com")], {
            url: "/about",
            target: null,
          }),
          buildText("\ttab"),
        ],
        { textFormat: 1, textStyle: "" }
      ),
      buildElement("quote", [buildText("A quote")]),
      buildElement(
        "list",
        [
          buildElement("listitem", [buildText("One")], { value: 1 }),
          buildElement(
            "listitem",
            [
              buildElement(
                "list",
                [
                  buildElement("listitem", [buildText("Nested")], {
                    indent: 1,
                  }),
                ],
                { listType: "number" }
              ),
            ],
            { value: 2 }
          ),
        ],
        { listType: "bullet" }
      )
    )

    expect(validateRichText(document, settings)).toEqual([])
  })

  it.each([
    ["text"],
    [null],
    [{ root: {} }],
    [{ root: { type: "root" } }],
    [[]],
  ])("refuses %j as no document", (value) => {
    expect(validateRichText(value, settings)).toEqual([
      { path: [], message: NOT_A_DOCUMENT_MESSAGE },
    ])
  })

  it("refuses a node of a type no feature adds, at its path", () => {
    const document = buildDocument(buildElement("table", []))

    expect(validateRichText(document, settings)).toEqual([
      {
        path: ["root", "children", 0],
        message: 'Remove the "table" element: this field does not allow it',
      },
    ])
  })

  it.each([
    [
      "heading" as const,
      buildElement("heading", [], { tag: "h2" }),
      "headings",
    ],
    ["blockquote" as const, buildElement("quote", []), "quotes"],
    [
      "unorderedList" as const,
      buildElement("list", [], { listType: "bullet" }),
      "bulleted lists",
    ],
    [
      "orderedList" as const,
      buildElement("list", [], { listType: "number" }),
      "numbered lists",
    ],
  ])(
    "refuses a %s node in a field without its feature",
    (key, block, named) => {
      const document = buildDocument(block)

      expect(validateRichText(document, settingsWithout(key))).toEqual([
        {
          path: ["root", "children", 0],
          message: `Remove the ${named}: this field does not allow them`,
        },
      ])
    }
  )

  it("refuses a link in a field without links", () => {
    const document = buildParagraphDocument([
      buildElement("link", [buildText("a")], { url: "https://example.com" }),
    ])
    expect(validateRichText(document, settingsWithout("link"))).toEqual([
      {
        path: FIRST_TEXT,
        message: "Remove the links: this field does not allow them",
      },
    ])
  })

  it("takes a bulleted list in a field with the unordered list feature only", () => {
    const document = buildDocument(
      buildElement(
        "list",
        [buildElement("listitem", [buildText("a")], { value: 1 })],
        { listType: "bullet" }
      )
    )

    expect(validateRichText(document, settingsWithout("orderedList"))).toEqual(
      []
    )
  })

  it("refuses a heading in a field whose heading feature has no level", () => {
    const document = buildDocument(buildElement("heading", [], { tag: "h2" }))
    const noLevel: RichTextSettings = {
      features: [{ key: "heading", props: { enabledHeadingSizes: [] } }],
    }

    expect(validateRichText(document, noLevel)).toEqual([
      {
        path: ["root", "children", 0],
        message: "Remove the headings: this field does not allow them",
      },
    ])
  })

  it("refuses a heading level outside the heading feature's sizes, naming those it takes", () => {
    const document = buildDocument(buildElement("heading", [], { tag: "h1" }))

    expect(validateRichText(document, settings)).toEqual([
      {
        path: ["root", "children", 0],
        message: "Use a heading level of h2, h3 or h4",
      },
    ])
  })

  it("refuses a check list", () => {
    const document = buildDocument(
      buildElement("list", [], { listType: "check" })
    )

    expect(validateRichText(document, settings)[0].message).toBe(
      "Use a bulleted or a numbered list"
    )
  })

  it.each([
    [8, "Remove the underline formatting: this field does not allow it"],
    [
      4 | 16,
      "Remove the strikethrough and code formatting: this field does not allow it",
    ],
    [4096, "Remove the text formatting this field does not allow"],
  ])("refuses a text format %i the features do not add", (format, message) => {
    const document = buildParagraphDocument([buildText("a", { format })])

    expect(validateRichText(document, settings)).toEqual([
      { path: FIRST_TEXT, message },
    ])
  })

  it("refuses bold in a field without the bold feature", () => {
    const document = buildParagraphDocument([buildText("a", { format: 1 })])
    expect(validateRichText(document, settingsWithout("bold"))[0].message).toBe(
      "Remove the bold formatting: this field does not allow it"
    )
  })

  it("refuses inline CSS on a text and on a paragraph", () => {
    const document = buildParagraphDocument(
      [buildText("a", { style: "color: red" })],
      { textStyle: "font-size: 30px" }
    )

    expect(validateRichText(document, settings)).toEqual([
      {
        path: ["root", "children", 0],
        message: "Remove the inline styles from the text",
      },
      { path: FIRST_TEXT, message: "Remove the inline styles from the text" },
    ])
  })

  it("refuses a paragraph's text format the features do not add", () => {
    const document = buildParagraphDocument([], { textFormat: 8 })

    expect(validateRichText(document, settings)[0].message).toBe(
      "Remove the underline formatting: this field does not allow it"
    )
  })

  it("refuses an aligned paragraph and an indented one", () => {
    const document = buildDocument(
      buildElement("paragraph", [], { format: "center" }),
      buildElement("paragraph", [], { indent: 1 })
    )

    expect(validateRichText(document, settings)).toEqual([
      { path: ["root", "children", 0], message: "Remove the text alignment" },
      { path: ["root", "children", 1], message: "Remove the indent" },
    ])
  })

  it.each([
    ["javascript:alert(1)"],
    ["//evil.example"],
    ["ftp://files.example.com"],
  ])("refuses a link to %s with the policy's message", (url) => {
    const document = buildParagraphDocument([
      buildElement("link", [buildText("a")], { url }),
    ])

    expect(validateRichText(document, settings)).toEqual([
      {
        path: FIRST_TEXT,
        message:
          "Use a link starting with http://, https://, mailto:, tel: or /",
      },
    ])
  })

  it("checks a link against its link feature's policy", () => {
    const document = buildParagraphDocument([
      buildElement("autolink", [buildText("a")], { url: "/about" }),
    ])
    const absoluteOnly: RichTextSettings = {
      features: [
        {
          key: "link",
          props: { linkPolicy: { protocols: ["https"], relative: false } },
        },
      ],
    }

    expect(validateRichText(document, absoluteOnly)[0].message).toBe(
      "Use a link starting with https://"
    )
  })

  it("refuses a link opening anywhere but this tab or a new one", () => {
    const document = buildParagraphDocument([
      buildElement("link", [buildText("a")], {
        url: "https://example.com",
        target: "_top",
      }),
    ])

    expect(validateRichText(document, settings)[0].message).toBe(
      "Open the link in this tab or in a new one"
    )
  })

  it("refuses a text holding a control character", () => {
    const document = buildParagraphDocument([buildText("a\u0000b")])

    expect(validateRichText(document, settings)).toEqual([
      {
        path: FIRST_TEXT,
        message: "Remove the control characters from this text",
      },
    ])
  })

  it("refuses a node out of its place: a text in the root, a paragraph in a link", () => {
    const document = buildDocument(
      buildText("loose"),
      buildElement("paragraph", [
        buildElement("link", [buildElement("paragraph", [])], {
          url: "/",
        }),
      ])
    )

    expect(validateRichText(document, settings)).toEqual([
      {
        path: ["root", "children", 0],
        message: 'Move the "text" element out of the "root" element',
      },
      {
        path: ["root", "children", 1, "children", 0, "children", 0],
        message: 'Move the "paragraph" element out of the "link" element',
      },
    ])
  })

  it("refuses a node it cannot read", () => {
    const document = buildParagraphDocument([
      { type: "text" } as RichTextNode,
      "word" as unknown as RichTextNode,
    ])

    expect(validateRichText(document, settings)).toEqual([
      {
        path: FIRST_TEXT,
        message: "This rich text holds an element that cannot be read",
      },
      {
        path: ["root", "children", 0, "children", 1],
        message: "This rich text holds an element that cannot be read",
      },
    ])
  })
})
