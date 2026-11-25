import { buildDocumentTableQuery } from "../build-document-table-query"

describe("buildDocumentTableQuery", () => {
  it("reads the search, the order, the status the table writes as JSON and the page", () => {
    expect(
      buildDocumentTableQuery(
        { q: "soup", order: "-updated_at", status: '"draft"', offset: "20" },
        20
      )
    ).toEqual({
      q: "soup",
      order: "-updated_at",
      status: "draft",
      limit: 20,
      offset: 20,
    })
  })

  it("opens in the table's first order until the editor sorts it", () => {
    const defaultSort = { column: "segment_id", direction: "desc" } as const

    expect(buildDocumentTableQuery({}, 10, defaultSort).order).toBe(
      "-segment_id"
    )
    expect(
      buildDocumentTableQuery({ order: "updated_at" }, 10, defaultSort).order
    ).toBe("updated_at")
  })

  it("starts on the first page with no filter when the URL holds nothing for the table", () => {
    expect(buildDocumentTableQuery({}, 10)).toEqual({
      q: undefined,
      order: undefined,
      status: undefined,
      limit: 10,
      offset: 0,
    })
  })

  it("sends an editor's picks: a select's values as a list, a boolean as its value", () => {
    expect(
      buildDocumentTableQuery(
        { filters: { difficulty: '["easy","hard"]', vegan: "true" } },
        10
      ).filters
    ).toEqual({ difficulty: ["easy", "hard"], vegan: true })
  })

  it("leaves out a pick it cannot read, and sends no filters without any", () => {
    expect(
      buildDocumentTableQuery({ filters: { difficulty: "{" } }, 10)
    ).not.toHaveProperty("filters")
  })
})
