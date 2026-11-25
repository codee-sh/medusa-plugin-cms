import { useTranslation } from "react-i18next"
import { MANAGER_FORM_FIELDS_I18N_NS } from "../../../../shared/admin-i18n-ns"

/**
 * Gives the form toolkit's `t`: a key is looked up in the toolkit's namespace, then in the dashboard's
 * `translation`, so an input uses Medusa's own texts, such as `general.select`, beside its own.
 *
 * @returns `useTranslation`'s result over both namespaces.
 */
export const useManagerFormFieldsTranslation = () =>
  useTranslation([MANAGER_FORM_FIELDS_I18N_NS, "translation"])
