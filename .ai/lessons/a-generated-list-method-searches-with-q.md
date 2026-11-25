---
{"title": "A generated list method searches with q", "modules": [], "areas": ["backend"], "topics": ["dml", "orm"]}
---

# A generated list method searches with q

The `list<Plural>` and `listAndCount<Plural>` methods `MedusaService` generates take a `q` filter and
turn it into a free-text search over the model's `.searchable()` columns
(`@medusajs/utils` 2.22.7, `dist/modules-sdk/medusa-internal-service.js:74-80`). The text is split on
whitespace, each word must match one of those columns with `ilike`, and a model with no searchable
column ignores `q` instead of failing (`dist/dal/mikro-orm/mikro-orm-free-text-search-filter.js`).

Nothing in the generated method's type says so - `q` reads like any other filter key - so a step that
needs a search tends to build its own `$or` of `$ilike` over the columns it thinks are searchable.

Rule: pass `q` through to the generated method, and mark the columns with `.searchable()` in the model.
Build a filter of your own only for matching the search does not do, such as a prefix or an exact
value.
