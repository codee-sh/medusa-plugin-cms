import type { CmsDocument } from "../../../../../workflows/cms/steps/list-cms-documents"
import { listPageValues } from "../list-page-values"

/**
 * Builds a page's document with one field.
 *
 * @param id - The document's id.
 * @param value - The field's value.
 * @returns The document.
 */
const documentOf = (id: string, value: unknown): CmsDocument => ({
  id,
  status: "published",
  updated_at: "2026-11-23",
  target_id: value,
})

describe("listPageValues", () => {
  it("lists each value once, in the page's order, leaving empty values out", () => {
    expect(
      listPageValues(
        [
          documentOf("a", "page_2"),
          documentOf("b", null),
          documentOf("c", "page_1"),
          documentOf("d", "page_2"),
          documentOf("e", ""),
        ],
        "target_id"
      )
    ).toEqual(["page_2", "page_1"])
  })

  it("takes a list field's values apart", () => {
    expect(
      listPageValues(
        [documentOf("a", ["x", "y"]), documentOf("b", ["y", "z"])],
        "target_id"
      )
    ).toEqual(["x", "y", "z"])
  })
})
