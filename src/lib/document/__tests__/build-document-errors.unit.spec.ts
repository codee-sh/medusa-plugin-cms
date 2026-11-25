import { buildDocumentErrors } from "../build-document-errors"

describe("buildDocumentErrors", () => {
  it("joins an issue's path with dots", () => {
    expect(
      buildDocumentErrors([
        {
          code: "invalid_type",
          path: ["sections", 2, "title"],
          message: "Invalid",
        },
      ])
    ).toEqual([{ path: "sections.2.title", message: "Invalid" }])
  })

  it("gives each unknown key its own error", () => {
    expect(
      buildDocumentErrors([
        {
          code: "unrecognized_keys",
          path: [],
          keys: ["id", "status"],
          message: "Unrecognized keys",
        },
      ])
    ).toEqual([
      { path: "id", message: "Unknown field" },
      { path: "status", message: "Unknown field" },
    ])
  })
})
