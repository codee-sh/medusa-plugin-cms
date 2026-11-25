# Prepare Checks

**Date:** 2026-11-21
**Status:** done
**Area:** backend
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-lib-structure-review](./2026-11-21-sub-lib-structure-review.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-21-sub-prepare-checks.md`

## TLDR

The verb table says a `prepare-` function shapes its input and holds no check of its own: it runs the
`validate-` helpers of its domain (`codee-ts-code-conventions` `references/function-and-file-names.md`).
`sub-lib-structure-review` brought `prepareFields` and `prepareRegistry` to it; 16 more functions of
`src/lib` still throw from their own body. This sub-spec moves each such check into a private
`validate-` helper beside its caller, renames the two functions whose verb is wrong, and records the two
that hold no check of a config. No message, behavior or export changes.

## Settled

User, 2026-11-21, in the review of `sub-lib-structure-review`:

- **A sub-spec of its own**, so `sub-lib-structure-review` closes with the two functions its plan named.

## Problem

`sub-lib-structure-review` promised in Target Behavior that no `prepare-` holds a check inline, and its
plan covered two functions. The rest read as shaping code that also judges, which the verb table keeps
apart: a reader of a `prepare-` cannot tell from its name that it throws.

## Current State and Evidence

The `prepare-` functions of `src/lib` with a `throw` in their own body, from a scan of each top-level
function (2026-11-21):

| Function | File | Throws | What it checks |
|---|---|---|---|
| `prepareCollectionActions` | `collection/prepare-collection-actions.ts` | 3 | a singleton names no actions; the actions are a list; **Create** once |
| `prepareFilterableFields` | `collection/prepare-store-query.ts` | 3 | no block field filterable; a filterable field public and boolean |
| `prepareAreas` | `area/prepare-areas.ts` | 3 | an area's name no column, not `areas`; its block types configured |
| `prepareAreaModel` | `area/prepare-area-model.ts` | 1 | a nullable text `parent_id` |
| `prepareLabels` | `config/prepare-labels.ts` | 1 | the labels an object |
| `prepareCmsText` | `config/prepare-cms-text.ts` | 1 | the text a string or a translation |
| `prepareBlockSections` | `block/prepare-block-sections.ts` | 1 | a block section with no `position` or `areas` |
| `prepareLinkPolicy` | `field/prepare-link-policy.ts` | 2 | the policy's shape; `validateLinkPolicy`'s problem thrown |
| `prepareHeadingSizes` | `field/prepare-rich-text-features.ts` | 1 | the sizes a list of `h1` to `h6` |
| `prepareRichTextFeature` | same | 2 | a built-in feature's key; its props an object |
| `prepareRichTextFeatureList` | same | 1 | the features a list |
| `prepareMaxDepth` | `registry/prepare-registry.ts` | 1 | a positive whole number |
| `prepareTranslationNs` | same | 1 | a namespace of the project's own |
| `prepareMedia` | `media/prepare-media.ts` | 4 | the provider's class, `identifier`, `stores`, and its `validateOptions` |
| `prepareConfigValue` | `config/prepare-config-value.ts` | 1 | none: it names the place of an error the config's function threw |
| `prepareAreasWrite` | `document/prepare-document-write.ts` | 1 | none: `UNEXPECTED_STATE` for a collection with areas and no area model, which the registry never builds |

Two names break the table besides: `prepareTranslationNs` shapes nothing and returns its input once
checked, a `validate-` that returns what it matched; `prepareAreasWrite` returns nothing and adds calls
to the write its caller holds, a `push-`.

Tests: `prepare-registry.unit.spec.ts` covers every check above by its message, `prepare-store-query`,
`prepare-labels` and `prepare-cms-text` their own. Two checks had no case - a `linkPolicy` whose
`protocols` are no list, and `features` that are no list - and gained one before this sub-spec's code
changes, passing on the code as it was.

## Target Behavior

- Every `prepare-` function of `src/lib` holds no `throw` in its own body, `prepareConfigValue` apart:
  its throw names where the config's function failed and judges nothing.
- `prepareAreasWrite` is `pushAreasWrite`, its `UNEXPECTED_STATE` guard kept: it narrows a state the
  registry never builds, and checks no input.
- `prepareTranslationNs` is `validateTranslationNs`.
- Every message a config error carries is the one it carries now.

## Proposed Solution

Each check goes to a private `validate-` helper in its caller's file, named after what it checks, with
its message unchanged. A helper with one caller stays private, however many lines it checks
(`code-layout.md`, "When a helper leaves its unit"), so no file is added, moved or renamed. Where the
caller needs what the check matched - a feature's key and props, a text's translation, a list it
narrowed - the helper returns it, as the table lets a `validate-` do. No helper is typed `asserts`: an
arrow function needs an explicit type at each call to assert, and the codebase writes arrow functions.

| Caller | Helper |
|---|---|
| `prepareCollectionActions` | `validateSingletonActions(configured, path)`, `validateActions(actions, slugs, path)` with `validateAction`, returning the actions |
| `prepareFilterableFields` | `validateFilterableFields(blocks, filterable, path)` |
| `prepareAreas` | `validateArea(name, area, holder, blocks, path, kind)` |
| `prepareAreaModel` | `validateParentColumn(description)` |
| `prepareLabels` | `validateLabels(labels, path)` |
| `prepareCmsText` | `validatePreparedText(text, prepared, where)`, returning the text |
| `prepareBlockSections` | `validateBlockSectionKeys(sections, path)` |
| `prepareLinkPolicy` | `validateResolvedLinkPolicy(policy, path)` |
| `prepareHeadingSizes` | `validateHeadingSizes(sizes, path)`, returning the sizes |
| `prepareRichTextFeature` | `validateFeature(feature, path)`, returning its key, props and place |
| `prepareRichTextFeatureList` | `validateFeatureList(features, path)`, returning the list |
| `prepareMaxDepth` | `validateMaxDepth(depth)` |
| `prepareMedia` | `validateMediaProvider(resolve, options)`, returning the class |

### Alternatives Considered

- **A file of its own per check:** the rule keeps a single helper private in its caller's file; only a
  caller running several subjects side by side splits them, and each caller here checks one subject.
- **A check inside `prepareConfigValue`'s callers instead of its `try`:** its throw is no check; it
  stays.

## Data Model and Persistence

None.

## Contracts

None changes: every function this sub-spec touches is internal to `src/lib`, and every message stays.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| Any config error of the table | the same message, at the same point of the checks | `prepare-registry.unit.spec.ts` and the domain tests pass unchanged |
| A `linkPolicy` whose `protocols` are no list | refused, as before | the case added before the change |
| `features` that are no list | refused, as before | the case added before the change |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A check moves after a step it ran before, so another error shows first | low | config errors | each helper is called where its block was | none |

**Rollout:** one phase, behind no flag. **Rollback:** revert its changes; no data is touched.

## Dependencies

- [sub-lib-structure-review](./2026-11-21-sub-lib-structure-review.md), Phase 1 done.

## Acceptance Criteria

- [x] A scan of each top-level `prepare-` function of `src/lib` finds no `throw` in its body but
  `prepareConfigValue`'s.
- [x] `grep -rnw "prepareTranslationNs\|prepareAreasWrite" src` finds nothing.
- [x] `yarn test:unit` passes with no assertion changed beyond the two cases added first.

## Phasing

### Phase 1 - The checks out of `prepare-`

**Goal:** the Target Behavior.

**Prerequisites:** none.

**Exit gate:** `yarn lint`, `yarn format:check`, `yarn typecheck`, `yarn typecheck:admin` and
`yarn test:unit` pass.

## Implementation Plan

### Phase 1

1. **P1.1 - The two uncovered checks tested**
   - **Outcome:** cases for a `linkPolicy` whose `protocols` are no list and for `features` that are no
     list, in `prepare-registry.unit.spec.ts`.
   - **Verification:** they pass on the code before P1.2.

2. **P1.2 - The checks of `collection/`, `area/` and `block/`**
   - **Outcome:** the helpers of the table for `prepareCollectionActions`, `prepareFilterableFields`,
     `prepareAreas`, `prepareAreaModel` and `prepareBlockSections`.
   - **Verification:** `prepare-registry` and `prepare-store-query` tests pass unchanged.

3. **P1.3 - The checks of `config/` and `field/`**
   - **Outcome:** the helpers of the table for `prepareLabels`, `prepareCmsText`, `prepareLinkPolicy` and
     the three of `prepare-rich-text-features.ts`.
   - **Verification:** `prepare-registry`, `prepare-labels` and `prepare-cms-text` tests pass unchanged.

4. **P1.4 - The checks of `registry/` and `media/`, and the two names**
   - **Outcome:** `validateMaxDepth`, `validateTranslationNs`, `validateMediaProvider`;
     `pushAreasWrite`.
   - **Verification:** the Acceptance Criteria; `prepare-registry` and `prepare-document-write` tests
     pass unchanged; then the Phase 1 exit gate.

## Short Tracker

- `done` - P1.1 (`4559a23`, 2026-11-21): the two cases pass on the code as it was, 262 tests in
  `prepare-registry.unit.spec.ts`.
- `done` - P1.2 to P1.4 (`2751707` to `4ff91a0`, 2026-11-21): exit gate green - `yarn lint`, `yarn format:check`,
  `yarn typecheck`, `yarn typecheck:admin`, and `yarn test:unit` at 124 suites and 1011 tests; the scan
  finds a `throw` in `prepareConfigValue` only.
- `done` - closed by the user (2026-11-21).
