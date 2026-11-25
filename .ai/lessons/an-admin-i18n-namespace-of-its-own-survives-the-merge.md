---
{"title": "An Admin i18n namespace of its own survives the merge", "modules": ["cms"], "areas": ["admin"], "topics": ["i18n"]}
---

# An Admin i18n namespace of its own survives the merge

Medusa's Admin builds its i18next resources by deep-merging each extension's `src/admin/i18n/index.ts`
as it is (`@medusajs/admin-vite-plugin` 2.22.7 `generateI18n`; `@medusajs/dashboard` `populateI18n`),
so `{ pl: { content: {...} } }` reaches i18next as the namespace `content` beside `translation`. The
common advice that everything lands in one `translation` namespace holds only for the extensions that
write their keys under `translation`, as the template does.

Two settings of the dashboard's i18next (`chunk-SGUYOGWH.mjs`) shape what such a namespace shows:
`fallbackLng: "en"`, and `fallbackNS: "translation"`, so a key missing in the namespace is looked up in
Medusa's own before it shows as the key. `supportedLngs` is the merged resources' languages.

Rule: a project's or a plugin's texts that another config names by key go in a namespace of their own,
never in `translation`, where a key would replace the dashboard's; expect a missing key to borrow
Medusa's text when the same path exists there.
