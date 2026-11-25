import { prepareLabels } from "../prepare-labels"

describe("prepareLabels", () => {
  it("prepares each label, naming its place when one is refused", () => {
    expect(
      prepareLabels(
        { singular: ({ t }) => t("page.singular"), plural: "Pages" },
        "cms-test",
        'collection "page"'
      )
    ).toEqual({
      singular: { type: "translation", key: "page.singular", ns: "cms-test" },
      plural: "Pages",
    })
    expect(() =>
      prepareLabels(
        { singular: "Page", plural: ({ t }) => t("page.plural") },
        undefined,
        'collection "page"'
      )
    ).toThrow('collection "page": labels.plural: the translation "page.plural"')
  })
})
