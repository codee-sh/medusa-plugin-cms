import { collectLayoutNames } from "../collect-layout-names"

describe("collectLayoutNames", () => {
  it("lists the names through groups and rows in the order shown", () => {
    expect(
      collectLayoutNames([
        "title",
        {
          type: "group",
          label: "Image",
          fields: ["image", { type: "row", fields: ["alt", "position"] }],
        },
        { type: "row", fields: ["cta_label", "cta_href"] },
      ])
    ).toEqual(["title", "image", "alt", "position", "cta_label", "cta_href"])
  })

  it("lists the names through tabs and collapsibles in the order shown", () => {
    expect(
      collectLayoutNames([
        {
          type: "tabs",
          tabs: [
            { label: "Text", fields: ["title"] },
            {
              label: "Image",
              fields: [
                {
                  type: "collapsible",
                  label: "Image",
                  fields: [
                    "image",
                    { type: "row", fields: ["alt", "position"] },
                  ],
                },
              ],
            },
          ],
        },
        "intro",
      ])
    ).toEqual(["title", "image", "alt", "position", "intro"])
  })

  it("lists a component node's names, listed or mapped to keys", () => {
    expect(
      collectLayoutNames([
        {
          type: "component",
          component: "pair",
          fields: ["cta_href", "cta_external"],
        },
        {
          type: "component",
          component: "swatch",
          fields: { color: "brand_color" },
        },
      ])
    ).toEqual(["cta_href", "cta_external", "brand_color"])
  })
})
