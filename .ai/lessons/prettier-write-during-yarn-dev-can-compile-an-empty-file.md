---
{"title": "prettier --write during yarn dev can compile an empty file", "modules": [], "areas": ["tooling"], "topics": ["tooling"]}
---

# prettier --write during yarn dev can compile an empty file

With `yarn dev` (`medusa plugin:develop`) running, a source file rewritten by `prettier --write` can come
out of the watcher's compile as an empty module: `.medusa/server/src/.../<file>.js` holds only
`"use strict";` and a source map whose `"sources"` is `[]`, 133 bytes. The watcher does not compile the
file again once Prettier has finished, so the empty module stays, and yalc carries it to the linked
project.

Seen twice on 2026-11-09, each time in the minute Prettier rewrote the file:
`list-cms-taken-values.js`, which made the host project's server fail at start with
`listCmsTakenValuesStep is not a function`, and `build-cms-collection.js`, which failed the host
project's registry test with `buildCmsCollection is not a function`. The plugin's own checks passed,
because `tsc` and Jest read the sources, not `.medusa/server`. That the watcher read the file while
Prettier was writing it is inferred from the timing; it was not traced in the compiler.

Seen a third time on 2026-11-10: `src/lib/index.js`, the package root, came out empty after a
`prettier --write src` while `yarn dev` ran, and the host project's `medusa develop` failed to load its
config with `defineConfig is not a function`.

Seen twice more on 2026-11-10, after a source was rewritten whole - by a script or a shell heredoc that
truncates the file and writes it again - and then passed through `prettier --write`:
`validate-cms-document.js` (`validateCmsDocumentStep is not a function` at the host's start) and
`build-live-rows.js`. A whole-file rewrite leaves the same empty moment Prettier does, so it counts as
the same trigger.

Rule: after `prettier --write` or a whole-file rewrite with `yarn dev` running, look for empty compiled modules -
`find .medusa/server/src -name "*.js" -size -200c ! -path "*__tests__*"` lists them, and a type-only
file such as `types.js` is the one legitimate hit - then `touch` each source so the watcher compiles it
again, and push with `yalc publish --push --no-scripts`.
