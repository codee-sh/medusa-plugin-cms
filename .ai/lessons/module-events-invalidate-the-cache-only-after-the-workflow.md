---
{"title": "Module events invalidate the cache only after the workflow", "modules": [], "areas": ["backend"], "topics": ["caching", "workflows"]}
---

# Module events invalidate the cache only after the workflow

A `MedusaService` write emits `<entity>.created` / `updated` / `deleted`, and the Caching Module's
default strategy clears the entity's tags when it receives the event. Inside a workflow the event
does not leave at the write: module events are grouped under the workflow's event group and released
only in its `onFinish`, and dropped if the workflow fails (`@medusajs/workflows-sdk`
`dist/helper/workflow-export.js:264-282`, 2.22.7). After release the event bus delivers them
asynchronously.

So a read at the end of the same workflow - a mutation that returns the updated record through a
cached `useQueryGraphStep` or a nested read workflow - gets the entry from before the write. Even
the request that follows can, if it arrives before the subscriber has run. Locally this rarely shows
because delivery is fast; the response of the write itself is the reliable reproduction.

Rule: a workflow that writes and then reads through the cache clears the tags itself, in a step
between the last write and the read. Ask `cachingModuleService.computeTags(...)` for the tags with
the matching operation instead of building strings like `ContentPage:<id>` by hand: that is the
same computation the event triggers later. Give the clear step no compensation; on rollback the next
read refills the cache from the restored data.
