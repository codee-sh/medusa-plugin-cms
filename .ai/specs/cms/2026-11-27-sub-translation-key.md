# Translation Key

**Date:** 2026-11-27
**Status:** done
**Area:** backend
**Related:** [main-spec](./2026-11-04-main-spec.md)

## TLDR

The package root exports `translationKey(key, options?)`, which returns the text
`({ t }) => t(key, options)`. A host writes `label: translationKey("page.singular")` instead of a helper
of its own, which `docs/translations.md` asked every host to write. Additive, a patch release.

## Problem

A text of the config is a `CmsText`: a string, or a function given `{ t }`. To translate its labels, a
host writes the same four-line helper around `t`, as the example in `docs/translations.md` did with a
`text` function. Every host copies it, and a new host found that the README's basic setup gives no hint
that a string label is never translated.

## Current State and Evidence

- `src/lib/config/types.ts` - `CmsText`, `CmsTranslate` (the type of `t`), `TranslatedText` (what `t`
  returns, which the plugin's JSDoc calls a translation) and `TranslationOptions`.
- `src/lib/config/prepare-cms-text.ts` - `prepareCmsText` runs a text's function with `{ t }` once, at
  start, and checks the translation it returns: a key, a namespace from `options.ns` or
  `admin.translationNs`, and plain options.
- `docs/translations.md` - the example defined `const text = (key) => ({ t }) => t(key)` in the host.
- i18next and react-i18next name only the immediate call, `t`. The libraries that name a key translated
  later each give it a name of their own: FormatJS `defineMessage`, Lingui `msg`, gettext `N_`. Payload's
  labels take the same `({ t }) => ...` function as `CmsText` and leave any helper to the project.

## Target Behavior

- `translationKey(key, options?)` returns a `CmsText` that `prepareCmsText` turns into the same
  translation as `({ t }) => t(key, options)`.
- Its options are those of `t`, `ns` included. Without `ns`, the key takes `admin.translationNs`, and
  without either, Medusa does not start, with the error `prepareCmsText` already gives.
- A string and a function of the host's own keep working unchanged.

## Proposed Solution

- `src/lib/config/translation-key.ts` holds the function, beside `define-config.ts`. It runs on the
  server only, where the config is read, so it stays in `src/lib/` and not in `src/shared/` (AGENTS.md,
  main spec D36).
- `src/lib/index.ts` exports it from the package root.
- `docs/translations.md` shows the config on `translationKey`, and the README lists it under Exports and
  links the translations page from the basic setup.

### Alternatives Considered

- **A verb name, `buildTranslation` or `buildCmsText`.** Rejected (user, 2026-11-27): in a config the
  helper stands where a value goes, and `label: translationKey("page.singular")` reads as that value,
  as `translationNs` does in Medusa's admin-sdk. The name breaks the verb rule of
  `codee-ts-code-conventions` on purpose, and its JSDoc says so.
- **`translate(key)`.** Rejected: the helper translates nothing when it is called, and `translate` reads
  as `t`, the `CmsTranslate` that does.
- **An object text, `{ key, ns? }`, in `CmsText` itself.** Not taken now: it changes a public type and
  how the registry tells a text apart. It stays open if a host needs a serialisable config.

## Data Model and Persistence

None.

## Contracts

```ts
// exported from @mostrajs/cms
export const translationKey: (
  key: string,
  options?: TranslationOptions & { ns?: string }
) => CmsText
```

An added export, a patch below 1.0 (AGENTS.md, "Plugin Contract").

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| No `ns` and no `admin.translationNs` | Medusa does not start, the error names the text | `translation-key.unit.spec.ts` |
| `ns` given, Medusa's `translation` | The translation reads that namespace | `translation-key.unit.spec.ts` |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A host's own `translationKey` clashes with the import | low | host config | The host renames or drops its own | none |

**Rollout:** the next release, through its changeset.

**Rollback:** remove the export. A host that uses it goes back to a function of its own.

## Dependencies

- `prepareCmsText` and the `CmsText` contract, unchanged.

## Acceptance Criteria

- [x] `translationKey` is exported from `@mostrajs/cms`, and a unit test proves it yields the translation
  `t` yields, with and without `ns`, and fails without a namespace.
- [x] `docs/translations.md` and the README show it.
- [x] A host's labels show in the editor's language through it.

## Phasing

### Phase 1 - The export

**Goal:** a host names its config's translations with `translationKey`.

**Prerequisites:** None.

**Exit gate:** the gate passes, and a host's Admin shows a label through it.

## Implementation Plan

### Phase 1

1. **P1.1 - The function and its export**
   - **Outcome:** `translationKey` from the package root.
   - **Areas:** `src/lib/config/translation-key.ts`, `src/lib/index.ts`
   - **Verification:** `src/lib/config/__tests__/translation-key.unit.spec.ts`, `yarn typecheck`.

2. **P1.2 - Docs and release note**
   - **Outcome:** the translations page and the README on `translationKey`, and one changeset.
   - **Areas:** `docs/translations.md`, `README.md`, `.changeset/translation-key.md`
   - **Verification:** links resolve, the example matches the export.

3. **P1.3 - Checked on a host**
   - **Outcome:** a host's config imports `translationKey` once it is released, and its Admin shows the
     labels in Polish and English.
   - **Areas:** the host's `apps/backend/src/cms/config.ts`
   - **Verification:** the user's check in the Admin.

## Short Tracker

| Item | Status |
|---|---|
| P1.1 | done |
| P1.2 | done |
| P1.3 | done |

## Changelog

- 2026-11-27 - Drafted and implemented (user): the name `translationKey`, in `src/lib/config/`.
- 2026-11-27 - Done (user): released in `0.1.2`. A host that installs `0.1.2` from npm imports
  `translationKey` in place of its own helper, and its Admin shows the labels in English and Polish.
