import type {
  ClientText,
  TranslatedText,
  TranslationOptions,
} from "../../lib/config/types"
import type { AdminCollectionsResponse } from "../hooks/api/collections/collections"

/** i18next's `t`, as far as the walk calls it. */
export type TranslateText = (
  key: string,
  options: TranslationOptions & { ns: string }
) => string

/**
 * Tells whether a value of the response is a translation the server prepared.
 *
 * @param value - The value.
 * @returns Whether it is a translation.
 */
const isTranslatedText = (value: unknown): value is TranslatedText =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  (value as { type?: unknown }).type === "translation"

/**
 * Translates every translation inside a value, at any depth, and keeps everything else as it is.
 *
 * @param value - A value of the response.
 * @param t - i18next's `t`.
 * @returns The value with each translation as its text.
 */
const translateValue = (value: unknown, t: TranslateText): unknown => {
  if (isTranslatedText(value)) {
    return t(value.key, { ...value.options, ns: value.ns })
  }

  if (Array.isArray(value)) {
    return value.map((item) => translateValue(item, t))
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, translateValue(item, t)])
    )
  }

  return value
}

/**
 * Translates every text the config gives the Admin, wherever it sits in the collection list: each
 * translation becomes its text in the editor's language, and a string stays as written. It knows no
 * field, so a new text of the config needs no change here.
 *
 * @param list - The response of `GET /admin/cms/collections`.
 * @param t - i18next's `t`.
 * @returns The list with every text a string.
 */
export const translateCollectionList = (
  list: AdminCollectionsResponse<ClientText>,
  t: TranslateText
): AdminCollectionsResponse<string> =>
  // The walk keeps the response's shape and turns only translations into strings, which is what the
  // two types of the response state.
  translateValue(list, t) as AdminCollectionsResponse<string>
