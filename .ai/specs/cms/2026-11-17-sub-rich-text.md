# Rich Text

**Date:** 2026-11-17
**Status:** in_progress
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-collections-and-documents](./2026-11-04-sub-collections-and-documents.md),
[sub-cms-translations](./2026-11-06-sub-cms-translations.md),
[sub-rich-text-features](./ended/2026-11-20-sub-rich-text-features.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-17-sub-rich-text.md`

## TLDR

A `richtext` field type: formatted text edited with Lexical, on any `model.text()` column of a collection
or a block, with no model change (main spec D25). The column holds Lexical's document as a JSON string,
so `.translatable()` keeps working; the APIs hand the document as an object, and each storefront renders
its nodes. What the editor offers is configured by **features**: global defaults under the config's
`richText`, which a field replaces or extends with its own `features`. The server checks every saved
document against the features of its field, without Lexical. This sub-spec takes over sub-phase 1g of
`sub-collections-and-documents`.

## Settled

User, 2026-11-20:

- **Features carry their options, in the common CMS shape:** factories such as `HeadingFeature({
  enabledHeadingSizes })` and `LinkFeature({ linkPolicy })`, with that shape's keys and
  `{ defaultFeatures, rootFeatures }`; `headings` and a field's `linkPolicy` move into their features.
  Specified in [sub-rich-text-features](./ended/2026-11-20-sub-rich-text-features.md), which replaces the
  words, `headings` and `linkPolicy` of Features, Config and Contracts below when its 1a is done.

User, 2026-11-16 and 2026-11-17:

- **Storage:** Lexical's JSON in a `text` column, as D25 has it. Medusa's `.translatable()` exists on
  `model.text()` only (`@medusajs/utils` 2.22.7 `dist/dml/properties/text.d.ts:67`), and the Translation
  module keeps a translation as the field's value under its name, whatever the text holds
  (`@medusajs/translation` 2.22.7 `dist/models/translation.js:32`); a `json` column cannot be translated.
- **Store output:** the Lexical document as an object; no HTML is built or stored. The README gives a
  small React renderer.
- **Features:** global defaults under the config's top-level `richText`, beside `media` and `maxDepth`;
  a field replaces or extends them; the server checks a document against its field's features.
  Features are named, so a later one - images from the library, links to products, a host's own - joins
  without changing the contract.
- **The type's name:** `richtext`, as `textarea` and `combobox` are written.
- **Input safety** follows main spec D36: a document is refused at the input, never rewritten; its
  links follow the config's one `linkPolicy`, shared with the `url` field type of `sub-input-safety`.
- **Translations** are edited in the plugin's Admin, a document in one language at a time, with the same
  editor per language ([sub-cms-translations](./2026-11-06-sub-cms-translations.md)); Medusa's
  **Settings -> Translations** would show the stored JSON.

User, 2026-11-17, with the steps of 1b:

- **Element attributes:** no alignment; an indent only in a list item, so nested lists come with `list`;
  a paragraph's `textStyle` empty and its `textFormat` within the field's features (Features).
- **Test columns:** `callout.body` of the test module becomes `richtext`, and `TestRecipe` gets a
  nullable `summary` column as a document's `richtext` field, whose migration the user generates.
- **Sub-phases:** the field is split into 1b, the server with the 1a editor, and 1c, the toolbar, the
  paste and the version view.
- **Lexical's extension API** (user, 2026-11-17, after 1b): the editor moves off `LexicalComposer`,
  deprecated in `@lexical/react` 0.53.0, and off the legacy `RichTextPlugin` and `HistoryPlugin` in a
  sub-phase of its own, before the toolbar; the toolbar and the paste become 1d.
- **The editor as it stands after 1d** (user, 2026-11-17): enough for now; 1e, Phase 3 and the
  editor's smaller additions are deferred, to be taken up later. Phase 2 stays, as the store read of
  `sub-collections-and-documents` 1h returns rich text.
- **Toolbar** (user, 2026-11-17, with the steps of 1d): undo and redo buttons; the history keeps at most
  100 steps, a constant of the plugin with no config key; Cmd+K opens the link popover. A command adding
  a format or a block outside the field's features does nothing, from the toolbar or a shortcut; one
  removing it works, so a document saved before the field lost a feature can be cleaned up. The paste
  filter and the version view move to 1e.

## Problem

A page or a block has plain text only: `text` in one line, `textarea` in several. A description, an
article's body or a block's copy cannot carry headings, lists, links or emphasis, and a project that
needs them would store HTML or Markdown in a `textarea`, unchecked and unrendered.

## Current State and Evidence

- `src/lib/field/types.ts` - `FieldKind` has no rich text; `src/lib/config/types.ts` - `FieldConfig` is
  `PlainField | TextField | SelectField | ComboboxField | SlugField | MediaField`, and `Config` has
  `media`, `maxDepth` and `versions` as global keys.
- `src/lib/config/types.ts` `FieldBase` (main spec D33) - a top-level key of a field is a data rule the
  server enforces and the Admin mirrors; `admin` holds hints only. `features` changes what a save
  accepts, so it is top-level.
- `src/lib/document/build-document-schema.ts` - one schema builder per field kind (`case "text"` and the
  rest), run by the server (`find-document-errors.ts`) and by the Admin's live validation alike.
- `src/workflows/cms/steps/update-cms-document-content.ts` `listStoredRows` - the compensation writes
  back `row[column]` from the stored document the workflow read, as the read returned it.
- `src/workflows/cms/steps/prepare-cms-version-snapshot.ts:157-168` - `changed_fields` compares each
  field's `JSON.stringify` in the snapshot with the one in `previous`, which is the latest version's
  snapshot or, for a document without versions, its stored row (`update-cms-document.ts:204`,
  `publish-cms-document.ts:135`).
- `src/workflows/cms/utils/build-admin-document.ts` `completeAdminDocumentRead` - finishes the Admin's
  read at any depth with the shape the media read carries (`MediaPlacement`, `src/lib/media/types.ts`),
  as the read before it runs in a `transform()` without the registry.
- `src/admin/components/manager-form-fields/` is the form toolkit: `eslint.config.*`'s
  `no-restricted-imports` refuses its imports of `lib`, `api`, `workflows` and `cms`.
  `fields/custom-field/custom-field.tsx:63` loads a component lazily through `getLazyComponent`.
- `@lexical/react` 0.53.0 `dist/LexicalComposer.d.ts` - `LexicalComposer` is `@deprecated`, "superseded
  by `LexicalExtensionComposer`" and "expected to be removed in a future major release"; it takes no
  extensions, so a feature Lexical ships as an extension cannot reach an editor built on it.
  `dist/LexicalRichTextPlugin.d.ts` and `dist/LexicalHistoryPlugin.d.ts` call themselves legacy plugins,
  replaced by `RichTextExtension` (`@lexical/rich-text`) and `HistoryExtension` (`@lexical/history`, which
  the plugin does not declare). The language service's deprecation diagnostics (6385, 6387) over `src/`
  flag `LexicalComposer` alone, in `richtext-editor.tsx`; `tsc` reports none of them.
- `@lexical/react` 0.53.0 `dist/LexicalExtensionComposer.d.ts` - takes one root `extension`, which must be
  stable across renders (module scope or `useMemo`), and renders a `ContentEditable` of its own unless
  `contentEditable` is `null`. A root extension (`defineExtension` from `lexical`,
  `dist/extension-core/types.d.ts`) carries `namespace`, `nodes`, `theme`, `editable`, `onError` and
  `$initialEditorState`, and its `dependencies`.
- `lexical` 0.53.0 `dist/Lexical.dev.js:22669` - the core binds Cmd+B, Cmd+I and Cmd+U to
  `FORMAT_TEXT_COMMAND` whatever the editor's toolbar offers, so the 1b editor underlines on Cmd+U and
  the save is then refused ("Remove the underline formatting").
- `@lexical/link` 0.53.0 `dist/LexicalLinkExtension.d.ts` - `LinkExtension` takes `validateUrl`, which
  `TOGGLE_LINK_COMMAND` applies and which turns a pasted URL over a selection into a link.
  `@lexical/history` `HistoryConfig` has `maxDepth` (unbounded by default; each step holds a whole
  editor state) and its output the `canUndo` and `canRedo` signals, read in React with
  `useExtensionSignalValue` (`@lexical/react` `dist/useExtensionSignalValue.d.ts`).
- `$setBlocksType`, which turns the selected blocks into headings, a quote or paragraphs, is exported by
  `@lexical/selection` 0.53.0 only, a dependency of `@lexical/rich-text` the plugin does not declare.
  `@medusajs/icons` has `link`, `list-bullet` and `arrow-uturn-left`, and no bold, italic, numbered list
  or quote icon.
- `@medusajs/admin-bundler` 2.22.7 `dist/index.js:1617-1672` - `medusa plugin:build` leaves out of the
  plugin's Admin bundle every package in `dependencies`, `peerDependencies` and `devDependencies`, and
  emits dynamic imports as `_chunks/`. The host's Vite resolves those packages from the host's
  `node_modules`, so Lexical must be one of the plugin's `dependencies`, which the plugin has none of
  yet.
- `sub-collections-and-documents`, "Rich text" and sub-phase 1g, written before features - moved here
  and rewritten; 1g there points here.
- [sub-cms-translations](./2026-11-06-sub-cms-translations.md), Current State - Medusa applies a
  translation only when its `typeof` matches the stored value's: a translated document is a string, as
  the base value is.
- The document routes take bodies up to 2 MB
  (`src/api/admin/cms/collections/[collection]/documents/middlewares.ts:26`); Lexical's JSON is verbose,
  and a save sends the whole document.
- Lexical 0.53.0 is the latest version (published 2026-10-28); `@lexical/react` needs React 18 or later
  and lists `yjs` as an optional peer. Its serialized `text` node carries `format` as a bitmask (bold 1,
  italic 2, strikethrough 4, underline 8, code 16, ...) and `style` as CSS text, which a paste from a
  word processor fills; `list` carries `listType` (`bullet`, `number`, `check`); `@lexical/link` also has
  an `autolink` node, which its auto-link plugin writes. Neither `@medusajs/ui` nor the dashboard ships an editor.

## Target Behavior

- `fields: { body: { type: "richtext", label: "Body" } }` on a `text` column gives a Lexical editor with
  a toolbar of the field's features; no model change.
- With no `richText` in the config, a field gets every built-in feature and headings `h2` to `h4`;
  `richText` sets those defaults for every `richtext` field, and a field's own `features` or `headings`
  replaces each. Its links follow the config's `linkPolicy` (D36), or the field's own `linkPolicy`.
- `features` on a field is a list, which replaces the defaults, or a function of the defaults, which
  the registry runs once at start; the Admin's projection carries the resulting list.
- The Admin API and the store API return the document as an object; a write takes it as one; the column
  holds its JSON string.
- A save is refused at the field's path when the document does not parse, holds a node or a format of a
  feature the field does not have, a heading level outside its `headings`, a link its link policy refuses,
  or inline CSS.
- An empty editor saves `null`, so a schema that refuses `null` makes the field required.
- A column that held plain text before `richtext` was set reads as one paragraph per line.
- A version snapshot holds the document as an object; a restore writes it back as a string; a save that
  changes nothing in the text leaves it out of `changed_fields`.
- A paste keeps only what the field's features allow; the rest of its formatting is dropped.

## Proposed Solution

### Features

A **feature** is a named part of the editor and of the check: the toolbar's controls, the Lexical nodes
it adds, and what the server accepts of them. The built-in features:

| Feature | Toolbar | What it allows in a document |
|---|---|---|
| `bold` | **B** | bit 1 of a `text` node's `format` |
| `italic` | *I* | bit 2 of a `text` node's `format` |
| `heading` | a block type menu | `heading` nodes whose `tag` is in `headings` |
| `list` | bulleted and numbered list | `list` with `listType` `bullet` or `number`, `listitem` |
| `quote` | the block type menu | `quote` |
| `link` | a link button and a URL popover | `link` and `autolink`, whose `url` the field's link policy allows |

Always allowed: `root`, `paragraph`, `text` and `linebreak`. A `text` node's `style` must be empty, and
its `format` may hold only the bits of the field's features; a `link`'s `target` may be `_blank` or
`null`, its `rel` is not read, and the storefront sets its own. Every other node type is refused, so a
pasted table or image never reaches the column.

Every element node carries `format`, its alignment, and `indent` (`lexical` 0.53.0
`dist/nodes/LexicalElementNode.d.ts`, `SerializedElementNode`): `format` must be empty, as no feature
aligns text, and `indent` must be 0 outside a `listitem`, whose indent nests a list. A paragraph also
carries `textFormat` and `textStyle`, the format of the text typed next
(`dist/nodes/LexicalParagraphNode.d.ts`): `textStyle` must be empty and `textFormat` hold only the bits
of the field's features, as a `text` node's `format` does. `direction` is not read.

A node sits only where its parent may hold it: the root holds `paragraph`, `heading`, `quote` and
`list`; those hold `text`, `linebreak`, `link` and `autolink`, a `list` holds `listitem`s, a `listitem`
inline nodes and a nested `list`, and a link holds `text` and `linebreak`. The editor never writes
anything else, and a storefront's renderer may rely on it.

A link's URL is checked by the link policy of main spec D36, through the same function as a `url`
field: a relative URL starts with `/`, `#` or `?`; `//host`, a space, a control character and a scheme
outside the policy, `javascript:` included, are refused. A text node holding a control character other
than tab or line feed is refused too (D36).

### Config

```ts
richText: {
  features: ["bold", "italic", "heading", "list", "quote", "link"],
  headings: ["h2", "h3", "h4"],
},
// main spec D36, shared with `url` fields
linkPolicy: { protocols: ["http", "https", "mailto", "tel"], relative: true },
// a field
lead: { type: "richtext", label: "Lead", features: ["bold", "italic", "link"] },
answer: {
  type: "richtext",
  label: "Answer",
  features: ({ defaultFeatures }) =>
    defaultFeatures.filter((feature) => feature !== "heading"),
},
```

- The registry resolves each `richtext` field once: its `features` and `headings`, else `richText`'s,
  else the built-in defaults, and its `linkPolicy`, else the config's `linkPolicy` (D36). It refuses an unknown
  feature, a heading level outside `h1` to `h6`, `headings` that are empty while `heading` is a feature,
  and a `features` function that throws or returns anything but a list of known features; the link
  policy's own refusals are `sub-input-safety`'s.
- It refuses `richtext` on a column that is not `text`, on a `searchable` column, as a slug's `from`,
  as `useAsTitle`, in `defaultColumns`, and in a layout's component node: a component edits plain
  values, and a document is not one. `filterable` (Phase 2b of `sub-collections-and-documents`) refuses
  it when it is built.

### Value

Pure functions in `src/shared/rich-text/`, which import no Lexical, so the server checks a document as
plain JSON and the Admin runs the same check:

- **`parseRichText(value)`** turns a stored text, a document object or `null` into a document or
  `null`; a text that is not a document, because the column held plain text, becomes one paragraph per
  line.
- **`validateRichText(document, field)`** answers `{ path, message }` errors against the field's
  resolved features and the rules above.
- **`isRichTextEmpty(document)`** is true for a document without text: what an empty editor saves.
- **`toPlainText(document)`** gives the text without formatting, one line per block, for a rollback
  script and for a later search or excerpt.

**Where the value changes form.** Inside the workflows a `richtext` value stays the column's text, so
the compensation of `updateCmsDocumentContentStep` writes back exactly what it read. It turns into a
document at the edges only:

- **Write:** the body holds a document; `buildDocumentSchema` checks it (`validateRichText`, empty as
  `null`), and `prepareDocumentWrite` writes `JSON.stringify(document)`, or `null` for an empty one,
  through `normalizeRichText` (`src/lib/document/`), which the versions share.
- **Validation of an edit:** `validateCmsDocumentStep` checks a body over the stored values of the
  fields it leaves out; a stored `richtext` value is parsed first, so a partial save passes.
- **Admin read:** `completeAdminDocumentRead` parses each `richtext` value at any depth, in the row and
  in the latest version's snapshot, through `parseRichTextValues`. The read placement (`ReadPlacement`,
  renamed from `MediaPlacement`) carries each model's `richtext` fields under `richTextFields`, beside
  its media `fields`, which the media read keeps to itself.
- **Store read:** `prepare-cms-store-documents` (`sub-collections-and-documents` 1h) parses them the same
  way.
- **Versions:** `prepareCmsVersionSnapshotStep` turns each `richtext` value of the snapshot and of
  `previous` through `normalizeRichText` before it stores and compares them, as `previous` is a snapshot
  or a stored row; an empty document is `null` there as in the column. A restore sends the snapshot's
  document as a body does.
- **Field schemas:** a field's `serverValidation` and `serverPublishValidation` get the document object,
  or `null`, as every other field gets its value.
- **Host components:** `useDocumentValue` gives the document object under the field's name.

### Admin

- **Toolkit:** a `richtext` input in `src/admin/components/manager-form-fields/fields/richtext-field/`
  holds Lexical and the toolbar, and imports nothing of the CMS: it gets `features`, `headings` and
  `linkPolicy` from `ManagerFormFieldConfig.richText`, typed by `RichTextSettings` of `src/shared/`,
  which the toolkit may import (AGENTS.md).
  `RichTextField` loads `richtext-editor.tsx`, the only module importing Lexical, through a
  module-level `React.lazy`, so a page without a `richtext` field loads no Lexical; a lint rule refuses
  a static import of Lexical or of the editor anywhere else in `src/`. It registers **every** built-in node, so a stored document always loads, shows only the
  field's features in its toolbar, and on a paste drops the formats and nodes the field does not allow.
- **Lexical's API:** the editor is built from extensions - a root extension per field, created once
  when the field mounts, with `RichTextExtension`, `HistoryExtension` and, in 1d, the extensions of the
  field's features - under `LexicalExtensionComposer`; no deprecated or legacy part of `@lexical/react`.
- **Features in the editor:** the editor's root extension always holds `ListExtension` and
  `LinkExtension`, so a stored list or link can be removed whatever the field allows; what is added is
  decided by the field's features - `LinkExtension`'s `validateUrl` makes a link only with `link` and a
  URL the link policy allows, and a format guard extension stops a text format (the bits of
  `RICH_TEXT_FORMAT_BITS`, shared with the server), a list or an alignment the field lacks, unless the
  command removes it.
- **Toolbar:** `Toolbar` knows no control itself; it renders, in order, every `ToolbarControl` it is
  given - a name, `isShown(settings, selection)` and a component taking `ToolbarControlProps`
  (settings, selection, disabled). `TOOLBAR_CONTROLS` lists the built-in ones: history, block type,
  text formats (one table entry per format), lists, link. A control shows when the field has one of its
  features or the selection holds what it sets, so a stored document can be cleaned up. A new feature's
  controls join as one more entry; a host's own feature (Phase 3) adds its entry and its extensions.
- **Files:** `richtext-field/` holds the field (`richtext-field.tsx`, the lazy entry) and the editor
  (`richtext-editor.tsx`); under `editor/`, `types.ts`, `theme.ts` (the classes of what the editor
  renders), `extensions/` the root extension and the guard, `hooks/` the selection state and the Cmd+K
  shortcut, `utils/` the block type options and change, the text formats, the link selection's restore
  and the editor's `onError`, and `toolbar/` the components only, with
  `toolbar-controls.ts`, the toolbar's list of controls (AGENTS.md, one component per `.tsx`). The files importing Lexical sit in `richtext-field/editor/`,
  imported by `richtext-editor.tsx` alone, so they stay in its lazy chunk.
- **CMS:** `build-field-config.ts` maps a `richtext` field's resolved features into that config.
- A document saved before a field lost a feature still loads; its save is refused at the field's path,
  naming the formatting, until the editor removes it.
- The version view writes a `richtext` value as `toPlainText`, shortened.

### Alternatives Considered

- **A `json` column:** cannot be translated (Settled) and breaks D3.
- **HTML, stored or built at a read:** must be sanitised, and gives a storefront no control of the
  structure (D25).
- **Parsing in the read step:** the compensation would write an object back into a text column, and
  `changed_fields` would compare an object with a text.
- **Features as Admin hints under `admin`:** they change what a save accepts, so by D33 they are a data
  rule.
- **The editor's whole Lexical config in the plugin's config:** ties hosts to Lexical's API, and an
  upgrade of Lexical to every host's config.
- **Lexical bundled into the plugin's Admin build:** the bundler leaves every declared package out, so
  bundling would need a package left undeclared, which `plugin:build` resolves against nothing.

## Data Model and Persistence

No model change: any `model.text()` column, `.translatable()` or not. A column already holding text
reads as paragraphs and is stored as a document at the next save.

## Contracts

- **Config:** `Config.richText?: RichTextConfig` (`features?`, `headings?`), beside `Config.linkPolicy` of
  `sub-input-safety`;
  `RichTextField = FieldBase & { type: "richtext"; features?: RichTextFeature[] | ((defaults:
  RichTextFeature[]) => RichTextFeature[]); headings?: RichTextHeading[]; linkPolicy?: Partial<LinkPolicy> }`.
  `RichTextFeature`, `RichTextHeading` and `RichTextDocument` are exported from the package root for a
  host's config and storefront types.
- **Projection:** a `richtext` field carries its resolved `features`, `headings` and `linkPolicy`.
- **Admin and store APIs:** the value is `{ root: { type: "root", children: [...] } }` or `null`; the
  `validate` route takes it as a write does.
- **Compatibility:** changing `type: "text"` to `"richtext"` on a live field changes its store value
  from a string to an object, a breaking change for that field's storefront code, stated in the README;
  the README's renderer escapes text through React, and says a storefront building HTML itself must
  treat the document as untrusted.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A value that is not a document, has an unknown node, or a link to another scheme or `//host` | 400 at the field's path | unit test of `validateRichText`; HTTP test |
| A heading in a field without `heading`, a level outside `headings`, an underline bit, inline CSS | 400 at the field's path, naming the formatting | unit test of `validateRichText` |
| An aligned paragraph, an indented paragraph, a paragraph's `textStyle` | 400 at the field's path; a nested list item's indent passes | unit test of `validateRichText` |
| A required field holds an empty editor's document | 400 at the field's path; `null` stored for an optional one | unit test of the schema |
| `richtext` set on a column already holding plain text | read as one paragraph per line; the next save stores a document | unit test of `parseRichText` |
| A save fails after the rich text was written | the compensation writes back the stored text | workflow integration test |
| A save that changes nothing, `previous` a stored row | the field is not in `changed_fields` | step test of the snapshot |
| A stored document uses a feature the field no longer has | it loads; its save is refused until the formatting is removed | Admin walkthrough |
| A paste from a word processor | only the field's features are kept | Admin walkthrough |
| Cmd+U, or Cmd+I in a field without `italic` | nothing changes | unit test of the format guard |
| A stored document holds italic, a heading or a link the field no longer allows | the italic toggles off, the block type menu turns the heading into a paragraph, the link popover removes the link | Admin walkthrough |
| A translation of a rich text field | a JSON string like the base value, applied by Medusa as it is | `sub-cms-translations` |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Lexical does not resolve or build in the host's Vite, through yalc or npm | medium | admin | 1a is a probe of the bare editor in the host, before any field | Another editor would need a converter for stored documents |
| Lexical is before 1.0, so a minor version can change the document format | medium | content | Exact versions; the server reads only its listed nodes, without Lexical | An upgrade is tested against stored documents |
| `richtext` turned on for a live field changes its store value | medium | api | Released with the storefront's renderer; stated in the README | A storefront deployed alone breaks on that field |
| A large document with the rest of a page passes 2 MB | low | api | The limit stays; the README names it | A very long article is split into blocks |
| Without 1e's paste filter, a paste from a word processor brings formatting the field refuses | low | admin | The save answers 400 at the field's path, naming the formatting; the guard lets the editor remove it | The editor cleans a paste up by hand until 1e |

**Rollout:** a new field type; nothing changes until a host sets `type: "richtext"`. Lexical becomes the
plugin's first `dependencies` entry, installed with the plugin.

**Rollback:** set the field back to `textarea`; a script through `toPlainText` turns its column into
plain text.

## Dependencies

- Lexical at exact versions, in the plugin's `dependencies`: `lexical`, `@lexical/react`,
  `@lexical/rich-text`, `@lexical/list`, `@lexical/link`, 0.53.0 (approved by the user on 2026-11-07 for
  1g). A host using the built plugin installs them with it; under `yarn dev` the host takes them
  from the plugin's `node_modules` and installs nothing (1a).
- `sub-input-safety` (main spec D36) before sub-phase 1b: the link policy, its URL check and the control
  character check, which `validateRichText` calls.
- The store read returns the document from `sub-collections-and-documents` 1h on; until then only the
  Admin API carries it.

## Acceptance Criteria

- [ ] `type: "richtext"` on a text column gives a Lexical editor with no model change; formatted text is
      saved, reloaded, published and restored.
- [ ] A field's features decide its toolbar, its paste and what a save accepts; a document outside them
      answers 400 at the field's path.
- [ ] Global `richText` sets every field's defaults, and a field's list or function changes them.
- [ ] A failed save writes back the stored text; a save that changes nothing leaves the field out of
      `changed_fields`.
- [ ] A page without a `richtext` field loads no Lexical.

## Phasing

| Sub-phase | Goal | The user can try |
|---|---|---|
| **1a Probe** | Lexical as the plugin's dependency, a bare editor in the form toolkit, built and run in the host | An editor shows and takes bold text in the host's Admin |
| **1b The field** | Config and registry with features, `src/shared/rich-text/`, the schema, the write, the Admin read, versions, the 1a editor on the field | Bold text saved, reloaded, published and restored |
| **1c Extension API** | The editor on `LexicalExtensionComposer`, `RichTextExtension` and `HistoryExtension`, with no deprecated or legacy Lexical API left | The description edits, bolds, undoes and saves as before |
| **1d Toolbar** | Each feature's extensions and controls, the format guard, undo and redo, the block type menu, lists, the link popover | Headings, lists, quotes and links edited; Cmd+U and a feature the field lacks do nothing |
| **1e Paste and versions** | The paste filter on pasted nodes, the version view as plain text | A paste from a word processor keeps only the field's features; a version lists its text |
| **2 Store** | The object in the store read, with `sub-collections-and-documents` 1h; the README's renderer | A storefront renders a page's rich text |
| **3 More features** (deferred) | Images from the media library, links to products and categories, a host's own features through the Admin extension registry | An image and a product link inserted and rendered |

Later sub-phases get their steps when they are next.

## Implementation Plan

### Sub-phase 1a - Probe

**Goal:** Lexical resolves, builds and runs in the host's Admin, loaded lazily from the plugin's form
toolkit, before any field is built on it.

**Prerequisites:** none.

1. **P1a.1 - Lexical as a dependency**
   - **Outcome:** `lexical`, `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/link` at
     exactly 0.53.0 in the plugin's `dependencies`; a changeset (`patch`) naming them.
   - **Areas:** `package.json`, `yarn.lock`, `.changeset/`
   - **Changes:** the user runs `yarn add` with the five packages at `0.53.0` exactly (the plugin's
     installs are the user's); nothing imports them yet.
   - **Verification:** `yarn typecheck` and `yarn typecheck:admin` pass; `package.json` lists the exact
     versions.

2. **P1a.2 - A bare editor in the toolkit**
   - **Outcome:** `RichTextInput` in `src/admin/components/manager-form-fields/fields/richtext-field/`:
     Lexical's `LexicalComposer` with `RichTextPlugin`, `HistoryPlugin` and a **B** button, its value a
     serialized document, `onChange` on each change; a `richtext` entry in `ManagerFormFieldType` and
     `FIELD_INPUTS`. `RichTextField` loads `richtext-editor.tsx` through `React.lazy`, and a lint rule
     keeps Lexical and the editor out of every other import. No CMS imports.
   - **Areas:** `src/admin/components/manager-form-fields/`
   - **Changes:** the input and its lazy entry; the toolkit's own `RichTextValue` type.
   - **Verification:** `yarn typecheck:admin`, `yarn lint` (the toolkit boundary), format check.

3. **P1a.3 - The probe in the host**
   - **Outcome:** the host's Admin shows the editor for one `textarea` field of the test page, switched
     in the plugin's form for the probe only, and keeps bold text in the form's state.
   - **Areas:** `src/admin/cms/common/utils/build-field-config.ts` (a probe switch, removed in 1b)
   - **Changes:** the probe maps one named field to `richtext` in the Admin only; nothing is saved
     through it, and the switch is never committed: 1a's commits are P1a.1 and P1a.2.
   - **Verification:** the user's `yarn dev` in the plugin, the host's install, the host's Vite cache
     cleared, then the walkthrough: the editor shows, takes bold text, and a page without the field
     loads no Lexical chunk (the network tab).

**Exit gate of 1a:** typecheck, admin typecheck, lint and format pass; the host's walkthrough shows the
editor; the probe switch is reverted. Then the steps of 1b are written.

### Sub-phase 1b - The field

**Goal:** a `richtext` field is configured, checked, written, read and versioned by the server, and
edited in the Admin with the 1a editor, whose toolbar is **B** only until 1d.

**Prerequisites:** 1a; `sub-input-safety` (done).

1. **P1b.1 - The read placement, renamed**
   - **Outcome:** `MediaPlacement` is `ReadPlacement`, and `src/lib/media/build-media-placement.ts` with
     its test is `src/lib/document/build-read-placement.ts`, exporting `buildReadPlacement`; nothing
     else changes.
   - **Areas:** `src/lib/media/`, `src/lib/document/`, the steps, utils and workflows importing them.
   - **Changes:** `git mv` of the file and its test, then the type's and the function's new names and
     the import paths only. Its own commit, before any content change.
   - **Verification:** `yarn typecheck`, `yarn test:unit`; `git status --short` shows `R`, not `RM`.

2. **P1b.2 - `src/shared/rich-text/`**
   - **Outcome:** `RichTextFeature`, `RichTextHeading`, `RichTextDocument` and `RichTextSettings`
     (`features`, `headings`, `linkPolicy`) with the built-in features and the default headings;
     `parseRichText`, `validateRichText`, `isRichTextEmpty` and `toPlainText`, one file each, following
     Features and Value. The functions are exported through `./shared`, the types from the package root
     too.
   - **Areas:** `src/shared/rich-text/`, `src/shared/index.ts`, `src/index.ts`
   - **Changes:** `validateRichText` walks the document's nodes and answers `{ path, message }` per
     error, checking links with `validateUrl` and text with `hasControlCharacters`; it reads
     `RichTextSettings`, never a field of `src/lib/`.
   - **Verification:** a unit test per function in `src/shared/rich-text/__tests__/`, every row of Edge
     Cases on `validateRichText` and `parseRichText` included; `yarn lint` (the `src/shared/` boundary).

3. **P1b.3 - Config and registry**
   - **Outcome:** `Config.richText`, `RichTextField` in `FieldConfig`, the `richtext` kind on a `text`
     column; `FieldDefaults` carries the config's `richText` resolved over the built-in defaults;
     `prepareField` resolves a field's `features` - a list, or a function run once - `headings` and
     `linkPolicy`, and `Field` carries them into the projection. Every refusal of Config is in place.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/`, `src/lib/collection/`, `src/lib/registry/`,
     `.changeset/` (`minor`, a new field type)
   - **Changes:** a resolver beside `prepare-link-policy.ts`; the refusals of `searchable`, a slug's
     `from`, `useAsTitle`, `defaultColumns` and a component node where each of those is checked now.
   - **Verification:** unit tests in `src/lib/registry/__tests__/` and `src/lib/config/__tests__/` for
     each resolution and refusal; `yarn typecheck`; `npx tsc -p tsconfig.json --emitDeclarationOnly`
     and `yalc publish --push --no-scripts` for the host.

4. **P1b.4 - The schema**
   - **Outcome:** `buildDocumentSchema` checks a `richtext` value through `validateRichText`, each error at
     the field's path; a document `isRichTextEmpty` counts as empty, so the field's schemas get `null`
     and one refusing `null` makes the field required.
   - **Areas:** `src/lib/document/build-document-schema.ts`
   - **Verification:** unit tests of the schema: a valid document, an unknown node, a `javascript:` link,
     a heading level outside `headings`, an empty document in a required and in an optional field, in a
     document and in a block.

5. **P1b.5 - The write**
   - **Outcome:** `prepareDocumentWrite` writes each `richtext` value of the document's row and of every
     block row as `JSON.stringify(document)`, an empty one as `null`.
   - **Areas:** `src/lib/document/prepare-document-write.ts`
   - **Verification:** unit tests of `prepareDocumentWrite`: a document's field, a block's field in a
     repeater, an empty document.

6. **P1b.6 - The Admin read**
   - **Outcome:** `buildReadPlacement` carries each model's `richtext` fields beside its media fields;
     `completeAdminDocumentRead` turns each `richtext` value through `parseRichText`, at any depth, in the
     row and in the latest version's snapshot.
   - **Areas:** `src/lib/document/build-read-placement.ts`, `src/lib/media/types.ts`,
     `src/workflows/cms/utils/build-admin-document.ts`
   - **Verification:** unit tests of `buildReadPlacement` and `completeAdminDocumentRead`: a stored
     document, plain text read as paragraphs, a block's value in a repeater, a snapshot.

7. **P1b.7 - Versions**
   - **Outcome:** `prepareCmsVersionSnapshotStep` turns each `richtext` value of the document, of
     `previous` and of their blocks through `parseRichText` before it stores and compares them.
   - **Areas:** `src/workflows/cms/steps/prepare-cms-version-snapshot.ts`
   - **Verification:** a step test: the snapshot holds an object; a save that changes nothing, with
     `previous` a stored row holding the text, leaves the field out of `changed_fields`; a changed
     document puts it in.

8. **P1b.8 - The routes, against the test module**
   - **Outcome:** `callout.body` is `richtext` and the tests sending it a text send a document;
     `TestRecipe` has a nullable `summary` column, a `richtext` field of the recipe.
   - **Areas:** `integration-tests/modules/test-content/`, `integration-tests/http/cms/`
   - **Changes:** the model's column, then a stop: the user runs `yarn test:db:generate`. Then HTTP
     tests in `admin-cms-documents.spec.ts`: a save and a read of a document's and a block's rich text
     as objects; 400 at the field's path for an unknown node, a `javascript:` link and a heading the
     field does not allow; the `validate` route; a restore of a version; a column holding plain text
     read as paragraphs; and, beside the existing compensation tests, a save failing after the content
     was written leaves the stored text in the column.
   - **Verification:** `yarn test:db:up`, `yarn test:integration:http`, `yarn test:db:down`, run by the
     agent.

9. **P1b.9 - The editor on the field**
   - **Outcome:** `build-field-config.ts` maps a `richtext` field to the toolkit's `richtext` input with
     `richText: { features, headings, linkPolicy }` on `ManagerFormFieldConfig`, typed by the toolkit;
     `buildFieldDefaults` starts an empty field at `null`, and the editor hands back `null` for an
     empty document. The toolbar stays **B**.
   - **Areas:** `src/admin/cms/common/utils/`, `src/admin/components/manager-form-fields/`
   - **Verification:** unit tests of `buildFieldConfig` and `buildFieldDefaults`; `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`.

10. **P1b.10 - The walkthrough in the host**
    - **Outcome:** one field of the host's config, on a `text` column the user picks, is `richtext`.
    - **Changes:** the host's config only; the declarations and `yalc publish` of P1b.3 when the types
      changed since.
    - **Verification:** the host's typecheck and config test; the user's walkthrough: bold text saved,
      reloaded, published, and an older version restored; the column holds the document's JSON.

**Exit gate of 1b:** unit tests, HTTP tests, typecheck, admin typecheck, lint and format pass; the
host's walkthrough passes. Then the steps of 1c are written.

### Sub-phase 1c - Extension API

**Goal:** the editor uses Lexical's extension API only, so no deprecated or legacy part of
`@lexical/react` is left, and 1d adds each feature as an extension. Nothing changes for the editor.

**Prerequisites:** 1b.

1. **P1c.1 - `@lexical/history` as a dependency**
   - **Outcome:** `@lexical/history` at exactly 0.53.0 in the plugin's `dependencies`, beside the other
     Lexical packages; the `patch` changeset of 1a names it.
   - **Areas:** `package.json`, `yarn.lock`, `.changeset/lexical-dependencies.md`
   - **Changes:** the user runs `yarn add @lexical/history@0.53.0 --exact`; the bundler leaves a declared
     package out of the Admin bundle, so `HistoryExtension` must be declared to be imported.
   - **Verification:** `yarn typecheck:admin`; `package.json` lists the exact version.

2. **P1c.2 - The editor on `LexicalExtensionComposer`**
   - **Outcome:** `richtext-editor.tsx` builds a root extension once per mounted field - `namespace`,
     `NODES`, `THEME`, `editable`, `onError` and `$initialEditorState` from the field's value, with
     `RichTextExtension` and `HistoryExtension` as dependencies - and renders it in
     `LexicalExtensionComposer` with `contentEditable={null}`, its own `ContentEditable` keeping the
     attributes `Form.Control` hands it. `LexicalComposer`, `RichTextPlugin`, `HistoryPlugin` and
     `LexicalErrorBoundary` are gone; `OnChangePlugin` and the toolbar stay children of the composer.
   - **Areas:** `src/admin/components/manager-form-fields/fields/richtext-field/richtext-editor.tsx`
   - **Changes:** the editor only; the lazy entry, the value and the toolbar's **B** are unchanged.
   - **Verification:** `yarn typecheck:admin`, `yarn lint` (the Lexical boundary), `yarn format:check`;
     the language service's deprecation diagnostics (6385, 6387) over `src/` list nothing, and no file
     imports `LexicalComposer`, `LexicalRichTextPlugin` or `LexicalHistoryPlugin`.

3. **P1c.3 - The walkthrough in the host**
   - **Outcome:** the host's image and text description behaves as after 1b.
   - **Verification:** the user's walkthrough: a stored description loads, bold text is typed, undone
     and redone, saved and reloaded; an emptied editor saves `null`; the editor's chunk loads only when
     the card opens.

**Exit gate of 1c:** admin typecheck, lint and format pass, no deprecation diagnostic is left, and the
host's walkthrough passes. Then the steps of 1d are written.

### Sub-phase 1d - Toolbar

**Goal:** the editor offers the field's features and no other: each feature adds its Lexical extensions
and its controls, a guard refuses anything outside them, and the toolbar has undo and redo, the block
type menu, lists and links.

**Prerequisites:** 1c.

1. **P1d.1 - `@lexical/selection` and `@lexical/extension`**
   - **Outcome:** `@lexical/selection` at exactly 0.53.0 in `dependencies`, for `$setBlocksType`;
     `@lexical/extension` at exactly 0.53.0 in `devDependencies`, for `buildEditorFromExtensions` in the
     unit tests. The changeset of 1a names `@lexical/selection`.
   - **Areas:** `package.json`, `yarn.lock`, `.changeset/lexical-dependencies.md`
   - **Changes:** the user runs `yarn add @lexical/selection@0.53.0 --exact` and
     `yarn add -D @lexical/extension@0.53.0 --exact`.
   - **Verification:** `yarn typecheck:admin`; `package.json` lists the exact versions.

2. **P1d.2 - Features as extensions, and the format guard**
   - **Outcome:** `richtext-field/editor/` holds the feature table - per built-in feature its extensions
     and the text formats it adds - and a format guard extension, configured with the field's features
     and headings, that handles `FORMAT_TEXT_COMMAND` for a format the field lacks, unless the selection
     already has it, and refuses a block type or a list the field lacks. The editor's root extension
     depends on `RichTextExtension`, `HistoryExtension` with `maxDepth: 100`, the extensions of the field's
     features - `ListExtension`, and `LinkExtension` with `validateUrl` from `src/shared/` and the field's
     link policy - and the guard. The toolbar is still **B**.
   - **Areas:** `src/admin/components/manager-form-fields/fields/richtext-field/`, `eslint.config.ts`
   - **Changes:** the Lexical boundary lets `richtext-field/editor/` import Lexical and refuses an import
     of that folder from anywhere but `richtext-editor.tsx`.
   - **Verification:** a unit test of the guard on an editor built with `buildEditorFromExtensions`: bold
     applies in a field with `bold`, italic and underline do nothing in it, a stored italic toggles off,
     and a link to `javascript:` is not made; `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

3. **P1d.3 - The toolbar**
   - **Outcome:** controls in a fixed order, each shown when the field has its feature: undo and redo,
     disabled while there is nothing to undo or redo; the block type menu - paragraph, the field's
     heading levels, quote - shown with `heading` or `quote`, or while the selection sits in a block the
     field lacks, which it can then turn into a paragraph; **B** and *I*; bulleted and numbered list,
     each pressed while the selection is in one and removing it then. Icons from `@medusajs/icons` where
     one exists, a letter otherwise, each with an accessible name.
   - **Areas:** `richtext-field/editor/`, `src/admin/i18n/json/en.json`
   - **Changes:** the block types the menu offers come from a pure helper over the features, the headings
     and the current block.
   - **Verification:** a unit test of that helper; `yarn typecheck:admin`, `yarn lint`,
     `yarn format:check`.

4. **P1d.4 - The link popover**
   - **Outcome:** the link button and Cmd+K open a popover over the selection: a URL input checked as
     the editor types with `validateUrl` and the field's link policy, showing the server's message; an
     "Open in a new tab" switch (`target: "_blank"`); apply and remove. While the selection is in a link
     the field no longer allows, the popover offers only removing it.
   - **Areas:** `richtext-field/editor/`, `src/admin/i18n/json/en.json`
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

5. **P1d.5 - The walkthrough in the host**
   - **Outcome:** the host's image and text description offers every built-in feature.
   - **Verification:** the user's walkthrough: a heading of each level, a quote, both lists and a link
     to a page and to `mailto:` saved, reloaded and published; a `javascript:` link refused in the
     popover; Cmd+U doing nothing; undo and redo across those changes. Then the description set to
     `features: ["bold", "link"]` for a moment: only **B** and the link show, Cmd+I does nothing, and a
     stored heading can be turned back into a paragraph; the config is set back.

**Exit gate of 1d:** unit tests, admin typecheck, lint and format pass; the host's walkthrough passes.
Then the steps of 1e are written.

### Sub-phase 1e - Paste and versions

Deferred (user, 2026-11-17): its steps are written when it is taken up. Its goal: a paste filter, as an extension handling
`SELECTION_INSERT_CLIPBOARD_NODES_COMMAND` of `lexical` 0.53.0, that keeps of the pasted nodes only
what the field's features allow, so a stored document still loads whole; and the version view writing a
`richtext` value as `toPlainText`, shortened. Verified by the user's walkthrough in the host.

## Short Tracker

- `done` - **1a, the probe** (2026-11-17). Lexical 0.53.0 exactly in `dependencies`, a `patch`
  changeset; `RichTextField` with its lazy `richtext-editor.tsx` (**B**, undo), the lint boundary for
  Lexical; admin typecheck, typecheck, lint and format pass. The user's walkthrough in the host: the
  editor shows in a hero's card, bolds and undoes, and its chunk loads only when the card opens. Under
  `yarn dev` the host takes Lexical from the plugin's `node_modules`, with nothing installed in the host
  ([lesson](../../lessons/yarn-dev-serves-the-plugin-admin-from-its-source.md)); the built bundle's way,
  where a host installs it with the plugin, is checked in Phase 6a of `sub-collections-and-documents`.
  The probe switch is reverted.
- `done` - **1b, the field** (steps approved and exit gate passed 2026-11-17). 735 unit tests and 112
  HTTP tests pass, with typecheck, admin typecheck, lint and format. Beyond the steps: the validation of
  an edit parses a stored rich text; an empty document is `null` in a version too; the fixture change
  moved the callout tests to documents; and the snapshot step compares values with `deepEqualObj`, as a
  `jsonb` snapshot comes back with its keys reordered and made an unchanged document count as changed
  ([lesson](../../lessons/jsonb-does-not-keep-the-order-of-keys.md)). The host's `image_text.description`
  is `richtext`, its typecheck failing only in `product-variants.spec.ts` as before; the user's
  walkthrough: bold text saved, reloaded, published, an older version restored, and an emptied editor
  stored as `null`; the column holds the document's JSON and a version the document as an object.
- `done` - **1c, the extension API** (2026-11-17). The editor on `LexicalExtensionComposer` with
  `RichTextExtension` and `HistoryExtension`; `@lexical/history` 0.53.0 exactly in `dependencies`, added
  by the user and named in the changeset of 1a; admin typecheck, lint and format pass, no deprecation
  diagnostic is left in `src/`, and nothing imports the legacy plugins. The user's walkthrough in the
  host: the description loads, bolds, undoes and saves as after 1b.
- `done` - **1d, the toolbar** (steps and dependencies approved, exit gate passed 2026-11-17). P1d.2 to P1d.4 done:
  `richtext-field/editor/` with the root extension, the format guard, the selection state, the toolbar,
  the block type menu, the list buttons and the link popover; the lint boundary keeps the folder in the
  editor's lazy chunk. 746 unit tests (the guard on a headless editor, the block type helper), typecheck,
  admin typecheck, lint and format pass, and no deprecation diagnostic is left. Beyond the steps: the
  list and link extensions are always present, the guard and `validateUrl` deciding what is added (see
  Admin); Jest compiles `lexical` and `@lexical/*`, which ship ES modules only; Cmd+K listens to
  `KEY_DOWN_COMMAND`, as `KEY_MODIFIER_COMMAND` is deprecated since Lexical 0.31. P1d.1 done: `@lexical/selection`
  in `dependencies` and `@lexical/extension` in `devDependencies`, both exactly 0.53.0, added by the
  user. The user's walkthrough in the host: headings, a quote,
  both lists and links saved, reloaded and published; `javascript:` refused in the popover; Cmd+U doing
  nothing; undo and redo; with `features: ["bold", "link"]`, only bold and the link shown, Cmd+I doing
  nothing, and a stored heading and list turned back into paragraphs.
- `done` - the review of the day's editor changes (2026-11-17), applied before 1d's commit: the toolbar
  renders a list of controls (`TOOLBAR_CONTROLS`), formats as table entries; `buildFieldEditorExtension`
  and `FeatureGuardExtension` renamed from names that read as Lexical's or as formats only;
  `getBlockTypeOptions` in `block-type-options.ts`; the editor's types in `editor/types.ts`; the toolkit's
  own `RichTextValue` and value check replaced by `src/shared/`'s; `DEFAULT_RICH_TEXT_SETTINGS` in
  `src/shared/`, used by the registry and the editor; the link popover anchored to its button, which
  carries `aria-expanded`; the selection state kept when nothing the toolbar shows changed; the lint
  rule for `./editor/` scoped to the rich text field; "must describe an object" and "an array" in the
  schema message. 747 unit tests, typecheck, admin typecheck, lint and format pass.
- `pending`, deferred (user, 2026-11-17) - **1e, the paste and the version view**; with it, the
  editor's smaller additions the review of 1d named: nested lists with Tab (`TabIndentationExtension`),
  arrow keys across the toolbar (`useLexicalRovingTabIndexRef`), shortcuts in the buttons' hints, and a
  button removing the formatting a field refuses. Until then a pasted document may need cleaning by
  hand (Risks).
- `pending` - **Phase 2, the store**: the document as an object in the store read is built, with
  `sub-collections-and-documents` 1h - the store answers each `richtext` field as its document
  (`build-store-document.unit.spec.ts`, checked 2026-11-21). Left: the README's renderer, and the exit
  gate, a storefront rendering a page's rich text.
- `pending`, deferred (user, 2026-11-17) - **Phase 3, more features**.
- `done` - A block's `repeaters` became `areas` in [sub-block-areas](./2026-11-23-sub-block-areas.md)
  (2026-11-23); the steps above keep `repeaters` as built.
