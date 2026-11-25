import { formatColumnLabel } from "../format-column-label"

describe("formatColumnLabel", () => {
  it("writes a column name in sentence case, its underscores as spaces", () => {
    expect(formatColumnLabel("published_at")).toBe("Published at")
  })

  it("capitalises a single word", () => {
    expect(formatColumnLabel("title")).toBe("Title")
  })

  it("answers an empty text for an empty name", () => {
    expect(formatColumnLabel("")).toBe("")
  })
})
