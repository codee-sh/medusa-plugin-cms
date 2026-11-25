---
{"title": "Zod 4 runs an array's max on a text too", "modules": ["cms"], "areas": ["backend", "admin"], "topics": ["validation"]}
---

# Zod 4 runs an array's max on a text too

`z.array(z.string()).max(3, "Keep at most 3 files")` given the text `"a.png"` reports two issues at
the same path: `invalid_type` (expected array) and `too_big` with the `max` message, because the
length check runs on anything with a `length`, and a text has one (checked with `zod` 4 in the plugin,
2026-11-10). A form then shows "Keep at most 3 files" under a field that holds one wrong value.

A refinement does not run once the type check failed: `z.array(z.string()).refine((list) =>
list.length <= 3, { message })` reports only `invalid_type` for a text. Use a refinement for a size
limit on a list whose wrong values must be reported once; `buildDocumentSchema` does so for a media
field's `max`.
