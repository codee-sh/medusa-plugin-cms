# Text Field Hints: Recommended Length and Placeholder From Another Field

**Date:** 2026-11-11
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md), [sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

> Folder: `.ai/specs/cms/ended/`

## TLDR

Two optional keys on a `text` or `textarea` field of the CMS config. `recommendedLength` shows a character
counter under the input in the Admin, which turns orange past the number and never blocks a save.
`placeholderFrom` names another text field of the same model, whose current value is shown as the
placeholder while the field is empty. Both are generic: SEO fields are the first use (an SEO title of
about 60 characters that falls back to the title, a description of about 160), but the plugin names no
SEO field and owns no SEO column (main spec D2, D17).

## Problem

An editor filling an SEO title or description has no way to see how long it may be or what the
storefront shows when it is left empty. A host project can only write that in the field's
`description`, which does not count anything and goes stale when the source changes.

- `src/lib/config/types.ts` - a `text` or `textarea` field takes `label`, `description`, `required` and
  `validation`, nothing more.
- `validation: z.string().max(60)` exists, but it is a hard limit: a save over it fails. Search engines
  cut a title by its width in pixels, not by a character count, so a hard limit refuses text that would
  show in full.
- `src/admin/components/manager-form-fields/types/types.ts` - `ManagerFormFieldConfig.placeholder` exists,
  but only as fixed text; nothing fills it from the form.

## Current State and Evidence

- `src/lib/field/prepare-fields.ts` - builds a `Field` from each config field after checking it against its
  column; `validateSlugFields` checks a slug's `from` the same way the new source check works.
- `src/lib/field/types.ts` - `Field` is what the registry keeps and `GET /admin/cms/collections` returns
  to the Admin.
- `src/admin/cms/common/build-field-config.ts` - turns a `Field` into a `ManagerFormFieldConfig`; both
  the document form (`document-fields/document-field.tsx`) and a block card
  (`area-field/area-field.tsx`) render through it and `ManagerFormField`.
- `src/admin/components/manager-form-fields/manager-form-field.tsx` - renders the label, hint, input and
  error of every field; the value of a field sits at `<name>.<field name>`, so a sibling field of the same
  model sits at `<name>.<other field>` in a document and in a block alike.
- `react-hook-form` 7.83.0 - `useWatch` takes `disabled`, so a field without a source watches nothing.
- `@medusajs/dashboard` `dist/app.css` - ships `text-ui-tag-orange-text`, the warning colour used for the
  counter.

## Target Behavior

- A `text` or `textarea` field with `recommendedLength: 60` shows `0 / 60` under its input, updated as the
  editor types. Past 60 the counter turns orange; the save is unchanged.
- A field with `placeholderFrom: "title"` shows the current title as its placeholder while it is empty,
  updated as the title changes. With the title empty it shows no placeholder.
- The placeholder is a hint only: the field stays empty in the form, in the save and in the store API. A
  storefront applies the same fallback itself (D17).
- Both work the same in a document's fields, a block's fields and a list row's fields.
- A config that gives `recommendedLength` other than a positive whole number, or a `placeholderFrom` that
  is not another `text` or `textarea` field of the same model, fails at startup with the field named.

## Proposed Solution

1. **Config** (`src/lib/config/types.ts`): the `text` and `textarea` types move out of `PlainField` into
   their own `TextField` type with two optional keys, `recommendedLength?: number` and
   `placeholderFrom?: string`. The other types do not take them: a slug fills itself from its source, and
   a counter means nothing on a number or a date.
2. **Registry** (`src/lib/field/`): a new `validateTextFields`, called in `prepareFields` beside
   `validateSlugFields`, checks both keys against the model's config. `prepareField` copies them onto the
   `Field`, which gains the two keys.
3. **Admin toolkit** (`src/admin/components/manager-form-fields/`): `ManagerFormFieldConfig` gains
   `recommendedLength` and `placeholderFrom`, generic to the toolkit and not to the CMS.
   `ManagerFormField` watches `<name>.<placeholderFrom>` and passes its text as the input's placeholder,
   falling back to `placeholder`; under the control it renders a `LengthCounter` when `recommendedLength`
   is set.
4. **CMS Admin** (`src/admin/cms/common/build-field-config.ts`): passes both keys through. Nothing in
   `DocumentField` or `BlockCard` changes, since both render through `ManagerFormField`.

### Alternatives Considered

- **A hard limit through `validation`:** stays available, but it fails the save for text a search engine
  may show in full; a counter guides without blocking.
- **SEO columns or an SEO group owned by the plugin:** the plugin owns no content column (D2) and names no
  field of a project; a project declares the fields and the keys make them helpful.
- **The fallback resolved by the store API:** the store API returns stored values (D17); a resolved value
  would also hide from the editor that the field is empty.
- **The placeholder computed in `DocumentField`:** a block card renders fields without it, so the logic
  would be written twice; `ManagerFormField` is the one place both pass through.

## Data Model and Persistence

None. The keys are config only; no column or migration changes.

## Contracts

- **Config types** (`src/lib/config/types.ts`, public): two optional keys on `text` and `textarea` fields.
  Additive, a minor version.
- **`GET /admin/cms/collections`**: each field of a collection, block or list may carry
  `recommendedLength` and `placeholderFrom`. Additive; the Admin of the same package reads them.
- **Startup errors**, through `buildConfigError`:
  - `<path>: field "<name>" takes recommendedLength as a positive whole number`
  - `<path>: field "<name>" takes its placeholder from "<source>", which is not another text field`

## UI/UX

- The counter sits right-aligned under the input, above the error, as `<length> / <recommended>` in
  `Text size="xsmall"`, `text-ui-fg-subtle`, and `text-ui-tag-orange-text` past the number. It holds only
  numbers, so it needs no translation key.
- A disabled field still shows its counter and placeholder.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| The source field is empty | No placeholder, or the config's fixed `placeholder` | Inspection in the host project |
| The source is not a text field (a slug, a number) or the field itself | Startup error naming the field | Registry unit test |
| The field holds `null` | The counter shows `0` | `LengthCounter` reads `null` as empty; inspection |
| Text past the recommended length | Orange counter; the save passes | Inspection |
| A block row moved or removed | The watch follows the row's path, as every field of the row does | Inspection |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| An editor reads the placeholder as a saved value | low | content | Placeholder styling of the input; the storefront applies the same fallback | Editors may still ask |
| A watch per field with a source re-renders the field on each keystroke in the source | low | admin | Only fields with `placeholderFrom` watch; others pass `disabled` | none |

**Rollout:** a minor version; projects opt in per field.

**Rollback:** remove the keys from a project's config; the plugin works without them.

## Dependencies

- `sub-collections-and-documents`: fields, `prepareFields`, `buildFieldConfig`, `ManagerFormField`.

## Acceptance Criteria

- [x] A config with both keys on a `text` and a `textarea` field builds; the registry's field carries them.
- [x] A non-integer, zero or negative `recommendedLength` fails at startup with the field named.
- [x] A `placeholderFrom` naming itself, a missing field or a non-text field fails at startup.
- [x] `buildFieldConfig` passes both keys to `ManagerFormFieldConfig`.
- [x] In a host project, the SEO title shows the page title as its placeholder and a counter that turns
  orange past 60; a save past 60 succeeds.

## Phasing

### Phase 1 - Hints in the config and the Admin

**Goal:** a host project sets both keys and the Admin shows the counter and the placeholder.

**Prerequisites:** none.

**Exit gate:** registry and `buildFieldConfig` unit tests pass; lint and both typechecks pass; the user
checks the SEO group of a page in a host project.

## Implementation Plan

### Phase 1

1. **P1.1 - Config keys and their check**
   - **Outcome:** `recommendedLength` and `placeholderFrom` on `text` and `textarea` fields, checked at
     startup and carried by the registry's `Field`.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/types.ts`,
     `src/lib/field/validate-text-fields.ts`, `src/lib/field/prepare-fields.ts`.
   - **Changes:** the `TextField` config type; `validateTextFields` beside `validateSlugFields`;
     `prepareField` copies both keys.
   - **Verification:** `src/lib/registry/__tests__/prepare-registry.unit.spec.ts` - the keys reach the
     field; each invalid value fails with its message.

2. **P1.2 - Counter and placeholder in the Admin**
   - **Outcome:** `ManagerFormField` renders the counter and the watched placeholder; the CMS passes the
     keys.
   - **Areas:** `src/admin/components/manager-form-fields/types/types.ts`,
     `src/admin/components/manager-form-fields/manager-form-field.tsx`,
     `src/admin/components/manager-form-fields/length-counter.tsx`,
     `src/admin/cms/common/build-field-config.ts`.
   - **Changes:** the two toolkit keys; `useWatch` with `disabled` when there is no source; the placeholder
     handed to the input through the config; `LengthCounter`; `buildFieldConfig` passes the keys.
   - **Verification:** `src/admin/cms/common/__tests__/build-field-config.unit.spec.ts`;
     `typecheck:admin`; the host project's SEO group by the user.

## Short Tracker

- `done` - Phase 1 / P1.1 and P1.2: unit tests, lint and both typechecks pass (2026-11-11).
- `done` - Phase 1 exit gate: the user ran the host's migration of its new column and confirmed the page's
  SEO group works in the Admin (2026-11-11).
- `done` - Closed 2026-11-11 after a `codee-spec-writing` checklist pass run in the same session, not by
  an independent reviewer. One Low finding stays: a `placeholderFrom` naming a missing field has no test
  of its own; it takes the same branch as a non-text source, which is tested.
