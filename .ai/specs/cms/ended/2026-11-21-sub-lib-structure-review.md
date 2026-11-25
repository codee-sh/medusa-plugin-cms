# Lib Structure Review

**Date:** 2026-11-21
**Status:** done
**Area:** backend
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-lib-cleanup](./2026-11-10-sub-lib-cleanup.md),
[sub-lib-review-fixes](./2026-11-20-sub-lib-review-fixes.md),
[sub-store-public-fields](./2026-11-20-sub-store-public-fields.md),
[sub-rich-text-features](./2026-11-20-sub-rich-text-features.md),
[sub-media-mime-types](./2026-11-20-sub-media-mime-types.md),
[sub-config-start-check](../2026-11-21-sub-config-start-check.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-21-sub-lib-structure-review.md`

## TLDR

A second review of `src/lib` (2026-11-21), after `sub-rich-text-features` and `sub-media-mime-types`,
found no defect that changes behavior. It found breaches of the layout `sub-lib-cleanup` set - a verb
outside its table, types declared beside functions against D12, checks inline in `prepare-` functions -
a folder cycle between `media/` and `document/`, names that still say "media" for what carries rich text
too, a handful of copied helpers, and JSDoc the rich text change left stale. The layout rules, which
sat only in the closed `sub-lib-cleanup`, moved to the codee-skills skills in
[sub-skill-code-conventions](./2026-11-21-sub-skill-code-conventions.md). A second pass against
the installed skills found every function named outside the verb table, private helpers included,
three folder cycles where the first pass saw one, and a gap in the skills themselves - their
extraction rule would have folded this plugin's per-check files back into their callers - which a
follow-up change of codee-skills closed. This sub-spec fixes the code against the installed skills in
four sub-phases, renames first.

## Settled

User, 2026-11-21:

- **No `lib/store/` and no `lib/rich-text/`.** The store's code follows the domain order of
  `sub-lib-cleanup`: `prepareStoreQuery` builds a registry entry, in `collection/`; the `build-store-*`
  functions read, in `document/`. One folder would hold both layers and make `collection/` and the new
  folder import each other's types. The rich text code in `src/lib` converts a document's values, which
  is `document/`'s; `prepareRichTextFeatures` stays in `field/` beside `prepareLinkPolicy`, which it uses.
- **The files the Admin imports from `src/lib` keep no guard** beyond what holds them today.
- **The layout rules go to the codee-skills skills, not to `AGENTS.md`** - the commonly used and the
  missing ones, so no project restates them - and before this sub-spec's code changes; they are
  designed in [sub-skill-code-conventions](./2026-11-21-sub-skill-code-conventions.md). An installed
  copy under `.agents/skills/` is never edited (AGENTS.md, "Never").
- **The `media/` - `document/` cycle is broken**: `buildStoreDocument` gets a document whose media and
  rich text are already placed, as the Admin's read already gets one.

User, 2026-11-21, after the review against the installed skills:

- **The skills' extraction rule changes, but not to "always extract".** A helper gets a file of its own
  beside its caller only when the caller runs several such subjects side by side - the checks of one
  config, the parts of one structure; a single helper stays private in its caller's file, however long.
  A Medusa step keeps its logic in its own file. With that, this plugin's per-check files fit the rule
  as they are.
- **The verb table gains `pick-`, `add-` and `push-`:** `add-` returns the entry it added or found, or
  the value it extended; `push-` puts an item into a list, a map or an object its caller holds and
  returns nothing. `select-` becomes `pick-`, `push-` or `add-`, `read-` becomes `describe-` or
  `parse-`, and `walk-` takes the verb of what the walk does.
- **"Query and module services in steps only" moves to `codee-medusa-backend-conventions`,** middleware
  included unless it reads no data; this plugin's two rules and the first host's one leave their
  `AGENTS.md` once it is installed.
- **`media/providers/` and `media-stores.ts` become `lib/media-provider/`,** the lowest domain that
  `config/`, `field/` and `media/` read, so no cycle is left.
- **The registry's getters stay impure, as a recorded deviation** - see Proposed Solution.
- **`retrieve-` names the data layer's read, `fetch-` a read from outside the app, and a name the
  framework gives keeps the framework's word** (codee-skills `dd45213`). Nothing in this plugin changes
  for it: `AbstractCmsMediaProvider`'s `retrieve`, `upload`, `delete` and `list` mirror Medusa's
  providers, and no plain function of `src/lib` reads.

User, 2026-11-21, after the second review:

- **`RichTextFeature.checkNode` becomes `findNodeErrors`.** It returns why a node is refused, an empty
  list for a node the feature takes - the problems of a value, which the verb table names `find-`.
  `validateNode` stays the name of the private walk in `validate-rich-text.ts`, so the hook and the
  walk that calls it are not one name. An established CMS registers a node's validations with the node
  it registers; the plugin keeps one hook per feature, named by its own table: that shape is the
  inspiration, not a template.
- **`src/lib` keeps its folders, in one order of two layers** - the config layer, which builds the
  registry, and the read layer, `document/`, which works on a built one; the order is in the main
  spec's [Architecture](../2026-11-04-main-spec.md#architecture). `media/` keeps the config layer's part,
  `prepare-media.ts` with `RegistryMedia` and `ClientMediaProvider`; the code that reads a document's
  media moves to `document/`, which converts a document's values, as the rich text code does. Medusa's
  core holds its layers strictly and lets the domains of one layer read each other (`core-flows`:
  `cart` and `order` import each other); the plugin has few folders, so its order holds across all of
  them. The registry stays built in `src/lib` on the first read; checking the config at start is a
  sub-spec of its own.

## Problem

`sub-lib-cleanup` laid `src/lib` out by domain, with a verb table, a `types.ts` per domain (D12), an
order in which domains read each other, and the rule that a `prepare-` function runs the `validate-`
helpers of its domain and holds no check inline. Later sub-specs added code that does not follow all of
it, and the rules sit in a closed spec that neither a contributor nor an agent reads before working.

## Current State and Evidence

Where the rules are - the skills of codee-skills `dd45213`, installed here and in the first host,
which this sub-spec's checks read:

- `.agents/skills/codee-ts-code-conventions/references/function-and-file-names.md` - the verb table,
  `retrieve-`, `fetch-`, `pick-`, `add-` and `push-` included, the framework's own names, the verbs not
  used, one subject per file, a file named after its export.
- `.agents/skills/codee-ts-code-conventions/references/code-layout.md` - folders by domain, a domain's
  `types.ts` for the types other files import, no two folders importing each other, a helper beside
  its caller only when the caller runs several subjects side by side, pure plain functions, and code
  that predates the rules brought to them when a task changes it.
- `.agents/skills/codee-medusa-backend-conventions/references/file-layout.md` and
  `workflows-and-steps.md` - Medusa's folders for each role, a step keeping its logic, and Query and
  module services in steps only.
- `.ai/specs/cms/ended/2026-11-10-sub-lib-cleanup.md`, "Verbs" and "Layout" - where the verb table, D12
  and the domain order first came from; the skills now hold them.

Breaches of the layout:

- Types beside functions that another file imports (D12; `code-layout.md`): `StoreSelection`,
  `StoreAreaSelection`, `StoreBlockSelection` in `document/build-store-selection.ts`, imported by
  `build-store-document.ts` and `build-store-read-fields.ts`; `StoreQueryInput` in
  `collection/prepare-store-query.ts`, imported by `prepare-collection.ts`. `MediaSlot`
  (`media/list-media-slots.ts`) and `MapBlock` (`document/map-document-blocks.ts`) are used by their own
  file only, so they stay.
- Checks inline in a `prepare-`: `field/prepare-fields.ts:86-118`, the two `required` checks;
  `registry/prepare-registry.ts:111-133`, the slug check written once for blocks and once for collections.
- The columns the plugin writes, described three ways: `DOCUMENT_COLUMN_TYPES` exported from
  `collection/validate-document-columns.ts` and read by `prepare-collection.ts:24`; `BLOCK_COLUMN_TYPES`
  in `block/prepare-block.ts`, passed to `validateColumnTypes`; `AREA_COLUMN_TYPES` in
  `area/prepare-area-model.ts`, likewise.
- Three folder cycles, all through `media/`, from a graph of the relative imports between the folders
  of `src/lib` (2026-11-21):
  - `media/` and `document/`: `document/build-store-document.ts` imports `media/place-media-records` and
    `media/types`; `media/list-media-slots.ts`, `place-media-records.ts`, `find-missing-media.ts` and
    `types.ts` import `document/`;
  - `media/` and `config/`: `config/types.ts` imports `media/providers/abstract-media-provider` and
    `media/providers/types`; `media/prepare-media.ts` and `types.ts` import `config/`;
  - `media/` and `field/`: `field/types.ts` imports `media/providers/types` and
    `field/validate-media-field.ts` imports `media/media-stores`; `media/` imports `field/types`.

  `media/providers/` and `media-stores.ts` sit below everything else in `media/`: they import nothing of
  `src/lib` but each other.
- A fourth cycle, through three folders, which no pair shows (second review, 2026-11-21):
  `document/` imports `registry/types` (8 files, types only); `registry/prepare-registry.ts`, `types.ts`
  and `validate-media-provider-fields.ts` import `media/prepare-media` and `media/types`; `media/`
  imports `document/` as above. Moving the providers out leaves it: `media/` holds two layers - the
  config's `prepareMedia`, `RegistryMedia` and `ClientMediaProvider`, read by `registry/`, the Admin
  and `get-cms-media-provider`; and a read's `findMediaRecord`, `findMissingMedia`, `listHeldValues`,
  `listMediaSlots`, `placeMediaRecords`, `MediaRead` and `MediaRecords`, which walk a document and are
  read by `document/` and the steps.
- Functions that are not pure (`code-layout.md`, "Plain functions are pure"):
  `registry/get-registry.ts` keeps the process's registry in a module-level `let` and resolves the CMS
  module and the logger from the container; `get-collection.ts` and `get-media-provider.ts` reach the
  container through it. `media/providers/` reaches the File Module, which is the technical role.
- `collection/list-public-fields.ts` reads block fields too (`collection/prepare-store-query.ts:65`,
  `document/build-store-selection.ts:99`, `:164`); `sub-store-public-fields` placed it beside
  `listStoreColumns`, its first consumer.

Names - every function of `src/lib` and `src/shared` checked against the verb table of
`function-and-file-names.md`, exports and private helpers alike:

| Now | In | Verb of the table |
|---|---|---|
| `checkComponentField`, `checkComponentNode`, `checkFieldSections` | `lib/layout/` | `validate-` |
| `checkTranslation` | `lib/config/prepare-cms-text.ts` | `validate-` |
| `walkLayout` | `lib/layout/check-field-sections.ts`, `validate-field-sections.ts` after P1a.1 | `validate-`: it walks to check |
| `toAreaKey`, `toStoredRichText` | `lib/document/prepare-document-write.ts` | `format-` |
| `toStoredValues` | same | `prepare-` |
| `toLinkableKey` | `lib/document/list-revived-rows.ts` | `format-` |
| `writeArea`, `deleteRemovedBlocks` | `lib/document/prepare-document-write.ts` | `push-`: they push calls to the write and return nothing |
| `placeMediaRecords`, `placeFieldRecords` | `lib/media/place-media-records.ts` | `map-` |
| `gatherBlockColumns` | `lib/document/build-store-read-fields.ts` | `push-`: it fills the caller's map and returns nothing |
| `selectAreaPath`, `selectWholeArea`, `selectWholeBlock`; `blockSelectionOf` | `lib/document/build-store-selection.ts` | `push-`: they fill the caller's selection; `add-` for `blockSelectionOf`, which returns the entry |
| `readJsonSchemaType`, `readObjectSchema` | `lib/field/validate-field-schema.ts`, `validate-model-schema.ts` | `describe-` |
| `namesColumn` | `lib/area/validate-area-link.ts` | `matches-` |
| `whenObject` | `lib/document/build-document-schema.ts` | `is-` |
| `plural` | same | `format-` |
| `checkElement`, `checkElementAttributes`, `checkFeatureNodes`, `checkNode`, `checkTextFormat`, `checkTextNode`, `checkTextStyle` | `shared/rich-text/validate-rich-text.ts` | `validate-` |
| `checkNode`, the hook of `RichTextFeature` | `shared/rich-text/types.ts`, set by `features/link-feature.ts` and `heading-feature.ts` | `find-`: it returns why a node is refused, empty when it is not (Settled) |
| `toPlainText`, `toBlockLines`, `toInlineText` | `shared/rich-text/to-plain-text.ts` | `format-` |
| `holdsText` | `shared/rich-text/is-rich-text-empty.ts` | `has-` |
| `readDocumentJson` | `shared/rich-text/parse-rich-text.ts` | `parse-` |

`addFieldRules` and `addModelRules`, which return the schema they extended, and `pickKeys`, `pickBlock`,
`pickAreaBlocks` take the verbs the table gains (Settled); `addRow`, `addDeletedId` and `addError`
return nothing, so they become `pushRow`, `pushDeletedId` and `pushError`. `lib/events.ts` exports
`DocumentEvents`, so its name is not its export's. `resolveRegistry` (`lib/registry/get-registry.ts`)
breaks the table too, and holds a check of its own, so no verb fits it as it is; it is left to
[sub-config-start-check](../2026-11-21-sub-config-start-check.md), which replaces the file (Deviations
kept).

- `document/build-live-rows.ts` - its JSDoc says "Lists the live rows", it returns `RowIds`, and
  `workflows/cms/steps/delete-cms-document-content.ts` uses it with `listRevivedRows`.
- `document/types.ts:125-141` - `MediaShapeBlock` carries `richTextFields`; its `fields` and
  `ReadPlacement.fields` hold the media fields only, beside `richTextFields`.
- `document/build-document-schema.ts:507` - the `superRefine` callback's `context` shadows
  `buildAreaSchema`'s `context: AreaContext`.
- `SchemaKey` (`field/validate-field-schema.ts:6`) and `ModelSchemaKey` (`field/validate-model-schema.ts:6`)
  are one type; `Extract<FieldConfig, ...>` is written inline in `field/validate-media-field.ts:20` and
  `validate-multiple-values.ts:26` beside the named `OptionsFieldConfig` of `field/types.ts`.

Copies:

- `camelToSnakeCase(key).toLowerCase()` - `document/list-revived-rows.ts:12`,
  `workflows/cms/steps/get-cms-document.ts:107` and `list-cms-documents.ts:116`, the two steps with one
  comment.
- `field/validate-field-schema.ts:46-61` and `validate-model-schema.ts:15-26` - the same `try` around
  `z.toJSONSchema(schema, { io: "input" })`; `:85` and `:48`, the same "is a Zod schema" test.
- `field/validate-media-field.ts:39-44` and `media/providers/file-media-provider.ts:51-56` - the same
  test of a MIME type list.
- `placeMediaRecords(parseRichTextValues(...))` - `document/build-store-document.ts:96-99` and
  `workflows/cms/utils/build-admin-document.ts:160-172`.
- `workflows/cms/steps/validate-cms-document.ts:149-160` parses a stored document's rich text fields, as
  `parseHeldValues` of `document/parse-rich-text-values.ts:13-23` does.
- `document/prepare-document-write.ts:35-70` - `addRow` and `addDeletedId`, one pattern.
- `document/build-document-schema.ts` - the save and publish schemas picked at `:251-254` and `:374-377`,
  a date turned to ISO at `:278` and `:352`, the object test at `:306-307` and `:413-416`.

Stale JSDoc:

- `field/prepare-fields.ts:42-43` - `defaults` named as the links of a `richtext` field and its headings,
  which `sub-rich-text-features` moved into `LinkFeature` and `HeadingFeature`.
- `field/validate-field-column.ts:9-12` - leaves out the combobox's values and the searchable `richtext`
  check the function makes.
- `media/place-media-records.ts:45` - "An empty field stays as it is", where `:10-11` says an empty text
  answers `null`.
- Broken line wraps: `area/prepare-areas.ts:9`, `document/prepare-document-write.ts:166-167`,
  `collection/prepare-store-query.ts:125`; "the `linkPolicy` sit" in `field/prepare-link-policy.ts:12`.

## Target Behavior

- Nothing a host, the Admin or the store sees changes - no message, route, response shape or event -
  apart from the two names under [Contracts](#contracts).
- The folders of `src/lib` keep the order of the main spec's
  [Architecture](../2026-11-04-main-spec.md#architecture): none imports a folder after it, directly or
  through a third.
- Every function of `src/lib` and `src/shared` is named with a verb of the table, every shared type sits
  in its domain's `types.ts`, and `prepareFields` and `prepareRegistry` hold no check inline; the other
  `prepare-` functions found with one are [sub-prepare-checks](./2026-11-21-sub-prepare-checks.md)'s
  (user, 2026-11-21).

## Proposed Solution

### Phase 1 - the code

**1a - Moves and names.** Each move is a commit of its own, `git mv` with the import paths fixed only,
before the commit that edits it (AGENTS.md):

- `layout/check-component-field.ts`, `check-component-node.ts`, `check-field-sections.ts` become
  `validate-component-field.ts`, `validate-component-node.ts`, `validate-field-sections.ts`, and their
  exports `validateComponentField`, `validateComponentNode`, `validateFieldSections`; `checkTranslation`
  becomes `validateTranslation`.
- `document/build-live-rows.ts` becomes `list-live-rows.ts`, `listLiveRows`.
- `collection/list-public-fields.ts` and its test move to `field/`: it reads any model's fields, and
  `field/` sits above both `collection/` and `document/`.
- `MediaShapeBlock` becomes `ReadShapeBlock`, and the media fields of both, `ReadShapeBlock.fields` and
  `ReadPlacement.fields`, become `mediaFields`, in `document/types.ts` and every reader.
- The shadowed `context` in `buildAreaSchema`'s callback becomes `refinement`.
- `media/providers/` and `media/media-stores.ts` move to `lib/media-provider/`, flat:
  `abstract-media-provider.ts`, `file-media-provider.ts`, `types.ts`, `media-stores.ts` and their tests;
  `lib/index.ts` keeps exporting the same names.
- `media/find-media-record.ts`, `find-missing-media.ts`, `list-held-values.ts`, `list-media-slots.ts`
  and `place-media-records.ts` move to `document/` with their tests; `media/` keeps `prepare-media.ts`
  and `types.ts`.
- `lib/events.ts` becomes `lib/document-events.ts`.
- `document/place-media-records.ts` becomes `map-media-records.ts`, and `shared/rich-text/to-plain-text.ts`
  becomes `format-plain-text.ts`, whose export `./shared` renames (see [Contracts](#contracts)).
- Every other name of the table under Current State, renamed in place: `validateLayoutItems`,
  `formatAreaKey`, `formatStoredRichText`, `prepareStoredValues`, `pushAreaWrite`,
  `pushRemovedBlockDeletes`, `pushRow`, `pushDeletedId`, `mapMediaRecords`, `mapFieldRecords`,
  `pushBlockColumns`, `pushAreaPath`, `pushWholeArea`, `pushWholeBlock`, `addBlockSelection`,
  `matchesColumn`,
  `isObjectPayload`, `formatBlockWord`; in `src/shared`, `validateElement`,
  `validateElementAttributes`, `validateFeatureNodes`, `validateNode`, `validateTextFormat`,
  `validateTextNode`, `validateTextStyle`, `formatPlainText`, `formatBlockLines`, `formatInlineText`,
  `hasText`, `parseDocumentJson`, `pushError`, and the hook `RichTextFeature.findNodeErrors` with the
  two features that set it. `toLinkableKey`, `readJsonSchemaType` and
  `readObjectSchema` go in 1d.

**1b - Types in `types.ts` (D12).** `StoreSelection`, `StoreAreaSelection` and `StoreBlockSelection` to
`document/types.ts`, and `MediaRead` and `MediaRecords` from `media/types.ts` with them;
`StoreQueryInput` to `collection/types.ts`; one
`ValidationKey = "serverValidation" | "serverPublishValidation"` in `field/types.ts` for both schema
checks; `MediaFieldConfig` and `MultipleValuesFieldConfig` named in `field/types.ts` beside
`OptionsFieldConfig`.

**1c - Checks out of `prepare-`, and the cycle.**

- `field/validate-required-field.ts` - `validateRequiredField(column, required, name, path)`, the
  check of `prepare-fields.ts:91-95`; `field/validate-required-columns.ts` -
  `validateRequiredColumns(model, fields, managedColumns, path)`, the loop of `:108-118`.
- `registry/validate-content-type-slug.ts` - `validateContentTypeSlug(slug, taken, path)`, the
  snake_case and repeat check, called for each block and each collection.
- `prepareCollection` passes `DOCUMENT_COLUMN_TYPES`, now its own constant, to `validateColumnTypes`
  as `prepareBlock` does, and `validateDocumentColumns` becomes `validateStatusColumn`, the enum check
  it keeps.
- `document/build-read-document.ts` - `buildReadDocument(document, media)`, the
  `mapMediaRecords(parseRichTextValues(...))` both reads make; `build-admin-document.ts` and
  `prepare-cms-store-documents.ts` call it, and `buildStoreDocument(document, selection)` takes its
  result, so the two reads make the conversion once. It sits in `document/`, beside the two functions
  it composes, and not in `workflows/cms/utils/` as first planned: that place only served to keep
  `document/` from importing `media/`, which the read code's move to `document/` in 1a settled, and the
  store's test in `src/lib` would have had to import from `src/workflows` (second review, 2026-11-21).
  With the moves of 1a and the types of 1b, no folder of `src/lib` imports one after it in the order.

Tests (`codee-medusa-testing`): the four new checks keep their coverage in
`prepare-registry.unit.spec.ts`, which tests them by their messages, unchanged, as
`sub-lib-review-fixes` did for the checks it split; `buildReadDocument` gets
`document/__tests__/build-read-document.unit.spec.ts`, to which the media case of
`build-store-document.unit.spec.ts` moves, its assertion unchanged, and the store's other cases read
`buildStoreDocument(buildReadDocument(...), selection)` with theirs unchanged.

**1d - Copies.**

- `model/format-entity-name.ts` - `formatEntityName(key)`, `TestRecipe` to `test_recipe`, read by
  `listRevivedRows` (with `_id`, in place of `toLinkableKey`), `get-cms-document` and
  `list-cms-documents`.
- `field/describe-input-json-schema.ts` - `describeInputJsonSchema(schema)`, the `try` around
  `z.toJSONSchema` in place of `readJsonSchemaType` and `readObjectSchema`; `field/is-zod-schema.ts` -
  `isZodSchema(value)`; both schema checks use them.
- `media-provider/is-mime-type-list.ts` - `isMimeTypeList(value)`, a non-empty list of MIME patterns,
  used by `validateMediaField` and `FileMediaProvider.validateOptions`.
- `parseHeldValues` becomes an export, `document/parse-rich-text-fields.ts`, `parseRichTextFields(holder,
  fields)`, read by `parseRichTextValues` and by `validate-cms-document` for the stored values. It
  keeps every key of its holder, so the step still picks the collection's fields of the stored row
  first, as it does now, and hands only those to it: a stored column outside the fields - `id`,
  `status` - stays out of the checked document.
- `prepare-document-write.ts` - one private `addCall(calls, key, open)`, which returns the call of a
  model and opens it when missing, behind `pushRow` and `pushDeletedId`.
- `build-document-schema.ts` - private `listModeSchemas(mode, schemas)` and `normalizeRuleValue(value)`,
  and `isObjectPayload` shared by both refinements.
- The stale JSDoc and line wraps listed above.

Tests (`codee-medusa-testing`, an exported util carries a unit test, colocated):
`lib/model/__tests__/format-entity-name.unit.spec.ts` - `TestRecipe` to `test_recipe`, one word, an
acronym; `lib/field/__tests__/describe-input-json-schema.unit.spec.ts` - a transform answers its input
type, `z.date()` answers `undefined`; `lib/field/__tests__/is-zod-schema.unit.spec.ts`;
`lib/media-provider/__tests__/is-mime-type-list.unit.spec.ts` - exact and `type/*` pass, an empty list
and a non-list fail; `lib/document/__tests__/parse-rich-text-fields.unit.spec.ts` - a field the holder
leaves out stays out. `list-revived-rows.unit.spec.ts`, `prepare-registry.unit.spec.ts`,
`file-media-provider.unit.spec.ts` and the `validate-cms-document` step test pass unchanged.

**Deviations kept:**

- `src/lib/` holds this plugin's domain code and is its package root, where the skills' roles name
  domain helpers `utils/` and technical code `lib/`. Renaming it would move every import and the `"."`
  entry for no change of behavior; it stays.
- `registry/get-registry.ts`, `get-collection.ts` and `get-media-provider.ts` are not pure: they read
  the container, and `getRegistry` keeps the registry for the process so a config is checked once. They
  are how every step and middleware reaches the registry, and no role of the skills names a container
  accessor; they stay in `registry/` until a second project needs a rule for one.
  [sub-config-start-check](../2026-11-21-sub-config-start-check.md) moves the registry into the CMS
  module and replaces `get-registry.ts`; `resolveRegistry` keeps its name until then, so it is not
  renamed twice.

### Alternatives Considered

- **`lib/store/` and `lib/rich-text/`:** settled against, see Settled.
- **The rules in `AGENTS.md`:** each project would restate them and drift; settled against.
- **An ESLint guard for the Admin's imports from `src/lib`:** settled against; the comment and review
  hold it.
- **One `isPlainObject` for `isBlockValue` and `prepare-rich-text-features`:** the bodies match but the
  subjects differ - a block in a body, a feature in a config - and a shared helper would tie `field/` to
  `document/`'s walk. Left as two.
- **One value conversion for `toStoredValues` and `toSnapshotValue`:** one writes the column's JSON, the
  other the version's document; they share `normalizeRichText` already. Left as two.

## Data Model and Persistence

None. No model, column or migration changes.

## Contracts

Two names a host reads change, in 1a; nothing else does.

| Now | Becomes | Exported from |
|---|---|---|
| `RichTextFeature.checkNode` | `RichTextFeature.findNodeErrors` | `"."` and `./shared`, as the type `RichTextFeature` |
| `toPlainText` | `formatPlainText` | `./shared` |

The package is at `0.0.1` and not yet released to npm, so the contract changes freely (AGENTS.md,
"Plugin Contract"): no compatibility bridge, and neither change is marked breaking. No project reads
either name - the first host imports `"."` and `./admin-extensions` only, and writes no rich text
feature of its own (2026-11-21).

Every other renamed or moved file is internal: the package root, `./workflows` and `./shared` export
the same names. `listPublicFields` is not exported from any entry.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A config error a renamed check throws | the same message as before | `prepare-registry.unit.spec.ts` passes unchanged |
| A store read with media and rich text after 1c | the same answer | `build-store-document.unit.spec.ts`, `prepare-cms-store-documents` step test |
| An Admin read after 1c | the same document | the `build-admin-document` util test |
| A restore's compensation after `formatEntityName` | the same ids soft-deleted again | `list-revived-rows.unit.spec.ts` |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A move loses its history | low | git history | a rename commit first, `git status --short` showing `R`, not `RM` | none |
| A rename misses a reader in the Admin | low | Admin bundle | `yarn typecheck:admin` at each exit gate | none |
| The skills change after Phase 1 starts | low | conventions | Phase 1 starts once `sub-skill-code-conventions` is installed | none |

**Rollout:** each sub-phase ships on its own, behind no flag.

**Rollback:** revert the sub-phase's commits; no data is touched.

## Dependencies

- [sub-skill-code-conventions](./2026-11-21-sub-skill-code-conventions.md), done and installed here.
- **The follow-up changes of codee-skills** (user, 2026-11-21), done and installed here and in
  the first host, up to `dd45213`: the extraction rule of `code-layout.md` and its Medusa narrowing
  for steps, `pick-`, `add-` and `push-` in the verb table with `select-`, `read-` and `walk-` mapped,
  `retrieve-` and `fetch-`, and "Where data is read and written" in `codee-medusa-backend-conventions`
  `references/workflows-and-steps.md`; the read rules of both `AGENTS.md` are cut to a link to it.

## Acceptance Criteria

- [x] Every function of `src/lib` and `src/shared`, private helpers included, starts with a verb of the
  installed table, `resolveRegistry` apart (Deviations kept): the `grep` of P1a.7 finds no old name, and
  `toLinkableKey`, `readJsonSchemaType` and `readObjectSchema` are gone after 1d; `listLiveRows`,
  `ReadShapeBlock` and `mediaFields` replace their old names.
- [x] Every type another file imports sits in its domain's `types.ts` - `FileMediaProviderOptions`
  included, found by the closing scan - apart from `DocumentCreatedEventData` and
  `DocumentUpdatedEventData`, which `lib/document-events.ts` declares beside the event names they
  describe: that file sits in no domain folder, and the names and their payloads are one subject.
- [x] `prepareFields` and `prepareRegistry` hold no check inline.
- [x] The folders keep the main spec's order: after 1c this lists no file - each folder grepped for an
  import of any folder after it, which catches a cycle through three folders as well as a pair (run in
  `bash`; before Phase 1 it lists `config/types.ts`, `field/types.ts`, `field/validate-media-field.ts`
  and four files of `media/`):
  `bash -c 'o=(media-provider config model field layout area block collection media registry document cache); for i in "${!o[@]}"; do up=$(IFS="|"; echo "${o[*]:i+1}"); [ -n "$up" ] && [ -d "src/lib/${o[i]}" ] && grep -rlnE "from \"\.\./($up)/" "src/lib/${o[i]}" --include="*.ts"; done; true'`
- [x] The copies listed under 1d have one source each.
- [x] The behavior is unchanged: `yarn test:unit` passes with no test's assertion changed - a fixture's
  key renamed in P1a.4 and the media case moved to `build-read-document` in P1c.5.

## Phasing

### Phase 1 - The code follows the layout

**Goal:** `src/lib` follows `sub-lib-cleanup`'s layout with no folder cycle and no copy listed here.

**Prerequisites:** `sub-skill-code-conventions` and the follow-up change of codee-skills installed here.

**Exit gate (each sub-phase):** `yarn lint`, `yarn typecheck`, `yarn typecheck:admin`,
`yarn format:check` and `yarn test:unit` pass; the moves show as renames in history.

## Implementation Plan

### Phase 1, sub-phase 1a

1. **P1a.1 - Rename the `check-` files**
   - **Outcome:** `layout/validate-component-field.ts`, `validate-component-node.ts`,
     `validate-field-sections.ts`, history kept.
   - **Areas:** `src/lib/layout/`, `src/lib/block/prepare-block-sections.ts`,
     `src/lib/layout/prepare-field-sections.ts`.
   - **Changes:** commit 1, `git mv` of the three files with the import paths fixed; commit 2, the
     exports and `checkTranslation` renamed, their JSDoc unchanged otherwise.
   - **Verification:** `git status --short` shows `R` before commit 1;
     `prepare-registry.unit.spec.ts` passes unchanged; `grep -rn "check[A-Z]" src/lib --include='*.ts'`
     finds no function.

2. **P1a.2 - `listLiveRows`**
   - **Outcome:** `document/list-live-rows.ts` exports `listLiveRows`.
   - **Areas:** `src/lib/document/build-live-rows.ts`,
     `src/workflows/cms/steps/delete-cms-document-content.ts`.
   - **Changes:** commit 1, `git mv` with the import fixed; commit 2, the export renamed.
   - **Verification:** the `delete-cms-document-content` step test passes.

3. **P1a.3 - `listPublicFields` in `field/`**
   - **Outcome:** `field/list-public-fields.ts` and its test.
   - **Areas:** `src/lib/collection/list-public-fields.ts` and its test,
     `collection/list-store-columns.ts`, `collection/prepare-store-query.ts`,
     `document/build-store-selection.ts`.
   - **Changes:** one commit, `git mv` of the file and its test with the import paths fixed.
   - **Verification:** `git status --short` shows `R`; `list-public-fields.unit.spec.ts` passes.

4. **P1a.4 - The read placement's names and the shadowed `context`**
   - **Outcome:** `ReadShapeBlock`, `mediaFields` on it and on `ReadPlacement`, `refinement` in
     `buildAreaSchema`.
   - **Areas:** `src/lib/document/types.ts`, `build-read-placement.ts`, `build-document-schema.ts`,
     `src/lib/media/list-media-slots.ts`, `place-media-records.ts`, their tests and readers in
     `src/workflows/`.
   - **Changes:** rename the type, the key and the parameter; JSDoc names the media fields.
   - **Verification:** `build-read-placement.unit.spec.ts`, `list-media-slots.unit.spec.ts`,
     `place-media-records.unit.spec.ts` and `list-cms-document-media.unit.spec.ts` pass with only the key
     renamed in their fixtures.

5. **P1a.5 - `media/` split by layer**
   - **Outcome:** the provider's classes, types, `MEDIA_STORES` and tests in `lib/media-provider/`; the
     read's five files and their three tests in `document/`; `media/` holds `prepare-media.ts` and
     `types.ts`.
   - **Areas:** `src/lib/media/`, their importers in `src/lib`, `src/workflows`, `src/api` and
     `src/admin`, `src/lib/index.ts`.
   - **Changes:** one commit, `git mv` of the files with the import paths fixed only.
   - **Verification:** `git status --short` shows `R` for each; `file-media-provider.unit.spec.ts`,
     `find-missing-media.unit.spec.ts`, `list-media-slots.unit.spec.ts` and
     `place-media-records.unit.spec.ts` pass; `yarn typecheck:admin`, as the Admin imports the
     provider's types.

6. **P1a.6 - File renames: `document-events.ts`, `map-media-records.ts`, `format-plain-text.ts`**
   - **Outcome:** each file named after its export.
   - **Areas:** `src/lib/events.ts`, `src/lib/document/place-media-records.ts` and its test,
     `src/shared/rich-text/to-plain-text.ts` and its test, `src/lib/index.ts`, `src/shared/index.ts`, their
     importers.
   - **Changes:** commit 1, the `git mv` of the files with the import paths fixed; commit 2, the exports
     renamed with P1a.7.
   - **Verification:** `git status --short` shows `R` before commit 1.

7. **P1a.7 - Every other function on the table's verbs**
   - **Outcome:** the names listed under Proposed Solution, 1a.
   - **Areas:** the files of the table under Current State and their importers and tests, with
     `src/shared/rich-text/types.ts`, `features/link-feature.ts` and `features/heading-feature.ts` for
     `findNodeErrors`.
   - **Changes:** rename each function and its readers; JSDoc keeps its wording, with the verb changed
     where it names the function.
   - **Verification:** no old name is left -
     `grep -rnwE "addRow|addDeletedId|addError|checkComponentField|checkComponentNode|checkFieldSections|checkTranslation|walkLayout|toAreaKey|toStoredRichText|toStoredValues|writeArea|deleteRemovedBlocks|placeMediaRecords|placeFieldRecords|gatherBlockColumns|selectAreaPath|selectWholeArea|selectWholeBlock|blockSelectionOf|namesColumn|whenObject|checkElement|checkElementAttributes|checkFeatureNodes|checkNode|checkTextFormat|checkTextNode|checkTextStyle|toPlainText|toBlockLines|toInlineText|holdsText|readDocumentJson" src`
     and `grep -rn "const plural" src/lib` find nothing (`plural` alone is also a label key);
     `yarn test:unit` passes with no assertion changed; then the Phase 1 exit gate.

### Phase 1, sub-phase 1b

1. **P1b.1 - The store's selection and query types in `types.ts`**
   - **Outcome:** `StoreBlockSelection`, `StoreAreaSelection` and `StoreSelection` in `document/types.ts`;
     `StoreQueryInput` in `collection/types.ts`.
   - **Areas:** `src/lib/document/build-store-selection.ts`, `build-store-document.ts`,
     `build-store-read-fields.ts`, `src/lib/collection/prepare-store-query.ts`, `prepare-collection.ts`,
     their tests and importers in `src/workflows`.
   - **Changes:** move the declarations with their JSDoc unchanged; the readers import them from
     `types.ts`.
   - **Verification:** `grep -rn "^export type" src/lib/document/build-store-selection.ts
     src/lib/collection/prepare-store-query.ts` finds nothing; `build-store-selection`,
     `build-store-document`, `build-store-read-fields`, `prepare-store-query` and `prepare-collection`
     tests pass unchanged.

2. **P1b.2 - A read's media types in `document/types.ts`**
   - **Outcome:** `MediaRecords` and `MediaRead` in `document/types.ts`; `media/types.ts` holds
     `RegistryMedia` and `ClientMediaProvider` and imports nothing of `document/`.
   - **Areas:** `src/lib/media/types.ts`, `src/lib/document/types.ts`, the readers in `src/lib/document/`
     and `src/workflows/cms/`, their tests.
   - **Changes:** move the two declarations with their JSDoc; the readers import them from
     `document/types`.
   - **Verification:** the order check of Acceptance Criteria lists no file; the `find-missing-media`,
     `map-media-records`, `build-store-document`, `build-admin-document`, `list-cms-document-media`,
     `prepare-cms-store-documents` and `validate-cms-document` tests pass unchanged.

3. **P1b.3 - The field config types named in `field/types.ts`**
   - **Outcome:** `ValidationKey`, `MediaFieldConfig` and `MultipleValuesFieldConfig` in
     `field/types.ts`, beside `OptionsFieldConfig`.
   - **Areas:** `src/lib/field/types.ts`, `validate-field-schema.ts`, `validate-model-schema.ts`,
     `validate-media-field.ts`, `validate-multiple-values.ts`.
   - **Changes:** `SchemaKey` and `ModelSchemaKey` give way to `ValidationKey`; the two inline
     `Extract<FieldConfig, ...>` to the named types.
   - **Verification:** `grep -rn "Extract<FieldConfig" src/lib/field --include='*.ts' | grep -v types.ts`
     and `grep -rnw "SchemaKey\|ModelSchemaKey" src` find nothing; `prepare-registry.unit.spec.ts`
     passes unchanged; then the Phase 1 exit gate.

### Phase 1, sub-phase 1c

1. **P1c.1 - `validate-status-column.ts`**
   - **Outcome:** `collection/validate-document-columns.ts` renamed `validate-status-column.ts`, history
     kept.
   - **Areas:** `src/lib/collection/`.
   - **Changes:** one commit, `git mv` with the import path fixed only.
   - **Verification:** `git status --short` shows `R`; `yarn typecheck`.

2. **P1c.2 - The document's columns checked as a block's are**
   - **Outcome:** `DOCUMENT_COLUMN_TYPES` is `prepare-collection.ts`'s own constant, passed to
     `validateColumnTypes` as `prepareBlock` passes its own; `validateStatusColumn(model, path)` keeps
     the `status` enum check only.
   - **Areas:** `src/lib/collection/prepare-collection.ts`, `validate-status-column.ts`.
   - **Changes:** the constant and the generic call move to `prepareCollection`, in the same order as
     now - the column types first, then the `status` choices; the JSDoc of the check names its one
     column.
   - **Verification:** `prepare-registry.unit.spec.ts` passes unchanged.

3. **P1c.3 - The `required` checks out of `prepareFields`**
   - **Outcome:** `field/validate-required-field.ts` - `validateRequiredField(column, required, name,
     path)`; `field/validate-required-columns.ts` - `validateRequiredColumns(model, fields,
     managedColumns, path)`; `field/is-required-by-model.ts` - `isRequiredByModel(column)`, which both
     read, so it leaves `prepare-fields.ts` for a file of its own (`code-layout.md`, a second consumer).
   - **Areas:** `src/lib/field/`.
   - **Changes:** the two blocks of `prepareFields` move into the checks with their messages unchanged;
     `prepareFields` calls them where the blocks were.
   - **Verification:** `grep -n "throw" src/lib/field/prepare-fields.ts` finds nothing;
     `prepare-registry.unit.spec.ts` passes unchanged.

4. **P1c.4 - The content type slug check out of `prepareRegistry`**
   - **Outcome:** `registry/validate-content-type-slug.ts` - `validateContentTypeSlug(slug, taken,
     path)`, the snake_case and repeat check, called for each block and each collection.
   - **Areas:** `src/lib/registry/prepare-registry.ts`, the new file.
   - **Changes:** `SNAKE_CASE` moves with the check; the messages stay `block "<slug>": ...` and
     `collection "<slug>": ...`, `path` being the part before the colon.
   - **Verification:** `prepareRegistry`'s body holds no `throw`; `prepare-registry.unit.spec.ts` passes
     unchanged.

5. **P1c.5 - `buildReadDocument`**
   - **Outcome:** `document/build-read-document.ts` exports `buildReadDocument(document, media)`;
     `buildStoreDocument(document, selection)` takes its result; `completeAdminDocumentRead` and
     `prepareCmsStoreDocumentsStep` call it.
   - **Areas:** `src/lib/document/build-read-document.ts`, `build-store-document.ts` and its test,
     `src/workflows/cms/utils/build-admin-document.ts`,
     `src/workflows/cms/steps/prepare-cms-store-documents.ts`.
   - **Changes:** the conversion leaves `buildStoreDocument`, whose JSDoc says it takes a read document;
     the new unit test as Proposed Solution, 1c, says.
   - **Verification:** `document/__tests__/build-read-document.unit.spec.ts` - a document's and a
     block's media records and rich text placed, a file not found answered `null`, the document it is
     given untouched; `build-store-document`, `build-admin-document` and `prepare-cms-store-documents`
     tests pass with no assertion changed; then the Phase 1 exit gate and the order check of Acceptance
     Criteria.

### Phase 1, sub-phase 1d

1. **P1d.1 - `formatEntityName`**
   - **Outcome:** `model/format-entity-name.ts` exports `formatEntityName(key)`; `listRevivedRows` reads
     it with `_id` in place of `toLinkableKey`, and `get-cms-document` and `list-cms-documents` in place
     of their `camelToSnakeCase(...).toLowerCase()`, the comment kept once in the function's JSDoc.
   - **Areas:** `src/lib/model/`, `src/lib/document/list-revived-rows.ts`,
     `src/workflows/cms/steps/get-cms-document.ts`, `list-cms-documents.ts`.
   - **Verification:** `model/__tests__/format-entity-name.unit.spec.ts` - `TestRecipe` to `test_recipe`,
     one word, an acronym; `grep -rn camelToSnakeCase src` finds `format-entity-name.ts` only;
     `list-revived-rows`, `get-cms-document` and `list-cms-documents` tests pass unchanged.

2. **P1d.2 - `describeInputJsonSchema` and `isZodSchema`**
   - **Outcome:** `field/describe-input-json-schema.ts` - the `try` around
     `z.toJSONSchema(schema, { io: "input" })`, `undefined` when JSON Schema cannot describe the schema;
     `field/is-zod-schema.ts` - `isZodSchema(value)`; `validateFieldSchema` and `validateModelSchema` read
     both, `readJsonSchemaType` and `readObjectSchema` gone. What `validateFieldSchema` reads of the JSON
     Schema - its one value type beside `null` - stays its private `findSchemaValueType`.
   - **Areas:** `src/lib/field/`.
   - **Verification:** `describe-input-json-schema.unit.spec.ts` - a transform answers its input type,
     `z.date()` answers `undefined`; `is-zod-schema.unit.spec.ts` - a schema passes, a plain object and
     `null` fail; `prepare-registry.unit.spec.ts` passes unchanged.

3. **P1d.3 - `isMimeTypeList`**
   - **Outcome:** `media-provider/is-mime-type-list.ts` - `isMimeTypeList(value)`, a non-empty list of
     MIME patterns, read by `validateMediaField` and `FileMediaProvider.validateOptions`.
   - **Areas:** `src/lib/media-provider/`, `src/lib/field/validate-media-field.ts`.
   - **Verification:** `media-provider/__tests__/is-mime-type-list.unit.spec.ts` - exact and `type/*`
     pass, an empty list and a non-list fail; `file-media-provider` and `prepare-registry` tests pass
     unchanged.

4. **P1d.4 - `parseRichTextFields`**
   - **Outcome:** `document/parse-rich-text-fields.ts` exports `parseRichTextFields(holder, fields)`, the
     former `parseHeldValues`; `parseRichTextValues` and `validate-cms-document` read it, the step after
     picking the collection's fields of the stored row, as now.
   - **Areas:** `src/lib/document/parse-rich-text-values.ts`, the new file,
     `src/workflows/cms/steps/validate-cms-document.ts`.
   - **Verification:** `document/__tests__/parse-rich-text-fields.unit.spec.ts` - a held value parsed, a
     field the holder leaves out stays out, the other keys kept; `parse-rich-text-values` and
     `validate-cms-document` tests pass unchanged.

5. **P1d.5 - One `addCall` behind `pushRow` and `pushDeletedId`**
   - **Outcome:** a private `addCall(calls, key, open)` in `prepare-document-write.ts` returns the call of
     a model and opens it when missing; the two pushes add their row or id to what it returns.
   - **Verification:** `prepare-document-write` tests pass unchanged.

6. **P1d.6 - `build-document-schema.ts`'s copies**
   - **Outcome:** private `listModeSchemas(mode, schemas)`, the save and publish schemas a mode checks,
     and `normalizeRuleValue(value)`, a date as its ISO text; `isObjectPayload` at the file's level, read
     by both refinements.
   - **Verification:** `build-document-schema` tests pass unchanged.

7. **P1d.7 - The stale JSDoc and line wraps of Current State**
   - **Outcome:** each listed under Current State, "Stale JSDoc", corrected.
   - **Verification:** inspection of each place; then the Phase 1 exit gate, the order check and the
     Acceptance Criteria.

## Short Tracker

- `done` - the follow-up change of codee-skills (`5034903`, 2026-11-21), reinstalled here and in
  the first host; the read rules of both `AGENTS.md` cut to a link to it.
- `done` - review against `codee-spec-review-medusa` (2026-11-21): M1 to M4 and L2 to L4 fixed in the
  spec; L1 settled by the user: `add-` returns the entry it added or found, or the value it extended,
  and `push-` returns nothing (codee-skills `9cb548c`, `f78c652`), which the names of 1a and 1d follow.
- `done` - codee-skills `9ca8be2` (code that predates the rules) reinstalled here and in
  the first host; the sentence on older handlers left the first host's `apps/backend/AGENTS.md`.
- `done` - codee-skills `dd45213` (`retrieve-`, `fetch-`, the framework's own names, calls to the
  outside) reinstalled here and in the first host (2026-11-21).
- `in_progress` - the second review of this spec (2026-11-21): H1 settled and fixed in the spec
  (`findNodeErrors`), M2 fixed with it, M1 settled and fixed (`src/lib` in one order of two layers, in
  the main spec), M3 settled (`resolveRegistry` left to `sub-config-start-check`), L1 to L4 fixed.
- `done` - Phase 1 / 1a (`18211af` to `6ffc515`, 2026-11-21): every move a rename in history; exit
  gate green - `yarn lint`, `yarn format:check`, `yarn typecheck`, `yarn typecheck:admin`, and
  `yarn test:unit` at 118 suites and 991 tests, as before it. The order check lists only
  `media/types.ts`, which 1b fixes.
- `done` - Phase 1 / 1b (`21a6819` to `e4711a8`, 2026-11-21): exit gate green, 118 suites and 991
  tests; the order check lists no file.
- `done` - Phase 1 / 1c (`5c16344` to `357e9d2`, 2026-11-21): exit gate green, 119 suites and 993
  tests with `build-read-document`; the order check lists no file. Found on the way: 16 more `prepare-`
  functions hold a check inline (`prepareMaxDepth`, `prepareTranslationNs`, `prepareMedia`,
  `prepareAreas`, `prepareLinkPolicy` and others), which Target Behavior covers and this plan does not;
  waiting on the user's call.
- `done` - Phase 1 / 1d (`44da5c7` to `edfa795`, 2026-11-21): exit gate green - `yarn lint`,
  `yarn format:check`, `yarn typecheck`, `yarn typecheck:admin`, and `yarn test:unit` at 124 suites and
  1009 tests; the order check lists no file; the Acceptance Criteria hold. `yarn lessons:check` fails on
  two lessons' `i18n` topic, which no commit of this sub-spec touched.
- `done` - the 16 `prepare-` functions with a check inline go to
  [sub-prepare-checks](./2026-11-21-sub-prepare-checks.md) (user, 2026-11-21), and Target Behavior names
  the two of this plan.
- `done` - closed by the user (2026-11-21).
