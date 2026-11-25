---
{"title": "jsonb does not keep the order of keys", "modules": ["cms"], "areas": ["backend"], "topics": ["database", "orm"]}
---

# jsonb does not keep the order of keys

PostgreSQL stores a `jsonb` value in its own key order - shorter keys first, then by bytes - and reads it
back in that order, not in the order it was written. A `model.json()` column is `jsonb`, so an object
read from it can hold the same keys and values as the one written, in another order.

`JSON.stringify` follows the order of keys, so it reports two such objects as different. The version
snapshot step compared fields that way; it held only flat values until rich text put a nested document
in a field, and then a save that changed nothing in a document listed it in `changed_fields`, as the
previous version's snapshot came back from `jsonb` with `type` before `children` and the body sent
`children` first. Only the HTTP test against the database showed it: the unit tests built both objects
in the same order.

Rule: compare values read from a `json` column with `deepEqualObj` from `@medusajs/framework/utils`,
which ignores the order of keys and keeps the order of arrays, never by comparing their JSON text.
