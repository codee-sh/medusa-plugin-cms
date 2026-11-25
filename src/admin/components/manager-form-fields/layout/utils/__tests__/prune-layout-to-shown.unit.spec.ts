import { pruneLayoutToShown } from "../prune-layout-to-shown"

describe("pruneLayoutToShown", () => {
  it("keeps the names the form shows inside their nodes", () => {
    expect(
      pruneLayoutToShown(
        [
          "title",
          {
            type: "group",
            label: "Image",
            fields: ["image", { type: "row", fields: ["alt", "position"] }],
          },
        ],
        (name) => name !== "position"
      )
    ).toEqual([
      "title",
      {
        type: "group",
        label: "Image",
        fields: ["image", { type: "row", fields: ["alt"] }],
      },
    ])
  })

  it("drops a row and a group the form shows nothing of", () => {
    expect(
      pruneLayoutToShown(
        [
          "title",
          { type: "group", label: "Image", fields: ["image"] },
          { type: "row", fields: ["cta_label", "cta_href"] },
        ],
        (name) => name === "title"
      )
    ).toEqual(["title"])
  })

  it("drops a collapsible and a tab the form shows nothing of, and keeps tabs left with one tab", () => {
    expect(
      pruneLayoutToShown(
        [
          {
            type: "tabs",
            tabs: [
              { label: "Text", fields: ["title"] },
              {
                label: "Image",
                fields: [
                  { type: "collapsible", label: "Image", fields: ["image"] },
                ],
              },
            ],
          },
        ],
        (name) => name === "title"
      )
    ).toEqual([{ type: "tabs", tabs: [{ label: "Text", fields: ["title"] }] }])
  })

  it("drops tabs the form shows nothing of", () => {
    expect(
      pruneLayoutToShown(
        [
          "title",
          {
            type: "tabs",
            tabs: [
              { label: "A", fields: ["a"] },
              { label: "B", fields: ["b"] },
            ],
          },
        ],
        (name) => name === "title"
      )
    ).toEqual(["title"])
  })

  it("keeps a component node whole while it shows any of its items", () => {
    const node = {
      type: "component" as const,
      component: "link",
      fields: { href: "cta_href", external: "cta_external" },
    }

    expect(pruneLayoutToShown([node], (name) => name === "cta_href")).toEqual([
      node,
    ])
    expect(pruneLayoutToShown([node], () => false)).toEqual([])
  })
})
