import { sectionFormFields } from "../section-form-fields"

const items = ["title", "slug", "seo_title", "seo_description", "intro"].map(
  (name) => ({ name })
)

describe("sectionFormFields", () => {
  it("keeps the items in no section in their order", () => {
    expect(
      sectionFormFields(items, [
        { label: "SEO", fields: ["seo_title", "seo_description"] },
      ]).unsectioned
    ).toEqual([{ name: "title" }, { name: "slug" }, { name: "intro" }])
  })

  it("lays each section's items out in the section's order, apart by column", () => {
    const { main, side } = sectionFormFields(items, [
      { label: "Intro", fields: ["intro"] },
      {
        label: "SEO",
        description: "How search engines show the page",
        fields: ["seo_description", "seo_title"],
        position: "side",
      },
    ])

    expect(main).toEqual([{ label: "Intro", layout: ["intro"] }])
    expect(side).toEqual([
      {
        label: "SEO",
        description: "How search engines show the page",
        position: "side",
        layout: ["seo_description", "seo_title"],
      },
    ])
  })

  it("keeps the items of a group and a row out of the unsectioned ones, and prunes them to what the form shows", () => {
    const { unsectioned, main } = sectionFormFields(items, [
      {
        label: "SEO",
        fields: [
          {
            type: "group",
            label: "Search",
            fields: [
              { type: "row", fields: ["seo_title", "seo_description"] },
              "missing",
            ],
          },
        ],
      },
    ])

    expect(unsectioned).toEqual([
      { name: "title" },
      { name: "slug" },
      { name: "intro" },
    ])
    expect(main).toEqual([
      {
        label: "SEO",
        layout: [
          {
            type: "group",
            label: "Search",
            fields: [{ type: "row", fields: ["seo_title", "seo_description"] }],
          },
        ],
      },
    ])
  })

  it("leaves out a section whose items the form does not show", () => {
    expect(
      sectionFormFields(items, [
        { label: "Extra", fields: ["missing"] },
        {
          label: "Empty group",
          fields: [{ type: "group", label: "Missing", fields: ["missing"] }],
        },
      ]).main
    ).toEqual([])
  })
})
