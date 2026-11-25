import { buildCmsPath } from "../build-cms-path"

describe("buildCmsPath", () => {
  it("builds a route's page, and a path under it", () => {
    expect(buildCmsPath("pages")).toBe("/cms/pages")
    expect(buildCmsPath("pages", "tpage_01")).toBe("/cms/pages/tpage_01")
    expect(buildCmsPath("settings", "tables", "links", "tsl_01", "edit")).toBe(
      "/cms/settings/tables/links/tsl_01/edit"
    )
  })

  it("refuses a collection on no route, which has no page", () => {
    expect(() => buildCmsPath(undefined)).toThrow("A CMS page needs a route")
  })
})
