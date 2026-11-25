---
{"title": "A cycle of cascades makes every soft delete throw", "modules": [], "areas": ["backend"], "topics": ["dml", "orm"]}
---

# A cycle of cascades makes every soft delete throw

Before a soft delete, `mikroOrmUpdateDeletedAtRecursively` runs `detectCircularDependency`
(`@medusajs/utils` `dist/dal/mikro-orm/utils.js`), which walks the model metadata along cascading
relations. Models that cascade in a loop, such as `page -> area -> grid -> item -> area`, fail with
`Unable to soft delete the areas. Circular dependency detected`, whatever the rows are: checked by running it
on 2.21.2, code unchanged in 2.22.7. Nothing warns earlier, because the models build and migrate; the first delete is what breaks.
A relation from a model to itself is allowed, so a self-referencing tree is fine.

Keep cascades acyclic across models. When a child needs to hold something higher in the chain, point every
row at the shared root with the foreign key and record its place in a plain column, as `content_area` does
with `parent_id`, or drop the cascade on one link and delete that link in code.
