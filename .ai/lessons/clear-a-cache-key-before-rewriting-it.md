---
{"title": "Clear a cache key before rewriting it", "modules": [], "areas": ["backend"], "topics": ["caching"]}
---

# Clear a cache key before rewriting it

The Caching Module's providers do not share write semantics. The in-memory provider overwrites an
existing key, but `@medusajs/caching-redis` writes entry data with `HSETNX`
(`dist/services/redis-cache.js`), so a `set` over a live key is a silent no-op that still re-applies
`expire` - each rewrite extends the stale value's TTL instead of replacing it. When a project uses the
in-memory provider locally and Redis in production, a cache-aside refresh can work locally and never
take effect in production, returning the old snapshot on every page load while the refresh response
itself looks correct (it is built in memory, not read back).

Failures are also invisible: `CachingModuleService.performCacheSet` fires `void provider.set(...)`,
so a caller's `try/catch` around `set` never sees a provider-side problem.

Always `clear({ key })` before `set` when a key is meant to be replaced, and make unit-test cache
mocks reject writes over a live key (`cachedValue ??= data`) - a mock that overwrites hides the bug.
