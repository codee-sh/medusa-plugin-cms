# Admin Extension Registry and Option Hooks

**Date:** 2026-11-12
**Status:** done 2026-11-13 - approved by the user 2026-11-12, closed with phase 1
**Area:** admin | backend
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md) (Phase 3, sub-phase 5c),
[sub-form-layout](./2026-11-11-sub-form-layout.md)

## TLDR

A host project needs a select whose choices live outside the config - products, categories, its own
records - and later a field drawn by its own component. The config reaches the Admin as JSON through
`GET /admin/cms/collections`, so it cannot carry a function or a component: it carries a **name**, and the
host registers the code under that name in its own Admin. One registry serves both uses; this sub-spec
builds it with its first use, **option hooks**: `options: { hook: "products" }` on a `combobox`, whose
options a host's React hook gets in the browser. The hook is the host's code and may read anything -
Medusa's API, the project's own routes, a constant - so the CMS adds no endpoint for options and proxies
nothing (user, 2026-11-12): `GET /admin/cms/references/:target` is not built, and the server checks only
that the value is a text.

A hook supplies data only; the CMS draws the input, so one hook serves every options input. Field
components, the second kind of entry, come in the next sub-spec, built-in ones among them (below).

The registry keeps its entries on `globalThis` under a `Symbol.for` key, because the plugin's Admin and the
host's Admin load the plugin from two different files (below). Medusa's own `defineCellRenderer` and
`defineSearchEntity` are the model: a module-level registry the host fills from a file its Admin loads at
boot.

## Decisions Taken

- **Option hooks first, field components next, one registry (user, 2026-11-12).** This sub-spec builds the
  registry and option hooks on a one-value field, with a contract that serves any options input. Field
  components follow in their own sub-spec, and hooks on the multi-value inputs with Phase 3 of
  `sub-collections-and-documents`. A hook costs a host a few lines and keeps every picker alike; a
  component can draw anything but is a whole field to write.
  - Rejected: components only (a host writes a whole picker for each source), both in this sub-spec (two
    deliverables that ship and roll back apart).
- **Built-in components a host can replace (user, 2026-11-12).** The plugin may ship field components of
  its own and exports them and their contracts, so a host can use one, feed it another source, copy and
  change it, or register something else under its name. The first is a relationship picker of the common
  kind: records
  found by search and filters on one side, the chosen ones in order on the other, with a minimum and a
  maximum, storing ids - a product found by category or tag where a plain list is too long, or a
  document of a registered collection. Specified with field components; this sub-spec only keeps the
  registry ready for it (below).
- **A hook feeds a `combobox`; a `select` only lists (user, 2026-11-12).** Each type names how the field
  behaves: `select` is a dropdown of the few options its config lists, on a text or an enum column;
  `combobox` searches its options - the ones its config lists, or a hook's, page by page, on a text
  column - and later holds several values with `multiple: true` on an array column, as a `media` field
  does; `checkboxes` shows every option at once, on an array column, for short lists. 1a first put the hook
  on `select`, which the Admin drew as a combobox; it moved before any release, and the host's field with
  it.
  - Rejected: `multiselect` as a type of its own (a combobox of several values is the same input).
- **The host maps its data to options (user, 2026-11-12).** A hook returns `{ value, label }` options; a
  host that reads the same data elsewhere keeps its own data hook and registers thin adapters, one per
  mapping, each under a name the config picks (`products` storing ids, `product-handles` storing
  handles). The mapping may be any function, and `useComboboxData` keeps searching, paging and fetching
  the stored value's label.
  - The plugin ships no options hook and no factory for one - no `createProductOptions` - on purpose: it
    gives the registry and the hook's contract, and the host decides what it reads and how (user,
    2026-11-12). The README shows a host's factory as an example only.
  - Rejected: a mapping function in the config (the config reaches the Admin as JSON); `value` and
    `label` as field paths in the config, the hook returning raw items (the CMS would take over what
    `useComboboxData` does, and a path cannot build a label from two fields).
- **No server loader for options (user, 2026-11-12).** `options` as a function of the container (main
  spec D18, Phase 3a, not built) is dropped: an options field lists its values in the config or names a
  hook. One way less to source options, no loader run on every `GET /admin/cms/collections`, and no
  membership check the server would make for one source and not the other.
- **Where a host registers (user, 2026-11-12).** The host keeps its registrations in a file of its own -
  `src/admin/cms/cms-extensions.ts` in the first host, next to its hooks in `src/admin/cms/` - and
  imports it for side effects from `src/admin/cell-renderers.tsx`, the
  file Medusa imports at boot so that registrations run (evidence below). One import line, no UI, and
  the same place Medusa's own `defineCellRenderer` is called from. Medusa 2.22.6, the latest on
  2026-11-12, loads the same files (`@medusajs/admin-vite-plugin` `dist/index.js:2155`, `:2174`), so an
  upgrade offers no dedicated file.
  - Rejected: a widget whose component renders nothing (a zone and a config for no UI), a host route
    file (registrations tied to one page's file), a `import.meta.glob` or virtual module in the plugin's
    Admin (the published Admin is bundled when the plugin is built and cannot name a host file), and a
    Vite plugin the host adds through `admin.vite` in `medusa-config.ts` (as much host code as the import
    line, plus a build hook to maintain).

## Problem

- A `select` lists its options in the config (`src/lib/config/types.ts:60-64`), so the choices are fixed
  at deploy. A field holding a product, a category or a project record cannot be a select.
- The planned answers do not fit. D18's loader function runs on the server for every
  `GET /admin/cms/collections` and returns the whole list, with no search and no pages; 5c's
  `GET /admin/cms/references/:target` makes the CMS a proxy of every API a host may want to pick from.
- A field that needs its own input has no way in: the field kinds are a closed map of the plugin
  (`src/admin/components/manager-form-fields/manager-form-field.tsx`).

## Current State and Evidence

**The CMS today**

- `src/lib/config/types.ts:60-64` - `SelectField` is `type: "select"` with `options: FieldOption[]`.
- `src/lib/field/prepare-fields.ts:70-95` - `validateSelectOptions` refuses an empty list, a repeated
  value and, on an enum column, a value its choices do not allow; `:224` copies the list into the field.
- `src/lib/field/types.ts` - the projected `Field` carries `options?: FieldOption[]`.
- `src/lib/document/build-document-schema.ts:69-72` - a select's value is `z.enum` of the option values.
- `src/admin/cms/common/utils/build-field-config.ts` - maps a field's kind to a `ManagerFormField` type
  (`select` to `select`); `src/admin/components/manager-form-fields/manager-form-field.tsx` - a closed map
  of inputs, `fields/select-field.tsx` - `Select` from `@medusajs/ui` over the projected list.
- Admin tests are unit tests of plain functions (`src/admin/**/__tests__/*.unit.spec.ts`, e.g.
  `build-field-config.unit.spec.ts`); components are checked in a host.
- Main spec D6 and D18 and `sub-collections-and-documents` "Option fields", Phase 3 and sub-phase 5c -
  loaders and the references route are specified, not built.

**Medusa's own registries (2.21.2)**

- `@medusajs/dashboard` `dist/lib.d.ts:37` `defineCellRenderer(type, def)` and `:126`
  `defineSearchEntity(name, def)`, exported from `@medusajs/dashboard/lib`; the store is a module-level
  `Map` (`dist/chunk-L6OMZR2J.mjs:84`, `:458-464`) looked up at render (`getCellRenderer`, `:440`).
- `@medusajs/admin-vite-plugin` (under `@medusajs/admin-bundler`) `dist/index.js:2146-2178` - for every
  Admin source it adds `import "<source>/cell-renderers.tsx"` and `import "<source>/search-entities.ts(x)"`
  when the file exists; `@medusajs/dashboard` `dist/app.mjs:89-90` imports both virtual modules, so the
  files run before the app renders. Widget files (`:1262`) and route files (`:1647-1654`) are imported
  statically too.
- **Inference:** a registration in any of these files runs before a CMS page renders, so a lookup at
  render finds it. 1a confirms it in a host.

**Where the plugin's Admin comes from**

- `@medusajs/utils` `dist/common/get-resolved-plugins.js:75-80` - with `srcDir` in
  `.medusa/server/medusa-plugin-options.json` (written by `yarn dev`) the plugin's Admin is `local`,
  served from `src/admin`; otherwise it is the package's `./admin` export.
- `@medusajs/medusa` `dist/loaders/admin.js:16-23` - a local Admin joins the host's sources; a package
  Admin is imported by the generated entry (`@medusajs/admin-bundler` `dist/index.js:1242-1270`).
- Lesson [yarn-dev-serves-the-plugin-admin-from-its-source](../../../lessons/yarn-dev-serves-the-plugin-admin-from-its-source.md) -
  `yarn dev` builds no Admin bundle.
- `tsconfig.json` compiles every file outside `src/admin` into `.medusa/server`, in `yarn dev` and in
  `yarn build` alike.
- **Inference:** under `yarn dev` the host cannot import the registry from the plugin's `./admin` export
  (no bundle, or a stale one), and a host import and the plugin's own Admin would be two module instances
  in any case. Hence state on `globalThis` under `Symbol.for(...)`, and a helper the host imports from a
  subpath outside `src/admin`, which the backend compiler emits in both modes. Whether the host's Vite
  serves that CommonJS file to the browser is proven in 1a.
- Lesson [a-module-file-the-admin-imports-cannot-import-node-modules](../../../lessons/a-module-file-the-admin-imports-cannot-import-node-modules.md) -
  the registry files import nothing from Node or the server.

**The shape to reuse**

- `medusa-plugin-automations` `src/admin/utils/dynamic-component.tsx` and `template.ts` - a key from the
  server, a map of `() => import(...)` loaders, loading and error states, and `form`, `name`, `errors`,
  `fields` passed to the component. Its map is a file of that plugin, so a host cannot add to it; the
  registry here can be added to. A hook cannot be loaded lazily (a component's hooks must be the same on
  every render), so option hooks are registered as functions; lazy loading returns with field components.
- `@medusajs/dashboard` `dist/components.d.ts:226-247` - `Combobox` takes `options`, `searchValue`,
  `onSearchValueChange`, `fetchNextPage`, `isFetchingNextPage`; `dist/hooks.d.ts:3142-3200` -
  `useComboboxData` returns those same keys, holds the search text itself, and fetches the label of its
  `defaultValue`.

## Target Behavior

- A host writes `options: { hook: "products" }` on a `combobox` field and registers a hook under that name
  in its Admin. The Admin renders the field as a searchable `Combobox` with the hook's options, more on
  scroll when the hook pages, and the stored value's label.
- The server checks a hook-fed combobox's value as a text only; it never calls the hook or Medusa's API for
  it. A static list keeps its check against its values. The store API returns the stored value, as for
  any select.
- A hook-fed combobox needs a text column; the registry refuses one on an enum column, whose values a static
  list states.
- A field whose hook name no one registered is disabled and says which name is missing; the form, its
  other fields and the save keep working. A hook that reports an error, or throws, does the same for its
  field only (1b).
- The plugin names no host source and imports nothing from a host project.

## Proposed Solution

### Registry

`src/admin-extensions/`, outside `src/admin` so that the backend compiler emits it in both modes, and
exported as `@codee-sh/medusa-plugin-content-cms/admin-extensions`:

| File | Holds |
|---|---|
| `types.ts` | `CmsOptionsHook`, `CmsOptionsHookInput`, `CmsOptionsHookResult` |
| `registry.ts` | the store, `globalThis[Symbol.for("@codee-sh/medusa-plugin-content-cms/admin-extensions")]`, created on first use as `{ optionsHooks: Map }`; `defineCmsOptionsHook(name, useOptions)` and `getCmsOptionsHook(name)` |
| `index.ts` | `defineCmsOptionsHook` and the types - what a host uses |

- A second registration of a name replaces the first, as `defineCellRenderer` does.
- The store keeps one map per kind of entry, so field components add `components` beside `optionsHooks`
  without touching it. When the plugin ships built-in entries, a lookup reads the host's entry first and
  the built-in under the same name second, so a host replaces a built-in by registering its name, in any
  order of evaluation. Nothing built-in is registered by this sub-spec.
- The plugin's Admin imports `getCmsOptionsHook` by a relative path; the host imports the subpath. Two
  module instances, one store.

### Hook contract

```ts
type CmsOptionsHookInput = {
  /** The stored value, so that the hook can fetch its label; `null` when empty. */
  value: string | null
}

type CmsOptionsHookResult = {
  options: { value: string; label: string }[]
  isPending: boolean
  isError: boolean
  /** With search: the text typed and its setter, as `useComboboxData` returns them. */
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  /** With pages: the next page, loaded when the list is scrolled to its end. */
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
}

type CmsOptionsHook = (input: CmsOptionsHookInput) => CmsOptionsHookResult
```

`useComboboxData`'s result fits as it is - an inference from its declared return type, proven by the
host's hook in P1a.4, which returns it unchanged and typechecks; a hook without search or pages returns
`options` and the two flags. A multi-value input will pass `value: string[]`, a change made with Phase 3, additive.

### Config and server

- `ComboboxField` (`type: "combobox"`, `options: FieldOption[] | OptionsHookSource`) beside
  `SelectField`, whose `options` stay a list; `OptionsHookSource = { hook: string }` is exported from the
  package root with the other config types.
- `validateFieldOptions` (`src/lib/field/prepare-fields.ts`) checks a select's and a combobox's listed
  options as a select's were; a hook needs `type: "combobox"`, a non-empty name and a column without enum
  choices.
- The projected `Field.options` carries the list or `{ hook }`; `buildDocumentSchema` checks a hook-fed
  combobox with `z.string()` and a listed one with `z.enum`, as a select.

### Admin

- The toolkit gains a `combobox` type: `fields/combobox-field.tsx` renders the dashboard's `Combobox`
  over the options its config lists, which the `Combobox` searches itself, or from the result of the
  hook its config passes (`optionsHook`), and a disabled `Combobox` with the toolkit's own text naming
  `optionsSource` when a source is named and no hook is passed. The toolkit stays unaware of the
  registry and the CMS (main spec D31): it declares its own `OptionsHook` type, the same shape as
  `CmsOptionsHook`, so that nothing in `src/admin/components/` imports from `src/admin-extensions/`.
- `buildFieldConfig` gives a combobox with `options.hook` an `optionsSource` set to the hook's name and `optionsHook` to what `getCmsOptionsHook` finds, `undefined` when nothing is
  registered.
- The field component is keyed by the hook name, so its hook calls never change between renders.

### Alternatives Considered

- **`GET /admin/cms/references/:target`** - the CMS proxies every source. Rejected (user, 2026-11-12).
- **A loader function on the server (D18)** - dropped, see Decisions Taken.
- **The registry imported from the plugin's `./admin` export** - absent under `yarn dev`, and a second
  module instance next to the plugin's own Admin. Rejected on the evidence above.
- **The registry in `src/lib`, under the package root** - the root carries server code (the media
  provider, Zod), which the host's Admin bundle would take in. Rejected for a subpath of its own.
- **Plan B, if 1a's proof fails: a declarative source in the config** - `path`, `list`, `value`, `label`,
  `search`, fetched by the plugin with `sdk.client.fetch`. Plain data, no registration, but only APIs of
  one shape and no host code.

## Data Model and Persistence

None. A hook-fed combobox stores its value in its text column, as a static one does.

## Contracts

- **New subpath** `./admin-extensions` in `package.json` `exports`, pointing at
  `./.medusa/server/src/admin-extensions/index.js`: `defineCmsOptionsHook` and the three hook types.
  Additive: a minor version, with a changeset.
- **Config:** a new field type, `combobox`, whose `options` take a list or `{ hook }`. Additive.
- **Projection:** `GET /admin/cms/collections` carries `options: { hook }` on a hook-fed combobox. Additive;
  only the plugin's Admin reads it.
- **Writes:** a hook-fed combobox accepts any text and `null`; a non-text answers 400 at its path.
- **Store API:** unchanged.

## UI/UX

- A hook-fed combobox is a `Combobox`: typing searches when the hook has search, scrolling to the end loads
  more when it has pages, and the chosen option's label shows.
- With no hook under its name, the field is disabled with the text `Options unavailable: no source named
  "{{name}}" is registered`, so the host developer sees the name to register. It is the toolkit's copy,
  `managerFormFields.combobox.unavailable` in `src/admin/i18n/json/en.json` (main spec D31);
  `codee-ui-copy` checks the wording in P1a.3.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A config names a hook no one registered | The field is disabled with the missing name; the rest of the form saves | `build-field-config` unit test; host walkthrough |
| A host registers a name twice | The later registration is used | registry unit test |
| The plugin's Admin and the host import the registry as two modules | One store, both see each entry | registry unit test with two isolated module instances; host walkthrough under `yarn dev` and from a build |
| A hook-fed combobox on an enum column | The registry refuses the config, naming the field | `prepare-registry` unit test |
| An empty hook name | The registry refuses the config | `prepare-registry` unit test |
| A write sends a number for a hook-fed combobox | 400 at the field's path | `build-document-schema` unit test |
| A stored value the hook does not list | The `Combobox` shows no label for it; handled in 1b | 1b |
| A hook reports an error, or throws | Handled in 1b; until then a throw reaches the page's error boundary | 1b |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| The host's Admin cannot import the CommonJS subpath - Vite's dev server pre-bundles it with esbuild, a production `medusa build` goes through Rollup's CommonJS handling, so one can work and the other fail | high | admin | Proven in 1a (P1a.4) in both: the host's `medusa develop` with the plugin under `yarn dev` and built, and the host's `medusa build`; plan B if not | Known after 1a |
| Medusa stops importing `cell-renderers.tsx` at boot | medium | admin | The README names the file and why; an unregistered name shows in the field, not as a crash | One release until the README changes |
| A hook breaks the rules of hooks (calls a hook conditionally) | low | admin | The component is keyed by the hook name; the README shows a hook built on `useComboboxData` | Host code |
| A value no source lists is saved (the server checks only the type) | low | content | Decided by the user: the hook's source owns its values | A stale id after the record is deleted |

**Rollout:** additive - a new subpath, a widened config type, a new toolkit input. A host without hooks sees
no change.

**Rollback:** revert the commits; a host that registered hooks removes `options: { hook }` from its config
and the import from `cell-renderers.tsx`. Stored values stay in their text columns.

## Dependencies

- `sub-form-layout` - closed 2026-11-12; its toolkit of `ManagerFormField` inputs is what P1a.3 extends.
- A host project with `yarn dev` linked through yalc, for P1a.4.

## Effect on Other Specs

Main spec D6 and D18 and Phase 3 of `sub-collections-and-documents` were applied on 2026-11-12, with the
`combobox` type; 5c's references route was removed by 1c on 2026-11-13.

- Main spec D6 and D18 - names in the config, code in the host's Admin; the server loader dropped.
- `sub-collections-and-documents` Phase 3 - an options field lists its values or names a hook; no
  `prepareFieldOptions`, no `options_error`; hooks on the multi-value inputs follow this registry. 5c
  loses the references route: a relation to a registered collection searches through
  `GET /admin/cms/collections/:collection/documents`, which already takes `q`, and a commerce reference is
  an option hook.

## Acceptance Criteria

- [ ] **1a** A host registers a hook in `cms-extensions.ts`, imported from `cell-renderers.tsx`, and a
      combobox with `options: { hook }` shows its options and saves a value, under `yarn dev` and from a
      built package.
- [ ] **1a** An unregistered name disables its field and names it; the form saves the other fields.
- [ ] **1a** A hook-fed combobox on an enum column, or with an empty name, fails the config; a non-text
      value answers 400.
- [ ] **1b** Search, pages and a stored value outside the list work; a failing hook affects its field only.
- [ ] **1c** The README's hook example runs in a host; the main spec and `sub-collections-and-documents`
      carry the effects above.

## Phasing

### Phase 1 - Option hooks

**Goal:** a combobox whose options come from a host's hook.

**Prerequisites:** see Dependencies.

| Sub-phase | Goal | Exit gate |
|---|---|---|
| **1a A combobox fed by a host hook** | The registry and its subpath, `{ hook }` in the config, the registry rule, the type-only check, the `combobox` input and the missing-name state | The criteria of 1a, checked by the user in a host; unit tests, typecheck, admin typecheck, lint and format check pass. A failed proof stops the sub-spec for plan B. |
| **1b Errors and unknown values** | A hook's `isError`, a throwing hook behind an error boundary of its own, a stored value the options lack shown as `Unknown value: <value>` | Each failure shown on its field only, in a host |
| **1c README and spec sync** | A products hook on `useComboboxData` in the README; the effects on other specs applied | The README example runs in a host |

## Implementation Plan

### Sub-phase 1a

1. **P1a.1 - The registry and its subpath**
   - **Outcome:** `defineCmsOptionsHook` and `getCmsOptionsHook` over one store on `globalThis`, importable
     as `@codee-sh/medusa-plugin-content-cms/admin-extensions`.
   - **Areas:** `src/admin-extensions/` (`types.ts`, `registry.ts`, `index.ts`), `package.json` `exports`.
   - **Changes:** as in "Registry"; no React import (the types are plain functions); JSDoc on each export.
   - **Verification:** `src/admin-extensions/__tests__/registry.unit.spec.ts` - a defined hook is found, a
     second definition replaces it, an unknown name is `undefined`, and a hook defined through one module
     instance is found through another (`jest.isolateModules`); each test deletes the store's
     `globalThis` key afterwards, so none sees another's entries; `yarn test:unit`, `yarn typecheck`,
     `yarn lint`, `yarn format:check`.

2. **P1a.2 - A hook-fed select in the config, the registry and the schema**
   - **Outcome:** `options: { hook }` passes `validateConfig`, reaches the projection, and a write checks
     its value as a text.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/index.ts`, `src/lib/field/prepare-fields.ts`,
     `src/lib/field/types.ts`, `src/lib/document/build-document-schema.ts`.
   - **Changes:** `OptionsHookSource` and the widened `SelectField.options`; `validateSelectOptions`
     branches on it (non-empty name, no enum choices); `Field.options` widened; `z.string()` for a hook.
     A `.changeset/` entry, minor: the `./admin-extensions` subpath and `options: { hook }`.
   - **Verification:** unit tests in `src/lib/registry/__tests__/prepare-registry.unit.spec.ts` (accepted on
     a text column, refused on an enum column and with an empty name, `{ hook }` in the prepared field) and
     the `build-document-schema` test (any text passes, a number fails); `yarn test:unit`, `yarn typecheck`,
     `yarn lint`, `yarn format:check`.

3. **P1a.3 - The `combobox` input and its lookup**
   - **Outcome:** the Admin renders a hook-fed select as a `Combobox` over the hook's result, or disabled
     with the missing name.
   - **Areas:** `src/admin/components/manager-form-fields/` (`fields/combobox-field.tsx`, the input map,
     the config type with `OptionsHook`), `src/admin/i18n/json/en.json`,
     `src/admin/cms/common/utils/build-field-config.ts`.
   - **Changes:** as in "Admin"; the missing-name text checked with `codee-ui-copy`.
   - **Verification:** `build-field-config.unit.spec.ts` - a registered hook gives `combobox` with that
     hook and its name, a missing one gives the name and no hook, a static select is unchanged; the test
     deletes the store's `globalThis` key after each case; `yarn test:unit`, `yarn typecheck:admin`,
     `yarn lint` (the toolkit's import rule included), `yarn format:check`.

4. **P1a.4 - Proof in a host**
   - **Outcome:** the three proofs - registration before render, one store across the two module
     instances, the missing-name state - in a real host.
   - **Areas:** the host project, through yalc: `src/admin/cms-extensions.ts`, `src/admin/cell-renderers.tsx`,
     one select with `options: { hook }` in its CMS config. Written in the host by the user, or by the
     agent when the user asks.
   - **Changes:** none in the plugin unless a proof fails.
   - **Verification:** the user's walkthrough in the host's `medusa develop` under the plugin's
     `yarn dev`, then with `yarn dev` stopped after `yarn build` and `yalc publish --push` (the lesson
     above), and last the host's own `medusa build` with its Admin served by `medusa start`: each time,
     options shown, a value saved and shown after a reload, a renamed hook showing its missing name. The
     host's typecheck passes with the hook returning `useComboboxData`'s result unchanged. A failure is
     recorded here, and the sub-spec turns to plan B.

### Sub-phase 1b

What the dashboard gives (`@medusajs/dashboard` 2.21.2, `useComboboxData`): the stored value's record is
fetched by a query of its own and put among the options only once it arrives and while nothing is typed;
the hook's result carries no state of that query. A `Combobox` shows nothing for a value no option holds.

1. **P1b.1 - A stored value the options lack**
   - **Outcome:** the field shows its stored value instead of an empty input. A listed set reads
     `Unknown value: <value>`, known at once, and the editor can clear it; a save keeping it answers 400
     at its path, as today. A hook's field shows the raw value as its label until the hook's options hold
     it - its own record arrives later, and the hook does not say when - so a deleted product stays
     visible by its id and can be replaced.
   - **Areas:** `src/admin/components/manager-form-fields/fields/utils/with-stored-options.ts` (new),
     `fields/combobox-field.tsx`, `src/admin/i18n/json/en.json` (`managerFormFields.combobox.unknownValue`).
   - **Changes:** `withStoredOptions(options, stored, labelOf)` (built after 3a, so over a list of held
     values) returns the options with every held value no option has first, labelled by `labelOf`, and
     the options unchanged otherwise; `ComboboxField` applies it to a listed set with the translated text, and to a hook's
     options with the raw value while the search text is empty; `allowClear` on both comboboxes. The text
     checked with `codee-ui-copy`.
   - **Verification:** `fields/utils/__tests__/with-stored-options.unit.spec.ts` - added when missing,
     not when present, not without a value, first in the list; `yarn test:unit`, `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`.

2. **P1b.2 - A hook that fails, and one that throws**
   - **Outcome:** a hook reporting `isError`, or throwing while it renders, leaves its field disabled with
     the stored value shown and `Could not load the options`; the form, its other fields and the save
     keep working, and the stored value is sent unchanged.
   - **Areas:** `fields/combobox-field.tsx`, `fields/options-error-boundary.tsx` (new), `en.json`
     (`managerFormFields.combobox.loadFailed`).
   - **Changes:** `HookCombobox` renders the disabled state when the hook's result has `isError`;
     `OptionsErrorBoundary`, a class component (React has no hook for it), wraps `HookCombobox`, renders
     the same state on a thrown error and logs it once with `console.error` and the source's name; it is
     keyed by the source, so a fixed registration after a reload mounts it afresh.
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; the behaviour is the
     host walkthrough of P1b.3, as the toolkit's tests cover plain functions only.

3. **P1b.3 - Proof in a host**
   - **Outcome:** each case seen on its field only.
   - **Areas:** the host, temporarily: two registrations in `src/admin/cms/cms-extensions.ts` - one
     returning `{ options: [], isPending: false, isError: true }`, one throwing - and the image and text
     block's `product_id` pointed at each in turn; a page whose block stores an id the products lack.
     Reverted after the walkthrough.
   - **Verification:** the user's walkthrough under `yarn dev`: the failing and the throwing source each
     show `Could not load the options` and the block still saves; the stored unknown id shows and can be
     cleared; the other fields are untouched.

**Exit gate:** P1b.1 to P1b.3 done; unit tests, admin typecheck, lint and format check pass.

### Sub-phase 1c

1. **P1c.1 - The README**
   - **Outcome:** a host can add an options hook from the README alone.
   - **Areas:** `README.md`.
   - **Changes:** a section on a field's config by where each key works (main spec D33), one on the
     fields that pick from options (`select`, `combobox`, `multiple`, `max`), and one on options from a
     hook: `defineCmsOptionsHook`, the import from `src/admin/cell-renderers.tsx`, a hook on
     `useComboboxData`, the hook's contract, a second mapping by handle with its params type, what the
     server checks, and what a field shows when its source is missing, fails or lacks a held value.
   - **Verification:** read against the host's working files (`src/admin/cms/`, `cell-renderers.tsx`).

2. **P1c.2 - The other specs**
   - **Outcome:** no spec plans the references route.
   - **Areas:** `sub-collections-and-documents`: the `Config` and `ReferenceTarget` rows, `relationTo`,
     the model mapping table, the `list-cms-references` workflow, the route row and its contract note,
     the Admin's relation picker, sub-phase 5c, the tracker.
   - **Changes:** the route and its workflow removed; a relation picker searches the target collection
     through `GET /admin/cms/collections/:collection/documents`; a commerce reference is a combobox fed
     by a hook.
   - **Verification:** a search of the active specs finds the route only among the main spec's rejected
     alternatives.

## Short Tracker

- `done` - `codee-spec-writing` checklist and `codee-spec-review-medusa` review, in the same session,
  not by an independent reviewer (2026-11-12): four Medium and two Low findings fixed in the spec.
- `done` - The user's approval (2026-11-12).
- `done` - P1a.1: `src/admin-extensions/` (`types.ts`, `registry.ts` with a `Map` per kind, `index.ts`)
  and the `./admin-extensions` export; four registry tests, two module copies sharing one store among
  them.
- `done` - P1a.2: `OptionsHookSource`, `validateOptionsHook` in `prepare-fields.ts`, `z.string()` for a
  hook-fed select, and `isOptionsHookSource` (`src/lib/field/is-options-hook-source.ts`), which the
  registry, the schema and the Admin's `buildFieldConfig` share; a minor changeset.
- `done` - P1a.3: the toolkit's `combobox` type, `OptionsHook` and `ComboboxField`, the
  `managerFormFields.combobox.unavailable` text, and `buildFieldConfig`'s lookup. All 430 unit tests,
  typecheck, admin typecheck, lint and format check pass (2026-11-12). Not committed.
- `done` - P1a.4: the proof in a host, the user's walkthrough in the three modes. Host code
  written at the user's request (2026-11-12): `src/admin/cms/use-product-options.ts` on
  `useComboboxData`, `src/admin/cms/cms-extensions.ts`, `src/admin/cell-renderers.tsx`, and `product_id` on the image and text block, its migration
  generated and run by the user. The host's admin `tsc` accepts `useComboboxData`'s result as a
  `CmsOptionsHook` unchanged. Under `yarn dev`: an unregistered name (`productz`) disables the field and
  names it, the rest of the block intact (user's screenshot, 2026-11-12); with `products`, the products
  are offered and a chosen one is saved (user, 2026-11-12). `yarn dev` mode passed. The host's
  `medusa build`, started as Medusa's docs describe, takes the plugin's built Admin package and works
  (user, 2026-11-12): its bundle holds two copies of the registry, the plugin's and the host's import,
  sharing the one `globalThis` key, so the built plugin and the production build are proven together.
  Its CMS form is unstyled in places - every panel of a tab shown, groups flat - because the build took
  its CSS from a stale root copy of the plugin; a local tooling gap, not the registry's, recorded in the
  host as the lesson `a-local-admin-build-styles-a-yalc-plugin-from-the-root-copy`.
- `done` - The hook moved from `select` to a new `combobox` type (user, 2026-11-12): `ComboboxField`,
  `validateFieldOptions` refusing a hook on a select, `combobox` in `FieldKind`, the schema and
  `buildFieldConfig`, and `ComboboxField` over listed options too; the host's `product_id` became a
  combobox. In the host, `use-product-options.ts` became `createProductOptions({ fields, toOption, valueKey? })`
  in `src/admin/cms/create-product-options.ts`: one registration per mapping, `valueKey` both the stored
  product field and the list filter `useComboboxData` finds the stored product by (`id`, `handle`). The
  steps above keep the names they were built with. All 434 unit tests, typecheck, admin
  typecheck, lint and format check pass; the host's config test passes against a `yarn build` of the
  plugin pushed with yalc (2026-11-12). Not committed.
- `done` - The combobox and `createProductOptions({ fields, toOption })` checked by the user in the host
  (2026-11-12).
- `done` - P1b.1 and P1b.2 (2026-11-13), built after 3a, so for one value and several alike:
  `withStoredOptions` puts every held value no option has first - `Unknown value: <value>` over a listed
  set, the raw value over a hook's while nothing is typed - and `allowClear`; `UnavailableCombobox`,
  disabled with the held values shown and the reason under it, serves a missing source, a hook's
  `isError` and a thrown hook behind `OptionsErrorBoundary`. The missing-source state shows the held
  value too, where 1a showed an empty input. All 455 unit tests, typecheck, admin typecheck, lint and
  format check pass. Not committed.
- `done` - The toolkit's `fields/` moved to a folder per field (user, 2026-11-13), committed alone as a
  rename: the combobox's files are in `fields/combobox-field/`, its error boundary and `utils/` with it.
  The steps above keep the paths they were built with.
- `done` - P1b.3: with the host's temporary `products-failing` on `product_id` and `products-throwing`
  on `product_ids`, each field is disabled, shows its held ids - one as text, three as chips - and
  `Could not load the options`, the rest of the block intact (user's screenshot, 2026-11-13). The
  temporary registrations and config are reverted. Sub-phase 1b done.
- `done` - Sub-phase 1c (2026-11-13): the README's sections on a field's config, the fields that pick
  from options and options from a hook; the references route, its workflow and `ReferenceTarget` removed
  from `sub-collections-and-documents`, whose 5c picks a relation through the documents route. Not
  committed. Phase 1 is done; the spec can close once the user agrees.
- `done` - Closed (user, 2026-11-13): moved to `cms/ended/`. Field components follow as a sub-spec of
  their own.
- `done` - The last checks of 1b, by the user in the host (2026-11-13): a block saved while its sources
  fail keeps the held values; the chips of a disabled combobox remove nothing. With them, the fix of the
  block card's second line above a section that opens it (`6ce187c`) is confirmed.
