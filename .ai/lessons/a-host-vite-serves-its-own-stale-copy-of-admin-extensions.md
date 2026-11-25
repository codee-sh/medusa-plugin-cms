---
{"title": "A host's Vite serves its own stale copy of admin-extensions", "modules": ["cms"], "areas": ["tooling", "admin"], "topics": ["tooling"]}
---

# A host's Vite serves its own stale copy of admin-extensions

The plugin's Admin runs from its source under `yarn dev`, but `@codee-sh/medusa-plugin-cms/admin-extensions`
does not: a host imports it from the compiled package, `.medusa/server/src/admin-extensions/index.js`, which
`yarn dev` compiles and `yalc` copies into the host's `node_modules`. The host's Vite pre-bundles that
CommonJS file into `node_modules/.vite/deps/@codee-sh_medusa-plugin-cms_admin-extensions.js` and
serves the bundle, not the file. A `yalc` push replaces the file and leaves the bundle alone, and Vite
rebuilds it only when the lockfile or its config changes, which a `yalc` push touches neither of; a
restart of the host does not rebuild it either.

So the browser runs a registry older than the plugin's Admin around it. On 2026-11-13 the host failed with
`defineCmsFieldComponent is not a function`; on 2026-11-14 the host's picker, registered with a loader,
reached the old registry, which stored `{ load }` as a component, and the new `CustomField` rendered it:
`React.jsx: type is invalid ... but got: object`. Both times the host's and the plugin's
`registry.js` already held the new code, and only the file under `.vite/deps` was older. Deleting
`node_modules/.vite` and starting the host fixed it; a restart alone did not.

The same cache also keeps the list of what it pre-bundles. Once a `yarn build` has given the package an
Admin bundle, `node_modules/.vite/deps/_metadata.json` lists `@codee-sh/medusa-plugin-cms/admin`
at `.medusa/server/src/admin/index.mjs`. `yarn dev` empties `.medusa/server` when it starts and writes no
Admin bundle - the host serves the Admin from the plugin's source - yet Vite keeps re-bundling every
entry its metadata lists. On 2026-11-16, after the plugin's `yarn dev` restarted, the host's Admin
looped on `error while updating dependencies: ENOENT ... .medusa/server/src/admin/index.mjs`; deleting
`node_modules/.vite` fixed it.

After a change to `src/admin-extensions/` that a host must see, after the plugin's `yarn dev` starts
again, or after a reinstall of the host's dependencies, stop the host's `medusa develop`, delete its
`node_modules/.vite`, start it again and reload the Admin. A production host never meets it: its
Admin and its `admin-extensions` come from the one installed package.
