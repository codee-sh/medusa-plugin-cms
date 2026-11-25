import { prepareCmsText } from "../prepare-cms-text"
import type { CmsText } from "../types"

const WHERE = 'collection "page": field "title" label'

/**
 * Prepares a text and returns the message it is refused with, or an empty text.
 *
 * @param text - The text.
 * @param translationNs - The config's namespace.
 * @returns The error's message, or `""`.
 */
const errorOf = (text: unknown, translationNs?: string): string => {
  try {
    prepareCmsText(text as CmsText, translationNs, WHERE)
    return ""
  } catch (error) {
    return (error as Error).message
  }
}

describe("prepareCmsText", () => {
  it("keeps a string as written, with or without a namespace", () => {
    expect(prepareCmsText("Title", "cms-test", WHERE)).toBe("Title")
    expect(prepareCmsText("Title", undefined, WHERE)).toBe("Title")
  })

  it("names a translation in the config's namespace", () => {
    expect(
      prepareCmsText(({ t }) => t("page.title"), "cms-test", WHERE)
    ).toEqual({ type: "translation", key: "page.title", ns: "cms-test" })
  })

  it("names a translation in the namespace t is given, Medusa's included, with its options", () => {
    expect(
      prepareCmsText(
        ({ t }) => t("fields.title", { ns: "translation", context: "short" }),
        undefined,
        WHERE
      )
    ).toEqual({
      type: "translation",
      key: "fields.title",
      ns: "translation",
      options: { context: "short" },
    })
  })

  it("lets the function return a string instead of a translation", () => {
    expect(prepareCmsText(() => "Plain", "cms-test", WHERE)).toBe("Plain")
  })

  it.each<[string, unknown, string | undefined, string]>([
    [
      "a translation without a namespace when the config sets none",
      ({ t }: Parameters<Exclude<CmsText, string>>[0]) => t("page.title"),
      undefined,
      `${WHERE}: the translation "page.title" names no namespace`,
    ],
    [
      "an empty namespace",
      ({ t }: Parameters<Exclude<CmsText, string>>[0]) =>
        t("page.title", { ns: "" }),
      "cms-test",
      `${WHERE}: the translation "page.title" names no namespace`,
    ],
    [
      "an empty key",
      ({ t }: Parameters<Exclude<CmsText, string>>[0]) => t(""),
      "cms-test",
      `${WHERE}: a translation needs a key`,
    ],
    [
      "an option that is an object",
      ({ t }: Parameters<Exclude<CmsText, string>>[0]) =>
        t("page.title", { nested: {} as unknown as string }),
      "cms-test",
      `${WHERE}: the options of the translation "page.title" must be texts, numbers or booleans`,
    ],
    [
      "a function that throws",
      () => {
        throw new Error("boom")
      },
      "cms-test",
      `${WHERE}: the text function threw: boom`,
    ],
    [
      "a function that returns a number",
      () => 3,
      "cms-test",
      `${WHERE}: the text function must return a text or a translation from t`,
    ],
    [
      "a value that is neither a text nor a function",
      { type: "translation", key: "page.title", ns: "cms-test" },
      "cms-test",
      `${WHERE} must be a text or a function of { t }`,
    ],
  ])("refuses %s, naming its place", (_case, text, translationNs, message) => {
    expect(errorOf(text, translationNs)).toContain(message)
  })
})
