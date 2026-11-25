# Skill Code Conventions

**Date:** 2026-11-21
**Status:** done
**Area:** tooling
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-lib-structure-review](../2026-11-21-sub-lib-structure-review.md),
[sub-lib-cleanup](./2026-11-10-sub-lib-cleanup.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-21-sub-skill-code-conventions.md`
>
> The change lands in the [codee-skills](https://github.com/codee-sh/codee-skills) repository, which keeps
> no specs; this one sits here because the review of this plugin's `src/lib` found the gap.

## TLDR

How a plain function is named, which file and folder it goes in, and when a helper is taken out are
written down only in this plugin's closed `sub-lib-cleanup`, and partly, each in its own words, in four
skills. Every new project or plugin decides them again. This sub-spec writes them once in the
codee-skills repository: the framework-free rules in `codee-ts-code-conventions`, two new references;
what Medusa narrows in `codee-medusa-backend-conventions`, split into references so the model reads only
the part it needs. `sub-lib-structure-review` then fixes this plugin against the installed skills.

## Settled

User, 2026-11-21:

- **The table gains five verbs this plugin's exports already use:** `define-` (a config or a
  registration typed where it is written - `defineConfig`, as Medusa's `defineLink`), `map-` (a copy
  with each item turned by a function the caller gives), `sanitize-` (a value made safe to output, what
  is unsafe dropped), `matches-` (a predicate beside `is-` and `has-`) and `split-` (one value divided
  into named parts). `place-` is a `map-`, and `to-` stays replaced by `build-`, `format-` and
  `normalize-` (`sub-lib-cleanup`, D9); neither joins.
- **The skills come first;** `sub-lib-structure-review` follows them.
- **Framework-free rules in a general skill, framework rules as its narrowing.** Naming and code layout
  hold across projects; a framework skill lists only where it differs and links the rest, never
  restating the table.
- **A skill is split into references,** so `SKILL.md` stays short and routes the model to the file the
  task needs.
- **A helper leaves its unit only for a second consumer,** with a listed set of exceptions; testability
  alone is never a reason (the rule of `codee-medusa-backend-conventions` and `codee-medusa-testing`,
  kept).
- **The verb table binds exported functions, private helpers and file names.** A name may extend the
  table: an agent that finds a better verb proposes it with its meaning and asks, never uses it silently;
  an accepted verb is added to the skill, not to a project.

## Problem

`sub-lib-cleanup` (2026-11-10) set a verb table, a layout by domain, a `types.ts` per domain and an
order in which domains read each other. It is a closed spec, so neither this plugin's later sub-specs
nor another project read it: the review of 2026-11-21 found `check-`, types beside functions and a
folder cycle in code written since. Where the skills speak, they disagree on words: `lib/` is technical
code in another framework's build skill and in `codee-medusa-admin-dashboard`, a module's own domain code
in `codee-medusa-testing`.

## Current State and Evidence

All paths are in the codee-skills repository unless named otherwise.

- `general/codee-ts-code-conventions/SKILL.md` (97 lines) - comments, JSDoc, callback names,
  `<Component>Props`; nothing on function verbs, file names or folders. Its description:
  "comments, JSDoc, naming, and code clarity".
- `frameworks/medusa/codee-medusa-backend-conventions/SKILL.md` (321 lines, no `references/`) - "Apply
  this skill after `codee-ts-code-conventions`"; the layout of `workflows/`, `api/`, `modules/`,
  `links/`, `subscribers/`, `jobs/`; "Helpers shared inside a domain go in `<domain>/utils/`. Extract a
  helper out of a step only when it has a second consumer"; step verbs, where `prepare-` "judges
  nothing" and "`build-` stays available for plain functions; only steps may not use it". An
  uncommitted change of the user adds "A `transform()` callback stays one level deep", whose function
  goes to `<domain>/utils/` with a unit test "even with one caller"; it is kept and moved.
- `frameworks/medusa/codee-medusa-testing/SKILL.md:79-84` - extraction for a second consumer, or for a
  module's domain "in `src/modules/<module>/lib/`".
- `frameworks/medusa/codee-medusa-scripts/SKILL.md:102-107` - `src/scripts/shared/`, not `src/utils/`,
  which "is pure functions with unit tests".
- `frameworks/medusa/codee-medusa-admin-dashboard/references/file-structure.md` - `lib/` for the SDK
  client and query keys, `utils/` for pure helpers, `<feature>/common/` and `components/` by number of
  consumers; "In a plugin: Import only types from the backend code".
- Another framework's build skill in codee-skills - a helper by its narrowest owner:
  feature `utils/`, module `utils/`, `src/lib/{technology}/` for technical, domain-agnostic code; "Do not
  use `src/lib/` as a generic dumping ground".
- `agents-templates/medusa.md:21-22`, `medusa-plugin.md:20-21` - the router rows of both skills;
  `README.md`, "General - working skills" - `codee-ts-code-conventions` as "Comments, JSDoc, naming and
  clarity".
- Projects: the first host's `apps/backend/src/utils/` and the `automations` and `notifications-emails`
  plugins keep shared pure code in `src/utils/`; the first host's modules keep their own code in
  `modules/<module>/lib/` (`asset`, `customer-access`, `navigation`); this plugin keeps its domain code
  in `src/lib/`, the package root.
- This plugin, `.ai/specs/cms/ended/2026-11-10-sub-lib-cleanup.md`, "Verbs", "Layout" - the table and
  the rules this sub-spec carries over.

## Target Behavior

- An agent naming a function, a step or a file, or placing a helper or a folder, in any TypeScript
  project, reads the rule from one installed skill reference.
- In a Medusa project it reads the general reference and the Medusa one, which names only differences.
- A verb outside the table is proposed to the user, not used.

## Proposed Solution

### `general/codee-ts-code-conventions/`

- **`SKILL.md`** keeps comments, JSDoc and the callback and props names, and gains a reference router:
  `references/function-and-file-names.md` when naming a function, a symbol or a file; `references/code-layout.md` when
  creating a file or a folder or placing a helper. Its description becomes "TypeScript code conventions
  for comments, JSDoc, the names of functions and files, and where plain code goes. Use when writing or
  reviewing TypeScript code, naming a function or a file, or deciding where a helper goes. Leave
  mechanical formatting to the project's formatter and linter."
- **`references/function-and-file-names.md`:**
  - A file is named after its export in kebab-case; it holds one subject - an exported function with
    the helpers only it uses, or a pair that writes and reads one format with the constant they share.
  - The verb table from `sub-lib-cleanup` - `get-`, `list-`, `find-`, `describe-`, `validate-`,
    `prepare-`, `build-`, `format-` / `parse-`, `normalize-`, `is-` / `has-` - each with what it does
    and returns, plus `define-`, `map-`, `sanitize-`, `matches-` and `split-` (Settled), and a table
    of synonyms not used with their replacement
    (`check-` to `validate-`, `resolve-` to `prepare-` or `validate-`, `to-` to `build-` / `format-` /
    `normalize-`, `load-` / `retrieve-` to `get-` / `list-`, `place-` to `map-`).
  - `prepare-` shapes what its consumer reads and holds no check of its own; it runs the `validate-`
    helpers of its domain.
  - The table binds exports, private helpers and file names; extending it is proposing and asking
    (Settled).
  - A framework skill may narrow the table for its own units; it lists only the difference.
- **`references/code-layout.md`:**
  - Folders by domain - what the code is about - never by kind (`checks/`, `builders/`, `helpers/`).
  - A domain folder's `types.ts` holds the shapes other files import; a type used by one file stays in
    it.
  - No two folders import each other; a domain reads only the domains it builds on.
  - Folder roles: **helpers** of one domain or feature, pure; **technical** code bound to a technology
    and to no domain - a client, an adapter; **shared** code that runs outside the app or package too,
    which imports nothing of the framework, its boundary held by lint where the project can. A
    framework skill names the folder of each role; a project with none uses `utils/`, `lib/<technology>/`
    and `shared/`. No role is a dumping ground.
  - A helper sits at its narrowest owner: one feature, then one domain, then shared across domains; a
    business rule stays in its owning domain when another reads it.
  - A helper leaves its unit for a second consumer. Exceptions: what the framework gives no test where
    it sits (the framework skill names it); code another runtime imports, such as a browser bundle,
    which goes to a file that imports nothing of the server. Testability alone is never one.
  - A plain function is pure: no I/O and no container; reading and writing belong to the framework's
    units.
  - Code that predates the rules is left as it is unless fixed deliberately; its backlog belongs to
    the project, not to the skill.

### `frameworks/medusa/codee-medusa-backend-conventions/`

- **`SKILL.md`** - its scope, "apply after `codee-ts-code-conventions`, whose `function-and-file-names.md` and
  `code-layout.md` this skill narrows", a router to the three references, its rules in one line each,
  and Deviations. Its description adds "where a plain function goes and what it is named".
- **`references/file-layout.md`** - today's "File layout" sections as they are, and the roles mapped:
  a workflow domain's helpers in `workflows/<domain>/utils/`; a module's own code in
  `modules/<module>/lib/`, as `codee-medusa-testing` and the projects have it; pure code several domains,
  routes or subscribers read in `src/utils/<domain>/`; in a plugin, code a storefront imports too in
  `src/shared/`, behind an export entry. The extraction exceptions of Medusa: a `transform()` callback's
  function, which goes to `<domain>/utils/` with a unit test even with one caller (the user's change);
  a function a plugin's Admin runs too.
- **`references/step-and-workflow-names.md`** - the step verbs as the difference from the general
  table: `fetch-` and the write verbs for steps only; `prepare-` in a step judges nothing, as a check is
  a `validate-` step; `build-` never on a step; the synonyms; a step's file named after its symbol
  without the suffix, a workflow's id after its file; workflow naming with `claim-`. The names of
  subscriber, job and link files stay in `file-layout.md`, beside their folders, as today.
- **`references/workflows-and-steps.md`** - workflow composition with the user's `transform()` rule, one
  job per step, step shape, workflow and step JSDoc, each section as it is today.

### Elsewhere in codee-skills

- `frameworks/medusa/codee-medusa-testing/SKILL.md:79-84` - the location sentence links
  `codee-medusa-backend-conventions` `references/file-layout.md` instead of naming the path, one source.
- `frameworks/medusa/codee-medusa-admin-dashboard/references/file-structure.md`, "In a plugin" - "Import
  only types from the backend code, except a pure function the server and the Admin both run, from a
  file that imports nothing reaching Node."
- `agents-templates/`, the four templates - the
  `codee-ts-code-conventions` row reads "TypeScript implementation or review, naming a function or a
  file, placing a helper"; the `codee-medusa-backend-conventions` row adds "plain functions".
- `README.md` - the `codee-ts-code-conventions` row says what it now covers.

### Alternatives Considered

- **Everything in `codee-medusa-backend-conventions`:** a project on another framework or on plain
  TypeScript would not have the naming rules, or would copy them; settled against.
- **A new general skill for layout:** one more router row in every project for rules every TypeScript
  task needs; `codee-ts-code-conventions` already loads on every one.
- **One folder name per role for every framework:** Medusa projects keep a module's code in
  `modules/<module>/lib/` and another framework keeps technical code in `src/lib/`; one name would
  turn working code into deviations. The role is general, the name the framework's.
- **Leaving the other framework's placement rules as they are:** out of scope here; once the
  general reference exists, they can be cut to a link in a change of their own.

## Contracts

None in code. The skills' names stay; `codee-ts-code-conventions` and
`codee-medusa-backend-conventions` change their descriptions, which decide when they load.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A task names a function in a non-Medusa project | `codee-ts-code-conventions` loads and its `function-and-file-names.md` answers | the description names "naming a function"; inspection |
| A Medusa step's name | the general table and the Medusa difference, no rule stated twice | `grep` for the table's rows in both files finds one copy |
| An agent wants a verb not in the table | it proposes and asks | the rule's text in `function-and-file-names.md` |
| A project still installs the old copy | it keeps the old rules until reinstalled | the reinstall step |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| The model loads `SKILL.md` but not the reference | medium | every project | `MUST load` lines in each router, as `codee-medusa-admin-dashboard` has | the model may still skip one |
| The general and the Medusa table drift | medium | Medusa projects | the Medusa reference lists differences only and links the rest | none while the rule holds |
| The user's uncommitted change is lost in the split | low | `codee-medusa-backend-conventions` | moved word for word into `workflows-and-steps.md`, checked by `git diff` | none |
| Existing code breaks the new rules | low | projects | Deviations: left alone unless fixed deliberately | each project's backlog |

**Rollout:** commit and push codee-skills; the user reinstalls from GitHub in each project (README,
"Always install from GitHub") and adds the router wording to its `AGENTS.md` by hand.

**Rollback:** revert the codee-skills commits and reinstall.

## Dependencies

- None to start. `sub-lib-structure-review` Phase 1 waits for this sub-spec.

## Acceptance Criteria

- [x] `codee-ts-code-conventions` has `references/function-and-file-names.md` and `references/code-layout.md`, routed
  from `SKILL.md`, its description naming function names, file names and placement.
- [x] `codee-medusa-backend-conventions` is a short `SKILL.md` with three references, the user's
  `transform()` rule among them word for word.
- [x] No rule is written in full in two skills: the verb table once, the extraction rule once with
  Medusa's exceptions apart, the module path once.
- [x] The router rows in `agents-templates/` and the `README.md` row say what the skills cover.
- [x] Reinstalled in this plugin, its Skill Router row updated.

## Phasing

### Phase 1 - The general rules

**Goal:** `codee-ts-code-conventions` answers naming and layout for any TypeScript project.

**Prerequisites:** None.

**Exit gate:** the user reads both references and approves; the description and router say when each
loads.

### Phase 2 - Medusa as a narrowing

**Goal:** `codee-medusa-backend-conventions` split into references, stating only Medusa's differences;
`codee-medusa-testing` and `codee-medusa-admin-dashboard` link to it.

**Prerequisites:** Phase 1.

**Exit gate:** `git diff` shows today's sections moved, not lost; no rule in two files; the user
approves.

### Phase 3 - Templates, README and install

**Goal:** projects route to the skills by their new scope.

**Prerequisites:** Phase 2.

**Exit gate:** the templates and README updated, the commits pushed by the user, the skills reinstalled
here and the router row of `AGENTS.md` updated.

## Implementation Plan

### Phase 1

1. **P1.1 - `references/function-and-file-names.md`**
   - **Outcome:** the verb table with the five added verbs, the synonyms, the file name and one-subject rules,
     the extension rule.
   - **Areas:** `general/codee-ts-code-conventions/references/function-and-file-names.md`.
   - **Changes:** as under Proposed Solution; examples in plain TypeScript, naming no project.
   - **Verification:** inspection by the user; every verb of `sub-lib-cleanup`'s table is in it.

2. **P1.2 - `references/code-layout.md`**
   - **Outcome:** domain folders, `types.ts`, no folder cycles, the three roles, the narrowest owner,
     extraction with its exceptions, pure functions, deviations.
   - **Areas:** `general/codee-ts-code-conventions/references/code-layout.md`.
   - **Changes:** as under Proposed Solution.
   - **Verification:** inspection by the user; the other framework's placement rules fit it without
     contradiction.

3. **P1.3 - `SKILL.md` router and description**
   - **Outcome:** the skill loads for naming and placement, and routes to both references.
   - **Areas:** `general/codee-ts-code-conventions/SKILL.md`.
   - **Changes:** the description as under Proposed Solution; a "References" section with `MUST load`
     lines, in the shape of `codee-medusa-admin-dashboard`'s; the "Related Skills" table kept.
   - **Verification:** inspection; the frontmatter keeps `name` and `description` only.

### Phases 2 and 3

Listed by goal above; their steps are written when each is next (AGENTS.md).

## Short Tracker

- `done` - Phase 1 (2026-11-21), codee-skills `139f80e`: `function-and-file-names.md` (renamed from
  `naming.md`; identifier names stay in `SKILL.md`, "Identifier names") and `code-layout.md`.
- `done` - Phase 2 (2026-11-21), codee-skills `ce48da6`: the three references, `SKILL.md` cut to a
  router, `codee-medusa-testing` and `codee-medusa-admin-dashboard` linking to `file-layout.md`. Beyond
  the plan: the `transform()` example's `toListedDocument` renamed `buildListedDocument`, as `to-` is not
  a verb; middleware's `ensure-` and `verify-` marked as Medusa's narrowing; a module's `clients/` named
  as Medusa's technical folder.
- `done` - Phase 3 (2026-11-21), codee-skills `efec6de`: the router rows of the four
  `agents-templates/`, two rows of `README.md` and one review skill's line. Reinstalled by the
  user here and in the first host, both copies identical to codee-skills `main`; the router rows of
  both `AGENTS.md` updated.
- `done` - closed 2026-11-21 (user), moved to `ended/`.
