import {
  EMPTY_FIELD_VALUE,
  type FieldValueFormatters,
  formatFieldValue,
} from "../format-field-value"

const formatters: FieldValueFormatters = {
  date: (value) => `date:${value}`,
  boolean: (value) => (value ? "Yes" : "No"),
}

describe("formatFieldValue", () => {
  it.each([null, undefined, "", []])("writes %p as a dash", (value) => {
    expect(formatFieldValue(value, "text", formatters)).toBe(EMPTY_FIELD_VALUE)
  })

  it("writes a date through its formatter", () => {
    expect(formatFieldValue("2026-11-19", "date", formatters)).toBe(
      "date:2026-11-19"
    )
  })

  it("writes a boolean through its formatter, false included", () => {
    expect(formatFieldValue(true, "boolean", formatters)).toBe("Yes")
    expect(formatFieldValue(false, "boolean", formatters)).toBe("No")
  })

  it("joins a list with commas", () => {
    expect(formatFieldValue(["vegan", "quick"], "text_list", formatters)).toBe(
      "vegan, quick"
    )
  })

  it("writes a number and a text as they are", () => {
    expect(formatFieldValue(4, "number", formatters)).toBe("4")
    expect(formatFieldValue("Soup", "text", formatters)).toBe("Soup")
  })

  it("writes rich text as its first line of text, and one without text as a dash", () => {
    const paragraph = (text: string) => ({
      type: "paragraph",
      children: text ? [{ type: "text", text }] : [],
    })
    const document = (...texts: string[]) => ({
      root: { type: "root", children: texts.map(paragraph) },
    })

    expect(
      formatFieldValue(
        document("", "Free delivery", "Today"),
        "richtext",
        formatters
      )
    ).toBe("Free delivery")
    expect(formatFieldValue(document(""), "richtext", formatters)).toBe(
      EMPTY_FIELD_VALUE
    )
  })
})
