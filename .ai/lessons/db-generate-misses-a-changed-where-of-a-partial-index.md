---
{"title": "db:generate misses a changed WHERE of a partial index", "modules": [], "areas": ["backend"], "topics": ["dml", "migrations"]}
---

# db:generate misses a changed WHERE of a partial index

A DML index declared with `where` is stored in the migration snapshot as one `expression`, the whole
`CREATE UNIQUE INDEX ... WHERE ...` statement, under its `keyName`. `medusa db:generate` compares such
indexes by name: when only the `where` changes and the name stays, the snapshot gets the new
expression and the generated migration gets nothing. The database keeps the old condition, and
nothing reports it - the next generate sees the snapshot already up to date.

Seen in the CMS test module (Medusa 2.22.7): `IDX_test_section_recipe_id_name_unique` gained
`parent_id IS NULL` so that a block's area rows, which carry the document's id too, stop
colliding with the document's own areas. The snapshot changed, the migration did not, and the first
document with two steps holding tips failed with "Test section with recipe_id: ..., name: tips,
already exists".

After changing an index's `where`, `on` or `unique`, check that the generated migration drops and
recreates it. When it does not, add `drop index if exists "<name>";` and the new `CREATE ... INDEX`
statement from the snapshot to the migration, or rename the index so the generator sees a new one.
