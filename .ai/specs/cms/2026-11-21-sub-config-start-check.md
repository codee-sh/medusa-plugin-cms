# Config Start Check

**Date:** 2026-11-21
**Status:** review
**Area:** backend
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-lib-structure-review](./ended/2026-11-21-sub-lib-structure-review.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-21-sub-config-start-check.md`

## TLDR

The plugin checks a project's config only when the first CMS request reads the registry: an invalid
config starts the app, and every CMS route then answers with the same error. This sub-spec checks the
config when the app starts, as a Medusa module checks its options: a loader of the CMS module builds the
registry, an error stops the start, and a warning is logged while the app starts. The registry is then
held by the module, not by a module-level variable of `src/lib`. What only a request can check - a
save, the `validate` route, a host's `server*` rule - stays at run time.

## Open Questions

- Q1. Which warnings does the first version add - only the mechanism, or named checks with it?
- Q2. Does `validateConfig`, which a host's tests call (the first host's
  `apps/backend/src/cms/__tests__/cms-config.unit.spec.ts`), also hand back the warnings, or does it
  keep throwing on errors only?

## Settled

User, 2026-11-21, in the review of `sub-lib-structure-review`:

- **Two kinds of finding.** An error stops the start; a warning is logged and the app starts.
- **Every check there is today stays an error.** A warning is a new check, for a config that works but
  looks like a mistake. An error is a config the registry cannot be built from, or one that would make
  a read or a write wrong or unsafe.
- **A migration is not blocked by an invalid config.**
- **The check runs at start as far as it can, and at run time for the rest.**
- **A sub-spec of its own**, after `sub-lib-structure-review`: that one changes no behavior, this one
  does.

## Problem

`getRegistry` builds the registry on the first call and keeps it, or the error, in a module-level `let`
(`src/lib/registry/get-registry.ts:12`). A project with an invalid config starts, and learns of it from
the first CMS request; `sub-lib-structure-review` records the module-level state as a deviation from
"plain functions are pure" (`codee-ts-code-conventions` `references/code-layout.md`). Nothing can warn
about a config: every check throws.

## Current State and Evidence

- `src/modules/cms/index.ts` - `Module(CMS_MODULE, { service })`, no loader;
  `src/modules/cms/service.ts` keeps the plugin's `config` option and returns it from `getConfig()`.
- `src/lib/registry/get-registry.ts` - `resolveRegistry` reads the config from the CMS module, throws
  `UNEXPECTED_STATE` without one, and runs `prepareRegistry`; `getRegistry` keeps the result or the
  error, and logs the error once.
- `src/lib` holds about 118 config checks, all of them throws (`buildConfigError` and `MedusaError`),
  most in `field/` (39), `layout/` (18), `collection/` (17) and `registry/` (16). No config check warns.
- `@medusajs/modules-sdk` `dist/loaders/utils/load-internal.js:484-503` - a module loader that throws is
  logged and its module registered as `undefined`; `dist/loaders/module-loader.js:12-17` throws that
  error on, so the app does not start.
- `load-internal.js:193-204` - with `migrationOnly`, a module registers its `__joinerConfig` and returns
  before `runLoaders`: a migration runs no loader of the CMS module.
- **To verify:** whether `medusa db:migrate`'s migration scripts load the whole app, and with it the
  loader.

## Target Behavior

- An app whose config has an error does not start; the log names the error as the CMS route answers it
  today.
- An app whose config has a warning starts; the log carries the warning, under `LOG_PREFIX`.
- `medusa db:migrate` runs whatever the config holds.
- A step and a middleware read the registry the module built, as fast as today.

## Short Tracker

- `pending` - Q1 and Q2; then the rest of the spec, after `sub-lib-structure-review` is done.
