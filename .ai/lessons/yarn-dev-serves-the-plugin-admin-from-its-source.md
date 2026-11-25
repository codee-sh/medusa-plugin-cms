---
{"title": "yarn dev serves the plugin Admin from its source", "modules": [], "areas": ["tooling", "admin"], "topics": ["tooling"]}
---

# yarn dev serves the plugin Admin from its source

`yarn dev` runs `medusa plugin:develop`. In `@medusajs/medusa` 2.22.7 it compiles the backend only, but
`compiler.developPluginBackend` (`@medusajs/framework` `dist/build-tools/compiler.js`) also writes
`.medusa/server/medusa-plugin-options.json` with `srcDir` set to the plugin's `src`. A linked project
reads that file when it resolves its plugins (`@medusajs/utils` `dist/common/get-resolved-plugins.js`):
with `srcDir` present the plugin's Admin is local, served by Vite straight from `src/admin`, so no Admin
bundle is built or needed. Each `yalc publish --push` rewrites the project's `yalc.lock`, which the
project's `medusa develop` watcher does not ignore, so the project restarts on its own.

`yarn build` (`plugin:build`) removes `.medusa/server` and builds the Admin bundle without the options
file. A build and push while `yarn dev` runs therefore switches the project to the bundle and cuts the
link to the source; `src/admin` changes stop showing until `yarn dev` starts again. Reading
`plugin:develop` alone suggests the opposite - that it ships the plugin without its Admin - because the
Admin side lives in the project's plugin resolution, not in the command.

`yarn dev` transpiles each changed file to JavaScript and writes no declarations, so the `.d.ts` files
the project typechecks against stay those of the last `yarn build`: a changed config type fails the
project's typecheck while its runtime already works. `npx tsc -p tsconfig.json --emitDeclarationOnly`
writes them into `.medusa/server` without removing the options file; `yalc publish --push` then carries
them over.

A build next to a running `yarn dev` can also leave the server half compiled. On 2026-11-09, after a
`yarn build`, `.medusa/server` held the `.d.ts` of every file but no `.js` for the fifteen added that
day - the version steps, the `CmsVersion` model and the `cms` migrations - and the linked project failed
to start with `Cannot find module './cms-stale-version'`, then `'./models'`. The watcher, which only
compiles what changes after it starts, rebuilt the touched steps but not the module's `models` and
`migrations`; only a restart of `yarn dev` rebuilt everything. That the build caused the gap is inferred
from the file times, not traced in `plugin:develop`.

Develop with `yarn dev` alone. Use `yarn build` and `yalc publish --push` only without `yarn dev`, and
restart `yarn dev` after one, before the linked project starts. A `Cannot find module` from the plugin's
`.medusa/server` in the project means a restart of `yarn dev`, not a fix in the code.

The packages that Admin source imports resolve from the plugin's own `node_modules`, as Vite resolves a
bare import from the importing file. On 2026-11-17 Lexical, added to the plugin's `dependencies` only,
showed in the host under `yarn dev` with nothing installed in the host: the host's
`node_modules/.vite/deps/_metadata.json` gave every `@lexical/*` entry a `src` inside the plugin's
`node_modules`. React stays single because the host's Admin Vite config dedupes `react` and `react-dom`
(`@medusajs/admin-bundler` `getViteConfig`). So a new Admin dependency of the plugin needs no install in a
linked host while `yarn dev` runs; the built bundle leaves every declared package out, so a host using
the built plugin - from npm, or from `yalc` without `yarn dev` - installs them with it.

`src/admin-extensions/` is the exception: a host imports it from the compiled package, and its Vite
serves a pre-bundled copy that outlives a `yalc` push:
[a-host-vite-serves-its-own-stale-copy-of-admin-extensions](a-host-vite-serves-its-own-stale-copy-of-admin-extensions.md).
