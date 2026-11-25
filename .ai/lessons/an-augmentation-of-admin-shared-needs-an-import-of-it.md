---
{"title": "An augmentation of admin-shared needs an import of it", "modules": ["cms"], "areas": ["admin"], "topics": ["typescript"]}
---

# An augmentation of admin-shared needs an import of it

A file that augments `InjectionZoneRegistry` with `declare module "@medusajs/admin-shared" { ... }` and
does not import `@medusajs/admin-shared` itself fails `yarn typecheck` (`tsconfig.typecheck.json`, and
`tsconfig.json` alike) with `TS2664: Invalid module name in augmentation, module '@medusajs/admin-shared'
cannot be found`, while `--traceResolution` shows the module resolved to its `dist/index.d.ts`. The
Admin's own typecheck (`moduleResolution: "bundler"`) passes the same file.

Found on 2026-11-19 with a `src/` file holding the zones of a singleton's page, since replaced by the
hand-written root `index.d.ts` that Medusa's docs prescribe, which no plugin typecheck compiles.
Why the server config refuses it was not traced; `import type {} from "@medusajs/admin-shared"` at the
top of the file makes both typechecks pass.

Rule: a file that augments a module imports that module too, even as an empty type import.
