/**
 * The i18next namespace of the plugin's own Admin texts, named after the package so no other extension
 * shares it. A project translates or replaces a text by adding the same namespace to its own
 * `src/admin/i18n/index.ts`; the dashboard merges both.
 */
export const CMS_I18N_NS = "medusa-plugin-cms"

/**
 * The i18next namespace of the form toolkit's texts, its media inputs' included. It travels with the
 * toolkit: an Admin that uses it registers the toolkit's `i18n/json` files under this namespace in its
 * own `src/admin/i18n/index.ts`.
 */
export const MANAGER_FORM_FIELDS_I18N_NS = "manager-form-fields"
