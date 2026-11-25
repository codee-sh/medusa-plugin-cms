---
{"title": "A unique index violation answers 400, not 422", "modules": [], "areas": ["backend"], "topics": ["orm", "validation"]}
---

# A unique index violation answers 400, not 422

A generated `create` or `update` that breaks a unique index does not fail with `DUPLICATE_ERROR`, which
Medusa answers with 422. `dbErrorMapper` (`@medusajs/utils` 2.22.7,
`dist/dal/mikro-orm/db-error-mapper.js:20-28`) turns PostgreSQL's `23505` into `INVALID_DATA`, a 400,
with the message `<Table> with <column>: <value>, already exists.`

Found while planning the CMS create workflow, whose spec promised a 422 for a taken slug on the strength
of the unique index alone. A test that only checks "the write fails" passes either way.

Rule: when a route must answer 422 for a taken value, read the live rows before the write and throw
`DUPLICATE_ERROR` yourself; keep the unique index as the guard for two writes racing past that read,
which then get the 400.
