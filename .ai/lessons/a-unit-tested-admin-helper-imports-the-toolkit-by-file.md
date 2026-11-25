---
{"title": "A unit-tested Admin helper imports the toolkit by file", "modules": ["cms"], "areas": ["admin", "testing"], "topics": ["testing", "tooling"]}
---

# A unit-tested Admin helper imports the toolkit by file

`jest.config.js` transforms `.js` and `.ts` files only (`"^.+\\.[jt]s$"`), so a `.tsx` file a test reaches
is loaded as it is and fails with `SyntaxError: Cannot use import statement outside a module`. The form
toolkit's index, `src/admin/components/manager-form-fields/index.ts`, re-exports its components
(`blocks-field.tsx` among them) beside its helpers, so a `.ts` helper that imports a helper through that
index pulls every component in, and its unit test fails before it runs. A value import is enough; a
type-only import is erased and pulls nothing.

Found on 2026-11-19: `list-singleton-cards.ts` imported `collectLayoutNames` from the index, and
`section-document-fields.ts`, which it uses, imported `sectionFormFields` the same way; neither had a
test until then, so nothing had failed.

Rule: a `.ts` helper under `src/admin/` imports the toolkit's helpers from their own files
(`manager-form-fields/layout/utils/<name>`), not from the toolkit's index.
