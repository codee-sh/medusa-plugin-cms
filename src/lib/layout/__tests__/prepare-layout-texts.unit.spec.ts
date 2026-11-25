import type { CmsText, LayoutSectionConfig } from "../../config/types"
import { prepareLayoutTexts } from "../prepare-layout-texts"

/**
 * Builds a text of the config that names a key of the config's namespace.
 *
 * @param key - The key.
 * @returns The text's function.
 */
const textOf =
  (key: string): CmsText =>
  ({ t }) =>
    t(key)

/**
 * Builds a translation of the test namespace, as the walk prepares it.
 *
 * @param key - The key.
 * @returns The translation.
 */
const translationOf = (key: string) => ({
  type: "translation",
  key,
  ns: "cms-test",
})

describe("prepareLayoutTexts", () => {
  it("prepares every node's label and description at any depth, and keeps names, rows and other keys", () => {
    const sections: LayoutSectionConfig[] = [
      {
        key: "main",
        label: textOf("main"),
        description: "Plain",
        position: "side",
        areas: ["sections"],
        fields: [
          "title",
          { type: "row", fields: ["title", "slug"] },
          {
            type: "tabs",
            tabs: [
              {
                label: textOf("tab"),
                description: textOf("tabHint"),
                fields: [
                  {
                    type: "collapsible",
                    label: textOf("more"),
                    description: textOf("moreHint"),
                    initCollapsed: true,
                    fields: [
                      {
                        type: "group",
                        label: textOf("group"),
                        description: textOf("groupHint"),
                        fields: [
                          {
                            type: "component",
                            component: "box",
                            fields: ["title"],
                            label: textOf("box"),
                            description: textOf("boxHint"),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              { label: "Other", fields: ["slug"] },
            ],
          },
        ],
      },
    ]

    expect(prepareLayoutTexts(sections, "cms-test", "collection")).toEqual([
      {
        key: "main",
        label: translationOf("main"),
        description: "Plain",
        position: "side",
        areas: ["sections"],
        fields: [
          "title",
          { type: "row", fields: ["title", "slug"] },
          {
            type: "tabs",
            tabs: [
              {
                label: translationOf("tab"),
                description: translationOf("tabHint"),
                fields: [
                  {
                    type: "collapsible",
                    label: translationOf("more"),
                    description: translationOf("moreHint"),
                    initCollapsed: true,
                    fields: [
                      {
                        type: "group",
                        label: translationOf("group"),
                        description: translationOf("groupHint"),
                        fields: [
                          {
                            type: "component",
                            component: "box",
                            fields: ["title"],
                            label: translationOf("box"),
                            description: translationOf("boxHint"),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              { label: "Other", fields: ["slug"] },
            ],
          },
        ],
      },
    ])
  })

  it("gives a JS config's missing lists back empty, for the section checks to refuse", () => {
    const sections = [
      {
        label: "Main",
        fields: [{ type: "tabs" }, { type: "group", label: "Group" }],
      },
    ] as unknown as LayoutSectionConfig[]

    expect(prepareLayoutTexts(sections, undefined, "collection")).toEqual([
      {
        label: "Main",
        fields: [
          { type: "tabs", tabs: [] },
          { type: "group", label: "Group", fields: [] },
        ],
      },
    ])
  })

  it("names a node's place when its text is refused", () => {
    const sections: LayoutSectionConfig[] = [
      {
        key: "main",
        label: "Main",
        fields: [
          {
            type: "tabs",
            tabs: [
              { label: "One", fields: ["title"] },
              { label: textOf("two"), fields: ["slug"] },
            ],
          },
        ],
      },
    ]

    expect(() =>
      prepareLayoutTexts(sections, undefined, 'collection "page"')
    ).toThrow(
      'collection "page": admin section 1: tab 2 label: the translation "two" names no namespace'
    )
  })
})
