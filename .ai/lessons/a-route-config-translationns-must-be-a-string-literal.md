---
{"title": "A route config's translationNs must be a string literal", "modules": ["cms"], "areas": ["admin"], "topics": ["i18n"]}
---

# A route config's translationNs must be a string literal

`@medusajs/admin-vite-plugin` 2.22.7 (`dist/index.js`, `getRouteConfig`) reads a route's
`defineRouteConfig` from the file's source with Babel, not by running it: it keeps `translationNs`
only when its value `isStringLiteral`. A constant - `translationNs: CMS_I18N_NS` - passes the
typecheck and is dropped without a warning, so the sidebar shows the label as its raw key. `label`
itself is read at runtime, so it may be any expression.

Rule: write a route's `translationNs` as the namespace's text, with a comment saying why it is not the
constant.
