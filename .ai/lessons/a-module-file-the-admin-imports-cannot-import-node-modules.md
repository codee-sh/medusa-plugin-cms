---
{"title": "A module file the Admin imports cannot import a Node module", "modules": [], "areas": ["admin", "backend"], "topics": ["tooling", "typescript"]}
---

# A module file the Admin imports cannot import a Node module

The Admin is bundled by Vite for the browser, and any backend file it imports - a constant from
`src/modules/<module>/lib/`, for example - goes into that bundle with all of its own imports. Vite
replaces a Node built-in such as `node:crypto` with an empty browser stub, so a named import from
it fails the bundle: `"createHash" is not exported by "__vite-browser-external:node:crypto"`.

Found when a file whose constant an Admin page imports gained a `createHash` import. Nothing before
the build saw it: a typecheck that excludes `src/admin`, an Admin `tsc` that resolves Node types without
complaint, and unit tests that run in Node. The build failed locally and on Medusa Cloud.

Rule: keep a file the Admin imports free of Node modules, and put server-only code that needs one in
a file of its own. After touching a file that `src/admin` imports, run `yarn build`, which bundles the
Admin, before committing.
