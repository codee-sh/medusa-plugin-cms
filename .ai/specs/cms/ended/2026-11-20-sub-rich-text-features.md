# Rich Text Features

**Date:** 2026-11-20
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md), [sub-rich-text](../2026-11-17-sub-rich-text.md),
[sub-config-value-functions](./2026-11-20-sub-config-value-functions.md)

> Folder: `.ai/specs/cms/ended/`
> Filename: `2026-11-20-sub-rich-text-features.md`

## TLDR

A rich text feature carries its options, in the common CMS shape: `HeadingFeature({ enabledHeadingSizes:
["h2", "h3"] })`, `LinkFeature({ linkPolicy })`, `BoldFeature()`. The plugin exports the factories; each
returns plain data, `{ key, props }`, so the config still reaches the Admin as JSON. The field's
`headings` and `linkPolicy` and the config's `richText.headings` move into their features, `list` splits
into `unorderedList` and `orderedList`, and `quote` becomes `blockquote`, the common CMS keys. A field's
`features` function gets `{ defaultFeatures, rootFeatures }`, the built-in list and the config's, and of
two features with one key the last wins. Each built-in feature owns its nodes, its format and the check
of its options, which the server and the editor both read. The checks stay main spec D36's. Answers
Open Question 1 of `sub-rich-text` (user, 2026-11-20: the plugin is not released, so the contract
changes freely, toward the common, proven CMS shape).

## Settled

User, 2026-11-20:

- **The direction:** the common CMS shape's factories, keys and option names,
  `{ defaultFeatures, rootFeatures }` and the last of a key winning; D36's checks kept. The plugin is not
  released, so the contract changes freely.
- **The heading levels left out:** `HeadingFeature()` without options gives `h1` to `h6`, the
  common default; the built-in `defaultFeatures` hold `HeadingFeature({ enabledHeadingSizes: ["h2", "h3",
  "h4"] })`, as a page's `h1` is its title, so a field that sets nothing keeps today's levels.
- **The link policy of rich text (user, 2026-11-20, during 1a):** a `LinkFeature`'s `linkPolicy`
  resolves over the default policy, not over the config's top-level `linkPolicy`, which stays the `url`
  fields'. A policy for every rich text field is set in `richText.features`, `LinkFeature({ linkPolicy
  })`, and reaches the fields through `rootFeatures`, as any feature does. The resolver of features
  then needs nothing from the config, and the built-in list is resolved once, as data.

## Problem

A feature is a word, so its options sit in keys beside the list: `headings` for `heading` on the
config's `richText` and on a field, and the field's `linkPolicy` for `link`. Every new option of a
feature adds a key to the field, to `FieldDefaults` and to the projection, and changing one option of
the defaults takes its own key at every level. The next features already have options: links to
products and categories (Phase 3 of `sub-rich-text`), images from the media library, the list types.

## Current State and Evidence

- `src/lib/config/types.ts` `RichTextField` - `features?: DefaultsValue<RichTextFeature[],
  "defaultFeatures">`, `headings?`, `linkPolicy?`; `RichTextConfig` - `features?` (a list only) and
  `headings?`.
- `src/shared/rich-text/types.ts` - `RichTextFeature` is `"bold" | "italic" | "heading" | "list" |
  "quote" | "link"`; `RichTextSettings` is `{ features, headings, linkPolicy }`, what the validator and
  the editor read.
- `src/shared/rich-text/rich-text-features.ts` - `RICH_TEXT_FEATURES`, `DEFAULT_RICH_TEXT_HEADINGS`
  (`h2` to `h4`), `DEFAULT_RICH_TEXT_SETTINGS`, `RICH_TEXT_FORMAT_BITS` keyed by feature.
- `src/shared/rich-text/validate-rich-text.ts` - central tables: `NODE_FEATURES` (node type to the
  feature it needs), `FEATURE_MESSAGES`, `CHILD_TYPES` (where a node may sit); `checkNodeKeys` reads
  `headings` and `linkPolicy` from the settings; `allowedFormats` folds `RICH_TEXT_FORMAT_BITS`.
- `src/lib/field/prepare-rich-text-formatting.ts` - resolves `features` (through `prepareConfigValue`
  with `{ defaultFeatures }`) and `headings` over a fallback; refuses unknown words, levels outside h1
  to h6, and empty `headings` with `heading`. `src/lib/field/prepare-field.ts:111-123` resolves a
  `richtext` field's `linkPolicy` with the `url` field's, through `prepareLinkPolicy`, and hands the
  field to `prepareRichTextFormatting`; `src/lib/registry/prepare-registry.ts:92-103` resolves the
  config's `linkPolicy` and `richText` into `FieldDefaults`.
- `src/lib/field/types.ts` - `Field` carries `features`, `headings` and `linkPolicy`; `RichTextFormatting`
  and `FieldDefaults.richText`.
- `src/lib/document/build-document-schema.ts:161-167` - builds `RichTextSettings` from the field.
- `GET /admin/cms/collections` (`integration-tests/http/cms/admin-cms-collections.spec.ts`) answers the
  projection; its tests assert no rich text field's features today. The test module's `richtext`
  fields, `callout.body` and `TestRecipe.summary`, set no feature
  (`integration-tests/modules/test-content/cms-config.ts:81,155`).
- `sub-config-value-functions` is done and in `ended/` (commit `88a46cc`): `ConfigValue`, `DefaultsValue`
  and `prepareConfigValue` are in place, and its record that the config's `richText.features` stays a
  list is frozen there.
- `src/admin/cms/common/utils/build-field-config.ts:67-69` - hands `features`, `headings` and
  `linkPolicy` to the toolkit's `richText`.
- `src/admin/components/manager-form-fields/fields/richtext-field/editor/` - `toolbar/toolbar-controls.ts`
  (`features.includes("list")`, `("link")`), `utils/get-block-type-options.ts` (features and headings),
  `utils/list-text-formats.ts`, `toolbar/link-popover.tsx` and `extensions/build-field-editor-extension.ts`
  (the link policy), `extensions/feature-guard-extension.ts` (one `list` feature for both list commands).
- Lexical's node types do not change: a quote is `quote`, both lists are `list` with `listType`
  `bullet` or `number` (`sub-rich-text`, Features).
- The host (`apps/backend/src/cms/config.ts:183,245`) has two `richtext` fields with
  none of `features`, `headings` or a field `linkPolicy`; its `linkPolicy` at `:260` is a `url` field's.
- `.changeset/richtext-field.md` - the unreleased `minor` changeset of the field names the features as
  words.

## Target Behavior

- A host writes features with the plugin's factories: `BoldFeature()`, `ItalicFeature()`,
  `HeadingFeature({ enabledHeadingSizes })`, `UnorderedListFeature()`, `OrderedListFeature()`,
  `BlockquoteFeature()`, `LinkFeature({ linkPolicy })`.
- The config's `richText.features` is a list, or a function of `{ defaultFeatures }`, the built-in list.
  Without it, every field falls back to the built-in list.
- A field's `features` is a list, which replaces its fallback whole, or a function of
  `{ defaultFeatures, rootFeatures }`: the built-in list and the config's resolved `richText.features`.
  Without it, the field takes the config's (the root editor).
- Of two features with one key in a list, the last wins.
- An option left out takes the feature's own default; a `LinkFeature`'s `linkPolicy` is resolved key by
  key over the default policy, `http`, `https`, `mailto`, `tel` and relative links (Settled). The
  config's top-level `linkPolicy` is the `url` fields' only.
- `HeadingFeature({ enabledHeadingSizes: [] })` offers no heading, and a save holding one is refused.
- A save is refused, as today, for a node no enabled feature registers, a format bit of a feature the
  field lacks, a heading level outside the heading feature's, a list type of a list feature the field
  lacks, and a link its link feature's policy refuses.
- The editor shows the controls of the field's features only; each list button follows its own feature.

## Proposed Solution

### Features as data

Each built-in feature has one file in `src/shared/rich-text/features/`: its factory and its
definition. The factory, PascalCase as the common CMS shape names it, returns
`{ key, props }`, plain data the projection carries to the Admin as it is. The definition is what the
validator and the editor read for that key:

| Key | Factory and options | Nodes it registers | Format bit |
|---|---|---|---|
| `bold` | `BoldFeature()` | - | 1 |
| `italic` | `ItalicFeature()` | - | 2 |
| `heading` | `HeadingFeature({ enabledHeadingSizes?: RichTextHeading[] })` | `heading`, its `tag` in the sizes | - |
| `unorderedList` | `UnorderedListFeature()` | `list` with `listType: "bullet"`, `listitem` | - |
| `orderedList` | `OrderedListFeature()` | `list` with `listType: "number"`, `listitem` | - |
| `blockquote` | `BlockquoteFeature()` | `quote` | - |
| `link` | `LinkFeature({ linkPolicy?: Partial<LinkPolicy> })` | `link`, `autolink`, their `url` by the policy | - |

`paragraph`, `text`, `linebreak` and `root` need no feature. `CHILD_TYPES`, where a node may sit, stays
one table of the validator: it describes Lexical's tree, not a feature. A definition holds what it
registers - node types, and for a list its `listType` - the format bit, the check of its node against
its resolved props, and the message for a node whose feature the field lacks.
`RICH_TEXT_FEATURE_DEFINITIONS` collects them by key; a later feature, built-in or a host's (Phase 3 of
`sub-rich-text`), joins as one more entry.

The two list features share Lexical's `list` and `listitem` nodes: a `list` belongs to
the feature of its `listType`, `bullet` to `unorderedList` and `number` to `orderedList`, and a
`listitem` is allowed with either. A `list` of another `listType` is refused as today ("Use a bulleted
or a numbered list"), now before the field's features are read, so a field without lists names the
list type too, and the nodes the list holds are not checked. The messages of a missing feature keep today's wording: "Remove the headings",
"Remove the quotes" and "Remove the links: this field does not allow them", and the list message splits
into "Remove the bulleted lists" and "Remove the numbered lists: this field does not allow them".

### Resolution

`prepareRichTextFeatures` (renamed from `prepareRichTextFormatting`) resolves a list into
`ResolvedRichTextFeature[]`:

- the list from `prepareConfigValue`: the config's with `{ defaultFeatures }`, a field's with
  `{ defaultFeatures, rootFeatures }`. `defaultFeatures` is the built-in list,
  `DEFAULT_RICH_TEXT_FEATURES`, resolved as it is written, `rootFeatures` the config's resolved list;
  each is a fresh copy, so a function cannot change them. A resolved feature passes the resolution unchanged, as its props are full;
- of two items with one key, the last kept, at its own position;
- each item an object with a known `key` and, when given, `props` an object;
- `enabledHeadingSizes` a list of h1 to h6, sorted, all six when left out (Settled);
- `linkPolicy` through `prepareLinkPolicy` over the default policy (Settled).

It refuses an unknown key, props of the wrong shape, a level outside h1 to h6, and a function that
throws or returns anything but a list; the link policy's refusals are `prepareLinkPolicy`'s. The rule
"empty `headings` while `heading` is a feature" goes: an empty list is a heading feature with no level.

`FieldDefaults.richText` becomes `richTextFeatures: ResolvedRichTextFeature[]`, the config's resolved
list, which is a field's `rootFeatures` and its fallback. `Field` carries `features` only for a
`richtext` field; `headings` leaves it, and `linkPolicy` stays for a `url` field. A field the registry
did not resolve is checked and edited with `DEFAULT_RICH_TEXT_FEATURES`.

### Check and editor

- `RichTextSettings` becomes `{ features: ResolvedRichTextFeature[] }`, still the one type the validator
  and the toolkit read; `findRichTextFeature(features, key)` in `src/shared/rich-text/` returns a
  feature with its props.
- `validateRichText` finds the definition registering a node's type among the field's features, runs
  its check, and folds the format bits from the definitions; a type registered by no built-in
  definition is refused as today, one registered by a feature the field lacks gets that feature's
  message.
- `buildDocumentSchema` hands the field's resolved `features`; `build-field-config.ts` hands them to the
  toolkit's `richText`.
- The editor reads features by key: the block type menu the heading's `enabledHeadingSizes` and
  `blockquote`; the list buttons, one per list feature; the link popover and `LinkExtension`'s
  `validateUrl` the link's `linkPolicy`; the format guard the format bits and each list command by its
  own feature. The root extension keeps `ListExtension` and `LinkExtension` always, as `sub-rich-text`
  settled, so a stored list or link can still be removed.

### What is not taken from the common CMS shape, and why

- **A factory holding server and client code** (`ClientFeature: '...#HeadingFeatureClient'`,
  `createServerFeature`): the config reaches the Admin as JSON, and Admin code is registered in the
  Admin (D40). The plugin's definitions stand in for the server half, its toolbar for the client half.
- **`editor: lexicalEditor({ features })`:** an adapter that serves several editors; the plugin has
  one, so `richText.features` and a field's `features` stay.
- **Checks registered only per node:** an established CMS passes an unknown node and checks no format
  bit; D36 refuses both, so the validator still walks every node and refuses a type no feature registers.
- **No scheme policy on links:** an established CMS's link keeps `javascript:`; `LinkFeature` takes
  a D36 link policy, checked as a `url` field's is, with its own default (Settled).
- **Rewriting a heading of a level the field lacks:** D36 refuses at the input and never rewrites; the
  block type menu turns such a heading into a paragraph.
- **Other features** (underline, align, indent, checklist, tables, uploads, ...): not built;
  each would join as one definition.

### Alternatives Considered

- **Words with keys beside them (today):** every option of a feature becomes a key of the field, of
  `FieldDefaults` and of the projection.
- **Objects in the config, flattened by the registry into today's `RichTextSettings`:** the config
  changes, the validator and the editor do not, but each option still becomes a flat key of the
  projection, which is part of the contract.
- **Objects written by hand, `{ type: "heading", levels }`, without factories:** a shape of our own where
  the common CMS shape is proven; the factories return that data anyway, and a literal `{ key, props }`
  still passes the registry's check.
- **A word or an object in one list:** two shapes, and `filter((feature) => feature !== "heading")`
  stops working on objects; the common CMS shape always calls a factory.
- **A duplicate key refused at start:** stricter, but breaks the common CMS pattern
  `[...rootFeatures, HeadingFeature({ ... })]`; the toolbar's order is fixed by `TOOLBAR_CONTROLS`, so a
  feature's position changes nothing.
- **`{ defaultFeatures }` as the field's fallback (D40 as written):** the name would mean the built-in
  list at the config and the config's list at a field; two names keep one meaning each.

## Data Model and Persistence

None. Stored documents keep their nodes: `quote` and `list` are Lexical's node types, and only the
features' keys change.

## Contracts

- **Config:** `RichTextConfig = { features?: ConfigValue<RichTextFeature[], { defaultFeatures:
  ResolvedRichTextFeature[] }> }`;
  `RichTextField = FieldBase & { type: "richtext"; features?: ConfigValue<RichTextFeature[],
  { defaultFeatures: ResolvedRichTextFeature[]; rootFeatures: ResolvedRichTextFeature[] }> }`, without
  `headings` and
  `linkPolicy`. `RichTextFeature` is the union of each factory's result, `{ key, props? }`;
  `ResolvedRichTextFeature` has every option filled; `RichTextFeatureKey` the keys.
- **Exports:** the seven factories from the package root and `./shared`, with `RichTextFeature`,
  `ResolvedRichTextFeature` and `findRichTextFeature`; `RICH_TEXT_FEATURES` and
  `DEFAULT_RICH_TEXT_HEADINGS` give way to the built-in `defaultFeatures` list.
- **Projection:** a `richtext` field carries `features: ResolvedRichTextFeature[]`; `headings` leaves it,
  and its link policy sits in the link feature's props.
- **Admin and store APIs:** the document is unchanged.
- **Compatibility:** the plugin is not released, so no bridge and no breaking note (AGENTS.md, Plugin
  Contract); the unreleased `richtext-field.md` changeset is rewritten to the new keys.
- **Main spec:** D25's amendment and D36's "a field may set its own" point at the link feature; D40's
  `features` takes `{ defaultFeatures, rootFeatures }` at a field, and the config's `richText.features`
  takes a function too. Amended in the main spec on 2026-11-20 (user); the ended
  `sub-config-value-functions` keeps its record unchanged, as `ended/` is frozen.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| An unknown key, props that are not an object, a level `h7`, a `linkPolicy` with `javascript` | the start stops, naming the place in the config | registry unit test |
| `[...rootFeatures, HeadingFeature({ enabledHeadingSizes: ["h3"] })]` | one heading feature, `h3` only | registry unit test |
| A field without `features`, a config with `richText.features` | the field takes the config's | registry unit test |
| A field function filtering `rootFeatures` by `key` | the filtered list | registry unit test |
| `HeadingFeature({ enabledHeadingSizes: [] })` and a document with a heading | 400 at the field's path | `validateRichText` unit test |
| A numbered list in a field with `UnorderedListFeature()` only | 400 at the field's path, naming numbered lists | `validateRichText` unit test |
| A link refused by the link feature's policy and allowed by the config's | 400 at the field's path | `validateRichText` and schema unit tests |
| A stored quote in a field without `BlockquoteFeature()` | loads; the block type menu turns it into a paragraph | Admin walkthrough |
| The numbered list button in a field with `UnorderedListFeature()` only | not shown; the command does nothing | guard unit test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| The host's typecheck fails on the old keys | low | host | Its config sets no feature and imports none of the removed exports (`apps/backend/src`, `apps/storefront/src` searched); declarations refreshed with `yalc` | None found in the host |
| The projection's new shape breaks the Admin or a test reading it | medium | admin, api | The server, the projection and the editor switch in one step; an HTTP assertion on the projection | None once P1a.2 passes |
| The validator's rewrite changes a message a test or a host reads | low | api | The existing messages kept; the unit tests of every Edge Case | A message worded anew for list types |

**Rollout:** one sub-phase; nothing changes for a host that sets no feature, as the built-in
`defaultFeatures` keep `h2` to `h4`.

**Rollback:** revert the sub-phase's commits; stored documents need nothing.

## Dependencies

- `sub-config-value-functions`, done: `ConfigValue` and `prepareConfigValue`.
- [sub-lib-review-fixes](./2026-11-20-sub-lib-review-fixes.md), done and closed 2026-11-20 (it
  went first, user, 2026-11-20): `src/lib/field/prepare-fields.ts` keeps only `prepareFields`, a
  field's own resolution is `src/lib/field/prepare-field.ts`, and `ReadPlacement` and
  `MediaShapeBlock`, which carry rich text, are in `src/lib/document/types.ts`. The paths of this spec
  are those of the tree it left.
- `sub-rich-text` 1d done: the editor's toolbar, guard and extensions this changes.

## Acceptance Criteria

- [ ] A config written with the factories resolves, and `headings`, a field's `linkPolicy` and the words
      are refused by the typecheck.
- [ ] A field function gets `{ defaultFeatures, rootFeatures }`, and the last of two features with one
      key wins.
- [ ] The server refuses what it refuses today, reading each option from its feature.
- [ ] The editor shows and allows the field's features only, each list button by its own feature.
- [ ] The host's two description fields behave as before.

## Phasing

| Sub-phase | Goal | The user can try |
|---|---|---|
| **1a Features with options** | Factories and definitions, the registry's resolution, the validator and the editor reading features by key | The host's description with `HeadingFeature({ enabledHeadingSizes: ["h2"] })` and `UnorderedListFeature()` only |

The contract changes end to end in one sub-phase, so the Admin never reads a projection it does not
know.

## Implementation Plan

### Sub-phase 1a - Features with options

**Goal:** features carry their options from the config to the server's check and the editor.

**Prerequisites:** the spec approved; `sub-lib-review-fixes` done (closed 2026-11-20).

1. **P1a.1 - The resolver, renamed**
   - **Outcome:** `src/lib/field/prepare-rich-text-formatting.ts` is `prepare-rich-text-features.ts`,
     exporting `prepareRichTextFeatures`; nothing else changes.
   - **Areas:** `src/lib/field/prepare-rich-text-formatting.ts`, `src/lib/field/prepare-field.ts`,
     `src/lib/registry/prepare-registry.ts`
   - **Changes:** `git mv`, then the function's name and the imports only. Its own commit, before any
     content change.
   - **Verification:** `yarn typecheck`, `yarn test:unit`; `git status --short` shows `R`, not `RM`.

2. **P1a.2 - Features by key, end to end**
   - **Outcome:** one step, as the config, the projection, the validator and the editor share the
     types, so a step adding the features before their readers would build code no step uses yet
     (AGENTS.md), and a step switching one layer would leave the others failing the typecheck. The
     words, `headings` and the field's `linkPolicy` go.
     - **Features:** the seven factories and their definitions in `src/shared/rich-text/features/`, one
       file per feature; `RICH_TEXT_FEATURE_DEFINITIONS`; `RichTextFeature`, `ResolvedRichTextFeature`,
       `RichTextFeatureKey`; `findRichTextFeature`; the built-in `defaultFeatures`.
     - **Config and registry:** `RichTextConfig` and `RichTextField` of Contracts;
       `prepareRichTextFeatures` of Resolution; `FieldDefaults.richTextFeatures`; `Field` without
       `headings`, and `linkPolicy` for `url` only.
     - **Check:** `RichTextSettings` is `{ features }`; `validateRichText` reads the definitions, which
       replace `NODE_FEATURES`, `FEATURE_MESSAGES` and `RICH_TEXT_FORMAT_BITS`, with the list rule and
       the messages of Features as data; `buildDocumentSchema` hands the field's features.
     - **Editor:** `build-field-config.ts` hands the resolved features; the toolbar controls, the block
       type options, the text formats, the list buttons, the link popover, the root extension and the
       guard read features by key, each list command by its own feature.
     - **Exports and changeset:** the factories and types from `./shared` and the package root;
       `RICH_TEXT_FEATURES`, `DEFAULT_RICH_TEXT_HEADINGS` and `DEFAULT_RICH_TEXT_SETTINGS` removed;
       `.changeset/richtext-field.md` rewritten to the factories and keys.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/`, `src/lib/registry/prepare-registry.ts`,
     `src/lib/document/build-document-schema.ts`, `src/lib/index.ts`, `src/shared/`,
     `src/admin/cms/common/utils/build-field-config.ts`,
     `src/admin/components/manager-form-fields/fields/richtext-field/editor/`,
     `integration-tests/http/cms/admin-cms-collections.spec.ts`, `.changeset/richtext-field.md`
   - **Verification:** unit tests of each factory, of `findRichTextFeature` and of the built-in list (its
     heading `h2` to `h4`, `HeadingFeature()` alone `h1` to `h6`); unit tests with every row of Edge
     Cases - `prepare-registry`, `validate-rich-text`, `build-document-schema`, `build-field-config`,
     `get-block-type-options`, `build-field-editor-extension` (the guard); an HTTP test in `admin-cms-collections.spec.ts`: the
     test module's `callout.body` carries the resolved built-in features, its heading `h2` to `h4` and
     its link the default policy, run with the whole HTTP suite by the agent (`yarn test:db:up`,
     `yarn test:integration:http`, `yarn test:db:down`); `yarn typecheck`, `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`, `yarn test:unit`.

3. **P1a.3 - The walkthrough in the host**
   - **Outcome:** the host's config unchanged and typechecked against the new declarations.
   - **Changes:** `npx tsc -p tsconfig.json --emitDeclarationOnly`, `yalc publish --push --no-scripts`.
   - **Verification:** the host's typecheck; the user's walkthrough: the description offers what it did, then,
     for a moment, `features: ({ rootFeatures }) => [...rootFeatures.filter((feature) => feature.key !==
     "orderedList"), HeadingFeature({ enabledHeadingSizes: ["h2"] })]` shows one heading level and the
     bulleted list only, and a stored numbered list can be turned back into paragraphs; the config is
     set back.

**Exit gate of 1a:** unit tests, HTTP tests, typecheck, admin typecheck, lint and format pass; the
host's walkthrough passes.

## Short Tracker

- `done` - the review of the spec (`codee-spec-writing`, `codee-spec-review-medusa`, 2026-11-20), its
  findings applied; approved by the user.
- `done` - `sub-lib-review-fixes`, closed 2026-11-20; the paths and lines of this spec updated to the
  tree it left.
- `done` - 1a / P1a.1: the resolver renamed, committed alone as a rename (`13bb08b`).
- `done` - 1a / P1a.2: features by key, end to end, with the link policy split from the config's
  (`7a72e19`).
- `done` - 1a / P1a.3: the declarations refreshed in the host, its typecheck free of CMS errors (two
  in `integration-tests/http/catalogue/product-variants.spec.ts` predate the change); the user's
  walkthrough on the Hero's description passed - one heading level, the bulleted list only - and the
  config is set back.
- `done` - 1a, the exit gate met; closed 2026-11-21 (user), moved to `ended/`.
