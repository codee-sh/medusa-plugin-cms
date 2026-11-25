# Admin Field Components

**Date:** 2026-11-13
**Status:** done 2026-11-16 - approved by the user 2026-11-13, closed with 1g
**Area:** admin | backend
**Related:** [main-spec](../2026-11-04-main-spec.md),
[sub-admin-extension-registry](./2026-11-12-sub-admin-extension-registry.md) (the registry this
builds on), [sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

## TLDR

A host needs a field the CMS cannot draw: a product picked after a category, a picker with filters, two
lists where the second depends on the first. Option hooks give a field its options; they do not let a
host build the input. This sub-spec adds the registry's second kind of entry, **field components**: a
layout node names a component as `{ type: "component", component: "product-picker", fields }`, the host
registers a React component under that name, and the CMS renders it in place of the inputs of the fields
the node lists. Inside it everything is
the host's - as many comboboxes, nested choices and conditions as it wants, data fetched however it likes
(user, 2026-11-13). Out of it comes one value, written into the field the component belongs to.

The field's `type` still decides what is saved and what the server checks (main spec D33): a component is
an editor of a `text`, `text_list`, `combobox` or other value, never a new kind of data. The CMS keeps
drawing the label, the description and the error, so every field looks alike whoever wrote its input.

Later sub-phases widen it (user, 2026-11-14): whether a field must be filled taken from its Zod
schemas, the Admin marking a field required to publish (1b), a component loaded when a form first shows it (1c), a
component owning several fields and drawing them all (1d), a hook reading the whole document, never
writing it (1e), and a rule over a model's own fields, run on the server (1f).

## Decisions Taken

- **Field components are the registry's second kind of entry (user, 2026-11-13).** Independent of option
  hooks: a component fetches its data however it wants and writes its value into its field. The
  relationship picker needs no place of its own: a host builds it as a component, or the plugin ships one
  later. The note's "built-in sources" question is gone with it.
- **The config names the component under `admin` (user, 2026-11-13).** `admin: { component: "<name>" }`:
  a component changes how a field is edited, never what a save accepts, which is what `admin` holds
  (main spec D33). Superseded on 2026-11-14 by the layout node below: `admin.component` leaves the
  config, built in 1a, removed in 1d.
- **A component reads the whole document and writes only its own fields (user, 2026-11-14).** It gets
  its own value - or, owning several fields, their values - and hands back one value per field it owns;
  every condition, nesting and dependency between choices lives inside it. So the config gains no
  conditions or nested structures, and the server checks each value by its field's type, as for any
  field, and anything can be built.
  - Reading, sub-phase 1e: `useDocumentValue(selector)`, imported from `admin-extensions`, gives
    whatever the selector picks from the document - its fields, and its areas with their blocks - and
    renders the component again when that pick changes; `useBlockPlace()` gives a component in a block
    its block's place (user, 2026-11-14). Both work in any component inside a CMS document form, a
    field component's own children included.
    - They read React contexts the plugin's Admin provides - `DocumentFormProvider` a document source
      (`subscribe`, `getDocument`), `BlockCard` the place - kept in the registry's store on
      `globalThis`, so every copy of `admin-extensions` gets the same context object. React is one file
      for `require` and `import`, so its copy is one.
    - The hooks import nothing of `react-hook-form`: it ships one file for `require`
      (`dist/index.cjs.js`) and another for `import` (`dist/index.esm.mjs`), and `admin-extensions`
      reaches a host as CommonJS, so a `useFormContext` there would meet a copy that sees no form.
    - Rejected: the hook handed in a component's props, which reaches a field component only and its
      children through props (user, 2026-11-14).
  - The document a component reads is shaped for components, not as the form holds it (user,
    2026-11-14): `{ fields, areas }`, each block `{ type, fields, areas }`. One function of the plugin
    turns the form's values into it, so the form's paths - `document.<field>`,
    `document.<area>.<index>.<field>` - stay the plugin's and may change without breaking a host.
    Rejected: the host reading the form with `useWatch` by those paths, which made them a public
    contract that no typecheck guards: a changed path reads `undefined` and a condition stops
    working silently (user, 2026-11-14).
  - The shape is recursive from the start (user, 2026-11-14): a block's `areas` hold blocks as a
    document's do, empty until a block's repeaters come (main spec D32), so they add data and change no
    type. Rejected: a flat shape now, widened later, which breaks a host typed against it.
  - A block's place is a path from the document down, one `{ area, index }` per level (user,
    2026-11-14): `[{ area: "sections", index: 2 }]`, and a block in a repeater adds its own entry.
    Rejected: one `{ area, index }`, which names a top-level block only.
  - Rejected: writing to a field the component does not own, through a `dispatch` handed to it. The
    config would no longer show what a component changes, and two components could
    overwrite one field with no rule of which wins (user, 2026-11-14).
  - Rejected: conditions in the config, declarative or named. A component that owns the fields shows
    and hides them, and decides what a hidden field holds (user, 2026-11-13).
- **A component is attached by a layout node only, to one field or several (user, 2026-11-14), in
  sub-phase 1d.** One way for every case: `{ type: "component", component, fields, label?, description? }`
  in a section, a tab, a collapsible or a group, in place of the fields it edits; a node of one field
  looks like a field, so it stands where a field does (analysis of the host's config, 2026-11-14). `admin.component` on a field
  leaves the config, its validator and the projection's `component` with it; the host's picker moves to
  a node.
  - `fields` names the fields two ways. A list, `["category_id", "product_id"]`, hands each field under
    its own name, for a component written for those fields. An object, `{ color: "brand_color" }`, hands
    each field under the component's own key, for a component used for fields of different names. The
    component reads every value by an explicit key, typed with `CmsFieldComponentProps<"color">`; no
    `names` prop is needed, and none is given. Rejected: `names`, which made a reusable component read
    its field by position; designed now, as a reusable component will come (user, 2026-11-14).
  - A node of one field looks like the field: the CMS draws its label, description and error around the
    component, as `admin.component` did, and the node's `label` is not used. A node of several fields
    draws a header only when it has a `label`, and the component draws every input, label and error of
    its fields itself; the plugin offers no helper that draws a field of its own inside it.
  - A component draws its fields with Medusa's own form parts, as any dashboard form does: `Form.Field`
    from `@medusajs/dashboard/components` named by `inputProps[key].name`, with `Form.Item`,
    `Form.Label`, `Form.Control` and `Form.ErrorMessage` around an input of `@medusajs/ui` (user,
    2026-11-14). The CMS's forms sit in the dashboard's `Form`, and the dashboard and `react-hook-form`
    are one copy for the host and the plugin, so `Form.Field` reaches the form. The plugin wraps none of
    it. Rejected: a `CmsField` exported from `admin-extensions`, which `yarn dev` cannot compile with
    JSX or the toolkit and so needs a renderer registered at runtime, and a `Field` handed in the
    component's props - both a layer of the plugin's own over what Medusa already gives.
  - Every component gets the same props, by key: `values`, `onChange(key, value)`, `onBlur(key)`,
    `fields` with each one's config, `errors` with each one's message, `inputProps` (`id`, `name`,
    `aria-describedby`, `aria-invalid`, `ref`), `disabled`, and the reading hook of 1e. The plugin turns
    a key into its field: `onChange("color", ...)` writes `brand_color`, and its error reaches
    `errors.color`. The 1a contract, unreleased, changes to it.
  - One definer and one registry, `defineCmsFieldComponent`, a component or a loader. Rejected: a second
    definer, `defineCmsFieldsComponent`, whose name differs by one letter from the first (user,
    2026-11-14).
  - The registry refuses a node with no field, a key or a field named twice, a field not of the model, a
    slug or a media field - their inputs carry behaviour the CMS owns - a unique field, whose value the
    Admin checks against the live documents as the editor types, and a node in a row or another node. A
    field sits in a layout once, so it has one owner.
  - A hidden required field is not refused: the component gets every owned field's error and shows it,
    and the README says so.
  - A node stays whole in a form that shows any of its fields, and the create form, which shows the
    required fields only, adds the node's other fields to them, so a component always gets every field
    it edits (analysis of the code, 2026-11-14).
  - The plugin binds each field with react-hook-form: a node of one field through the field's own
    `Form.Field`, a node of several with `useController`, through a component per field that hands the
    rest to the next, so no hook runs in a loop. The host's component gets plain props, never the form
    (user, 2026-11-14). `FormLayout` takes a renderer of a node from the CMS, as it takes `renderItem`,
    since the toolkit imports nothing of the CMS (main spec D31).

  Model cases: a category and a product picker over two fields; a button link and its "open in a new tab"
  switch, drawn by one component, the switch shown for any link, an internal one included (user,
  2026-11-14); a color picker used for fields of different names.
- **A field's schemas say whether it must be filled (user, 2026-11-14), in sub-phase 1b.** One
  mechanism for every rule of a value: `required` leaves a field's config (main spec D33, amended).
  - `serverValidation` runs on every save, an empty value included: a schema that refuses `null` makes
    the field required, `.nullish()` lets it stay empty - `z.string().min(3)` for a title,
    `z.string().max(70).nullish()` for an SEO title. `serverPublishValidation` runs besides it at a
    publish only, as `required: "publish"` did: `z.string()` on a slug.
  - Every kind of field takes the two schemas, as `required` reached every kind: a select, a single
    combobox or media `z.string()`, a list `z.array(z.string())`, a boolean `z.boolean()`, a date
    `z.string()` or `z.iso.datetime()` (analysis of the code, 2026-11-14). The plugin still checks a
    value's type, options and format first, so a schema gets a value of the field's type or `null`: an
    empty value - missing, `null`, `""`, `[]` - reaches it as `null`, which is what the registry asks
    about, and a date as its ISO text, as `z.date()` has no JSON Schema for the registry's type check. An empty value a schema refuses shows `Required`, in the Admin and on the server alike, as
    Zod's own message for `null` - `expected string, received null` - is no message for an editor. The
    plugin parses an empty value with `Required` as the parse's message, which a message the host puts
    on the schema overrides (user, 2026-11-14): `z.string({ error: "Add a title" })`. The Admin, which
    has no schemas, shows `Required` until the live validation answers with the host's message. A
    filled value keeps the schema's messages, as today. A field with no schema may stay empty.
  - The registry works out the word by asking each schema whether `null` passes, and the projection
    carries `required: "always" | "publish"`, absent for a field that may stay empty. The Admin reads
    it as before: its schema checks an empty required field at once, the label shows `(Optional)` for
    a field that may stay empty, `(Required to publish)` for `"publish"`, nothing for `"always"`, and a
    checkbox or a switch shows neither; a component gets the same words in `field.required`.
  - A column the database requires still needs a field required at every save: the registry refuses a
    `serverValidation` that lets `null` through on it, or none.
  - A format rule without `.nullish()` makes a field required; the Admin's label shows it, and the
    README says so.
  - The registry's type check of a schema reads its JSON Schema type, and reads `anyOf` with `null`,
    which `.nullish()` gives, as the type beside it.
  - A model's schemas sit in one record: per field `{ save?, publish? }`, and the model's own rules of
    1f beside them, in place of today's `validation` and `blockValidation` maps and the publish maps
    they would have gained.
  - Not released yet - the package is at 0.0.1 and unpublished, with every changeset pending - so the
    config and the 1a contract change without breaking anyone; the host's config moves in P1b.4.
- **Registered directly or lazily (user, 2026-11-13; settled 2026-11-14), in sub-phase 1c.**
  `defineCmsFieldComponent(name, Component)`, or `defineCmsFieldComponent(name, { load })` for a heavy
  component, loaded when a form first shows it. `load` resolves to a module with the component as its
  default export, as `React.lazy` takes it: `() => import("./picker")`, or with
  `.then((module) => ({ default: module.Picker }))` for a named export. A lazy entry sits in a map of its
  own, so an older copy of the module sees no component rather than a loader it would render. While it
  loads, the field shows its stored value disabled with `Loading`; a load that fails is caught
  by the field's error boundary. A node's component of 1d is registered the same two ways.
  - Both ways stay, and the loader is the default the README and the JSDoc show first; a component
    given as it is suits a small one, which a loader would show `Loading` for while
    `React.lazy` suspends its first render (user, 2026-11-14). Rejected: a loader only.
- **Each model may check its own fields together (user, 2026-11-14), in sub-phase 1f.** A collection and
  a block type take the field's two keys: `serverValidation`, a Zod schema run on every save, and
  `serverPublishValidation`, run besides it at a publish only. Each runs on the values of the model's
  own fields - a block's only, never the document's or another block's - once each field passed its own
  checks. An issue's path names a field, and the plugin turns it into the document's path of that
  field, under its block for a block's rule, so the error lands at the field, in its tab's count and in
  a component's `errors`. The rules are synchronous and read no data: Query and module services run in
  steps only. They run in `validate-cms-document`: a save and the live validation run `serverValidation`,
  a publish both. A condition a component shows a field under and a rule that requires the field then
  are kept in one function of the host, used by both; the README says so.
  - Rejected: `serverValidation: { always, publish }` - its keys read as a choice of events and mix
    `required`'s words into a config's keys (user, 2026-11-14).
  - Placed in this sub-spec by the user's decision, though it ships apart from the Admin: the rules and
    the components are delivered together.
- **One value out per field (user, 2026-11-13).** Whatever a component builds inside, it hands the CMS
  one value of each field's type for each field it owns. A nested structure has no column to go to
  while fields on `json` columns are refused (main spec D3, D28); a host that needs one stores a
  reference to its own record instead.

## Problem

- The form toolkit draws a closed set of inputs (`FIELD_INPUTS` in
  `src/admin/components/manager-form-fields/manager-form-field.tsx`); a host cannot add one.
- Option hooks feed one `combobox`. A choice that depends on another - a category, then its products -
  or a picker with filters and an order cannot be built from them.

## Current State and Evidence

- `src/admin-extensions/registry.ts` - one store on `globalThis` under `ADMIN_EXTENSIONS_STORE_KEY`, with
  one map per kind (`optionsHooks`), created with `??=` only when no store is there. Its key's JSDoc says
  a change to the store's shape gives the key a new suffix. Adding a map is not such a change only if
  each map is created on its own: a store an older copy created holds `optionsHooks` alone, and a newer
  copy reading `components` from it would find nothing to write to. A new suffix is no way out, as the
  newer copy would then lose the hooks the older one registered.
- `src/admin/cms/common/utils/build-field-config.ts` - looks an options hook up by name and hands it to
  the toolkit; a component is looked up the same way.
- `src/admin/components/manager-form-fields/fields/combobox-field/options-error-boundary.tsx` - keeps a
  throwing hook inside its field; a component is its second consumer, so it moves up to the toolkit's
  shared place, as planned when it was written.
- `src/lib/config/types.ts` - `FieldAdminConfig` holds `description` and is what `FieldBase.admin`, and
  so a media field, takes; `SlugFieldAdminConfig` and `TextFieldAdminConfig` extend it. A key added to
  it would reach slug and media too, so `component` gets a type of its own.
- `src/lib/field/validate-text-fields.ts`, `validate-slug-fields.ts` - the checks of a field's config,
  each run by `prepareFields` and tested in `src/lib/registry/__tests__/prepare-registry.unit.spec.ts`.
- `src/admin/components/manager-form-fields/fields/types.ts` - `Form.Control` hands an input `id`,
  `aria-describedby` and `aria-invalid`, which tie the label, the hint and the error to it; the input
  puts the binding's `ref` on its element, which the form focuses on a failed save.
- Main spec D33 - data rules at the top, server functions named `server*`, Admin code named, the
  editor's hints under `admin`.
- `medusa-plugin-automations` `src/admin/utils/dynamic-component.tsx` - a component found by key and
  loaded with `import()`, with loading and error states, handed `form`, `name`, `errors`, `fields`.

## Target Behavior

- A host registers `defineCmsFieldComponent("product-picker", ProductPicker)` and lays a node
  `{ type: "component", component: "product-picker", fields: ["product_id"] }` out in a section. The
  Admin draws the field's label, description and error as for any field, and `ProductPicker` as its
  input.
- The component gets each field under its key: the stored value, `onChange` and `onBlur`, the field's
  config (label, required, listed options, multiple, max), its error, and the attributes and ref it puts
  on its main input, and whether it is disabled - the same props for a node of one field or several.
  With those on its input, the label points at it and a failed save focuses it.
- A component replaces the field's input and what belongs to that input. On a combobox whose options a
  hook gives, the hook is not called and need not be registered. A text field's `recommendedLength` and
  `placeholderFrom` are not supported with a component (user, 2026-11-13): the config is accepted, and
  the Admin draws no counter and passes no placeholder. A `textarea` with a component draws the
  component.
- A save checks the value by the field's `type`, as without a component: a component on a `combobox`
  with listed options still cannot save a value outside them.
- A component on `slug` or `media` is refused when the config is resolved: their inputs carry behaviour
  the CMS owns - a slug filled from its source and locked, files uploaded at the save.
- A name no one registered shows the field disabled, its stored value as text, and
  `Unavailable: no component named "<name>" is registered`. A component that throws shows the same
  state with `Could not show this part of the form`; the rest of the form works and saves. The value as text: a
  text as it is, a list joined with `, `, any other value through `String()`, an empty input when there
  is none.

## Proposed Solution (outline)

- **Admin extension registry** - `components` beside `optionsHooks`, each map created on its own when
  missing; `defineCmsFieldComponent` and `getCmsFieldComponent` in `src/admin-extensions/`, the
  contract's types exported with the hook's.
- **Config and server** - a layout node, `{ type: "component", component, fields }`, attaches a
  component to one field or several (1d; `admin.component` of 1a removed); the config registry checks
  it; the sections carry it. Nothing else changes on the server.
- **Toolkit** - a node of one field renders through the `custom` input, inside the field's label and
  error; a node of several through `LayoutComponent`; both inside the shared error boundary, with the
  toolkit's own types (main spec D31: the toolkit imports nothing of the CMS).
- **CMS** - a node's fields and component found under its name, passed to the toolkit's layout.

### Alternatives Considered

- **A built-in relationship picker as a field type.** Rejected for a component a host builds (user,
  2026-11-13): the picker is one input among many a host may want.
- **The component drawing the whole field, label and error included.** Rejected: every field would look
  as its author chose, and the error from a save would land nowhere the CMS knows.
- **A component storing a structure of its own.** Rejected while `json` fields are refused (main spec
  D28).

## Contracts

```ts
// @codee-sh/medusa-plugin-content-cms/admin-extensions, beside the options hook's types
type CmsFieldComponentProps<TKey extends string = string> = {
  /** Each field's stored value, by its key: its name, or the component's own key the node maps to it. */
  values: Record<TKey, unknown>
  /** Writes one of its fields; a save checks the value by that field's type. */
  onChange: (key: TKey, value: unknown) => void
  onBlur: (key: TKey) => void
  /** Each field's config. */
  fields: Record<
    TKey,
    {
      label: string
      /** When the field must be filled: at every save, or at a publish; left out for an optional field. */
      required?: "always" | "publish"
      options?: { value: string; label: string }[]
      multiple?: boolean
      max?: number
    }
  >
  /** Each field's error message; the CMS also draws it around a node of one field. */
  errors: Record<TKey, string | undefined>
  /** Spread on each field's main input, so the label, the hint and the error point at it. */
  inputProps: Record<
    TKey,
    {
      id?: string
      name: string
      "aria-describedby"?: string
      "aria-invalid"?: boolean
      ref: RefCallback<HTMLElement>
    }
  >
  disabled: boolean
}

type CmsFieldComponent<TKey extends string = string> = (props: CmsFieldComponentProps<TKey>) => ReactNode

type CmsFieldComponentLoader = { load: () => Promise<{ default: CmsFieldComponent<any> }> }

defineCmsFieldComponent(name: string, component: CmsFieldComponent<any> | CmsFieldComponentLoader): void
```

```ts
// config: a layout node in a section, a tab or a collapsible
type LayoutComponentConfig = {
  type: "component"
  component: string
  /** Field names, handed under their names, or the component's keys mapped to field names. */
  fields: string[] | Record<string, string>
  /** A header over a node of several fields; a node of one field shows the field's own label. */
  label?: string
  description?: string
}
```

- **Config:** the node, additive; `admin.component` on a field, added in 1a and unreleased, removed.
- **Projection:** the sections carry the node as the config writes it; a field no longer carries
  `component`.
- **Subpath:** `defineCmsFieldComponent`, `CmsFieldComponent`, `CmsFieldComponentProps` and
  `CmsFieldComponentLoader` in `./admin-extensions`, minor, with the changeset of field components.
- **Writes and store API:** unchanged.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A config names a component no one registered | The field disabled, its stored value shown as text, `Unavailable: no component named "<name>" is registered`; the form saves the rest | `build-field-config` unit test; host walkthrough |
| A component throws while it renders | The field shows its stored value and `Could not show this part of the form`; the rest of the form works | host walkthrough with a temporary throwing component |
| A component writes a value of the wrong type | The save answers 400 at the field's path, as for any field | `build-document-schema` is unchanged; host walkthrough |
| A node owning a `slug` or `media` field, or with no component name | The registry refuses the config, naming the field | `prepare-registry` unit test |
| A host registers a name twice | The later registration is used | registry unit test |
| The store was created by an older copy of the module, with `optionsHooks` alone | `components` is created beside it; the hooks the older copy registered stay found | registry unit test |
| A text field with a component and `recommendedLength` or `placeholderFrom` | The config is accepted; no counter is drawn and no placeholder passed | `build-field-config` unit test |
| A combobox whose options a hook gives, with a component | The component draws the field; the hook is not called, registered or not | `build-field-config` unit test |
| A `textarea` with a component | The component draws the field | `build-field-config` unit test |
| A field of several values with a component no one registered | The disabled input shows the values joined with `, ` | host walkthrough |
| A unique field owned by a component node | The component draws it, so the live check of a taken value is not shown; a save still refuses a taken value with 422 | host walkthrough, when a unique field is owned |
| In the host's picker, a document with a saved product is opened again | The category is the first of the product's categories in tree order, none when it has none; the saved product shows; picking or clearing a category overrides it | host walkthrough |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A component writes a value its column cannot hold | low | content | The save checks the value by the field's type and answers 400 | A component's own bug, shown on the field |
| A component breaks the form | medium | admin | The shared error boundary keeps it inside its field | None for the form |
| A component bypasses a rule the Admin shows, such as `max` | low | content | `max` is a data rule the server enforces too (D33) | None |
| A host's Admin loads an older copy of the module, which creates the store first | high | admin | Each map created on its own when missing, tested on a store holding `optionsHooks` alone | None |
| A component leaves `inputProps` off its input | low | admin | The contract's JSDoc and the README say where they go | The label points at nothing and a failed save does not focus the field |

**Rollout:** additive - a layout node, a map in the registry, a toolkit input. **Rollback:** revert; a
host removes the node and its registration, and the fields return to their own inputs.

## Acceptance Criteria

- [x] **1a** In the host, a registered component draws a field; its value is saved and shown after a
      reload; the CMS draws the label, description and error.
- [x] **1a** An unregistered name and a throwing component each stay inside their field.
- [x] **1a** `admin.component` on a slug or media field, or empty, fails the config.
- [x] **1a** A component that puts `inputProps` on its input is pointed at by the field's hint and
      error, and a failed save focuses it.
- [x] **1a** A store an older copy of the module created keeps its hooks and takes components.
- [x] **1b** A field's schemas decide whether it must be filled, at a save or a publish; the Admin marks
      `(Required to publish)` and `(Optional)` from the words the registry works out, and a component
      gets them in `field.required`.
- [x] **1c** A loader registered in place of a component loads it on first use, with a loading state,
      and a failed load stays inside its field.
- [x] **1d** A layout node attaches a component to one field, drawn like the field, or to several,
      listed or mapped to the component's keys; each saved and checked by its type, its errors shown;
      no field names a component of its own.
- [x] **1e** A component reads a value of the document and renders again when it changes, and cannot
      write it.
- [x] **1f** A block's `serverValidation` over two of its fields refuses a save and shows live, its
      `serverPublishValidation` refuses only a publish, each error at its field.
- [x] **1g** The README's examples run in the host.

## Phasing (outline)

| Sub-phase | Goal | Exit gate |
|---|---|---|
| **1a A component edits a field** | The registry's `components`, `admin.component` in the config and the projection, the toolkit's `custom` input, the shared error boundary, the missing-name state | In the host, a component drawing a category combobox and a product combobox - the second following the first - saves a product id into a text field and shows it after a reload |
| **1b Required from the schemas** | `required` out of the config, `serverPublishValidation` in, the word worked out by the registry and carried to the Admin, the label marking a field required to publish | In the host's config moved to schemas, a field required to publish shows `(Required to publish)`; a draft saves without it, a publish refuses it with the schema's message |
| **1c Lazy components** | A loader registered in place of a component, its loading state | A component loaded on first use, in the host |
| **1d Components by a layout node** | A layout node attaching a component to one field or several, listed or mapped to its keys; one contract by key; `admin.component` removed | In the host, the button link's component saves both fields, "open in a new tab" shown for any link |
| **1e Reading the document** | `useDocumentValue(selector)` in both components' props, and a block's place | In the host, the button link's component hides "open in a new tab" while the document's title holds a given word |
| **1f Rules over a model's fields** | `serverValidation` and `serverPublishValidation` on a collection and a block type, errors at the fields | In the host, a button label without a link fails a publish, with the error at the link |
| **1g README** | Field components, single and owning several fields, registered with a loader by default, the reading hook and the model rules, with the host's examples | The README examples run in the host |

## Implementation Plan

### Sub-phase 1a

1. **P1a.1 - Components in the registry**
   - **Outcome:** `defineCmsFieldComponent` and `getCmsFieldComponent` over a `components` map in the
     same store.
   - **Areas:** `src/admin-extensions/` (`registry.ts`, `types.ts`, `index.ts`).
   - **Changes:** the store gains `components: Map<string, CmsFieldComponent>` beside `optionsHooks`;
     `getStore` creates each map on its own when missing, so a store an older copy created takes the new
     one; the key keeps its text, and its JSDoc says adding a map this way is not a change of shape; the
     contract's types as in Contracts; `index.ts` exports the definer and the types. A changeset, minor,
     which P1a.2 extends.
   - **Verification:** registry unit tests - found, replaced, missing, seen through another copy of the
     module, an options hook and a component under one name kept apart, and a store holding
     `optionsHooks` alone keeping its hooks and taking a component; `yarn test:unit`, `yarn typecheck`,
     `yarn lint`, `yarn format:check`.

2. **P1a.2 - `admin.component` in the config, the registry and the projection**
   - **Outcome:** a field names its component; the projection carries the name.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/validate-field-components.ts` (new),
     `src/lib/field/prepare-fields.ts`, `src/lib/field/types.ts`.
   - **Changes:** `FieldComponentAdminConfig` as in Contracts, taken by the plain, select and combobox
     fields and extended by `TextFieldAdminConfig`; `validateFieldComponents`, run by `prepareFields`
     beside `validateTextFields`, refuses an empty name and a component on a slug or media field (for a
     config written in JavaScript); the JSDoc of `recommendedLength` and `placeholderFrom` says a
     component leaves them unused; `prepareField` copies the name onto `Field.component`. The changeset
     of P1a.1 names the config key.
   - **Verification:** unit tests in `src/lib/registry/__tests__/prepare-registry.unit.spec.ts` - carried
     on a text field, refused when empty, on a slug field and on a media field; `yarn test:unit`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

3. **P1a.3 - One error boundary for the toolkit**
   - **Outcome:** the hook's error boundary serves every field.
   - **Areas:** `fields/combobox-field/options-error-boundary.tsx` to
     `src/admin/components/manager-form-fields/field-error-boundary.tsx`.
   - **Changes:** the file moved alone in a commit of its own (`git mv`, import paths only); then, in the
     next commit, `OptionsErrorBoundary` named `FieldErrorBoundary`, its `source` prop and log naming the
     field's extension in general.
   - **Verification:** `git status --short` shows `R` for the move; `yarn typecheck:admin`, `yarn lint`,
     `yarn test:unit`.

4. **P1a.4 - The toolkit's `custom` input and the CMS's lookup**
   - **Outcome:** a field with a component renders it inside the field's label and error, or its
     unavailable state.
   - **Areas:** `src/admin/components/manager-form-fields/` (`types.ts`, `fields/custom-field/`, the input
     map), `src/admin/i18n/json/en.json` (`managerFormFields.custom.unavailable`, `.failed`),
     `src/admin/cms/common/utils/build-field-config.ts`.
   - **Changes:** a toolkit type `custom` with `component` (its own `CustomFieldComponent` and
     `CustomFieldProps` types, the same shape, D31) and `componentSource`; `CustomField` renders the
     component with the props of Contracts inside `FieldErrorBoundary` keyed by the name - `inputProps` from what `Form.Control` hands it and
     the binding's `ref`, `invalid` from `aria-invalid` - or a disabled input with the stored value as
     text, as Target Behavior turns it, and the reason; `buildFieldConfig` gives a field with `component`
     the type `custom` ahead of `textarea` and of its kind, the registered component and the name, and
     no `optionsSource`, `optionsHook`, `recommendedLength` or `placeholderFrom`. The texts checked with
     `codee-ui-copy`.
   - **Verification:** `build-field-config` unit tests - a registered component passed with its name, a
     missing one passed as the name only, a textarea with one given `custom`, a hook combobox with one
     given no hook, a text field with one given no counter or placeholder source, a field without one
     unchanged; `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

5. **P1a.5 - Proof in the host**
   - **Outcome:** the user's example works: a category, then a product of that category, saved as one id.
   - **Areas:** the host: `src/admin/cms/category-product-picker.tsx` - a category combobox and a product
     combobox following it, both on `useComboboxData` - registered in `cms-extensions.ts`; in
     `apps/backend/src/cms/config.ts`, the image and text block's `product_id` turned into `type: "text"` with
     `admin: { component: "category-product-picker" }`, its `options: { hook: "products" }` dropped: the
     server checked only that a hook combobox holds a text, and a text field checks the same on the same
     column, so no hook is left unused (user, 2026-11-13). The category is a filter, not
     a value: it is not saved, so a document opened again picks the first of the saved product's
     categories in the tree's order, none when it has none, until the editor picks or clears one (user,
     2026-11-13). The categories show as a tree, each labelled with its path, and the number of the
     chosen category's products shows above the product combobox, with a spinner while it loads. Each
     combobox is named by a label of its own; the product combobox takes the hint, error state and ref of
     `inputProps` but not its `id`, as a click on the field's label would otherwise open its list (user,
     2026-11-13). Written by the agent at the user's request; a temporary throwing component for the
     failure case, reverted after.
   - **Verification:** the user's walkthrough under `yarn dev`: the category narrows the products, the
     chosen id is saved and shown after a reload with its category picked; clicking the field's label
     opens nothing; an unregistered name and the throwing component each stay in their field; the
     host's config test and admin `tsc` on the changed files.

**Exit gate of 1a:** P1a.1 to P1a.5 done; unit tests, typecheck, admin typecheck, lint and format check
pass.

### Sub-phase 1b

1. **P1b.1 - The config and the registry**
   - **Outcome:** every field's config takes `serverValidation` and `serverPublishValidation` and no
     `required`; the projected field carries the word its schemas give.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/` (`prepare-fields.ts`, `types.ts`,
     `validate-field-schema.ts`), `src/lib/collection/prepare-collection.ts`,
     `src/lib/block/prepare-block.ts`, the registry's types, `README.md`, `.changeset/`.
   - **Changes:** `required` off `FieldBase`, `serverPublishValidation?: FieldValidation` beside
     `serverValidation`, their JSDoc saying an empty value reaches them as `null` and `.nullish()` lets
     it pass; a config written in JavaScript that still gives `required` is refused, naming the
     schemas; `validateFieldSchema` checks both schemas on every kind, with the JSON Schema type of each
     kind - `string` for a text, slug, select, single combobox or media and a date, `number` or
     `integer`, `boolean`, `array` for a list - reading `anyOf` with `null` as the type beside it;
     `prepareField` sets `Field.required` to `"always"` when `serverValidation` refuses `null`, else to
     `"publish"` when `serverPublishValidation` does, else leaves it out; the column check asks for
     `"always"`; `prepareFields` returns one record of schemas, per field `{ save?, publish? }`, which
     the collection and the block keep in place of `validation`. The README's keys of a field and the
     pending changesets that name `required` say the schemas instead.
   - **Verification:** `prepare-registry` unit tests - each word worked out, a field with no schema
     optional, a `.nullish()` schema accepted, a schema on a select, a date and a boolean accepted, a
     schema of the wrong type refused, `required` in a config refused, a nullable `serverValidation` on
     a required column refused; `yarn test:unit`, `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P1b.2 - The document schema**
   - **Outcome:** a save checks a field with `serverValidation`, a publish with both schemas, an empty
     value with `Required` unless the schema says otherwise.
   - **Areas:** `src/lib/document/build-document-schema.ts`, `src/lib/document/types.ts`,
     `src/lib/document/find-document-errors.ts`, `src/workflows/cms/steps/validate-cms-document.ts`.
   - **Changes:** one check per field in place of today's two passes - the required fields, then the
     schemas: an empty value becomes `null`; with schemas - the server - it goes to `save`, and in
     `publish` mode to `publish` too, parsed with `Required` as the parse's message, which a message on
     the schema overrides; without schemas - the Admin - the field's word gives `Required`; a filled
     value passes its type, options and format, then the schemas with their own messages, a date as its
     ISO text. `DocumentSchemaOptions` takes the record of schemas, of the document's fields and of
     each block type, in place of `validation` and `blockValidation`; `find-document-errors` and the
     step hand it.
   - **Verification:** `build-document-schema` and `validate-cms-document` unit tests - an empty title,
     `""` and `null` alike, refused at a save with `Required`, and with the host's message when its
     schema gives one; a short title with the schema's own message, also when the schema gives none;
     an empty slug saved as a draft and refused at a publish; an empty optional field passing; an empty
     list refused by `z.array(z.string())`; a date reaching its schema as text; the Admin's schema
     without schemas refusing an empty required field with `Required`; `yarn test:unit`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

3. **P1b.3 - The toolkit, the label and the component contract**
   - **Outcome:** the label marks a field required to publish, and a component reads the words.
   - **Areas:** `src/admin/components/manager-form-fields/` (`types.ts`, `manager-form-field.tsx`,
     `fields/custom-field/custom-field.tsx`), `src/admin-extensions/types.ts`,
     `src/admin/cms/common/utils/build-field-config.ts`, `src/admin/i18n/json/en.json`
     (`managerFormFields.requiredToPublish`).
   - **Changes:** the toolkit's `required` and `CustomFieldProps.field.required` typed as the words;
     `ManagerFormField` passes `optional` to the dashboard's `Form.Label` only for a field with no
     `required`, and for `"publish"` draws `(Required to publish)` beside the label in the style the
     dashboard gives `(Optional)`; `buildFieldConfig` passes the field's word; `CustomField` hands it on;
     `CmsFieldComponentProps.field.required` as in Contracts. The text checked with `codee-ui-copy`.
   - **Verification:** `build-field-config` unit tests - each word passed as it is, an optional field
     with none; `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

4. **P1b.4 - The host's config and the proof**
   - **Outcome:** the host's fields say through their schemas what they need, and the editor sees it.
   - **Areas:** the host's `apps/backend/src/cms/config.ts`: each `required: "always"` turned into a
     `serverValidation` that refuses an empty value, each `required: "publish"` into a
     `serverPublishValidation`, each format rule of an optional field given `.nullish()` - the page's
     `seo_title` and the image and text block's `cta_href`; `yalc` carries the declarations.
   - **Verification:** the host's config test; the user's walkthrough under `yarn dev`: the page's title
     shows no mark and refuses an empty save with `Required`, or with its own message once
     its schema gives one, its slug and the hero block's
     title show `(Required to publish)`, a draft saves without them and a publish refuses it, the SEO
     title shows `(Optional)` and still refuses 71 characters; admin `tsc` of the host on its CMS files.

**Exit gate of 1b:** P1b.1 to P1b.4 done; unit tests, typecheck, admin typecheck, lint and format check
pass.

### Sub-phase 1c

1. **P1c.1 - Lazy entries in the registry**
   - **Outcome:** `defineCmsFieldComponent(name, { load })` registers a loader that the CMS finds by name.
   - **Areas:** `src/admin-extensions/` (`registry.ts`, `types.ts`), `.changeset/`.
   - **Changes:** `CmsFieldComponentLoader` (`{ load: () => Promise<{ default: CmsFieldComponent }> }`) in
     the contract's types; the store gains `lazyComponents`, created on its own when missing as the other
     maps are; `defineCmsFieldComponent` takes a component or a loader and puts it in its map, removing
     the name from the other, so a later registration replaces either kind; `getCmsFieldComponent` finds
     a component and `getCmsFieldComponentLoader` a loader, one getter per map as for the hooks. The
     unreleased changeset of field components names the loader.
   - **Verification:** registry unit tests - a loader found, a component replaced by a loader and a
     loader by a component, a store an older copy created taking a loader; `yarn test:unit`,
     `yarn typecheck`, `yarn lint`, `yarn format:check`.

2. **P1c.2 - A lazy component in the toolkit and the CMS**
   - **Outcome:** a field whose component is a loader shows its loading state, then the component.
   - **Areas:** `src/admin/components/manager-form-fields/` (`types.ts`,
     `fields/custom-field/custom-field.tsx`, `fields/custom-field/utils/get-lazy-component.ts` (new)),
     `src/admin/i18n/json/en.json` (`managerFormFields.custom.loading`),
     `src/admin/cms/common/utils/build-field-config.ts`.
   - **Changes:** the toolkit's `custom` config takes `loadComponent` beside `component`;
     `getLazyComponent` makes one `React.lazy` per loader, kept in a `WeakMap` by loader, as a component
     made anew on each render would load and mount again; `CustomField` renders it inside `Suspense`,
     whose fallback is the stored value disabled with the loading text, all inside `FieldErrorBoundary`;
     `buildFieldConfig` passes a loader as `loadComponent`. The text checked with `codee-ui-copy`.
   - **Verification:** unit tests - `getLazyComponent` giving one component per loader and another for
     another loader; `build-field-config` passing a loader; `yarn test:unit`, `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`.

3. **P1c.3 - Proof in the host**
   - **Outcome:** the host's picker loads only when a form shows it.
   - **Areas:** the host's `src/admin/cms/cms-extensions.ts`: the picker registered with
     `load: () => import("./category-product-picker").then((module) => ({ default:
     module.CategoryProductPicker }))`. A temporary loader of a missing export for the failure case,
     reverted after.
   - **Verification:** the user's walkthrough under `yarn dev`: the browser's network panel shows the
     picker's module requested when the Product tab opens, not before; the loading state shows under a
     slowed network; the failing loader leaves `Could not show this field` in its field; admin `tsc` on
     the changed files.

**Exit gate of 1c:** P1c.1 to P1c.3 done; unit tests, typecheck, admin typecheck, lint and format check
pass.

### Sub-phase 1d

1. **P1d.1 - The node in the config and the registry** - done: the node in a section, a tab and a
   collapsible, refused in a group, a row and another node, and owning a slug, a media field or a field
   with a component. Its minimum of two fields and its list-only `fields` change in P1d.3.

2. **P1d.2 - One contract, by key**
   - **Outcome:** every component gets its fields' values, configs, errors and input props by an
     explicit key, typed by the component.
   - **Areas:** `src/admin-extensions/types.ts`, `src/admin/components/manager-form-fields/types.ts`
     (`CustomFieldProps`), `fields/custom-field/custom-field.tsx`, `.changeset/field-components.md`.
   - **Changes:** `CmsFieldComponentProps<TKey>` and `CustomFieldProps<TKey>` as in Contracts, without
     `names`; `CustomField` hands its one field under the key its config gives - the field's name until
     P1d.3 brings the node's keys; the JSDoc of `defineCmsFieldComponent` shows the loader first.
   - **Verification:** `yarn test:unit`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

3. **P1d.3 - The node of one field or more, listed or mapped**
   - **Outcome:** a node names one field or more, as a list or mapped to the component's keys, and may
     stand in a group.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/layout/` (`check-field-sections.ts`,
     the toolkit's layout types and `collect-layout-names.ts`,
     `prune-layout-to-shown.ts`, `form-layout.tsx`.
   - **Changes:** `fields` takes a list or an object of keys to field names, at least one field; the
     registry refuses an empty key, a field named twice, and a field not of the model, beside the
     refusals of P1d.1, and takes the node in a group; the layout utils read a node's fields from either
     form. `admin.component` stays until P1d.6, so the host's picker keeps working.
   - **Verification:** `prepare-registry` unit tests - a node of one field, in a group, a mapping, each
     refusal; `collect-layout-names` with a mapping; `yarn test:unit`, `yarn typecheck`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

4. **P1d.4 - The node in the toolkit**
   - **Outcome:** `FormLayout` draws a node through a renderer it is given; a node of one field looks
     like the field, a node of several draws its component under its header.
   - **Areas:** `src/admin/components/manager-form-fields/layout/` (`types.ts`, `form-layout.tsx`,
     `layout-component/` (new: `layout-component.tsx`, `bound-entries.tsx`), `utils/prune-layout-to-shown.ts`),
     `fields/custom-field/`, `utils/build-component-props.ts` (new, shared by both inputs),
     `src/admin/i18n/json/en.json`.
   - **Changes:** the toolkit's node takes a list or a mapping, read by `listComponentItems`; `FormLayout`
     requires `renderComponent(node, items)` and hands it each item under its key; a node of one field
     renders through `ManagerFormField` with the `custom` input, under the component's key, and
     `ManagerFormField` gives a `custom` input no placeholder or counter;
     `LayoutComponent` binds a node of several fields with `useController`, one component per field,
     builds the props by key, and renders the component inside `ExtensionErrorBoundary` and `Suspense`,
     under the node's label when it has one; with no component, loading or failed, it shows each field's
     stored value disabled under its label, and the reason once; `pruneLayoutToShown` keeps a node whole
     when it keeps any of its fields. Copy checked with `codee-ui-copy`.
   - **Verification:** `prune-layout-to-shown` and `count-layout-errors` unit tests - a node kept whole
     with one field shown, dropped with none, a mapped node's fields counted in its tab; `yarn test:unit`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

5. **P1d.5 - The node in the CMS**
   - **Outcome:** a document's and a block's layouts draw a node with the host's component.
   - **Areas:** `src/admin/cms/common/document-fields/document-form-layout.tsx`,
     `src/admin/cms/common/area-field/block-card.tsx`, `src/admin/cms/common/component-node/` (new),
     `src/admin/cms/document-create-form/config.ts`, `src/lib/layout/check-field-sections.ts` with
     `check-component-node.ts` (new).
   - **Changes:** `ComponentNode` gives a node its fields' configs through `buildFieldConfig`, each under
     its key, and the component or the loader registered under its name; both layouts pass it to
     `FormLayout` as the node's renderer; `getCreateFields` adds to the required fields what the layout
     pruned to them still names, as `pruneLayoutToShown` keeps a node whole; the registry refuses a unique
     field in a node, which the Admin checks only through `CheckedDocumentField`.
   - **Verification:** unit tests - `getCreateFields` adding a node's other fields; the registry refusing
     a node owning a unique field; `yarn test:unit`,
     `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

6. **P1d.6 - The host on nodes, and no `admin.component`**
   - **Outcome:** the host attaches every component by a node, and a field no longer names a component.
   - **Areas:** the host's `apps/backend/src/cms/config.ts` - the picker as a node of `product_id` in the
     Featured product group, the Link collapsible holding `{ type: "component", component: "cta-link",
     fields: ["cta_href", "cta_external"] }`; its `src/admin/cms/cta-link.tsx`, a link input and an "Open
     in a new tab" switch, shown for any link, an internal one included, registered with a loader. In the plugin, once the host no longer uses it: `FieldComponentAdminConfig`
     and `admin.component` leave the config, `validate-field-components.ts`, `Field.component` and the
     `custom` type of `buildFieldConfig` with them; the changeset says a node attaches a component. The
     host starts with its `node_modules/.vite` deleted.
   - **Verification:** unit tests without `admin.component`; the user's walkthrough under `yarn dev`: the
     picker as before, its label drawn by the CMS; both link fields saved and shown after a reload, the
     switch shown for `/offer` and for `https://...`; a link refused by its schema shows the
     message in the component and counts in the Button tab; an unregistered name leaves the values shown
     disabled; the host's config test and admin `tsc` on its CMS files.

**Exit gate of 1d:** P1d.1 to P1d.6 done; unit tests, typecheck, admin typecheck, lint and format check
pass.

### Sub-phase 1e

**Goal:** a component reads a value of the document and renders again when that value changes, and
cannot write it.

**Prerequisites:** 1d.

**Contract** (`@codee-sh/medusa-plugin-content-cms/admin-extensions`; additive):

```ts
/** The document as a component reads it, shaped for components rather than as the form holds it. */
type CmsDocumentValue = {
  /** The document's own fields the form holds, by name. */
  fields: Record<string, unknown>
  /** Each area's blocks, in order. */
  areas: Record<string, CmsBlockValue[]>
}

type CmsBlockValue = {
  /** The block type's slug. */
  type: string
  fields: Record<string, unknown>
  /** The block's own areas, its repeaters; empty until they come. */
  areas: Record<string, CmsBlockValue[]>
}

/** One level of a block's place: an area, and the block's index in it. */
type CmsBlockPlace = { area: string; index: number }

/** Reads what `select` picks from the document; renders again only when that pick changes. */
function useDocumentValue<T>(select: (document: CmsDocumentValue) => T): T
/** The component's block, from the document down; `undefined` for the document's own fields. */
function useBlockPlace(): CmsBlockPlace[] | undefined
```

**Behaviour:**

- `fields` holds the fields the form holds: the create form holds only the fields it shows, so a
  component there reads `undefined` for the others.
- A block's `fields` hold the fields its type's config lists; a block of a type the collection does not
  know is `{ type, fields: {}, areas: {} }`. Its `id` and `block_type` are not fields.
- A pick is compared by content - primitives, dates by time, lists and plain objects - so a selector
  that builds a new object each time renders again only when the content differs.
- The place follows a move: a block moved up reads its new index on the next render.
- Outside a CMS document form `useDocumentValue` throws
  `useDocumentValue runs inside a CMS document form only`, and `useBlockPlace` returns `undefined`.

#### Steps

1. **P1e.1 - The document as a component reads it**
   - **Outcome:** the form's values turn into `CmsDocumentValue`, and two picks compare by content.
   - **Areas:** `src/admin-extensions/types.ts`, `src/admin-extensions/is-same-value.ts` (new),
     `src/admin/cms/common/utils/build-document-value.ts` (new), their unit tests.
   - **Verification:** unit tests - fields picked and areas mapped, fields the form does not hold, an
     unknown block type; `isSameValue` on primitives, lists, objects and dates.

2. **P1e.2 - Contexts every copy shares, and the hooks**
   - **Outcome:** `useDocumentValue` and `useBlockPlace` are exported and read contexts held in the
     registry's store.
   - **Areas:** `src/admin-extensions/registry.ts` (`getCmsDocumentContext`,
     `getCmsBlockPlaceContext`), `use-document-value.ts` and `use-block-place.ts` (new), `index.ts`.
   - **Changes:** `useDocumentValue` runs `useSyncExternalStore` over the source's `subscribe`, its
     snapshot the pick, handing back the last pick while `isSameValue` holds.
   - **Verification:** the registry's unit test - two copies get the same contexts.

3. **P1e.3 - The CMS provides the document and the place**
   - **Areas:** `src/admin/cms/common/document-form-provider/document-form-provider.tsx`,
     `src/admin/cms/common/area-field/block-card.tsx`, `.changeset/field-components.md`.
   - **Changes:** `DocumentFormProvider` provides `{ subscribe, getDocument }` - `form.subscribe` to the
     values, `buildDocumentValue` over `form.getValues("document")` - made once with its other stable
     values; `BlockCard` provides its place, the place around it followed by `{ area, index }`.
   - **Verification:** `yarn typecheck`, `yarn typecheck:admin`, `yarn test:unit`, `yarn lint`,
     `yarn format:check`.

4. **P1e.4 - The host's button link reads the title**
   - **Areas:** the host's `apps/backend/src/admin/cms/cta-link.tsx`.
   - **Changes:** `useDocumentValue((document) => document.fields.title)`; the switch's `Form.Field` left
     out while the title holds "offer", in any case, keeping its stored value. The plugin's declarations
     refreshed with `tsc --emitDeclarationOnly` and `yalc publish --push --no-scripts`; the host starts
     with its `node_modules/.vite` deleted.
   - **Verification:** the host's ESLint and admin `tsc` on its CMS files; the user's walkthrough under
     `yarn dev`: typing "Offer" into the page's title hides the switch in an image and text block and
     removing it shows it again; a moved block keeps it working; typing in another field shows no lag.

**Exit gate of 1e:** P1e.1 to P1e.4 done; unit tests, typecheck, admin typecheck, lint and format check
pass; the walkthrough of P1e.4.

### Sub-phase 1f

**Goal:** a collection and a block type check their own fields together on the server, each error at a
field.

**Prerequisites:** 1b, whose field schemas the rules run after.

**Contract** (`src/lib/config/types.ts`; additive):

```ts
/**
 * A Zod object schema over a model's own fields, e.g. `z.object({ cta_label: ..., cta_href: ... })`
 * with a `.superRefine()`. It gets every field of the model by name, an empty value as `null` and a date
 * as its ISO text, once each field passed its own schemas. An issue's path names the field it lands at.
 */
export type ModelValidation = z.ZodType

export type ContentTypeConfig = {
  // ...as today
  /** The rule every save checks the model's fields with together. */
  serverValidation?: ModelValidation
  /** The rule a publish checks them with, beside `serverValidation`; a draft saves without it. */
  serverPublishValidation?: ModelValidation
}
```

**Behaviour:**

- `PreparedFields.schemas` becomes one record, `{ fields, model }`: `fields` the per-field schemas of
  1b, `model` the model's `{ save?, publish? }` (Decisions Taken). `DocumentSchemaOptions.schemas` and
  `blockSchemas` take that record.
- The registry refuses a model rule whose JSON Schema type is not `object`, and one whose `properties`
  name a key that is no field of the model, each with the model's config path.
- The rule runs inside `buildDocumentSchema`, beside the fields' schemas, as a `.superRefine()` on its
  object after the field rules. Its `when` runs it only when no issue sits at one of the model's fields:
  a field that failed its type or its schema is reported alone, while an issue elsewhere - a block's,
  for a document's rule - does not hold it back. `when` on `.superRefine()` exists from Zod 4.4
  (colinhacks/zod#5739), which Medusa ships from 2.22.2; the plugin needs Medusa 2.22.7 and Zod 4.6.6.
  `shape` runs `save`, `publish` runs `save` and then `publish`, the second only when the first passes,
  as a field's schemas run.
- An issue whose path starts with a field of the model lands at that field - `cta_href` on a document,
  `sections.2.cta_href` on a block. Any other path lands on the model: the document's general error,
  shown in the toast, or the block's path, `sections.2`.
- Skipped with `beforeFill`, and a document's rule with `partial` too, a block being checked whole, as
  the route's middleware checks a body before the server
  fills it; `validate-cms-document` checks the whole document again. The live validation runs in
  `shape` mode, so it shows a `serverValidation` error as the editor types, and a
  `serverPublishValidation` error shows when a publish is refused.
- The Admin gets no model rule: the projection never carried `schemas`, and the Admin's
  `buildDocumentSchema` runs without them.
- A rule with an async refinement throws in Zod's synchronous parse; the README says rules are
  synchronous and read no data.

#### Steps

1. **P1f.1 - The model's schemas in one record**
   - **Outcome:** `PreparedFields.schemas` is `{ fields, model }`, `model` empty; the document schema reads
     `schemas.fields` and `blockSchemas[slug].fields`. Nothing checks differently yet.
   - **Areas:** `src/lib/field/types.ts` (`ModelSchemas`), `src/lib/field/prepare-fields.ts`,
     `src/lib/document/types.ts`, `src/lib/document/build-document-schema.ts`,
     `src/lib/document/find-document-errors.ts`, their unit tests.
   - **Verification:** the existing unit tests of `prepareFields`, `buildDocumentSchema` and
     `findDocumentErrors`, updated to the new shape, pass unchanged in what they assert.

2. **P1f.2 - The rules in the config and the registry**
   - **Outcome:** `serverValidation` and `serverPublishValidation` on `ContentTypeConfig` land in
     `schemas.model`; a rule that is not an object, or names a key that is no field, fails the config.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/prepare-fields.ts`,
     `src/lib/field/validate-model-schema.ts` (new), which reads the rule's JSON Schema `type` and
     `properties` itself, as a field's `readJsonSchemaType` reads no properties; the registry's unit tests.
   - **Verification:** unit tests - a collection's and a block's rules carried to `schemas.model`; a
     `z.string()` rule and a rule naming an unknown key each refused with the config path.

3. **P1f.3 - The rules run, errors at the fields**
   - **Outcome:** a document's and a block's rules run as Behaviour says.
   - **Areas:** `src/lib/document/build-document-schema.ts` (`addModelRules`, `buildRuleValues`), its
     tests in `src/lib/document/__tests__/find-document-errors.unit.spec.ts`,
     `src/workflows/cms/steps/__tests__/` for `validate-cms-document`, `.changeset/field-components.md`.
   - **Verification:** unit tests - a block rule over two fields refusing a save at its field's path under
     the block; a publish rule passing a draft and refusing a publish; a rule left out while one of its
     fields fails its own schema; an issue at no field landing on the document and on the block; a
     before-fill check skipping every rule and a partial one the document's; an empty value reaching the
     rule as `null`. Then `yarn typecheck`,
     `yarn test:unit`, `yarn lint`, `yarn format:check`.

4. **P1f.4 - The host's image and text block**
   - **Areas:** the host's `apps/backend/src/cms/config.ts`, with the condition in one function the rule
     calls.
   - **Changes:** the `image_text` block's `serverPublishValidation` refuses a button label without a
     link, at `cta_href`: `Add a link for the button`. The plugin's declarations refreshed with
     `tsc --emitDeclarationOnly` and `yalc publish --push --no-scripts`.
   - **Verification:** the host's config test and ESLint on `src/cms/config.ts`; the user's walkthrough
     under `yarn dev`: a block with a label and no link saves as a draft, its publish is refused with the
     error under "Button link" and in its tab's count; filling the link clears it. The live validation
     runs in `shape` mode and does not show a publish rule.

**Exit gate of 1f:** P1f.1 to P1f.4 done; unit tests, typecheck, lint and format check pass; the
walkthrough of P1f.4.

### Sub-phase 1g

**Goal:** the README shows a host how to build field components, read the document and write rules over
a model's fields, with the host's own code as its examples.

**Prerequisites:** 1f.

#### Steps

1. **P1g.1 - Field components and reading the document**
   - **Outcome:** a README section on field components - registered with a loader first, given as they
     are for a small one; attached by a layout node to one field or several, listed or mapped to keys;
     the props by key; what the editor sees while a component loads, when no one registered its name
     and when it throws; one value of its type per field - and on `useDocumentValue` and
     `useBlockPlace`. The table of a field's config names the layout node beside `options: { hook }`.
   - **Areas:** `README.md`.
   - **Verification:** each example matches the host's `cms-extensions.ts`, `cta-link.tsx` and
     `config.ts`; each message quoted matches `src/admin/i18n/json/en.json` and the hooks' code.

2. **P1g.2 - Rules over a model's fields**
   - **Outcome:** a README section on a model's `serverValidation` and `serverPublishValidation`: what a
     rule gets, when it runs, where its errors land, that a field it requires keeps its `(Optional)`
     label (user, 2026-11-16), that it reads no data, and a condition shared with a component through
     one function of the host.
   - **Areas:** `README.md`.
   - **Verification:** the example matches the host's `image_text` rule; the behaviour stated matches
     `addModelRules` and the unit tests of 1f.

**Exit gate of 1g:** P1g.1 and P1g.2 done; the user reads the README against the host.

## Short Tracker

- `done` - Sub-phase 1a, checked by the user in the host on 2026-11-13: the picker saves a product id and
  shows its category after a reload, an unregistered name and a throwing component each stay in their
  field. The contract's `inputProps.ref` is a `RefCallback<HTMLElement>`: a `Ref<HTMLElement>` object does
  not fit the dashboard `Combobox`'s `HTMLInputElement` ref, and the form hands a callback anyway.
- `done` - A failed save focusing the picker and showing its error, checked by the user on 2026-11-14
  with `product_id` required for the walkthrough.
- `done` - Sub-phase 1b, required from the schemas, checked by the user in the host on 2026-11-14: the
  page's title unmarked, refusing an empty save with `Required` and a short one with its schema's
  message; its slug and the hero block's title, description and image alt marked `(Required to
  publish)`, a draft saving without them and a publish refusing it; the SEO title and the button link
  `(Optional)`, still refusing a value their format rules break. The host's config test passes on the
  plugin `yarn dev` compiled. `(Required to publish)` sits in `Form.Label`'s `icon` slot, beside where
  the dashboard puts `(Optional)`.
- `done` - Sub-phase 1c, lazy components, checked by the user in the host on 2026-11-14: the picker's
  module requested only when the Product tab opens, `Loading the field` under a slowed network, and a
  loader of a missing export leaving `Could not show this field` in its field with the rest of the form
  working. The host's dynamic import names `./category-product-picker.js`, as the host admin's Node16
  resolution asks of an `import()`, which Vite 7 resolves to the `.tsx` source (`tryCleanFsResolve`).
  The host's Vite served a stale pre-bundle of `admin-extensions` until its `node_modules/.vite` was
  deleted: [a-host-vite-serves-its-own-stale-copy-of-admin-extensions](../../../lessons/a-host-vite-serves-its-own-stale-copy-of-admin-extensions.md).
- `done` - Sub-phase 1d, components attached by a layout node only, decided by the user on
  2026-11-14. P1d.1 to P1d.6 committed: the
  contract by key typed `CmsFieldComponentProps<TKey>`, the registry holding `AnyCmsFieldComponent`; a
  node of one field or more, listed or mapped, allowed in a group; `LayoutComponent` binding a node of
  several fields with `useController`, a node of one field through `ManagerFormField` and
  `componentKey`; `ComponentNode` in the CMS, the create form adding a node's fields through
  `pruneLayoutToShown`, a unique field refused in a node; the host's picker and `cta-link` on nodes; `admin.component` removed. Unit tests import
  the toolkit's utils by their files, as Jest does not transform the `.tsx` its index pulls in. The
  user closed it on 2026-11-14; the host's `cta-link` draws its fields with the dashboard's `Form` parts.
- `done` - Sub-phase 1e, reading the document by import, decided by the user on 2026-11-14: P1e.1 to
  P1e.4 done, checked by the user in the host on 2026-11-14 - the button link's component shows the
  page's title as it is typed, hides "Open in a new tab" while the title holds "Offer" and shows it
  again without it, keeps working with its block moved, and typing in other fields shows no lag. The
  host's Vite served a pre-bundle of `admin-extensions` without the hooks until its `node_modules/.vite`
  was deleted, as the lesson records.
- `done` - Sub-phase 1f, rules over a model's fields, approved by the user 2026-11-16: P1f.1 to P1f.4
  done, checked by the user in the host on 2026-11-16 - an image and text block with a button label and
  no link shows `Add a link for the button` under "Button link", with the count on its "Button" tab.
  The plugin moved to Medusa 2.22.7 and Zod 4.6.6 the same day, and the rules moved from a walk of their
  own in `findDocumentErrors` into the schema, with `.superRefine()`'s `when`. The host stays on 2.21.2
  until its RBAC moves to the 2.22.3 API on `develop`; there Zod 4.2 ignores `when`, so a document's
  rule waits until no block holds a type error. A field a rule requires keeps its `(Optional)` label,
  as its own schema lets it stay empty.
- `done` - Sub-phase 1g, the README, decided by the user 2026-11-16: P1g.1 and P1g.2 done - field
  components, reading the document and rules over a model's fields, with the host's `cms-extensions.ts`,
  `cta-link.tsx` and `image_text` rule as examples; the `cta-link` example leaves out the host's JSDoc and
  its `OFFER_WORD` constant. Closed by the user on 2026-11-16, which closes the sub-spec.
