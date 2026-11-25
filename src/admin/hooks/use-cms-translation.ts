import { useTranslation } from "react-i18next"
import { CMS_I18N_NS } from "../../shared/admin-i18n-ns"

/**
 * Gives the CMS screens' `t`: a key is looked up in the plugin's namespace, then in the dashboard's
 * `translation`, so a screen uses Medusa's own texts, such as `actions.save`, beside its own.
 *
 * @returns `useTranslation`'s result over both namespaces.
 */
export const useCmsTranslation = () =>
  useTranslation([CMS_I18N_NS, "translation"])
