import { buildConfigError } from "./build-config-error"
import { prepareConfigValue } from "./prepare-config-value"
import type { ClientText, CmsText, CmsTranslate, TranslatedText } from "./types"

/**
 * Tells whether every option of a translation is a text, a number or a boolean, which the Admin hands
 * to i18next as they are.
 *
 * @param options - The options, if any.
 * @returns Whether they fit.
 */
const hasPlainOptions = (options: unknown): boolean =>
  options === undefined ||
  (typeof options === "object" &&
    options !== null &&
    !Array.isArray(options) &&
    Object.values(options).every((value) =>
      ["string", "number", "boolean"].includes(typeof value)
    ))

/**
 * Checks a translation a text's function returned: a key, a namespace and options of texts, numbers or
 * booleans.
 *
 * @param translation - What the function returned, when it is an object.
 * @param where - The text's place, for error messages.
 * @returns The translation.
 * @throws When the key or the namespace is missing or empty, or an option is anything else.
 */
const validateTranslation = (
  translation: Partial<TranslatedText>,
  where: string
): TranslatedText => {
  const { key, ns, options } = translation

  if (typeof key !== "string" || !key) {
    throw buildConfigError(`${where}: a translation needs a key`)
  }

  if (typeof ns !== "string" || !ns) {
    throw buildConfigError(
      `${where}: the translation "${key}" names no namespace, and the config sets no admin.translationNs`
    )
  }

  if (!hasPlainOptions(options)) {
    throw buildConfigError(
      `${where}: the options of the translation "${key}" must be texts, numbers or booleans`
    )
  }

  return { type: "translation", key, ns, ...(options && { options }) }
}

/**
 * Checks what a text of the config came to: a string, or a translation its function returned.
 *
 * @param text - The text, or its function, as the config gives it.
 * @param prepared - The text, or what its function returned.
 * @param where - The text's place, for error messages.
 * @returns The text, or the translation.
 * @throws When it is neither, or the translation does not fit.
 */
const validatePreparedText = (
  text: CmsText,
  prepared: unknown,
  where: string
): ClientText => {
  if (typeof prepared === "string") {
    return prepared
  }

  if (
    typeof text === "function" &&
    typeof prepared === "object" &&
    prepared !== null &&
    (prepared as { type?: unknown }).type === "translation"
  ) {
    return validateTranslation(prepared as Partial<TranslatedText>, where)
  }

  throw buildConfigError(
    typeof text === "function"
      ? `${where}: the text function must return a text or a translation from t`
      : `${where} must be a text or a function of { t }`
  )
}

/**
 * Prepares a text of the config: a string as it is, or what its function returns for `{ t }`, whose `t`
 * names a translation in `options.ns` or the config's namespace. `t` throws nothing and only builds the
 * translation, so a problem is named once, here, rather than as a throw of the text's function.
 *
 * @param text - The text, or its function.
 * @param translationNs - The config's `admin.translationNs`, the namespace `t` takes when it names none.
 * @param where - The text's place, for error messages: `collection "page": field "title" label`.
 * @returns The text, or the translation.
 * @throws When the text is neither a string nor a function, the function throws or returns anything but
 * a string or a translation, or the translation does not fit.
 */
export const prepareCmsText = (
  text: CmsText,
  translationNs: string | undefined,
  where: string
): ClientText => {
  /**
   * Names a translation, in `options.ns` or the config's namespace.
   *
   * @param key - The key.
   * @param options - i18next's options, with the namespace.
   * @returns The translation, checked once the function returns.
   */
  const t: CmsTranslate = (key, { ns = translationNs, ...options } = {}) => ({
    type: "translation",
    key,
    ns: ns as string,
    ...(Object.keys(options).length ? { options } : {}),
  })
  return validatePreparedText(
    text,
    prepareConfigValue(text, { t }, `${where}: the text function`),
    where
  )
}
