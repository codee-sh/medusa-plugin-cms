# Translated Config Texts in the Admin

**Date:** 2026-11-20
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md), [sub-singletons](../2026-11-18-sub-singletons.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-20-sub-admin-text-translations.md`

## TLDR

A config may name `admin: { translationNs: "<namespace>" }`. Then every text it gives the Admin - a
collection's and a block type's labels, a field's label and description, an option's label, a section's,
a layout node's, an area's and a repeater's label - is a key in that i18next namespace, which the host
fills in its own `src/admin/i18n/index.ts`, one tree per language. Without it, the texts are shown as
written, as today. This is Medusa's own rule for an Admin route's `label` and `translationNs`. The
Admin translates the collection list once, where it enters through `GET /admin/cms/collections`, so no
screen and not the form toolkit change. This is not `sub-cms-translations`: that one translates content,
this one the Admin's own texts that a config writes.

## Out of Scope

- **Validation and server messages in the Admin's language** go to a sub-spec of their own, not written
  yet (user, 2026-11-20). A Polish editor still reads in English `Required`
  (`src/lib/document/build-document-schema.ts`, also run in the browser), `Blocks cannot be nested this
  deep`, the shared schemas' messages (`src/shared/sanitize/build-text-schema.ts`,
  `src/shared/rich-text/validate-rich-text.ts`), the stale-version message, `Unknown field`, the three
  messages of P1.2, and a host's own Zod messages (`serverValidation`).
- **Texts as functions:** [sub-config-value-functions](./2026-11-20-sub-config-value-functions.md)
  replaces this spec's texts-as-keys and `translation_ns` (D40).

## Problem

Every text a config gives the Admin reaches the screen as written. A host whose editors use another
language than its developers, or several, writes the config in one of them, and the plugin's own texts
(Medusa's `translation` namespace) follow the Admin's language while the config's do not.

## Current State and Evidence

- `src/lib/config/types.ts` - every text is a plain `string`: `Labels`, `FieldAdminConfig.description`,
  `FieldConfig.label`, `FieldOption.label`, `LayoutSectionConfig`, `LayoutGroupConfig`,
  `LayoutComponentConfig`, `LayoutCollapsibleConfig`, `LayoutTabConfig` (`label`, `description`),
  `AreaConfig.label`, `CollectionConfig.admin.description`. `Config` has no `admin` key.
- `src/workflows/cms/workflows/list-cms-collections.ts` - answers `{ collections, media_provider }`; the
  collections are `ClientCollection`s with their reachable `ClientBlock`s.
- `src/admin/hooks/api/collections/collections.ts` - `useCollections`, `useCollection` and
  `useMediaProvider` read one query, `collectionListQuery`; every screen that shows a config text reads
  the collection through the first two.
- `@medusajs/admin-sdk` 2.22.7 `dist/index.d.ts` - a route's `label` is plain text unless `translationNs`
  is given, then a key: `t(label, { ns })`; the dashboard does it in `chunk-5RT26WHA.mjs:144045`.
- `@medusajs/dashboard` 2.22.7 `chunk-5RT26WHA.mjs:148977` - `populateI18n` deep-merges the dashboard's
  resources with each extension's `i18nModule.resources` (a plugin's or the host's
  `src/admin/i18n/index.ts`); `chunk-SGUYOGWH.mjs:19` sets `fallbackLng: "en"`.
- `src/admin/i18n/index.ts` - the plugin's own texts sit in `translation`, the dashboard's namespace.
- Server messages that quote a config label, shown to editors in a toast:
  `validate-cms-drafts.ts` (`labels.plural`) and `validate-cms-singleton.ts` (`labels.singular`). The
  registry's own startup errors quote labels too, for the developer, who reads keys.

## Target Behavior

- Without `admin.translationNs`, the Admin is unchanged.
- With it, every config text the Admin shows is `t(text, { ns })`, following the Admin's language, with
  i18next's fallback to English; a key with no translation shows as the key, so a gap is visible.
- `translationNs` `"translation"`, `"medusa-plugin-content-cms"`, `"manager-form-fields"`, or an empty
  string, stops the start: they are the dashboard's and the plugin's namespaces, where a host's key would
  overwrite theirs (user, 2026-11-20).
- An editor never sees a key in a server message: the two messages above name no label.
- The options a host's hook gives (`defineCmsOptionsHook`) are the host's to translate.
- The plugin's own texts come in English and Polish, in two namespaces of their own: the Content
  screens' and the form toolkit's, which a host extends with a language or overrides text by text in its
  own `src/admin/i18n/index.ts` (user, 2026-11-20).

## Proposed Solution

- **Config and registry.** `Config.admin?: { translationNs?: string }`; the registry keeps
  `translationNs?: string`, checked by `prepareRegistry`.
- **Projection.** `GET /admin/cms/collections` answers `translation_ns: string | null` beside
  `media_provider`; the texts in `collections` stay as the config wrote them.
- **Admin.** `translateCollectionList(response, t)` in `src/admin/utils/` returns the
  response with every text of every collection and block type passed through
  `t(text, { ns: response.translation_ns })`, or the response itself without a namespace. Its walk
  follows the types above: labels, fields with their options, `admin.description`, `admin.sections` and
  their layout nodes at any depth, areas, and each block's labels, fields, sections and repeaters.
  `useCmsCollections` and `useCmsCollection` in `src/admin/hooks/` apply it in `select`, over `t` from
  `useTranslation()`, memoised on `t`, so a change of language selects again; the cache keeps the
  server's answer. `useCollections` in `hooks/api/collections` stays the server's answer, taking a
  `select`. Both sit where every feature reaches them, as navigation (D34) and a record's widget (D35)
  will show collection texts outside `cms/` (user, 2026-11-20).
- **Server messages.** "Drafts and versions are off for this collection, so changes go live when
  saved."; "This collection holds one document, which already exists. Edit it instead."; "This
  collection holds one document, which cannot be deleted. Edit it instead." The editor reads them on the
  collection's own page.

### Alternatives Considered

- **Texts per language in the config** (`label: { en, pl }`). Rejected (user, 2026-11-20):
  every language travels to the Admin, the plugin would own the fallback, and translators get no JSON of
  their own. The `string` type can still widen to `string | Record<string, string>` later.
- **A full key with its namespace per text** (`"cms-host:page.singular"`). Rejected: a text that is not
  a key but holds a `:` would be read as one; one namespace for the config decides it once.
- **`t()` at each screen.** Rejected: some 30 files show config texts, the form toolkit among them, which
  must stay generic (main spec D31); one walk at the boundary covers them and whatever comes next.

## Data Model and Persistence

None.

## Contracts

All additive; the plugin is not published yet.

- **Config:** `Config.admin.translationNs?: string`.
- **Projection:** `translation_ns: string | null` in `GET /admin/cms/collections`.
- **Server messages:** the three above; the error type and status are unchanged.
- **The plugin's texts:** the namespaces `medusa-plugin-content-cms` and `manager-form-fields`, their
  keys those of `src/admin/i18n/json/en.json` and `src/admin/components/manager-form-fields/i18n/json/en.json`.
- **Host:** `src/admin/i18n/index.ts` exporting `{ <lang>: { <translationNs>: { ...keys } } }`, as
  Medusa documents for Admin customizations.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A key missing in the Admin's language | the English text; missing in English too, the key | unit test of the walk over a fake `t`; walkthrough |
| A key that names an object of keys (`page` beside `page.singular`) | i18next's "returned an object" text, visible as a gap | the README's key layout |
| `translationNs` of `"translation"`, of the plugin's two namespaces, or `""` | startup refused, naming `admin.translationNs` | registry unit test |
| A config without `translationNs` | the response as it came, the same object | unit test |
| The editor switches language | the texts follow without a reload | walkthrough |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A text of a new config key is not walked and shows as a key. | low | admin | The walk sits beside the types it follows; its unit test lists each kind of text. | Seen at once in the Admin. |
| A host's key in another extension's namespace overwrites it (deep merge). | low | admin | The README asks for a namespace of the host's own. | A host's choice. |

**Rollout:** additive; a host opts in with the key and its translations.

**Rollback:** remove `translationNs` and write the texts again as plain text.

## Dependencies

- None. P2a.5 of [sub-singletons](../2026-11-18-sub-singletons.md) adds the label of a `link` action to
  the walk.

## Acceptance Criteria

- [ ] Without `translationNs`, every screen is unchanged.
- [ ] With it, every config text follows the Admin's language from the host's translations.
- [ ] `translation`, the plugin's two namespaces and an empty namespace stop the start.
- [ ] No server message an editor sees quotes a config label.

## Phasing

### Phase 1 - Translated config texts

**Goal:** a host translates its config's texts in its own namespace.

**Prerequisites:** None.

**Exit gate:** unit, HTTP, typecheck, admin typecheck, lint and format checks pass; the user's
walkthrough in the host, in two languages.

## Implementation Plan

### Phase 1

1. **P1.1 - `translationNs` in the config, the registry and the projection**
   - **Outcome:** `admin.translationNs` reaches `GET /admin/cms/collections` as `translation_ns`, `null`
     when left out; `"translation"`, the plugin's two namespaces and `""` stop the start.
   - **Areas:** `src/lib/config/types.ts` (`Config.admin`), `src/lib/registry/prepare-registry.ts`,
     `src/lib/registry/types.ts`, `src/workflows/cms/steps/get-cms-translation-ns.ts` (new, a read of the
     registry, as `get-cms-media-provider` beside it), `src/workflows/cms/workflows/list-cms-collections.ts`,
     `src/admin/hooks/api/collections/collections.ts` (`AdminCollectionsResponse`).
   - **Verification:** `prepare-registry` unit tests (kept, refused for each reserved namespace and
     `""`); the step's unit test; `admin-cms-collections.spec.ts` asserting `translation_ns: null`, from
     the workflow and from the route. `yarn test:unit`,
     `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P1.2 - Server messages without labels**
   - **Outcome:** the three messages above.
   - **Areas:** `validate-cms-drafts.ts`, `validate-cms-singleton.ts`, their unit tests, and the HTTP and
     workflow tests that match the text.
   - **Verification:** `yarn test:unit`, `yarn test:integration:http`, `yarn lint`, `yarn format:check`.

3. **P1.3 - The Admin translates the collection list**
   - **Outcome:** with `translation_ns`, every config text on every screen is translated; without it,
     nothing changes.
   - **Areas:** `src/admin/utils/translate-collection-list.ts` (new),
     `src/admin/hooks/use-translate-collection-list.ts`, `use-cms-collections.ts`, `use-cms-collection.ts`
     (new), `src/admin/hooks/api/collections/collections.ts` (`select`, `useCollection` gone), the
     screens that read collections.
   - **Verification:** unit tests of the walk over a fake `t`: each kind of text, layout nodes nested in
     a section, a block's texts, and the same object back without a namespace. `yarn test:unit`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

4. **P1.4 - README and the host's proof**
   - **Outcome:** the README's "Translating the config" section: the key, the host's
     `src/admin/i18n/index.ts`, a namespace of its own, keys as leaves, hook options translated by the
     host. The host's config names its namespace and translates its texts in English and Polish.
   - **Areas:** `README.md`; the host's `apps/backend/src/cms/config.ts`, `src/admin/i18n/index.ts`
     (new), its spec row.
   - **Verification:** `yarn format:check`; the host's typecheck; the user's walkthrough in both
     languages.

5. **P1.5 - The plugin's own texts in Polish, in namespaces of their own** (user, 2026-11-20)
   - **Outcome:** the Content screens, the sidebar and the breadcrumbs, and the form toolkit with its media
     inputs follow the Admin's language in English and Polish; a host adds a language or overrides a text
     in the same namespace.
   - **Areas:** `src/shared/admin-i18n-ns.ts`, both namespaces' names, which the registry reads too
     (user, 2026-11-20); `src/admin/i18n/` (`json/en.json` without its `cms` wrapper, `json/pl.json`,
     `index.ts`), `src/admin/hooks/use-cms-translation.ts`; the toolkit's `i18n/` (`json/en.json`,
     `json/pl.json`) and
     `hooks/use-manager-form-fields-translation.ts`, which `components/media` uses too, as the toolkit
     already depends on it; every `useTranslation()` of the Admin, its keys without their prefix;
     `routes/cms/page.tsx` with `translationNs`, `cms/content-breadcrumb/`; `README.md`, `AGENTS.md`.
   - **Changes:** each hook reads its namespace, then the dashboard's `translation`, so Medusa's keys
     (`actions.save`, `general.select`) still resolve; the route's `translationNs` is a string literal
     ([a-route-config-translationns-must-be-a-string-literal](../../../lessons/a-route-config-translationns-must-be-a-string-literal.md)).
     The toolkit keeps no import of the CMS: another Admin that takes it registers its namespace.
   - **Verification:** a unit test that each Polish file holds the English keys, every Polish plural
     form of a key English counts, and the values English interpolates; `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the
     user's walkthrough in Polish.

## Short Tracker

- `in_progress` - Phase 1, approved by the user 2026-11-20. P1.1 built: `admin.translationNs` checked by
  `prepareRegistry`, `get-cms-translation-ns` beside the media provider's step, `translation_ns` in the
  collection list. P1.2 built: the three messages without a label. P1.3 built:
  `translateCollectionList`, applied by `useCmsCollections` and `useCmsCollection` over the plain API
  hook (user, 2026-11-20: the API hook stays the server's answer). P1.4: README section
  "Translating the config's texts"; every text of the host's config a key of `cms-content`, in English and
  Polish, the blocks' shared fields under one `fields` group (user, 2026-11-20). The i18next merge is recorded in
  [an-admin-i18n-namespace-of-its-own-survives-the-merge](../../../lessons/an-admin-i18n-namespace-of-its-own-survives-the-merge.md).
  P1.5 built (user, 2026-11-20): the two namespaces, `pl.json` of each, `useCmsTranslation` and
  `useManagerFormFieldsTranslation` in the 42 files that translated, the sidebar's label and the
  breadcrumb translated. The toolkit marks an optional field with its own `optional` key in the slot of
  the dashboard's "(Optional)", which showed in English in a Polish Admin on Medusa's own forms too,
  though Medusa's `pl` holds `fields.optional`; why was not traced (user, 2026-11-20). 876 unit tests, typecheck, admin typecheck, lint and format check pass. Pushed to the host
  after P1.4; its server typecheck passes but for the two errors in `product-variants.spec.ts` that
  predate this work, and its Admin's errors are all in files outside the CMS. The user's walkthrough
  in Polish passed (2026-11-20): the page and page settings texts, their fields, and the plugin's own
  texts. Waits for the user's `yarn test:integration:http` (the messages, `translation_ns`). Not
  committed.
- After review (2026-11-20): the registry refuses the plugin's two namespaces too, their names in
  `src/shared/admin-i18n-ns.ts`; the translations' test takes the plural keys from English and compares
  interpolated values; the toolkit's optional mark is one text, brackets included; Polish copy
  corrected. Validation messages moved out of scope (user, 2026-11-20).
- `done` (2026-11-20) - `yarn test:integration:http` passes, 187 tests in 11 suites, on the test
  database. `sub-config-value-functions` replaces its texts-as-keys and `translation_ns`.
