# AGENTS.md

Operational guide for AI agents working in this repository.

`@codee-sh/medusa-plugin-cms` is a CMS for Medusa. A project models its content as ordinary Medusa
data models and registers them in a config; the plugin provides the workflows, the Admin and store APIs
and the Admin **Content** screens. It owns no content table.

Rules are grouped by the authority they carry: `Always` is the default, `Ask First` needs the user's
explicit approval, `Never` has no exception. The process around them is in [SDLC.md](SDLC.md), and review
rules are in [CODE_REVIEW.md](CODE_REVIEW.md).

---

## Always

- **MUST check `git status`** before editing, and preserve existing user changes.
- **MUST match the task against every applicable row in the Skill Router.** A single task often maps to
  multiple rows; load them all and report any unavailable skill.
- **MUST check `.ai/specs/`** before implementing any non-trivial feature. Follow `codee-spec-writing` for
  spec creation, updates, lifecycle changes, and review workflows.
- **MUST inspect the existing implementation** and related tests before deciding where to make changes.
- **MUST identify the smallest focused change** that satisfies the request. Prefer what Medusa already
  provides over a helper, and add a file only when the current step needs it.
- **MUST build only what the current step uses, in small units.** Code for a later step waits for it,
  checks and resolution included. A function does one job: one that finds, checks and builds in
  one body is split into named helpers. What a file holds and when a helper gets a file of its own:
  `codee-ts-code-conventions`, `references/code-layout.md`.
- **MUST design for the foreseeable future, not only for today.** "Nothing needs it now" is no argument
  for leaving a case out of a contract or for placing code where the next known consumer cannot reach
  it. Weigh an option by whether the cases the specs already name fit without a move or a break. This is
  no licence for features nobody asked for: build what the task needs, shaped so the next case fits.
- **MUST check how established headless CMSs shape a contract before designing one** - their config
  keys, a function's params and their names - and take the proven shape, adapted to how Medusa works.
  The maintainer's analyses sit in `.ai/specs/references/local/`, which stays out of the repository;
  read them when the folder exists. A spec states why its contract takes or leaves the common shape.
- **MUST keep a `.tsx` file to one component and its props type.** A function, a Lexical `$` function,
  a hook or a data table the component needs goes to a `.ts` file of its own beside the components -
  `utils/`, `hooks/`, `extensions/` for Lexical extensions - one subject per file, named after its
  export, so a component file only renders. A list that configures a component, such as a toolbar's
  controls, may sit beside it as a `.ts` file, as a table's `columns` does.
- **MUST keep the plugin generic.** It names no collection, block or model of any project; all of that
  comes from the config and the models it reads. Its tests run on `Test*` models of their own.
- **MUST name a project that uses the plugin by its role, never by its name.** A project the plugin runs
  in is the host, the one it is built alongside is the first host, and their parts are the host's backend
  and storefront; the plugin is the plugin. No project, repository or client name goes into code, tests,
  specs, lessons or commit messages. A path inside a host is written from the host's root, with the host
  named by role: `apps/backend/src/cms/config.ts` in the first host.
- **MUST NOT cache or copy data only to avoid re-reading it.** Read a field where it is needed instead of
  building a map or buffer of values that already sit in memory; keep extra state only when the logic
  needs it (dedupe, collision detection, an index a diff walks).
- **MUST write everything in English**: code, comments, variable names, and documentation.
- **MUST record non-obvious findings** as one kebab-case record in `.ai/lessons/` plus one row in the
  [.ai/lessons.md](.ai/lessons.md) catalog. Route the task through the catalog and open only the records
  that match; never bulk-read `.ai/lessons/`.
- **MUST commit a rename before the content change.** git records a file that is renamed *and* heavily
  edited as `RM`, and past a similarity threshold it records a delete plus an add, which makes the content
  diff unreadable. Check `git status --short` shows `R` and not `RM` before committing the rename. A file of
  one line whose line changes is never detected as a rename:
  [git-loses-the-rename-of-a-one-line-file-whose-line-changes](.ai/lessons/git-loses-the-rename-of-a-one-line-file-whose-line-changes.md).
- **MUST keep one authoritative source per topic.** A rule or a convention is explained in full in exactly
  one file; every other file carries the trigger and a link to it.
- **MUST present a feature from a newer framework version as an option, not a constraint.** When something
  the task needs exists only in a newer Medusa version than the installed one, say so plainly and let the
  user weigh the upgrade.
- **MUST, on a Medusa version bump,** read the GitHub release page of every release in the range, move every
  `@medusajs/*` dev and peer dependency to the new version together, run the gate and the linked project's
  tests, and prune the lessons per `codee-lessons`, "Pruning".
- **MUST keep shared rules in the repository.** A working rule belongs in this file or a `.ai/lessons/`
  record, never in an agent's private memory.
- **MUST call `clear({ key })` before `set`** on any Caching Module key meant to be replaced, and make test
  cache mocks reject writes over a live key. Why:
  [clear-a-cache-key-before-rewriting-it](.ai/lessons/clear-a-cache-key-before-rewriting-it.md).
- **MUST load `codee-medusa-testing`** before writing or reviewing a step, workflow, module service, API
  route, or exported util. It names the test layer, the runner, and the file location for that change.
- **MUST call Query and module services in steps only, and reach data through a workflow, reads
  included** - `codee-medusa-backend-conventions`, `references/workflows-and-steps.md`, "Where data is
  read and written".
- **MUST enforce every rule on the server, and mirror it in the Admin where it can run there.** A save is
  always checked by the server, whatever sent it. A data rule and code in `src/shared/` run in the browser
  through the same `buildDocumentSchema`; a rule the browser cannot run - a host's `server*` function, a
  check against stored data - reaches the editor through the `validate` route while they type. A new rule
  goes to the server first, and to the client by the same code, never by a copy.
- **MUST put a helper that code outside the plugin also uses in `src/shared/`,** the shared role of
  `codee-medusa-backend-conventions`, `references/file-layout.md`: sanitising, slugs, media types and rich
  text, which the server, the Admin, the form toolkit and a storefront (through the `./shared` entry) all
  import. `eslint.config.ts` holds its boundary. Everything else stays in `src/lib/` (main spec D36).
- **MUST log through one prefix constant**, `LOG_PREFIX`, never a bracketed literal repeated across
  files.
- **MUST add an Admin text in English and Polish at once.** A key goes to `en.json` and `pl.json` of its
  namespace in the same change - `src/admin/i18n/json/` for the Content screens, read through
  `useCmsTranslation`, and `src/admin/components/manager-form-fields/i18n/json/` for the form toolkit and
  media, read through `useManagerFormFieldsTranslation`; a count gets every Polish plural form. The
  translations' unit test fails on a key one language lacks.
- **MUST let the user's `yarn dev` carry a change to a linked project.** Do not run `yarn build` while it
  runs: a build cuts the link `yarn dev` makes to the Admin source until `yarn dev` starts again. To
  refresh the declarations the project typechecks against, run
  `npx tsc -p tsconfig.json --emitDeclarationOnly`, then `yalc publish --push --no-scripts`. Why:
  [yarn-dev-serves-the-plugin-admin-from-its-source](.ai/lessons/yarn-dev-serves-the-plugin-admin-from-its-source.md).

---

## Plugin Contract

- **The public contract** is the config types (`src/lib/config/types.ts`), what the package root and
  `./workflows` export, the shapes of the Admin and store routes, the inputs and outputs of the exported
  workflows, and the events. From 1.0 an additive change is a minor version and anything else is
  breaking: a major version, stated in its changeset and its commit message. Below 1.0 a breaking change
  is a minor, which its changeset and commit message call breaking; anything else is a patch.
- **Until the first release to npm the contract changes freely.** No project depends on a published
  version yet, so a change to the contract keeps no compatibility bridge and is not marked breaking: no
  major version and no breaking note in a spec, a changeset or a commit message. The rule above applies
  from the first published version on.
- **Medusa packages** are `devDependencies` at the installed version and `peerDependencies` from that
  version within 2.x, `^<version>`, so a project on a later 2.x release installs without peer warnings.
  Declare nothing Medusa or the dashboard already brings with yarn, such as `@tanstack/react-query`,
  `react-router-dom` or `@medusajs/js-sdk`.
- **yarn only.** A pnpm command here moves the dependencies aside. Why:
  [pnpm-in-the-plugin-hides-its-medusa-cli](.ai/lessons/pnpm-in-the-plugin-hides-its-medusa-cli.md).

---

## Ask First

- **Before implementing anything.** Describing, analyzing, reviewing, and planning are the default. Create
  or edit files only after an explicit instruction to implement. When in doubt, describe the change and
  wait for approval.
- **Before committing or pushing.** Commit only when the user explicitly asks for it. The request covers
  the commit it asks for and nothing past it. Finish the change, report it, and wait to be asked again.
- **Before pushing, opening a PR, or merging the release PR.** The merge of the release PR publishes to
  npm (SDLC.md, "Release"); only the maintainer merges it. Nothing is published by hand.
- **Before adding a production dependency.** Check what Medusa already ships and reuse that instead.
- **Before reducing scope, changing architecture, or touching code outside the active spec.**

---

## Never

- **Never run `yarn install`, `yarn dev`, `medusa develop`, or another long-running or dependency-install
  command**, here or in a linked project. The user runs them; tell them what to run and what to check.
- **Never create or run migrations**, here or in a project using the plugin. Schema belongs to the user,
  the test module's included: its migrations in `integration-tests/modules/test-content/migrations/` come
  from the user's `yarn test:db:generate`.
- **Never import from a project.** A project depends on the plugin, not the other way round.
- **Never refactor code outside the task scope.**
- **Never claim a change is ready to merge** on the strength of a check that was not run.
- **Never edit `.ai/specs/ended/` or `.ai/specs/implemented/`.** They are a frozen archive, with the one
  exception "Specification Repository Rules" states.
- **Never edit an installed skill.** The copies under `.agents/skills/`, and the `.claude/skills/` symlinks
  to them, are overwritten by the next install. A change to a skill belongs in the
  [codee-skills](https://github.com/codee-sh/codee-skills) repository.

---

## Validation Commands

| Check | Command |
|------|---------|
| Lint | `yarn lint` |
| Typecheck | `yarn typecheck` |
| Admin typecheck | `yarn typecheck:admin` |
| Format | `yarn format:check` |
| Unit tests | `yarn test:unit` |
| Build | `yarn build` |
| Lessons catalog | `yarn lessons:check` |

### Policy

- Validate changes once after a logical batch of edits.
- Report warnings separately and resolve all new validation errors introduced by the change.
- Report what you actually ran and what it returned. Naming a check you did not run, with the reason, is a
  complete answer.
- When a check fails for a reason that predates the change, report it explicitly.
- HTTP and workflow integration tests run in the plugin, manually, when a step's verification asks for
  them, and the user runs them (user, 2026-11-22): a full `yarn test:integration:http` takes minutes. The
  agent does not run `yarn test:integration:http`, `:modules` or `yarn test:db:up` on its own; it names
  in its report the test files the step needs and the command, and runs one only when the user asks for
  it, a single file over the whole suite. `yarn test:db:generate` is the user's. Unit tests stay the
  agent's routine check. The app is `medusa-config.ts` with the test module in
  `integration-tests/modules/test-content/`; how to run and extend them is in [docs/tests.md](docs/tests.md).

---

## Skills

Skills extend the agent with task-specific guidance, checklists, and reference material. They are installed
under `.agents/skills/`. If the task matches a skill's description, load it before starting, without
waiting to be asked. `SKILL.md` specifies which references to load for a given subtask.

### Skill Router

| Task | Skills |
|------|--------|
| Medusa backend | `codee-medusa-backend` |
| Medusa Admin UI, including forms | `codee-medusa-admin-dashboard` |
| Bug report, before proposing or writing a fix | `codee-root-cause` |
| TypeScript implementation or review, naming a function or a file, placing a helper | `codee-ts-code-conventions` |
| Any Medusa backend file - where it goes, what it is named, its JSDoc, what a step accepts and returns - and the plain functions beside it | `codee-medusa-backend-conventions` |
| Test for a Medusa step, workflow, module, API route, or util | `codee-medusa-testing` |
| Plugin tooling, release, npm publication, CI, integration test app, yalc, changeset text | `codee-medusa-plugin-delivery` |
| Plugin README, `docs/` pages, package name, description and keywords, GitHub description and topics | `codee-medusa-plugin-docs` |
| User-facing UI text | `codee-ui-copy` |
| Write or restructure specifications | `codee-spec-writing` |
| Review a Medusa specification | `codee-spec-review-medusa` |
| Working notes, including exploration for one spec module | `codee-spec-notes` |
| Non-obvious finding worth recording, or looking one up | `codee-lessons` |
| Pull request description | `codee-generate-pr-description` |
| New agent skill | `codee-skill-creator` |
| Configure or re-configure the agent pipeline | `codee-setup-agent-pipeline` |

---

## Specification Repository Rules

- Working notes never live in `.ai/specs/`: they go to `.ai/notes/{topic}/`, and a spec never depends on
  one. `codee-spec-notes` owns the rule.
- Create or update a spec for a new module, significant feature, architecture change, or change to APIs,
  data models, workflows, or cross-module behavior. Skip typo-only edits, small bug fixes, and isolated
  refactors with no behavior change.
- Pending, draft, active, and partially implemented specs live in their module folder under `.ai/specs/`.
- Closed sub-specs live in the module-local `ended/`. When a module has no active sub-specs, move the whole
  folder to `.ai/specs/ended/`, with `git mv`.
- `ended/` and `.ai/specs/implemented/` are a frozen archive: never edit a file there again, except to
  replace a project's, repository's or client's name with the host's role (see "MUST name a project that
  uses the plugin by its role"): the repository goes public without its history, so its files carry no
  such name.
- Keep the active spec's status, implementation plan, tracker, risks, and changelog synchronized with
  implementation.
- Split a phase into sub-phases (`1a`, `1b`, ...). Each is a few steps and ends in something the user can
  try; write the detailed steps of a sub-phase only when it is next, and list later ones by their goal.
- `codee-spec-writing` is the source of truth for document types, naming, templates, required sections,
  phasing, and tracker shape.

---

## Project Structure

```
src/
├── admin/         - the Admin Content screens
├── api/           - Admin and store routes
├── lib/           - config types, registry and pure helpers; exported as the package root
├── modules/cms/   - holds the project's config; no tables
├── shared/        - pure helpers the plugin and a storefront both use; the ./shared entry
└── workflows/cms/ - workflows and steps
```
