---
{"title": "yalc publish pushes the build yarn dev last compiled", "modules": [], "areas": ["tooling"], "topics": ["tooling"]}
---

# yalc publish pushes the build yarn dev last compiled

`yalc publish --push` copies the package as it is on disk, and the package's code is the compiled
`.medusa/server`, which only a running `yarn dev` (`medusa plugin:develop`) or a build refreshes. With
`yarn dev` stopped, a push carries the code of the last compilation, however many source changes came
after it.

Found on 2026-11-18: the exclusive flag rule was pushed to the first host several times while `yarn dev`
was not running. The host's `publish-cms-document.js` stayed at an hours-old compilation without the new
step, a published page took the homepage flag while another kept it, and nothing looked wrong: the
declarations from `npx tsc -p tsconfig.json --emitDeclarationOnly` were fresh, so the host's typecheck
passed against types its running code did not have.

Rule: before pushing, check that `.medusa/server` holds the change - a new file's compiled `.js`, or a
grep of the changed workflow - and after pushing, check the same in the host's
`node_modules/@codee-sh/medusa-plugin-cms/.medusa/server`. With `yarn dev` stopped, ask the user
to start it rather than pushing.
