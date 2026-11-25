---
{"title": "An empty cached query result carries no tags", "modules": [], "areas": ["backend"], "topics": ["caching"]}
---

# An empty cached query result carries no tags

`query.graph` with `options.cache.enable` and no `tags` tags the entry with tags computed from the
result: one per entity it returns, plus `<Entity>:list:*` for entities found in an array
(`@medusajs/caching` 2.22.7, `utils/parser.js`, `buildAffectedCacheKeys`). A result with no
entities - an empty list - gets no tag at all. Nothing can clear it; it lives until the TTL (one
hour by default, `services/cache-module.js`).

Found through failing store tests: a read made while no document was published cached `[]`, and
every document published afterwards stayed invisible to the store, although each workflow cleared the
entity's `:list:*` tag. In production that is the first document of an environment missing from the
storefront for up to an hour.

Rule: a cached list read that may come back empty passes its list tag explicitly and keeps the
automatic ones - `cache: { enable: true, tags: ["<Entity>:list:*"], computeAutomaticTags: true }`.
Given `tags` alone replace the computed ones, so `computeAutomaticTags` is what keeps the per-entity
tags too.
