---
{"title": "A Query filter on a relation narrows the parents, not the relation", "modules": [], "areas": ["backend"], "topics": ["orm"]}
---

# A Query filter on a relation narrows the parents, not the relation

`query.graph` accepts a filter on a relation of the same module, such as
`filters: { id, areas: { name: "sections" } }` on a document whose `areas` hold several rows. It
chooses which **documents** come back - one without such an area is left out, `[]` for a filter no
row matches - but each document still comes with **every** row of `areas`, the ones the filter does
not match included. MikroORM loads a populated relation with `populateWhere: ALL` by default
(`@mikro-orm/core` `utils/Configuration.js`), and Medusa does not change it (`@medusajs/utils` 2.22.7
sets no `populateWhere`).

Found in the CMS plugin's test app (2026-11-18): a recipe with an area row `sections` and a block's
area row `tips` answered both rows with and without `areas: { name: "sections" }`. Nothing in the call
says the filter applies only to the parent, so a read meant to load less loads the same, and the
extra rows are easy to miss when the code that builds the answer drops them anyway.

Rule: to narrow the rows of a relation, start the query at the related entity and filter it there -
`query.graph({ entity: "test_section", filters: { recipe_id, name: "sections", parent_id: null } })`
answers that area row alone, with its blocks. A filter on a relation is for choosing parents.
