import { findAreaRow } from "../find-area-row"

const ROWS = [
  { id: "tsec_2", name: "sections", parent_id: "tstep_1" },
  { id: "tsec_1", name: "sections", parent_id: null },
]

describe("findAreaRow", () => {
  it("finds the document's own area of a name, not one under a block", () => {
    expect(findAreaRow(ROWS, "sections")?.id).toBe("tsec_1")
  })

  it("finds a block's area by the block's id", () => {
    expect(findAreaRow(ROWS, "sections", "tstep_1")?.id).toBe("tsec_2")
    expect(findAreaRow(ROWS, "sections", "tstep_9")).toBeUndefined()
  })

  it("finds nothing for an area without a row", () => {
    expect(findAreaRow(ROWS, "aside")).toBeUndefined()
  })
})
