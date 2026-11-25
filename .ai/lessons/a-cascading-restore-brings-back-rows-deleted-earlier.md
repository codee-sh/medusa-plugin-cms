---
{"title": "A cascading restore brings back rows deleted earlier", "modules": [], "areas": ["backend"], "topics": ["dml", "orm", "workflows"]}
---

# A cascading restore brings back rows deleted earlier

A generated `restore<Model>` does not undo one soft delete. It walks the model's `.cascades()` with
`withDeleted: true` and sets `deleted_at` on every related row, whenever that row was deleted
(`@medusajs/utils` 2.22.7 `dist/dal/mikro-orm/utils.js`, `performCascadingSoftDeletion`). A soft delete
walks the same way, so it also overwrites the `deleted_at` of rows deleted long ago, and the two cannot
be told apart afterwards.

So a workflow whose compensation restores a parent also revives children that a user removed earlier.
Nothing fails: the rollback looks clean, and old content is live again. It only shows on a failure
after the delete step, which is why tests of the happy path never see it.

When a parent keeps soft-deleted children, a compensation must not call `restore` alone. Record the ids
of the live rows before deleting, restore, then soft-delete again what came back and was not live, in
one transaction.

What came back is in the restore's answer: a generated `restore<Model>s(ids)` returns the ids of every
row it revived, the cascaded ones included, under each model's linkable key (`test_step_id` for
`TestStep`, `camelToSnakeCase(name).toLowerCase()` + `_id`), so nothing needs to be read again
(`@medusajs/utils` 2.22.7 `dist/modules-sdk/medusa-service.js`, `restore`). The CMS reads it with
`listRevivedRows`.
