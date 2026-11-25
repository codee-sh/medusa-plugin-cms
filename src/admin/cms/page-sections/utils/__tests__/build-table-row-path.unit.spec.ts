import { buildTableRowPath } from "../build-table-row-path"

describe("buildTableRowPath", () => {
  it("builds the drawer's path over the route's page, the table named by its key", () => {
    expect(buildTableRowPath("settings", "footer_links", "tsl_01")).toBe(
      "/cms/settings/tables/footer_links/tsl_01/edit"
    )
  })

  it("builds the drawer over a list's own page, its table under the list's slug", () => {
    expect(buildTableRowPath("tags", "tag", "ttag_01")).toBe(
      "/cms/tags/tables/tag/ttag_01/edit"
    )
  })

  it("refuses a page with no route", () => {
    expect(() => buildTableRowPath(undefined, "tag", "ttag_01")).toThrow(
      "A CMS page needs a route"
    )
  })
})
