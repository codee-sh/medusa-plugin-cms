# Config Values as Functions

**Date:** 2026-11-20
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md), [sub-admin-text-translations](./2026-11-20-sub-admin-text-translations.md), [sub-singletons](../2026-11-18-sub-singletons.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-20-sub-config-value-functions.md`

## TLDR

A config key may take a value or a function of one params object, run once on the server at start; its
result is what the registry keeps and the Admin and the API receive (main spec D40). One generic type,
`ConfigValue`, and one mechanism, `prepareConfigValue`, give every key that opts in the same two forms;
the code that prepares a key passes its function the params it decides, so a new key gets its forms by
its type and one call. The first keys are the config's Admin texts and the two functions the config
already has. A text is a string, shown as written and never translated, or a function given `{ t }`,
whose `t` names a translation - a key, its namespace and i18next's options - that the Admin resolves in
the editor's language. `features` and `admin.actions` move from `(defaults) => ...` to
`({ defaultFeatures }) => ...` and `({ defaultActions }) => ...`, the defaults named after the key.
This replaces the texts-as-keys contract of `sub-admin-text-translations`.

## Problem

A config key is either a fixed value or, for `features` and `admin.actions`, a function of the default,
each in its own shape. A text is only a `string`, which `admin.translationNs` turns into a key: a host
cannot keep one text plain while translating the others, cannot pass i18next's options (`context`,
`count`, interpolation), and every new key that wants a function has to invent its form again (user,
2026-11-20).

## Current State and Evidence

- `src/lib/config/types.ts` - `RichTextField.features` and `CollectionConfig.admin.actions` take a value
  or `(defaults) => value`; every text (`Labels`, `label`, `description`, `FieldOption.label`, layout
  nodes, `AreaConfig.label`, the `link` action's `label`) is a `string`. The package root exports these
  types (`src/lib/index.ts`: `export type * from "./config/types"`).
- `src/lib/field/prepare-rich-text-formatting.ts:28` (`runFeaturesFunction`) and
  `src/lib/collection/prepare-collection-actions.ts:33` (`runActionsFunction`) - two copies of one job:
  call the function once at start with a copy of the defaults, and turn a throw into a config error
  naming the place.
- `src/lib/field/prepare-fields.ts:350`, `src/lib/collection/prepare-collection.ts:92`,
  `src/lib/block/prepare-block.ts:57`, `src/lib/area/prepare-areas.ts` - texts enter the registry as the
  config wrote them. The registry's types reuse the config's (`RegistryArea = AreaConfig & { name }`,
  `RegistryLayoutSection = LayoutSectionConfig & { position }`, `RegistryBlock.admin.sections:
  LayoutBlockSectionConfig[]`), so the registry and the projection share the config's text type today.
- `src/lib/layout/check-field-sections.ts:70, 97, 128`, `src/lib/block/prepare-block-sections.ts:23` -
  startup errors quote a node's `label`.
- `src/admin/utils/translate-collection-list.ts` - the Admin's walk names every text it translates;
  `GET /admin/cms/collections` answers `translation_ns` beside the collections, read from the registry by
  `src/workflows/cms/steps/get-cms-translation-ns.ts`.
- The store API answers no config text: nothing under `src/api/store/` reads a label.
- The config holds functions that must not run at start - `serverTransform` runs on a save, a media
  provider is a class - so no generic walk over the config can tell which function to call.
- The host (`apps/backend/src/cms/config.ts`) gives 62 texts as keys of `cms-content` and one
  `actions: (defaults) => ...`.
- `integration-tests/modules/test-content/cms-config.ts` - the test app's config, every text plain, no
  `admin.translationNs`.

## Target Behavior

- A text is `string | ((params: { t }) => string | TranslatedText)`. A string is shown as written in
  every language, with or without `admin.translationNs`; a function's `t(key, options?)` names a
  translation, which the editor reads in the Admin's language with i18next's fallback (user, 2026-11-20).
- `t` names its namespace with `options.ns`, any namespace, Medusa's `translation` included, as a text
  only reads it; without `options.ns` it takes `admin.translationNs`, and without both the start stops
  (user, 2026-11-20). `admin.translationNs` is only the default namespace of `t`, and stays refused as
  `""`, `translation` or one of the plugin's two namespaces, the ones a host would fill.
- Every function of the config takes one params object, so a later parameter is added without breaking a
  function already written: `features: ({ defaultFeatures }) => ...`,
  `actions: ({ defaultActions }) => ...`,
  `label: ({ t }) => ...` (user, 2026-11-20).
- Every function runs once on the server at start. One that throws, or a text that returns anything but
  a string or a translation, or a translation with an empty key or options that are not text, number or
  boolean, stops the start, naming its place in the config.
- `GET /admin/cms/collections` answers a text as a string or as `{ type: "translation", key, ns,
  options? }`; `translation_ns` leaves the response.
- The Admin translates every `translation` object of the response, wherever it sits, so a new text key
  needs no change in the Admin; screens and the form toolkit receive strings, as today.
- The keys that take a function now are the texts, `features` and `admin.actions` (user, 2026-11-20);
  every other key keeps its value until a case asks for a function, and then takes one by its type and
  one call of `prepareConfigValue` with the params its function gets.
- Validation messages in the editor's language are not this spec's: the plugin's own messages and a
  host's Zod messages belong to a sub-spec of their own, not written yet (user, 2026-11-20).

## Proposed Solution

- **Types** (`src/lib/config/types.ts`, public):
  - `ConfigValue<TValue, TParams, TResult = TValue> = TValue | ((params: TParams) => TResult)` - the
    mechanism. A function's result may differ from the value, as a text's does. It cannot carry a key
    whose value is itself a function, such as `serverTransform`, which runs on a save: a function is
    always read as the form to call at start.
  - `DefaultsValue<T, TName extends string> = ConfigValue<T, Record<TName, T>>` - a key with defaults,
    which its function gets under the name the key states, `default<Key>`, as in
    `({ defaultFeatures })` (user, 2026-11-20), for `features` and
    `admin.actions`.
  - `TranslatedText = { type: "translation"; key: string; ns: string; options?: TranslationOptions }`,
    `TranslationOptions = Record<string, string | number | boolean>`.
  - `CmsTranslate = (key: string, options?: TranslationOptions & { ns?: string }) => TranslatedText`.
  - `CmsText = ConfigValue<string, { t: CmsTranslate }, string | TranslatedText>` - a text: a string, or
    a function returning a string or a translation; a translation is never written as a value, so it
    always comes from `t` and its default namespace. `ClientText = string | TranslatedText`, a text once
    prepared.
  - The types that hold texts take the text type as a parameter. The config's - `Labels<TText>`,
    `FieldOption<TText>`, `AreaConfig<TText>`, the layout nodes, `CollectionAction<TText>` - default to
    `CmsText`; the registry's (`RegistryCollection`, `RegistryBlock`, `RegistryArea`, `PreparedFields`)
    take `ClientText`; the client's (`Field`, `ClientCollection`, `ClientBlock`) default to `string`, what
    a screen reads, and the server answers them with `ClientText`. The Admin's files that read
    `ClientCollection`, `ClientBlock` or `Field` keep their types. A text the registry forgets to prepare
    is a function where `ClientText` is expected, which fails the typecheck. The same holds for a
    `DefaultsValue` key, whose registry type is the plain value.
- **Server** (`src/lib/config/`), named `prepare*` as every function of `src/lib` that turns the config
  into the registry - one mechanism, which the code preparing each key calls with the params that key's
  function gets (user, 2026-11-20):
  - `prepareConfigValue(value, params, where)` - the mechanism: the value, or the function called with
    the params; a throw becomes a config error, `${where} threw: <message>`. It checks no result.
  - `features` and `admin.actions` call it with `{ defaultFeatures: [...] }` and
    `{ defaultActions: [...] }`, a copy, so their function
    cannot change the defaults. It replaces `runFeaturesFunction` and `runActionsFunction`; each key's own
    check (`isListOf`, `validateAction`) still checks the result.
  - `prepareCmsText(text, translationNs, where)` - a text: builds `t` over the default namespace,
    prepares the text through `prepareConfigValue`, and checks that it is a string or a translation with
    a key, a namespace and options of text, number or boolean. `t` throws nothing and only builds the
    object, so a problem is named once, by `prepareCmsText`, rather than as a throw of the text's
    function. It exists because every text, at every place, gets the same params and the same check.
  - `describeText(text)` - a prepared text as a startup error quotes it: the text, or the translation's
    key.
  - Each `prepare*` of the registry prepares its texts where they enter the registry, before the checks
    that quote them; `prepareRegistry` hands `translationNs` down to each `prepare*` that holds texts. A
    form's sections are prepared by `prepareLayoutTexts`, a walk of the layout nodes that the typecheck
    keeps in step with their types.
  - A later key declares its type over `ConfigValue` - `CmsText` for a text, `DefaultsValue` for a key
    with defaults, its own for other params - and the code that prepares it calls `prepareConfigValue`
    with the params it decides, or `prepareCmsText` for a text.
- **Projection:** the collection list keeps the prepared texts as they are, so a translation reaches the
  Admin as its object. `get-cms-translation-ns` and `translation_ns` are removed.
- **Admin** (`src/admin/utils/translate-collection-list.ts`): the walk becomes a generic map over the
  response that turns each `translation` object into `t(key, { ...options, ns })` and keeps everything
  else. It takes the response with `ClientText` and returns it with `string`, one cast at that boundary,
  as the walk knows no field and the parameterised types state the two shapes. `useCmsCollections` and
  `useCmsCollection` keep applying it in `select`, so a change of language selects again and the cache
  keeps the server's answer.
- **Host:** its texts become functions - a local `const text = (key: string): CmsText => ({ t }) =>
  t(key)` keeps its config short - and its `actions` takes `{ defaultActions }`.

### Alternatives Considered

- **A function run in the Admin** (`defineCmsTranslate` in `cms-extensions.ts`, given every text with
  its context). Rejected (user, 2026-11-20): one function for every text grows into a switch far from the
  config, and its context becomes a contract of its own.
- **A function run on the server with a real `t`.** Rejected: the server knows neither the editor's
  language nor the Admin's translations, which live in the Admin's bundle.
- **A generic walk over the whole config at start.** Rejected: the config holds functions that must not
  run then.
- **A string as a key whenever `admin.translationNs` is set**, as `sub-admin-text-translations` built it.
  Rejected (user, 2026-11-20): a host could not keep one text plain, and a text was a key by a setting
  elsewhere in the config.

## Data Model and Persistence

None.

## Contracts

The plugin is not published, so the contract changes without a compatibility bridge.

- **Config:** the types above; `features` functions take `{ defaultFeatures }` and `admin.actions` functions `{ defaultActions }`; every text
  key takes `CmsText`; `admin.translationNs` is the default namespace of `t`.
- **Projection:** in `GET /admin/cms/collections`, every text is `string | TranslatedText`; the response
  loses `translation_ns`. The discriminator `type: "translation"` is reserved: no other object of the
  response uses it (layout nodes are `row`, `group`, `tabs`, `collapsible`, `component`; actions
  `create`, `collection`, `link`).
- **Workflows:** `getCmsTranslationNsStep` leaves `./workflows`; `listCmsCollectionsWorkflow` answers
  `{ collections, media_provider }`.
- **Startup errors:** a function that throws keeps today's messages (`the "features" function threw`,
  `the admin "actions" function threw`); a text's errors name its place, as `fields.title: label`.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A string text in a config with `admin.translationNs` | shown as written, in every language | unit test of the walk; walkthrough |
| `t("x")` without `options.ns` and without `admin.translationNs` | startup refused, naming the text's place | `prepareCmsText` unit test |
| `t("fields.title", { ns: "translation" })` | Medusa's own text, in the editor's language | `prepareCmsText` unit test; walkthrough |
| `t("")`, or options holding an object, a function or `undefined` | startup refused, naming the text's place | `prepareCmsText` unit test |
| A text function that throws, or returns a number | startup refused, naming the text's place | `prepareCmsText` unit test |
| A `features` or `actions` function that changes the defaults it gets | the registry's defaults stay as they were | registry unit test |
| A key missing in the Admin's language | English, then Medusa's `translation`, then the key | walkthrough, as in `sub-admin-text-translations` |
| The editor switches language | the texts follow without a reload | walkthrough |
| A startup error about a node whose label is a translation | the error quotes the key | registry unit test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A host's texts written as keys show as raw keys once a string is plain. | medium | host | The only host moves to functions in the same sub-phase that changes the meaning. | None until the first publication. |
| A future object of the response takes `type: "translation"` and is translated by mistake. | low | admin | The discriminator is reserved in Contracts; the walk's unit test covers the other node types. | A review catches a new one. |
| A key that should take a function is left as a value. | low | config | The rule is D40; a key opts in by its type and one call. | None. |

**Rollout:** 1a and 1b each land in the plugin and the host together, the host through the user's
`yarn dev` or `yalc publish --push`.

**Rollback:** revert the sub-phase's commits in the plugin and the host together.

## Dependencies

- `sub-admin-text-translations` Phase 1, whose walk, hooks and host namespace this spec reuses; it closes
  as `done` once its integration tests pass (user, 2026-11-20).
- P2a.5 of [sub-singletons](../2026-11-18-sub-singletons.md), which built `admin.actions`; 1a changes its
  function's shape.

## Acceptance Criteria

- [ ] `features` takes `({ defaultFeatures }) => ...`, `admin.actions` `({ defaultActions }) => ...`, and `prepareConfigValue` runs every
  config function that runs at start (P1a.1, P1a.2).
- [ ] A text is a string, shown as written, or a function of `{ t }`, translated in the editor's
  language.
- [ ] `t` reads any namespace, `admin.translationNs` by default; without either the start stops.
- [ ] A new text key needs its type and one `prepareCmsText` call on the server, and nothing in the
  Admin.
- [ ] The response has no `translation_ns`.

## Phasing

### Phase 1 - Config values as functions

**Goal:** every config function takes one params object, and a text is a string or a function of
`{ t }`.

**Prerequisites:** Phase 1 of `sub-admin-text-translations` built.

#### 1a - One params object

**Goal:** `features` and `admin.actions` run through `prepareConfigValue` with their named defaults; the host's
header buttons work as before.

**Exit gate:** unit tests, typecheck, admin typecheck, lint and format check pass; the host's typecheck;
the user sees the page list's header buttons unchanged.

#### 1b - Texts as strings or functions

**Goal:** a text is a string or a function of `{ t }` from the config to the screen, the Admin's walk is
generic, `translation_ns` is gone, and the host's texts are functions.

**Exit gate:** unit, HTTP, typecheck, admin typecheck, lint and format checks pass; the user's
walkthrough in the host, in English and Polish.

## Implementation Plan

### Phase 1

#### 1a

1. **P1a.1 - `ConfigValue`, `DefaultsValue` and `prepareConfigValue`**
   - **Outcome:** the mechanism and the type of a key with defaults.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/config/prepare-config-value.ts` (new).
   - **Changes:** `ConfigValue<TValue, TParams, TResult = TValue>`, with the JSDoc that a key whose value
     is a function cannot take it, and `DefaultsValue<T>` in the types; `prepareConfigValue(value, params,
     where)` returns a value as it is, calls a function with the params, and turns a throw into
     `buildConfigError(\`${where} threw: <message>\`)`.
   - **Verification:** `src/lib/config/__tests__/prepare-config-value.unit.spec.ts` - a value back as it
     is, a function given the params, a throw named by its place; `yarn test:unit`, `yarn typecheck`.

2. **P1a.2 - `features` and `admin.actions` take their named defaults**
   - **Outcome:** both functions take one params object and run through `prepareConfigValue`.
   - **Areas:** `src/lib/config/types.ts` (`RichTextField.features` and `CollectionConfig.admin.actions`
     as `DefaultsValue`; the config's `richText.features` stays a list), `src/lib/field/prepare-rich-text-formatting.ts`,
     `src/lib/collection/prepare-collection-actions.ts`, their JSDoc examples, `README.md`, the tests that
     write `(defaults) =>`.
   - **Changes:** `runFeaturesFunction` and `runActionsFunction` give way to `prepareConfigValue` with
     `{ defaultFeatures }` and `{ defaultActions }`, each a copy, and the place each message names today, so the messages stay; each key's
     own check of the result stays.
   - **Verification:** `prepare-registry` unit tests for both - the function given its named defaults, the
     defaults unchanged after it, a throw's message unchanged; `yarn test:unit`, `yarn typecheck`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

3. **P1a.3 - The host on `{ defaultActions }`**
   - **Outcome:** the host's `actions` takes `({ defaultActions }) => ...`.
   - **Areas:** the host's `apps/backend/src/cms/config.ts`.
   - **Verification:** the host's typecheck; the user's look at the page list's header.

#### 1b

1. **P1b.1 - Text types and `prepareCmsText`**
   - **Outcome:** a text of the config is a string or a function of `{ t }`, prepared once at start.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/config/prepare-cms-text.ts` (new),
     `src/lib/config/describe-text.ts` (new).
   - **Changes:** `TranslationOptions`, `TranslatedText`, `CmsTranslate`, `CmsText`, `ClientText`; the
     text type parameter on `Labels`, `FieldOption`, `AreaConfig`, every layout node and
     `CollectionAction`, `CmsText` by default; every text key typed `CmsText`. `prepareCmsText` and
     `describeText` as in Proposed Solution.
   - **Verification:** `src/lib/config/__tests__/prepare-cms-text.unit.spec.ts` - a string as it is; a
     function given `{ t }`; `t` with the default namespace, with `options.ns` (`translation` included),
     with options; every refusal of the edge-case table, each naming its place;
     `describe-text.unit.spec.ts` - a text, a translation's key. `yarn test:unit`, `yarn typecheck`.

2. **P1b.2 - The registry prepares every text**
   - **Outcome:** the registry and the projection hold `ClientText`; startup errors quote it.
   - **Areas:** `src/lib/registry/prepare-registry.ts`, `src/lib/collection/prepare-collection.ts`,
     `src/lib/collection/prepare-collection-actions.ts`, `src/lib/block/prepare-block.ts`,
     `src/lib/block/prepare-block-sections.ts`, `src/lib/field/prepare-fields.ts`,
     `src/lib/area/prepare-areas.ts`, `src/lib/layout/prepare-field-sections.ts`,
     `src/lib/layout/check-field-sections.ts`, `src/lib/layout/prepare-layout-texts.ts` (new); the types
     of `src/lib/collection/types.ts`, `src/lib/block/types.ts`, `src/lib/area/types.ts`,
     `src/lib/field/types.ts`.
   - **Changes:** `prepareRegistry` hands `translationNs` to `prepareCollection` and `prepareBlock`, and
     they to `prepareFields`, `prepareAreas`, the sections and the actions. Each prepares, with
     `prepareCmsText` and a place such as `collection "page": field "title" label`: labels, a collection's
     `admin.description`, a field's label, description and listed options' labels, an area's and a
     repeater's label, a `link` action's label, and every node of the sections through
     `prepareLayoutTexts`. `validateAction` and the section checks read the prepared text and quote it
     with `describeText`. The registry's types take `ClientText`; `Field`, `ClientCollection` and
     `ClientBlock` take the text type, `string` by default.
   - **Verification:** `prepare-registry` unit tests - a function text of each kind reaches the registry
     as its translation, a string as it is, a startup error quotes a translation's key, a `link` action
     with a function label passes; `prepare-layout-texts.unit.spec.ts` - every node kind at any depth.
     `yarn test:unit`, `yarn typecheck`, `yarn typecheck:admin`.

3. **P1b.3 - The projection without `translation_ns`**
   - **Outcome:** `GET /admin/cms/collections` answers prepared texts and no `translation_ns`.
   - **Areas:** `src/workflows/cms/steps/get-cms-translation-ns.ts` and its test (removed),
     `src/workflows/index.ts`, `src/workflows/cms/workflows/list-cms-collections.ts`,
     `src/admin/hooks/api/collections/collections.ts`, `integration-tests/modules/test-content/cms-config.ts`,
     `integration-tests/http/cms/admin-cms-collections.spec.ts`.
   - **Changes:** the step and its export go; the workflow answers `{ collections, media_provider }`, its
     JSDoc two steps; `AdminCollectionsResponse<TText = string>` without `translation_ns`. The test app's
     config sets `admin: { translationNs: "cms-test" }`, gives the recipe's `servings` the label
     `({ t }) => t("recipe.servings")` and `cooked_at` the label `({ t }) => t("fields.cookedAt", { ns:
     "translation", context: "short" })`.
   - **Verification:** `admin-cms-collections.spec.ts`, from the workflow and the route: the two labels as
     their translations, `Title` as a string, no `translation_ns`. `yarn test:unit`,
     `yarn test:integration:http`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

4. **P1b.4 - The Admin's generic walk**
   - **Outcome:** the Admin translates every `translation` object of the response, wherever it sits.
   - **Areas:** `src/admin/utils/translate-collection-list.ts`, its test,
     `src/admin/hooks/use-translate-collection-list.ts`, `src/admin/cms/common/utils/label-option-values.ts`.
   - **Changes:** the walk as in Proposed Solution; the hook passes i18next's `t`; the option labels'
     util reads `FieldOption<string>`.
   - **Verification:** the walk's unit test - a translation at any depth with its namespace and options,
     a string unchanged, a layout node's and an action's own `type` untouched, the response's other keys
     kept. `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

5. **P1b.5 - The host's texts as functions**
   - **Outcome:** the host's config gives its 62 texts as functions of the `cms-content` namespace.
   - **Areas:** the host's `apps/backend/src/cms/config.ts`; `README.md`, its sections on the config's
     texts, the plugin's own texts and `admin.translationNs`.
   - **Changes:** a local `text(key)` helper and every text through it; the translations' JSON stay.
   - **Verification:** the host's typecheck and lint; the user's walkthrough in English and Polish.

## Short Tracker

- `in_progress` - Phase 1 / 1a, approved by the user 2026-11-20: P1a.1 to P1a.3 built - `ConfigValue`,
  `DefaultsValue`, `prepareConfigValue`, `features` on `{ defaultFeatures }` and `admin.actions` on `{ defaultActions }`
  (user, 2026-11-20), the host on it;
  no `prepareDefaultsValue`, each caller passes its params (user, 2026-11-20). 898 unit tests,
  typecheck, admin typecheck, lint and format check pass; the host's typecheck passes but for the two
  errors of `product-variants.spec.ts` that predate this work, and its server starts. Waits for the
  user's look at the page list's header; not committed.
- `in_progress` - Phase 1 / 1b: P1b.1 to P1b.5 built (2026-11-20). Texts are `CmsText`, prepared by
  `prepareCmsText` where they enter the registry - sections through `prepareLayoutTexts`, labels through
  `prepareLabels` - and quoted by `describeText` in startup errors; `translationNs` is a parameter of
  each `prepare*` that holds texts. The registry's types take `ClientText`, the client's `string` by
  default; code that reads no text takes `AnyField`, server-only code `RegistryField`. The projection
  has no `translation_ns`; the Admin's walk is generic. The test app's config translates two labels;
  the host gives its 63 keys through `text()`. 914 unit tests, 187 HTTP tests, typecheck, admin
  typecheck, lint and format check pass; the host's typecheck passes but for the two errors of
  `product-variants.spec.ts` that predate this work, its lint and format check pass.
- `done` (2026-11-20) - the user's walkthrough passed: every text of the host's config translated in the
  Admin. Phase 1's exit gate is met.
