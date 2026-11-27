import { prepareCmsText } from "../prepare-cms-text"
import { translationKey } from "../translation-key"

const WHERE = 'collection "page": label singular'

describe("translationKey", () => {
  it("names a translation in the config's namespace", () => {
    expect(
      prepareCmsText(translationKey("page.singular"), "content", WHERE)
    ).toEqual({ type: "translation", key: "page.singular", ns: "content" })
  })

  it("names a translation in the namespace it is given, with its options", () => {
    expect(
      prepareCmsText(
        translationKey("fields.createdAt", {
          ns: "translation",
          context: "short",
        }),
        "content",
        WHERE
      )
    ).toEqual({
      type: "translation",
      key: "fields.createdAt",
      ns: "translation",
      options: { context: "short" },
    })
  })

  it("is refused at start when no namespace reaches it", () => {
    expect(() =>
      prepareCmsText(translationKey("page.singular"), undefined, WHERE)
    ).toThrow(
      `${WHERE}: the translation "page.singular" names no namespace, and the config sets no admin.translationNs`
    )
  })
})
