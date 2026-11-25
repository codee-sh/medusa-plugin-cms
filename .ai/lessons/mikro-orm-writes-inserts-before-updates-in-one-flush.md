---
{"title": "MikroORM writes inserts before updates in one flush", "modules": [], "areas": ["backend"], "topics": ["orm", "database"]}
---

# MikroORM writes inserts before updates in one flush

A generated `update<Model>` in a `MedusaService` does not write at once: the repository assigns the
values and calls `manager.persist(entity)` (`@medusajs/utils` 2.22.7
`dist/dal/mikro-orm/mikro-orm-repository.js`, `update`), and a generated `create` persists too. Inside
one `@InjectTransactionManager()` method both reach the database at the single flush that ends the
transaction, and MikroORM's unit of work writes the inserts there before the updates.

Found in the `cms` module's `createCmsVersion`, which takes `latest` from a document's current version
and inserts the new one as latest, under a partial unique index (`WHERE latest = true`). The insert ran
first, so for a moment two rows were latest, and the index refused the second version with
`Cms version with collection: recipe, document_id: trec_1, already exists.` A partial unique index
cannot be deferred to the commit: PostgreSQL defers constraints only, not indexes. One `update` call
that moves the flag between two rows fails the same way, as the order of the updates within it is not
the order of its input.

Rule: when one write in a transaction must reach the database before another - giving up a flag that a
unique index guards before setting it elsewhere - flush between them with
`sharedContext.transactionManager.flush()`, still inside the transaction; outside a transaction, make
them two calls.
