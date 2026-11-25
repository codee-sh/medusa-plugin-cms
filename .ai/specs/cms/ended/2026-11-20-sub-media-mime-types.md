# Media MIME Types

**Date:** 2026-11-20
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-20-sub-media-mime-types.md`

## TLDR

A media field's `accept` sits among D33's data rules, which the server enforces on every write, but only
the picker checks it: a save straight to the API can put a PDF into an image-only field. The server
cannot check a field's types on a save, as the default provider's records carry no type and the upload
route knows no field. So the rule splits by where it can hold, in the common CMS shape: the media
provider gets `mimeTypes`, the types the media library takes at all, which the upload step enforces beside
`maxFileSize`; and a field's `accept` becomes `admin.mimeTypes`, the picker's narrowing of the provider's
types, an editor hint as D33 defines one. Both take exact types and `type/*` wildcards, matched by one
helper in `src/shared/` that the server and the Admin both run.

## Settled

User, 2026-11-20:

- **Two levels:** `mimeTypes` on the media provider, enforced by the server when a file is uploaded;
  `admin.mimeTypes` on a media field, the picker's filter, within the provider's types.
- **The name:** `mimeTypes` at both levels, the common CMS name, and what the values are: MIME
  types, matched against a record's `mime_type`. `accept` stays only inside the Admin, as the components'
  prop and the `<input accept>` attribute.
- **D33** is amended accordingly: a field's types leave the data rules for the editor hints, and the
  provider's `mimeTypes` is a rule the server holds at upload.
- **Wildcards:** yes, `image/*` as the common CMS shape takes it, at both levels.
- **Defaults:** a provider without `mimeTypes` takes any type, as `maxFileSize` defaults to a limit and
  not to a refusal; a field without `admin.mimeTypes` keeps JPG, PNG and WebP.
- **Now, before the first release** (user, 2026-11-20): the config contract changes freely until then.

## Problem

D33 (main spec) states that a data rule at the top level of a field "is enforced by the server on every
write" and that "a rule the server does not hold is no rule". `accept` is listed there, but nothing on the
server reads it. The server cannot start reading it on a save as things stand: it does not know a stored
file's type, and the upload route does not know which field a file is for.

## Current State and Evidence

- `src/lib/config/types.ts:242` - `MediaField.accept?: string[]`, at the top level of the field;
  `FieldAdminConfig` (`:93`) holds `description` only, and `SlugField` extends it as
  `SlugFieldAdminConfig`.
- `src/lib/field/prepare-field.ts:16`, `:103` - `DEFAULT_MEDIA_ACCEPT`, JPG, PNG and WebP, copied into the
  projection as `accept`; `src/lib/field/validate-media-field.ts` checks `stores` and the multiplicity, not
  `accept`: an empty list or a string passes.
- `src/lib/field/types.ts:76` - the projection's `accept`, which
  `src/admin/cms/common/utils/build-field-config.ts:59` hands the form toolkit as `media.accept`.
- `src/lib/media/find-missing-media.ts` - a save checks that each media value has a record, not its type.
- `src/lib/media/providers/file-media-provider.ts:69` - `retrieve` keeps `{ id, url }` of the File
  Module's answer; `src/lib/media/providers/types.ts` - `CmsMedia.mime_type` is optional.
- `src/lib/media/providers/abstract-media-provider.ts:70` - `maxFileSize`, an abstract getter;
  `FileMediaProvider` reads it from its options (`:49`) and checks them in `validateOptions` (`:32`).
- `src/workflows/cms/steps/create-cms-media.ts:27` - the upload step refuses a file over `maxFileSize`
  with `INVALID_DATA`, for a caller that skips the route's parser; it has the file's `mimeType`, which
  multer takes from the part's `Content-Type`.
- `src/admin/components/media/utils/check-upload-file.ts:21` - the picker checks a type with
  `accept.includes(file.type)`, exact only; `mime-type-label.ts` labels a type by its subtype.
- `src/api/admin/cms/media/validators.ts:6`, `media-select-table.tsx:49` - the field's types are sent to
  the provider's `list` as `mime_type`; `FileMediaProvider` has no `list`.
- `integration-tests/modules/test-content/cms-config.ts:73`, `integration-tests/http/cms/admin-cms-collections.spec.ts:153`,
  `src/lib/registry/__tests__/prepare-registry.unit.spec.ts:2363-2370`,
  `src/admin/cms/common/utils/__tests__/build-field-config.unit.spec.ts:170` - `accept` in the test app
  and the tests; `README.md:15` - the D33 table with `accept`.
- **Inference:** a `mimeTypes` check at upload guards against a mistake, not an attacker, as the type
  comes from the client. Sniffing the content is outside this sub-spec.

## Target Behavior

- A provider's `mimeTypes`, when given, refuses an upload of any other type with `400`,
  `The file type "<type>" is not allowed`; left out, any type is taken.
- A media field's `admin.mimeTypes` decides what its picker offers and takes, JPG, PNG and WebP when left
  out; the server does not check it on a save.
- Both take exact types and `type/*`, compared without regard to case.
- A config with `accept` on a media field, or with `mimeTypes` that are not a non-empty list of MIME types
  or wildcards, fails at start naming its place.

## Proposed Solution

- **`src/shared/media/`** - `matchesMimeType(type, patterns)`, true when a pattern is the type or its
  `type/*`, case-insensitively; and `isMimeTypePattern(value)`, a `type/subtype` or `type/*` of RFC 6838
  token characters. One file each. The upload step and the Admin's check both call `matchesMimeType`; the
  registry and `FileMediaProvider.validateOptions` both call `isMimeTypePattern`.
- **Provider:** `AbstractCmsMediaProvider` gets `get mimeTypes(): string[] | undefined`, `undefined` by
  default, so existing providers keep taking any type. `FileMediaProviderOptions.mimeTypes` sets
  `FileMediaProvider`'s, and its `validateOptions` refuses a list that is empty or holds a non-pattern.
  The JSDoc of `list` says a query's `mime_type` may hold `type/*`.
- **Upload:** `create-cms-media` refuses a file whose `mimeType` the provider's `mimeTypes` does not
  match, with `INVALID_DATA`, before `maxFileSize`'s check and before `upload`. The route's middleware
  stays as is: the step is where the workflow's rule lives, and it already holds the size check for
  callers that skip the route.
- **Field config:** `MediaField` loses `accept` and takes `admin?: MediaFieldAdminConfig`, which extends
  `FieldAdminConfig` with `mimeTypes`, as `SlugFieldAdminConfig` does for `lockOnEdit`.
  `validateMediaField` refuses `accept` (a JS config can still give it), and `admin.mimeTypes` that is not
  a non-empty list of patterns.
- **Projection:** `Field.accept` becomes `Field.mimeTypes`, `prepareField` fills it from
  `admin.mimeTypes` or the default, and `buildFieldConfig` hands it on as the toolkit's `media.accept`.
- **Admin:** `checkUploadFile` matches with `matchesMimeType`; `mimeTypeLabel` shows a wildcard as written.
- **Docs:** D33's table in the main spec and in `README.md` move the field's types to the editor hints;
  the comment on `FieldBase` follows.

### Alternatives Considered

- **Check the provider's types in the upload middleware:** a caller of the workflow that skips the route
  would bypass it; the step already holds the size check for that reason.
- **Check a field's types against the provider's at start:** the registry has no provider instance, and
  creating one without a container could fail in a host's provider; the upload refuses a type outside the
  provider's anyway, with a message the editor sees.
- **Keep the projection's key `accept`:** the config says `mimeTypes`; one name from config to projection
  keeps a search for it complete, and the form toolkit keeps its own `accept`, the HTML name.

## Data Model and Persistence

None. No model, column or migration changes; stored values are untouched.

## Contracts

- Config: `MediaField.accept` is gone; `MediaField.admin.mimeTypes` and
  `FileMediaProviderOptions.mimeTypes` are new. The plugin is unreleased, so no bridge (AGENTS.md).
- `AbstractCmsMediaProvider.mimeTypes`, a getter with a default, is additive for a host's provider.
- The collections route's field projection answers `mimeTypes` in place of `accept`.
- `POST /admin/cms/media` answers `400` with `The file type "<type>" is not allowed` for a type the
  provider does not take.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| Provider `["image/*"]`, upload `image/png` | stored | step unit test of `create-cms-media` |
| Provider `["image/*"]`, upload `application/pdf` | `INVALID_DATA`, nothing stored | step unit test |
| Provider without `mimeTypes`, any type | stored, as today | step unit test |
| `IMAGE/PNG` against `image/*` | matches | unit test of `matchesMimeType` |
| `image/*` against `imagex/png` or `image` | no match | unit test |
| `mimeTypes: []`, `"image/png"` as a string, or `"png"` on the provider | `validateOptions` throws | unit test of `FileMediaProvider` |
| Field `admin.mimeTypes: []` or with `"png"` | config error at start | unit test of `prepareRegistry` |
| Field with `accept` in a JS config | config error at start naming `admin.mimeTypes` | unit test of `prepareRegistry` |
| Field without `admin.mimeTypes` | projection holds JPG, PNG and WebP | unit test of `prepareRegistry` |
| Picker given `image/*`, file `image/gif` | accepted before upload | unit test of `checkUploadFile` |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A host's config still sets `accept` | low | startup | the registry refuses it with a message naming `admin.mimeTypes` | none; the plugin is unreleased |
| A field's `admin.mimeTypes` reaches outside the provider's | low | Admin upload | the upload answers `400` naming the type, which the picker shows | the mismatch shows at the first upload, not at start |
| A client sends a false `Content-Type` | low | media library | none here: the check guards against mistakes, as Current State says | a file of another type can be stored |

**Rollout:** one commit; the test app's config moves to `admin.mimeTypes` with it.

**Rollback:** revert the commit.

## Dependencies

- None. `sub-rich-text-features` changes `config/types.ts` and `prepare-field.ts` too; whichever lands
  second rebases on the other.

## Acceptance Criteria

- [x] An upload of a type outside the provider's `mimeTypes` is refused, and any type passes without it.
- [x] A media field takes `admin.mimeTypes` with wildcards, and refuses `accept`.
- [x] The Admin's picker takes a file a wildcard matches.
- [x] D33 in the main spec and the README list the field's types among the editor hints.

## Phasing

### Phase 1 - File types where the rule holds

**Goal:** the provider's types are enforced on upload; a field's types are an editor hint under `admin`.

**Prerequisites:** None.

**Exit gate:** the steps' unit tests pass; `yarn lint`, `yarn typecheck`, `yarn typecheck:admin`,
`yarn format:check` and `yarn test:unit` pass. The HTTP tests are updated for the projection's key;
running them is manual (`yarn test:integration:http`), and the report says whether they ran.

## Implementation Plan

### Phase 1

1. **P1.1 - The MIME type helpers**
   - **Outcome:** `matchesMimeType` and `isMimeTypePattern` in `src/shared/media/`.
   - **Areas:** `src/shared/media/matches-mime-type.ts`, `src/shared/media/is-mime-type-pattern.ts`, their
     tests.
   - **Changes:** as Proposed Solution; plain functions without imports.
   - **Verification:** unit tests - exact and wildcard matches, case, a near miss (`imagex/png`), a type
     without a subtype; patterns accepted and refused.

2. **P1.2 - The provider's `mimeTypes`, enforced on upload**
   - **Outcome:** a provider's types refuse other uploads.
   - **Areas:** `abstract-media-provider.ts`, `file-media-provider.ts`, `create-cms-media.ts`, their tests.
   - **Changes:** the getter with its default; `FileMediaProviderOptions.mimeTypes` and its check in
     `validateOptions`; the step's refusal before the size check; the step's JSDoc.
   - **Verification:** `file-media-provider.unit.spec.ts` - `mimeTypes` read from the options, invalid
     lists refused; `create-cms-media.unit.spec.ts` - a matching type stored, another refused and not
     uploaded, any type without `mimeTypes`.

3. **P1.3 - A field's `admin.mimeTypes`**
   - **Outcome:** the field config, its checks and the projection use `admin.mimeTypes`.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/types.ts`, `prepare-field.ts`,
     `validate-media-field.ts`, `src/admin/cms/common/utils/build-field-config.ts`, the test app's
     `cms-config.ts`, `prepare-registry.unit.spec.ts`, `build-field-config.unit.spec.ts`,
     `admin-cms-collections.spec.ts`.
   - **Changes:** as Proposed Solution, Field config and Projection.
   - **Verification:** `prepare-registry.unit.spec.ts` - the default and a given list in the projection,
     an empty list, a non-pattern and `accept` refused; `build-field-config.unit.spec.ts` - `mimeTypes`
     handed on as `media.accept`.

4. **P1.4 - The Admin's check takes wildcards**
   - **Outcome:** the picker matches as the server does.
   - **Areas:** `src/admin/components/media/utils/check-upload-file.ts`, `mime-type-label.ts`, their tests.
   - **Changes:** `matchesMimeType` in place of `includes`; a wildcard labelled as written.
   - **Verification:** `check-upload-file.unit.spec.ts` - a wildcard accepted, an outside type refused;
     `yarn typecheck:admin`.

5. **P1.5 - D33 and the docs**
   - **Outcome:** the main spec, the README and the config comment say where a field's types work.
   - **Areas:** `.ai/specs/cms/2026-11-04-main-spec.md` (D33's table and its 2026-11-20 amendment),
     `README.md`, `src/lib/config/types.ts` (`FieldBase`'s comment).
   - **Changes:** `accept` out of the data rules row, `mimeTypes` into the editor hints row; the
     amendment's "until it is built" removed.
   - **Verification:** inspection; then the Phase 1 exit gate.

## Short Tracker

- `done` - Phase 1 (2026-11-20): `yarn lint`, `yarn typecheck`, `yarn typecheck:admin`,
  `yarn format:check` and `yarn test:unit` pass. `admin-cms-collections.spec.ts` updated for
  `mimeTypes`; the HTTP tests were not run.
- `done` - closed 2026-11-20 (user), moved to `ended/`.
