import { formatDocumentErrors, parseDocumentErrors } from "../document-errors"

describe("formatDocumentErrors", () => {
  it("writes one path and message per line, a general error without a path", () => {
    expect(
      formatDocumentErrors([
        { path: "title", message: "Required" },
        { path: "", message: "Invalid input" },
      ])
    ).toBe("title: Required\nInvalid input")
  })
})

describe("parseDocumentErrors", () => {
  it("reads back the errors formatDocumentErrors writes", () => {
    const errors = [
      { path: "title", message: "Required" },
      { path: "sections.2.title", message: "Use at least 3 characters" },
      { path: "", message: "Invalid input" },
    ]

    expect(parseDocumentErrors(formatDocumentErrors(errors))).toEqual(errors)
  })

  it("keeps a line that starts with no dot path as a general error", () => {
    expect(
      parseDocumentErrors("Test recipe with slug: soup, already exists.")
    ).toEqual([
      { path: "", message: "Test recipe with slug: soup, already exists." },
    ])
  })
})
