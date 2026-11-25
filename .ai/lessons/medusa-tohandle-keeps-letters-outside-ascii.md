---
{"title": "Medusa toHandle keeps letters outside ASCII", "modules": [], "areas": ["backend"], "topics": ["validation"]}
---

# Medusa toHandle keeps letters outside ASCII

`toHandle` from `@medusajs/framework/utils` (`@medusajs/utils` 2.22.7, `dist/common/to-handle.js`)
lowercases the text and keeps every Unicode letter and digit (`[^\p{L}\p{N}\s_-]` is what it drops), so
`Żurek z jajkiem` becomes `żurek-z-jajkiem`. It strips no diacritics, and it falls back to
`product-<random>` when nothing is left.

That is right for product handles in any script, but not where the format is ASCII only: a CMS slug
checked against `^[a-z0-9]+(?:-[a-z0-9]+)*$` refuses what `toHandle` builds from Polish or German text.

Rule: before reusing `toHandle`, check the format the result must pass. For ASCII slugs, drop the marks
with `normalize("NFD")` and `\p{M}`, map the letters Unicode does not decompose (`ł`, `ß`, `æ`, `ø`,
`đ`) by hand, as `toCmsSlug` does.
