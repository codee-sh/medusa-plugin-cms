---
{"title": "yarn dev compiles a changed test into the package", "modules": [], "areas": ["tooling", "testing"], "topics": ["tooling", "testing"]}
---

# yarn dev compiles a changed test into the package

`tsconfig.json` excludes `**/__tests__/**`, and `yarn build` honours it: it empties `.medusa/server` and
compiles through the TypeScript config, so a published package holds no test. `yarn dev`
(`medusa plugin:develop`) does not. Its watcher compiles every `.ts` file that is added or changed, and
ignores only `integration-tests`, `test`, `unit-tests` and `src/admin`, never the config's `exclude`
(`@medusajs/framework` 2.22.7 `dist/build-tools/compiler.js`, `developPluginBackend` and
`_Compiler_backendIgnoreFiles`). Each test edited while it runs lands in `.medusa/server`, beside the
code, and stays there until the next `yarn build`.

`yalc publish --push` then copies those tests into the host's `apps/backend/.yalc`, and a host whose
Jest `testMatch` reaches that folder runs them. They fail there - their `fixtures` sit in
`integration-tests`, which the package never holds - so the host's unit run reports failures that are
neither the host's nor the plugin's. Nothing in the plugin's own gate shows it.

A host linking this plugin through yalc keeps `<rootDir>/.yalc/` in Jest's `modulePathIgnorePatterns`.
Stale tests in `.medusa/server` are removed with
`find .medusa/server -path "*__tests__*" -delete`, or by a `yarn build` once `yarn dev` is stopped.
