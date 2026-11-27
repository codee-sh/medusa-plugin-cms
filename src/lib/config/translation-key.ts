import type { CmsText, CmsTranslate } from "./types"

/**
 * Names a translation as a text of the config, so a label reads as the value it stands for:
 * `label: translationKey("page.singular")`. It is `({ t }) => t(key, options)`, which the plugin runs
 * when Medusa starts. The name breaks the verb rule on purpose: it stands where a config takes a value.
 *
 * @param key - The key, in `options.ns` or the config's `admin.translationNs`.
 * @param options - i18next's options, with the namespace.
 * @returns The text.
 */
export const translationKey =
  (key: string, options?: Parameters<CmsTranslate>[1]): CmsText =>
  ({ t }) =>
    t(key, options)
