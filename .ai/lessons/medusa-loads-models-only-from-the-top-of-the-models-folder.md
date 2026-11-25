---
{"title": "Medusa loads models only from the top of the models folder", "modules": [], "areas": ["backend"], "topics": ["dml", "orm"]}
---

# Medusa loads models only from the top of the models folder

A model file in a subfolder of a module's `models/` is not loaded: the module loader calls `importAllFromDir` on `models/` (`@medusajs/modules-sdk` 2.22.7 `dist/loaders/utils/load-internal.js`), which stops at that level. A barrel re-exporting the file does not help. Typecheck and lint pass, and the backend fails at boot with `Entity 'X' was not discovered`, naming the first model it reaches through a relation.

Keep every model file directly in `models/`.
