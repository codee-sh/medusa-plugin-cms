import formFieldsEn from "../../components/manager-form-fields/i18n/json/en.json"
import formFieldsPl from "../../components/manager-form-fields/i18n/json/pl.json"
import en from "../json/en.json"
import pl from "../json/pl.json"

/** The suffixes i18next adds to a key for each plural form a language has. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

/** The plural forms i18next asks Polish for. */
const POLISH_PLURAL_FORMS = ["one", "few", "many", "other"]

/** A value a text interpolates, such as `{{count}}`; its name is the first group. */
const INTERPOLATION = /{{\s*([^}\s]+)\s*}}/g

/** Each namespace of the plugin, by language. */
const NAMESPACES: { name: string; en: object; pl: object }[] = [
  { name: "the CMS screens", en, pl },
  { name: "the form toolkit", en: formFieldsEn, pl: formFieldsPl },
]

/**
 * Lists the texts of a translation tree with their keys as dotted paths, a plural key with its suffix.
 *
 * @param tree - The translations.
 * @param prefix - The path of the tree inside the whole.
 * @returns The keys and their texts.
 */
const listTexts = (tree: object, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([key, value]): [string, string][] =>
    typeof value === "object" && value !== null
      ? listTexts(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)]]
  )

/**
 * Removes a key's plural suffix, as languages differ in how many plural forms they have.
 *
 * @param key - The key.
 * @returns The key without its suffix.
 */
const toBaseKey = (key: string) => key.replace(PLURAL_SUFFIX, "")

/**
 * Lists the keys of a translation tree as dotted paths, a plural key once without its suffix.
 *
 * @param tree - The translations.
 * @returns The keys, sorted.
 */
const listKeys = (tree: object): string[] =>
  [...new Set(listTexts(tree).map(([key]) => toBaseKey(key)))].sort()

/**
 * Lists the keys of a translation tree that have plural forms, without their suffix.
 *
 * @param tree - The translations.
 * @returns The keys.
 */
const listPluralKeys = (tree: object): string[] => [
  ...new Set(
    listTexts(tree)
      .map(([key]) => key)
      .filter((key) => PLURAL_SUFFIX.test(key))
      .map(toBaseKey)
  ),
]

/**
 * Lists the values each key of a translation tree interpolates, over all its plural forms.
 *
 * @param tree - The translations.
 * @returns Per key without its suffix, the names of its values, sorted.
 */
const listInterpolations = (tree: object): Record<string, string[]> => {
  const names: Record<string, Set<string>> = {}

  for (const [key, text] of listTexts(tree)) {
    const baseKey = toBaseKey(key)
    names[baseKey] ??= new Set()

    for (const [, name] of text.matchAll(INTERPOLATION)) {
      names[baseKey].add(name)
    }
  }

  return Object.fromEntries(
    Object.entries(names).map(([key, keyNames]) => [key, [...keyNames].sort()])
  )
}

describe.each(NAMESPACES)(
  "$name's translations",
  ({ en: english, pl: polish }) => {
    it("give Polish the same keys as English", () => {
      expect(listKeys(polish)).toEqual(listKeys(english))
    })

    it("give Polish every plural form of a key English counts", () => {
      const polishKeys = listTexts(polish).map(([key]) => key)

      for (const baseKey of listPluralKeys(english)) {
        expect(polishKeys).toEqual(
          expect.arrayContaining(
            POLISH_PLURAL_FORMS.map((form) => `${baseKey}_${form}`)
          )
        )
      }
    })

    it("give Polish the same interpolated values as English", () => {
      expect(listInterpolations(polish)).toEqual(listInterpolations(english))
    })
  }
)
