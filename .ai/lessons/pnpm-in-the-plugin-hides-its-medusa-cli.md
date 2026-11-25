---
{"title": "pnpm in the plugin hides its Medusa CLI", "modules": [], "areas": ["tooling"], "topics": ["tooling"]}
---

# pnpm in the plugin hides its Medusa CLI

The plugin is installed with yarn (`yarn.lock`, `packageManager` in `package.json`). Running a pnpm command
in it, such as `pnpm dev`, lets pnpm check the dependencies first; it finds a `node_modules` made by
another package manager and moves every direct dependency into `node_modules/.ignored`, `@medusajs/cli`,
`@medusajs/framework` and `@medusajs/medusa` among them.

The symptom points elsewhere. `node_modules/.bin/medusa` still links to `../@medusajs/cli/cli.js`, which is
gone, so `yarn dev` falls back to a global `medusa` (here `~/.config/yarn/global`) of an older version. It
prints `ERROR undefined`, a command list without `plugin:*`, `db:*` or `exec`, and
`Unknown argument: plugin:develop`, which reads like a broken plugin script rather than a missing install.
`yarn install` alone may answer that everything is up to date, because `.yarn-integrity` was not touched.

The case above was seen on Yarn 1; the plugin has run on Yarn 4, through Corepack, since 2026-11-09.

Use yarn only in the plugin, also in a host project that uses pnpm. To recover, remove `node_modules` and
run `yarn install`; `yarn medusa --version` then reports the project's Medusa version again. The Yarn 1
recovery, `yarn install --frozen-lockfile --check-files`, does not apply to Yarn 4.
