# Form Layout: Sections, Groups, Rows, Collapsibles and Tabs

**Date:** 2026-11-11
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md), [sub-collections-and-documents](../2026-11-04-sub-collections-and-documents.md)

## TLDR

A collection's or block's form can be laid out beyond flat sections, on two levels:

- **Inside a section:** `admin.groups` is renamed `admin.sections`; a section is still a card of the page
  in the `main` or `side` column (a subheading in the create modal and a block card). Its `fields` take
  layout nodes besides field names, presentational as in the common CMS shape: a `group` (a labelled set
  of fields, such as `image` with `image_alt`), a `row` (fields side by side), a `collapsible` and `tabs`.
- **Above the sections, deferred (user, 2026-11-12):** a collection's `admin.mainTabs` split the main
  column into tabs ("Content | SEO | Settings"), each holding sections. The side column and the header card
  with **Save** stay outside them. Tabs in a section already split a page's fields ("General | SEO"), so
  1d waits for a collection that needs several cards in one tab, or its areas in a tab. The design below
  stays, marked for 1d, so it can be taken up without designing it again.

Layout never changes data: every field stays a column of its model, sent and validated by name as today.
Block cards, which ignore their sections today, render them.

## Terms

The words below mean one thing each, in this spec, in the code and in the config. Data and layout are
apart: `fields` and `areas` say what a model stores, `admin` says only where the Admin shows it.

Names follow one pattern (user, 2026-11-11): a layout node's config type is `Layout<Node>Config`, the
same in the config types and in the toolkit's copy of them, and the toolkit component that renders it is
`Layout<Node>`: `LayoutMainTabs`, `LayoutTabs`, `LayoutCollapsible`, `LayoutGroup`, `LayoutRow`, with
`FormLayout` rendering a tree; the CMS's `DocumentFormLayout` renders a document's fields through it. A
section has no component of the toolkit: its card or subheading is the form's (D31). `LayoutHeading` is
no node but a part the nodes share: the label and description of a group, of a block card's section and
of a collapsible.

| Term | Config | Type | What it is | Holds |
|---|---|---|---|---|
| **Field** | a key of `fields` | `FieldConfig` | One column of the model, or a relation's id key (D19): the unit of data, sent, validated and stored by name. | - |
| **Area** | a key of `areas` | `AreaConfig` | A document's ordered list of blocks. | blocks |
| **Block** | `blocks[]` | `BlockConfig` | One item of an area, a model of its own; edited in a **block card**. | its own fields |
| **Layout** | everything under `admin.sections` and `admin.mainTabs` | - | Where and in what order the Admin shows fields and areas. It stores nothing, and moving a field in it changes no data. | - |
| **Main tab** | `admin.mainTabs[]` | `LayoutMainTabConfig` | A tab of a collection's whole form, splitting the main column ("Content", "SEO"). The header card with **Save** and the side column stay outside. Not in blocks. | sections |
| **Section** | `admin.sections[]`, `LayoutMainTabConfig.sections[]` | `LayoutSectionConfig`, `LayoutMainTabSectionConfig`, `LayoutBlockSectionConfig` | A titled part of a form: a card on the document page, in the main or side column; a subheading in the create modal and in a block card. | fields, groups, rows, collapsibles, section tabs; then areas (not in blocks) |
| **Section tabs** | `{ type: "tabs" }` | `LayoutTabsConfig`, `LayoutTabConfig` | Tabs inside one section, showing one tab's fields at a time. | per tab: fields, groups, rows, collapsibles |
| **Collapsible** | `{ type: "collapsible" }` | `LayoutCollapsibleConfig` | A titled part of a section that the editor opens and closes. | fields, groups, rows |
| **Group** | `{ type: "group" }` | `LayoutGroupConfig` | Fields under one label in a bordered box, as a collapsible's that does not close. It stores nothing. | fields, rows |
| **Row** | `{ type: "row" }` | `LayoutRowConfig` | Fields side by side, stacking in a narrow column. | field names only, at least two |

What sits in what, outermost first; a level may be skipped, never reversed:

```
main tab → section → section tabs → collapsible → group → row → field
```

- A main tab holds sections only; a section tab holds no sections, since a section is a card and a card
  in a card does not read. Inside a section tab, a group or a collapsible plays the part of a sub-section.
- Fields and areas in no section open the form: in the first main tab when there are main tabs, else in
  the header card (fields) and as cards of their own (areas). In a block card they come before its
  sections.
- **Position** (`main` or `side`) is the column of a section on the document page. It is not grouping:
  only collection sections outside main tabs take it.

How each surface shows the layout:

| | Document page | Create modal | Block card |
|---|---|---|---|
| Main tab | tab bar under the header card | tab bar | - |
| Section | card in its column | subheading; side sections last | subheading with a top border |
| Section tabs, collapsible, group, row | inside their section | inside their section | inside their section |

## Problem

A content type's form is a flat list of fields cut into sections. Fields that belong together, such as an
image and its alt text, or a button's label, link and target, show as unrelated inputs one under another;
a block with ten fields is one long column; and a page with content, SEO and settings sections is one long
page. Two more gaps:

- `admin.groups` already means a section of the page, so "group" cannot name a set of fields inside one.
- A block takes `admin.groups`, and the registry checks them, but `BlockCard` renders the block's fields
  flat and ignores them.

## Current State and Evidence

- `src/lib/config/types.ts:108-117` - `FieldGroup`: `label`, `description`, `fields: string[]`,
  `areas?: string[]`, `position?: "main" | "side"`. `CollectionConfig.admin.groups` (`:144`) and
  `BlockConfig.admin.groups` (`:161`) both take it.
- `src/lib/field/prepare-field-groups.ts` - checks that each group names editable fields and areas, each in
  one group at most, and fills `position`; called by `prepare-collection.ts:72` and `prepare-block.ts:56`,
  the latter with no areas.
- `src/lib/field/types.ts` - `RegistryFieldGroup`; `src/lib/collection/types.ts:38`,
  `src/lib/block/types.ts:16` carry `admin.groups` to `ClientCollection` and `ClientBlock`, which
  `GET /admin/cms/collections` returns as they are.
- `src/admin/components/manager-form-fields/group-form-fields.ts` - the toolkit's `groupFormFields` and
  `FormFieldGroup`: items in no group, and the `main` and `side` sections by flat name lists. It imports
  nothing of the CMS (main spec D31).
- `src/admin/cms/common/group-document-fields.ts` - `groupDocumentFields` adds areas to the toolkit's call;
  used by the edit and create forms. The create form shows a subset of fields (`getCreateFields`) and its
  groups as subheadings.
- `src/admin/cms/document-edit-form/document-edit-form.tsx:292-394` - in `LayoutComposer`'s main column: a
  header `Container` with the title, the live note, **Save** and `DocumentActionMenu`, whose body holds
  the fields in no group; then each area in no group as a card; then the main groups as cards. The side
  column: `DocumentStatusSection`, the side groups, `DocumentHistorySection`. The form sections sit in one
  `div` hidden while a version is viewed.
- `src/admin/cms/common/area-field/area-field.tsx:239-249` - `BlockCard` renders `fields.map(...)` with
  `ManagerFormField`, under `name={path}`; sections unused.
- `.changeset/document-page.md:21` - the only place `admin.groups` is announced; no version is released
  (`package.json` 0.0.1, no tag, not on npm).
- `@medusajs/ui` 4.2.6 `Tabs` wraps Radix Tabs and passes props through
  (`dist/esm/components/tabs/tabs.js`). Radix `Tabs.Content` with `forceMount` stays visible:
  `hidden` is `!present` and `present` is `forceMount || isSelected`
  (`@radix-ui/react-tabs` 1.1.2 `dist/index.mjs:156-163`), so inactive content must be hidden by
  `data-[state=inactive]:hidden`.

## Target Behavior

- A host config writes `admin.sections`; `admin.groups` is gone.
- In a section's `fields`, a `group` shows its label, description and fields together, with a gutter
  on the left; a `row` shows its fields side by side, wrapping when the column is narrow; a
  `collapsible` shows a header that opens and closes its fields, open unless `initCollapsed`; `tabs` show
  one tab's fields at a time, the first one open.
- A collection with `admin.mainTabs` shows, in the main column, the header card (title, live note, **Save**,
  action menu) with no fields under it, then the tab bar, then the open tab's cards. The fields and areas
  in no section open the first tab: the fields in a card without a heading, each area as its own card,
  as today. The side column is unchanged and visible on every tab.
- Any tab, of the form or of a section, and a closed collapsible, with an error under it shows the number
  of errors next to its label.
- Switching tabs or closing a collapsible keeps everything the editor did in the hidden fields: values,
  an unlocked slug, a chosen file.
- The document page, the create modal and a block card lay out the same config the same way; the create
  modal shows `admin.mainTabs` as tabs too, with the side sections after the tabs as subheadings, last as
  today. A block card shows its fields in no section first, then each section under its label.
- The create modal, which shows fewer fields, leaves out a node with nothing to show, and a tab or
  section left empty.
- Saving, validation, server errors, versions and the store API are unchanged.
- A config that breaks a rule below fails at startup with the section, tab or node named.

## Proposed Solution

### Config shape

Inside a section:

```ts
admin: {
  sections: [
    {
      label: "Content",
      fields: [
        {
          type: "tabs",
          tabs: [
            { label: "Text", fields: ["label", "title", "description"] },
            {
              label: "Image",
              fields: [
                { type: "group", label: "Image", fields: ["image", "image_alt"] },
                "image_position",
              ],
            },
            {
              label: "Button",
              fields: [
                { type: "row", fields: ["cta_label", "cta_href"] },
                "cta_external",
              ],
            },
          ],
        },
      ],
    },
  ],
}
```

Above the sections, on a collection:

```ts
admin: {
  // Without main tabs, sections in both columns; with main tabs, only the side column's.
  sections: [{ label: "Publishing", fields: ["slug"], position: "side" }],
  mainTabs: [
    {
      label: "Content",
      sections: [
        { label: "General", fields: ["title", { type: "group", label: "Hero image", fields: ["image", "image_alt"] }] },
        { label: "Sections", fields: [], areas: ["sections"] },
      ],
    },
    {
      label: "SEO",
      sections: [
        { label: "Search", fields: ["seo_title", "seo_description"] },
        { label: "Sharing", fields: ["og_image"] },
      ],
    },
  ],
}
```

Types (`src/lib/config/types.ts`, all labels plain strings so the config goes to the Admin as JSON):

```ts
type LayoutRowConfig = { type: "row"; fields: string[] }
type LayoutGroupConfig = { type: "group"; label: string; description?: string; fields: (string | LayoutRowConfig)[] }
type LayoutCollapsibleConfig = {
  type: "collapsible"; label: string; description?: string; initCollapsed?: boolean
  fields: (string | LayoutGroupConfig | LayoutRowConfig)[]
}
type LayoutTabConfig = { label: string; description?: string; fields: (string | LayoutGroupConfig | LayoutRowConfig | LayoutCollapsibleConfig)[] }
type LayoutTabsConfig = { type: "tabs"; tabs: LayoutTabConfig[] }
type LayoutItemConfig = string | LayoutGroupConfig | LayoutRowConfig | LayoutCollapsibleConfig | LayoutTabsConfig

type LayoutSectionConfig = { label: string; description?: string; fields: LayoutItemConfig[]; areas?: string[]; position?: "main" | "side" }
type LayoutMainTabSectionConfig = Omit<LayoutSectionConfig, "position">
type LayoutMainTabConfig = { label: string; description?: string; sections: LayoutMainTabSectionConfig[] }
type LayoutBlockSectionConfig = Omit<LayoutSectionConfig, "areas" | "position">
```

`CollectionConfig.admin.sections?: LayoutSectionConfig[]` and `admin.mainTabs?: LayoutMainTabConfig[]`;
`BlockConfig.admin.sections?: LayoutBlockSectionConfig[]`, with no `mainTabs`.

`LayoutTabConfig` (a tab inside a section, holding fields) and `LayoutMainTabConfig` (a tab of the form,
holding sections) are the two levels of one idea; their names say which level they serve (user,
2026-11-11).

### Rules, checked at startup

What each container takes is fixed by the types above. Inside a section, nesting goes one way: tabs →
collapsible → group → row → field; no tabs in tabs, no group in a group. A main tab holds sections, and a
section in it may hold tabs of its own.

- Every name is an editable field (or, in `areas`, an area) of the model; each field and area is in at
  most one place across `admin.sections` and every main tab.
- A `row` holds at least two names. `tabs` and `admin.mainTabs` hold at least two tabs. A group, a
  collapsible and a layout tab hold at least one field; a main tab holds at least one section; a section
  holds a field or an area, as today.
- With `admin.mainTabs`, `admin.sections` holds only `position: "side"` sections: a main section goes into a
  tab. A section in a main tab has no `position`.
- A block takes no `admin.mainTabs`, and its sections have no `position` and no `areas`. The types say so;
  the registry also refuses them, because a JS config or a cast passes the types.
- Areas stay at the section level, after the section's layout, as today.

### Where the code goes

1. **Config and registry** (`src/lib/`): the types above. The layout's checks sit in `src/lib/layout/`.
   `checkFieldSections` (`check-field-sections.ts`) holds the checks a collection's and a block's sections
   share and walks a section's tree once with the containers' allowed children; `prepareFieldSections`
   (`prepare-field-sections.ts`) runs it and fills `position` for a collection, and `prepareBlockSections` (`src/lib/block/`) refuses
   `position` and `areas` first and returns a block's sections as they are. A new `prepareMainTabs`
   checks `admin.mainTabs` and its sections through `prepareFieldSections`; both share one set of names
   seen, for the "in one place" rule. `RegistryFieldGroup` becomes `RegistryLayoutSection`, a
   collection's section with `position` filled; `RegistryBlock.admin.sections` holds
   `LayoutBlockSectionConfig[]` as the config gives them, with no `position`. The collection's registry
   and client types gain `admin.mainTabs` (an empty array when the config has none).
2. **Toolkit** (`src/admin/components/manager-form-fields/`, imports nothing of the CMS, D31):
   - Everything that lays a form out sits in `layout/`: its own layout types in `layout/types.ts`
     (`LayoutSectionConfig` among them), structurally the same as the config's, so a CMS client section
     passes without a cast; `typecheck:admin` checks that at each call. The functions on the tree sit in
     `layout/utils/`, its hooks in `layout/hooks/`, its components in `layout/` itself.
   - `sectionFormFields(items, sections)` returns the items in no section (`unsectioned`) and each section
     with its `layout`, the tree pruned to the items the form shows, a section left empty dropped. A
     section carries no copy of its items: the tree names them.
   - `collectLayoutNames(items)` lists the names under a tree; `pruneLayout(items, isShown)` drops what the
     form does not show and the nodes left empty, one recursion over every node holding `fields`. Only the
     create modal, which shows the required fields alone, leaves anything to drop.
   - `FormLayout` renders a pruned tree: `layout`, the form's `items` and `renderItem(item)`. It finds the
     item of each name in `items` and hands it to `renderItem`, which the form supplies, so the CMS keeps
     `DocumentField` with the slug lock and the taken-value check. One component per node, each in its
     own file: `LayoutGroup`, `LayoutRow`, `LayoutCollapsible`, `LayoutTabs`. `LayoutHeading` shows a
     label and its description for a group, a collapsible's header and a block card's section.
   - `useLayoutErrorCount(form, name, names)` reads `useFormState` for those paths and, for each,
     takes react-hook-form's `get(errors, "<name>.<path>")` and counts the error objects with a `message`
     under it: one for a field, and for an area each failing field of its block rows plus the area's own
     error (`minRows`, `maxRows`), which sits at the path or its `root`, as `OwnError` in
     `area-field.tsx:74-90` reads it. `LayoutErrorBadge` shows the count. Both serve main tabs too.
3. **CMS Admin** (`src/admin/cms/`):
   - `groupDocumentFields` becomes `sectionDocumentFields`. It passes the side sections and every form
     tab's sections to `sectionFormFields` in one call, so the fields in no section are found across all
     of them, and returns each section's pruned tree and areas, and the main tabs with their sections,
     a tab with none left dropped. A section's areas go to `sectionFormFields` as names after its fields,
     so a section of areas alone is kept; the result takes them off the top of the tree into `areas`.
     It returns the sections of the `main` and the `side` column apart, as `sectionFormFields` does.
   - The edit form, the create form and `BlockCard` render a section's content through `FormLayout`.
     `BlockCard` renders its fields in no section first, then each section under a subheading, as the
     create modal does.
   - Main tabs are cards of the CMS form, not of the toolkit (D31 leaves the cards to the form):
     `LayoutMainTabs` in `src/admin/cms/common/` renders the tab bar and, per tab, the cards the form
     hands it, each tab with `useLayoutErrorCount` over its sections' fields and areas. The edit form keeps
     its header card above it and, with tabs, renders the fields and areas in no section at the top of the
     first tab. The create modal uses the same component inside its body, and renders the side sections
     after it as subheadings.

### Alternatives Considered

- **The common CMS shape, layout nodes inside `fields`:** `fields` is a record keyed by column (main
  spec D19), and a layout node has no column. Mixing them would turn the record into an array and break
  every config. Keeping layout under `admin` keeps data and layout apart.
- **One recursive tree where a tab holds either sections or fields:** fewer keys, but one node with two
  meanings and rules that depend on where it stands. Two fixed places, `admin.mainTabs` and
  `{ type: "tabs" }`, are checked by their types (user, 2026-11-11).
- **A `tab` key on each section instead of `admin.mainTabs`:** the tabs' order and labels would need a list
  of their own anyway, and a section's tab would be a string to match.
- **Main sections both above the tabs and in them:** two places to look for a main section, and
  **Save** separated from the form by cards; with tabs every main section is in one.
- **Moving Save into the tab bar:** the header card already holds it with the title and the action
  menu, and can stay above the tabs unchanged.
- **Named groups and tabs that nest data:** every field is a column of the model (D2, D3); nesting would
  need a JSON column or prefixed names. Left out.
- **Keeping `admin.groups` and naming the new node `fieldset`:** one word would still mean two things to
  a reader who knows the common CMS shape; the key is unreleased, so the rename costs one changeset edit
  (user, 2026-11-11).
- **Tabs that unmount inactive content (Radix default):** values survive (`shouldUnregister` is false),
  but a field's own state does not: an unlocked slug locks again, a taken-value suggestion goes. Hence
  `forceMount` with `data-[state=inactive]:hidden`, and a collapsible hides instead of unmounting.
- **Switching to the first tab with an error on a failed save:** the tab's error count shows the editor
  where to go; switching could jump away from what the editor was looking at.
- **The open main tab in the URL:** a reload would keep the tab, but no other page of the plugin keeps UI
  state in the URL; left for later.
- **`items` in place of a layout node's `fields`:** would keep the word for the data record alone, but
  what a section, a group or a row lays out is fields, and a node only gathers them; `fields` stays
  (user, 2026-11-11).
- **`row` and `collapsible` in a later slice:** the user wants them now (user, 2026-11-11).
- **Widths of the fields in a row (an `admin.width`):** a row would hold objects instead of names.
  The `auto-fit` grid serves the configs so far, and widths can come later without breaking a config
  (user, 2026-11-12).
- **Spacing that depends on the place:** a document form's fields sit 16px apart (`gap-y-4`)
  everywhere, as in the dashboard's own forms: in a section card, the header card, the create modal, a
  block card, and inside a group, a collapsible and a tab, through `LayoutItems`. A tighter spacing inside
  the nodes looked cramped beside the sections' 24px, and 24px everywhere looked too loose (user,
  2026-11-12); no spacing setting in the config.
- **Config types** (public): `admin.groups` → `admin.sections`; `FieldGroup` → `LayoutSectionConfig`,
  plus `LayoutMainTabSectionConfig`, `LayoutMainTabConfig`, `LayoutBlockSectionConfig` and the layout
  types; `CollectionConfig.admin.mainTabs`. All exported from the package root as the config types are.
  No release has `admin.groups`, so `.changeset/document-page.md` is edited to say `admin.sections`
  instead of adding a breaking changeset. The layout nodes and the main tabs each get a `minor`
  changeset.
- **`GET /admin/cms/collections`**: `admin.groups` → `admin.sections` on each collection and block, each
  section's `fields` now a tree; each collection gains `admin.mainTabs`. The Admin of the same package reads
  it.
- **Toolkit** (`src/admin/components/`, not part of the package exports): `groupFormFields` →
  `sectionFormFields`, `FormFieldGroup` → `LayoutSectionConfig`; new `FormLayout`, `pruneLayout`,
  `collectLayoutNames`, `useLayoutErrorCount`, `LayoutErrorBadge`.
- **Startup errors**, through `buildConfigError`, `<path>` as today:
  - `<path>: admin section "<label>" lists no fields or areas`
  - `<path>: admin section "<label>" names "<name>", which is not an editable field`
  - `<path>: "<name>" is in more than one admin section`
  - `<path>: admin section "<label>" names "<name>", which is not an area`
  - `<path>: area "<name>" is in more than one admin section`
  - `<path>: admin section "<label>": a <child type> cannot sit in a <parent type>`, and
    `tabs cannot sit in a <parent type>` for tabs
  - `<path>: admin section "<label>": a row needs at least two fields`
  - `<path>: admin section "<label>": tabs need at least two tabs`
  - `<path>: admin section "<label>": a <type> "<label>" lists no fields`
  - `<path>: admin section "<label>" of a block takes no position or areas`
  - `<path>: admin.mainTabs need at least two tabs`
  - `<path>: tab "<label>" lists no sections`
  - `<path>: admin section "<label>" in tab "<tab>" takes no position`
  - `<path>: with admin.mainTabs, main section "<label>" goes into a tab`
  - `<path>: a block takes no admin.mainTabs`

## UI/UX

- **Group:** a bordered box (`border-ui-border-base rounded-md border`) with `LayoutHeading` in its
  header and its fields under a top border, the same box as a collapsible's without the toggle. A line on
  the left, a gutter, was tried first and dropped (user, 2026-11-12).
- **Row:** a grid `grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4`, so a narrow block card stacks
  the fields.
- **Collapsible:** a bordered box whose header is a button (triangle icon as in `BlockCard`, label,
  description, error badge) with `aria-expanded`; closed content is `hidden`, not unmounted.
- **Tabs in a section:** `Tabs` from `@medusajs/ui`, triggers in `Tabs.List`, the first tab open; each
  `Tabs.Content` with `forceMount` and `data-[state=inactive]:hidden pt-4`, the tab's description above
  its fields.
- **Main tabs:** the same `Tabs`, its list between the header card and the cards, outside any
  `Container`; each `Tabs.Content` force-mounted and hidden the same way, with the cards in the main
  column's spacing and the tab's description as subtle text above them.
- **Error badge:** `Badge size="2xsmall" color="red"` with the number, for any tab and a closed
  collapsible. Its accessible name is new copy under the toolkit's key:
  `managerFormFields.layout.errorCount_one` "{{count}} error", `_other` "{{count}} errors", checked with
  `codee-ui-copy` when written.
- Labels and descriptions come from the config as written, like field labels today.

## Performance and Cache

`useLayoutErrorCount` subscribes to errors per tab and collapsible only, through `useFormState` with
their names; fields keep their own subscriptions. With main tabs every section stays mounted, as every
section is mounted today. Pruning and name collection run in `useMemo` per form, as
`groupDocumentFields` does now. No cache is involved.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| The create modal shows none of a tab's fields | The tab is left out; tabs left with one tab still render as tabs | `pruneLayout` and `sectionDocumentFields` unit tests |
| Every node of a section pruned | The section is not rendered, as today | `sectionFormFields` unit test |
| With main tabs, fields or areas in no section | They open the first tab | `sectionDocumentFields` unit test; inspection |
| An area in a tab with a failing block field and a `minRows` error | The tab counts both | Inspection |
| The create modal of a collection with main tabs and side sections | The tabs, then the side sections as subheadings | Inspection |
| A save fails on a field in another main tab or a hidden section tab | Each tab on the way shows its error count; the field shows its error when opened | Inspection in a host project |
| An editor unlocks a slug, switches tabs and back | The slug stays unlocked | Inspection |
| A version viewed read-only | Shows the snapshot in place of the form and its tabs, as today | Inspection |
| A tab, group or collapsible holds a `required` field | Validation as today; layout plays no part | Existing schema tests |
| A block section given `position: "side"`, or a block given `admin.mainTabs`, in a JS config | Startup error | Registry unit test |
| A row inside a narrow block card | Its fields stack | Inspection |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A host keeps `admin.groups` after taking the new version | medium | config | TypeScript refuses the unknown key; the plugin is unreleased and has one host | A JS config loses its sections silently |
| The toolkit's layout types drift from the config's | low | admin | One call site per form passes the client type into the toolkit; `typecheck:admin` fails on drift | none |
| An editor misses an error in a hidden tab | low | content | The error badge on every tab on the way; the save's toast as today | none |
| Two tab bars, a main tab's and a section's, read as one | low | admin | The form's bar sits outside the cards, a section's inside its card | A config may still overuse tabs |

**Rollout:** sub-phase by sub-phase. The host project changes `groups` to `sections` when it takes 1a and
adopts the nodes and the main tabs as they come.

**Rollback:** revert the sub-phase. Sections without nodes keep working, a config without `admin.mainTabs`
renders as today, and no data changes.

## Dependencies

- `sub-collections-and-documents`: the registry, `ManagerFormField`, `DocumentField`, the edit and create
  forms, `BlockCard`. Its active text names `admin.groups` (config table, P1a.5, the form layout
  paragraph); P1a.2 updates it in the same commit.
- Main spec D31: `groupFormFields` named in the toolkit bullet; updated in P1a.2.

## Acceptance Criteria

- [x] A config with `admin.sections` builds; one with `admin.groups` fails to typecheck.
- [x] A block card renders its sections under their labels.
- [x] Each rule of "Rules, checked at startup" refuses a broken copy of the test config with its message;
  the rules of `admin.mainTabs` go with 1d.
- [x] `pruneLayout`, `sectionFormFields` and `sectionDocumentFields` drop nodes, tabs and sections left
  empty; putting the fields in no section into the first main tab goes with 1d.
- [x] In a host project, tabs, groups, rows and collapsibles lay out a page and its blocks (the image
  and text block's tabs with a row and a closed collapsible, the hero's collapsible with a group); an
  error in a hidden tab shows on the tab; an unlocked slug stays unlocked across tabs.
- [ ] (1d, deferred) In a host project, a page with `admin.mainTabs` shows Content and SEO tabs under the header card with
  **Save**, the side column on both, and an error in the SEO tab counted on it.

## Phasing

### Phase 1 - Layout of a form

Sub-phases, each ending in something to try in a host project:

- **1a - Sections, renamed and in block cards.** `admin.sections`; block cards render theirs.
- **1b - Groups and rows.** The tree in config, registry and toolkit, with `group` and `row`.
- **1c - Collapsibles and tabs in a section.** `collapsible` and `tabs`, with error counts.
- **1d - Main tabs, deferred (user, 2026-11-12).** `admin.mainTabs` on collections; see the TLDR for why
  and when it comes back.

**Prerequisites:** none.

**Exit gate (each sub-phase):** unit tests of the changed area, `yarn lint`, `yarn typecheck`,
`yarn typecheck:admin`, `yarn format:check` pass; the user checks the result in a host project.

## Implementation Plan

### Sub-phase 1a

1. **P1a.1 - Pure renames, committed alone**
   - **Outcome:** files renamed with only the path fixes that keep things working; `git status --short`
     shows `R`, not `RM`.
   - **Areas:** `src/lib/field/prepare-field-groups.ts` → `prepare-field-sections.ts`;
     `src/admin/components/manager-form-fields/group-form-fields.ts` → `section-form-fields.ts` and its
     test; `src/admin/cms/common/group-document-fields.ts` → `section-document-fields.ts`.
   - **Verification:** `yarn typecheck`, `yarn typecheck:admin`, `yarn test:unit` pass unchanged.

2. **P1a.2 - `admin.sections`**
   - **Outcome:** the key, the types and the functions renamed (`FieldSection`, `RegistryFieldSection`,
     `prepareFieldSections`, `sectionFormFields`, `FormSectionConfig`, `sectionDocumentFields`); the
     error messages say "admin section"; `BlockFieldSection` without `position` and `areas`, refused by
     the registry if present.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/`, `src/lib/collection/`, `src/lib/block/`,
     the renamed admin files and their callers, `.changeset/document-page.md`, main spec D31,
     `sub-collections-and-documents` (config table, P1a.5, form layout paragraph). That spec carries
     uncommitted changes of the user's: they are kept, and the step edits only the lines naming
     `admin.groups`.
   - **Verification:** `src/lib/registry/__tests__/prepare-registry.unit.spec.ts` (renamed messages; a
     block section with `position` refused); the renamed toolkit test;
     `src/workflows/cms/steps/__tests__/list-cms-collections.unit.spec.ts`, whose block projection
     expects `admin: { sections: [] }`.

3. **P1a.3 - Block cards render their sections**
   - **Outcome:** `BlockCard` shows its fields in no section, then each section with its label and
     description as a subheading.
   - **Areas:** `src/admin/cms/common/area-field/area-field.tsx`, using `sectionFormFields`.
   - **Verification:** `typecheck:admin`; the user moves the host project to `sections` and checks a block
     with a section.

### Sub-phase 1b

Goal: `group` and `row` inside a section, in the config, the registry and the three forms. The host groups
`image` with `image_alt` and sets the button's label and link side by side.

1. **P1b.1 - The tree in the config and its check**
   - **Outcome:** `RowLayout`, `GroupLayout` and `SectionItem` (`string | GroupLayout | RowLayout` until
     1c adds its nodes) in the config types; `FieldSection.fields` takes `SectionItem[]`, a block section
     too. `checkFieldSections` walks each section's tree once: a node's type must be one its container
     takes (a section takes `group` and `row`, a group takes `row`, a row takes names only), a row holds at
     least two names, a group at least one item, and every name is checked as today. The tree reaches the
     Admin unchanged.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/check-field-sections.ts`.
   - **Verification:** `prepare-registry.unit.spec.ts` - a collection and a block section with a group and
     a row are recorded as written; refused: a group in a group, a group in a row, a row of one name, a
     group without items, a name in a group that is not a field, a name in a row and outside it.

2. **P1b.2 - The toolkit lays a tree out**
   - **Outcome:** in `src/admin/components/manager-form-fields/layout/`: the toolkit's own `FormRowLayout`,
     `FormGroupLayout` and `FormLayoutItem`; `collectLayoutNames(items)`; `pruneLayout(items, isShown)`,
     which keeps the names shown and drops a row or group left empty; `FormLayout` (`items`,
     `renderField(name)`), which renders a name through `renderField`, a group through `LayoutGroup` and a
     row through `LayoutRow`, each in its own file. `FormSectionConfig.fields` takes `FormLayoutItem[]`;
     `sectionFormFields` finds the items in no section through `collectLayoutNames`, prunes each section's
     tree to the items shown, and returns each section with its pruned `layout` and its `items`.
   - **Areas:** `src/admin/components/manager-form-fields/layout/`, `section-form-fields.ts`, `index.ts`.
   - **Verification:** unit tests of `collectLayoutNames`, `pruneLayout` and `sectionFormFields` (a group
     and a row pruned to the items shown, a section left empty dropped); `typecheck:admin`.

3. **P1b.3 - The forms render the tree**
   - **Outcome:** `sectionDocumentFields` returns each section's `layout` without its areas, and the areas
     apart. `DocumentFields` takes an optional `layout` over its `fields` and renders through `FormLayout`;
     the edit form and the create modal pass a section's layout, and `BlockCard` renders a section's
     layout with `ManagerFormField`.
   - **Areas:** `src/admin/cms/common/section-document-fields.ts`,
     `src/admin/cms/common/document-fields/document-fields.tsx`, the edit and create forms,
     `src/admin/cms/common/area-field/area-field.tsx`.
   - **Verification:** `typecheck:admin`; the user groups `image` with `image_alt` and puts `cta_label`
     and `cta_href` in a row in the host's image and text block, on a page and in its create modal.

4. **P1b.4 - The review of 1b** (user, 2026-11-12)
   - **Outcome:** `section-form-fields.ts` and its test moved into `layout/`, committed alone, and
     `LayoutSectionConfig` into `layout/types.ts`. `FormLayout` takes `layout`, `items` and
     `renderItem(item)` and finds each item by name, so a section drops its `items` (toolkit) and `fields`
     (CMS) and the forms their own lookups; the edit form tests `section.layout` for fields to show.
     `sectionDocumentFields` takes a section's areas off the top of its tree instead of pruning it again.
     `pruneLayout` is one recursion. `ungrouped` and `ungroupedAreas` become `unsectioned` and
     `unsectionedAreas`, as "group" now names a node. In `checkFieldSections`, `walkLayout` takes one
     `where` for its messages, the containers' children are typed, and a node of a JS config without
     `fields` is refused with the message of its type rather than a `TypeError`.
   - **Areas:** `src/admin/components/manager-form-fields/layout/`, `index.ts`,
     `src/admin/cms/common/section-document-fields.ts`, `document-fields/document-fields.tsx`,
     `area-field/area-field.tsx`, the edit and create forms, `src/lib/field/check-field-sections.ts`.
   - **Verification:** the toolkit's unit tests with the new result shape; `prepare-registry.unit.spec.ts`
     refusing a group and a row without `fields`; `typecheck:admin`; the user sees the host's image and
     text block, a page and its create modal unchanged.

5. **P1b.5 - A document field ready for large forms** (user, 2026-11-12)
   - **Outcome:** `DocumentField` is memoized and only picks a component: a slug or a unique field goes
     through the new `CheckedDocumentField` (the slug fill, the taken-value check, the slug lock and the
     offered value, as `DocumentField` held them), any other field straight to `ManagerFormField`, with
     no hooks. A render of the form that changes no field's props (`isDirty`, a save pending, an upload)
     no longer renders every field: the props are stable already, `autoFilled` a ref and `onTakenChange`
     a `useCallback` in `useDocumentFormChecks`. The slug locks when `documentId` is given, so
     `lockSlug` and `DocumentFormLayout`'s `lockSlugs` go.
   - **Outcome, shared values** (user, 2026-11-12): each form wraps its content once in a
     `DocumentFormProvider` with the form, the collection, `documentId`, `autoFilled` and
     `onTakenChange`, read through `useDocumentForm()`, which throws outside it, as
     `MediaFieldsProvider` does. `DocumentFormLayout` takes `fields` and `layout` only, `DocumentField`
     the `field`. The form comes from this context, not from react-hook-form's `useFormContext`: its
     value follows `formState`, so every field would render on each change of the form's state.
   - **Areas:** `src/admin/cms/common/document-fields/`, `src/admin/cms/common/document-form-provider/`,
     the edit and create forms.
   - **Verification:** `typecheck:admin`, lint; the user checks in the host project that a slug fills from
     its source, a taken value is flagged with its offer, the slug locks on the document page until
     **Unlock** and is editable in the create modal.

6. **P1b.6 - The review of 1b, continued** (user, 2026-11-12)
   - **Outcome:** `checkFieldSections` and `prepareFieldSections` moved to `src/lib/layout/`, committed
     alone. `sectionDocumentFields` returns `main` and `side` instead of one list, so the edit form drops
     its two filters by `position` and the create modal its own sort. The edit form renders a section's
     `DocumentFormLayout` without testing its layout first, as an empty layout renders nothing.
     `LayoutHeading` in the toolkit's `layout/` shows a label and its description; `LayoutGroup` and a
     block card's section use it.
   - **Areas:** `src/lib/layout/`, `src/lib/collection/prepare-collection.ts`,
     `src/lib/block/prepare-block-sections.ts`, `src/admin/components/manager-form-fields/layout/`,
     `src/admin/cms/common/section-document-fields.ts`, `area-field/area-field.tsx`, the edit and create
     forms.
   - **Verification:** typecheck, admin typecheck, lint, format check, unit tests; the user sees the main
     and side sections of a page in their columns, the side ones last in the create modal, and the
     image group and the block card's section headings unchanged.

7. **P1b.7 - The edit form composes its parts** (user, 2026-11-12), ahead of 1d, which adds main tabs
   to the same form
   - **Outcome:** in `document-edit-form/`, `DocumentSectionCard` is the card of a section and of an area
     in no section, which `LayoutMainTabs` will hand on in 1d; `DocumentEditHeader` holds the title,
     the note on a published document, **Save** and the action menu; `StaleVersionAlert` the warning with
     **Reload**; `buildUpdatePayload` in `config.ts` the body of a save, the areas left as they opened
     left out. `DocumentFormProvider` also holds `onServerErrorsChange`, so `DocumentValidation` takes no
     props in either form. `useDocumentFormMedia(form, initialMedia)` in `cms/common/hooks/` sets up both
     forms' media: the record store, the source, the upload of the chosen files and whether it runs.
   - **Areas:** `src/admin/cms/document-edit-form/`, `src/admin/cms/common/document-form-provider/`,
     `src/admin/cms/common/document-validation/`, `src/admin/cms/common/hooks/`, the create form.
   - **Verification:** a unit test of `buildUpdatePayload`; admin typecheck, lint, format check; the user
     sees the document page unchanged, a save sending a changed area and leaving an unchanged one, the
     live validation marking a filled field, and the warning with **Reload** after a save from an
     outdated form.

8. **P1b.8 - The review of `cms/common` and the form toolkit** (user, 2026-11-12)
   - **Outcome:** committed alone first, the code unchanged: the layout's tree functions and their tests
     in `layout/utils/`, and `area-field.tsx` split into `AreaField`, `BlockCard`, `BlockSummary` and
     `OwnError`, one file each, with `AreaFormValues` in `area-field/types.ts`. Then: the toolkit's
     `types/` folder becomes `types.ts`, and the props of `ManagerFormField` and `ManagerFormFields` sit
     in their components' files; `useCmsMediaSource` goes into `useDocumentFormMedia`, its only caller;
     `AreaField` reads the form and the collection from `DocumentFormProvider`. `ManagerFormFields`
     stays, unused in this plugin, as main spec D30 keeps it for the plugins the toolkit goes to.
   - **Areas:** `src/admin/components/manager-form-fields/`, `src/admin/cms/common/area-field/`,
     `src/admin/cms/common/hooks/`, the edit form.
   - **Verification:** typecheck, admin typecheck, lint, format check, unit tests; the user sees an area's
     blocks added, moved, removed and their errors shown as before, and a file picked in a form.

### Sub-phase 1c

Goal: `collapsible` and `tabs` in a section, in the config, the registry and the three forms, with the
error count on a tab and a closed collapsible. The host splits the image and text block into tabs.

1. **P1c.1 - The nodes in the config and their check**
   - **Outcome:** `LayoutCollapsibleConfig`, `LayoutTabConfig` and `LayoutTabsConfig` in the config types
     and the toolkit's copy, and in `LayoutItemConfig`. `checkFieldSections` takes them in its table of
     containers: a section takes a group, a row, a collapsible and tabs; a tab a group, a row and a
     collapsible; a collapsible a group and a row; a group a row; a row names only. Tabs hold at least two
     tabs, and a tab and a collapsible at least one item, with the messages of "Contracts".
   - **Areas:** `src/lib/config/types.ts`, `src/lib/layout/check-field-sections.ts`,
     `src/admin/components/manager-form-fields/layout/types.ts`.
   - **Verification:** `prepare-registry.unit.spec.ts` - a section with tabs holding a collapsible is
     recorded as written; refused: tabs in tabs, a collapsible in a collapsible, tabs in a group, tabs of
     one tab, a tab and a collapsible without items, a name in a tab that is not a field.

2. **P1c.2 - The tree and its errors in the toolkit**
   - **Outcome:** `collectLayoutNames` and `pruneLayout` walk a tab's items too; `pruneLayout` drops a tab
     left empty and tabs left without one, and keeps tabs left with one tab. `countLayoutErrors(errors,
     name, names)` in `layout/utils/` counts the error messages under `<name>.<item>` for each name;
     `useLayoutErrorCount(form, name, names)` in `layout/hooks/` reads them through `useFormState` for
     those paths only. `LayoutErrorBadge` shows the count, with the copy
     `managerFormFields.layout.errorCount_one` and `_other`, checked with `codee-ui-copy`.
   - **Areas:** `src/admin/components/manager-form-fields/layout/`, `src/admin/i18n/json/en.json`.
   - **Verification:** unit tests of `collectLayoutNames`, `pruneLayout` and `countLayoutErrors`;
     `typecheck:admin`.

3. **P1c.3 - The forms render the nodes**
   - **Outcome:** `LayoutCollapsible` (a header button with the triangle icon, `LayoutHeading`, the
     badge while closed, `aria-expanded`; open unless `initCollapsed`; its content hidden, not
     unmounted) and `LayoutTabs` (`Tabs` from `@medusajs/ui`, a badge on each trigger, the tab's
     description above its items, each content force-mounted and hidden while inactive). Their items, and
     a group's, sit in `LayoutItems`, 16px apart, as the fields of every form section now do. `FormLayout` renders both and takes `form` and `name`, the path its items sit under,
     for the counts: `DocumentFormLayout` gives `document`, `BlockCard` the block's path. The changeset
     `form-layout-groups-rows.md` names the two nodes.
   - **Areas:** `src/admin/components/manager-form-fields/layout/`,
     `src/admin/cms/common/document-fields/document-form-layout.tsx`,
     `src/admin/cms/common/area-field/block-card.tsx`, `.changeset/form-layout-groups-rows.md`.
   - **Verification:** `typecheck:admin`, lint, format check; the user splits the host's image and text
     block into tabs with a collapsible, sees an error in a hidden tab counted on it, and an unlocked slug
     stay unlocked across a page's section tabs.

### Sub-phase 1d (deferred; steps written when it comes back)

Deferred by the user on 2026-11-12: tabs in a section split a page's fields into "General | SEO", which
covers the page today. It comes back when a collection needs several cards in one tab or its areas in a
tab, which a section's tabs cannot hold. The config shape, the rules, the contracts and the edge cases
of `admin.mainTabs` above stay as designed.

Goal: `admin.mainTabs` with `LayoutMainTabSectionConfig` and `LayoutMainTabConfig`, checked by
`prepareMainTabs`, carried to the client (the `list-cms-collections` step test expects them on a
collection); `sectionDocumentFields` returns the main tabs; `LayoutMainTabs` in the edit form under its
header card and in the create modal, the side sections after it. The host splits a page into Content and
SEO.

## Short Tracker

- `done` - P1a.1: files renamed with their import paths, committed alone as `e9aefdc` (2026-11-11).
- `done` - P1a.2: `admin.sections` and the section names; the shared checks in `checkFieldSections`,
  a block's in `prepareBlockSections`. The toolkit's result keeps its `ungrouped` key, which names the
  items in no section. In `sub-collections-and-documents` the config table and the form layout paragraph
  say `admin.sections`; its done steps and tracker entries keep `admin.groups` as built then.
- `done` - P1a.3: a block card's sections, each set apart by a top border, under its label and
  description; typecheck, admin typecheck, lint, format check and all 386 unit tests pass. Exit gate of
  1a: the user moved the host project to `admin.sections` and checked the image and text block's
  section (2026-11-11).
- `done` - P1b.1 and P1b.2: the tree in the config, checked by `checkFieldSections`; the toolkit's
  `layout/` with `collectLayoutNames`, `pruneLayout`, `FormLayout`, `LayoutGroup` and `LayoutRow`.
- `done` - P1b.3: built; typecheck, admin typecheck, lint, format check and all 398 unit tests
  pass (2026-11-11). The host's image and text block has a group and a row in its config, and the user
  found the result good in the Admin (2026-11-11). Reviewed with the user (2026-11-12); the findings
  went into P1b.4.
- `done` - P1b.4 to P1b.8, the review of 1b with the user (2026-11-12): committed as `8825285`,
  `4de0de3`, `d1f1d89`, `380c992`, `d210535`, `c77ccd9`, `847d429`, `00248f0`, `103f0af` and `4002e01`,
  each move alone before its content change. Typecheck, admin typecheck, lint, format check and all 402
  unit tests pass, and the user checked the forms in the host project. 1b is closed (user, 2026-11-12).
- `done` - Sub-phase 1c (2026-11-12): P1c.1 to P1c.3, committed as `8f07c4f`; typecheck, admin
  typecheck, lint, format check and all 418 unit tests pass. The host's config lays a page and its two
  blocks out in tabs, collapsibles, groups and rows; the user checked the error counts and the state kept
  across tabs, and settled the spacing (16px everywhere) and the group's box on it.
- `done` - The sub-spec is closed without 1d (user, 2026-11-12) and moved to `ended/`.
- `pending`, deferred (user, 2026-11-12) - Sub-phase 1d, `admin.mainTabs`: tabs in a section cover the
  page; it comes back with a collection that needs several cards or its areas in one tab. Once 1c is
  checked, the sub-spec closes without 1d; a new sub-spec takes it up then, from the design recorded here.
- The spec was approved by the user on 2026-11-11.
- `done` - `codee-spec-writing` checklist and `codee-spec-review-medusa` review, run in the same session,
  not by an independent reviewer (2026-11-11): four Medium and two Low findings fixed in the spec.
- `done` - The layout names (user, 2026-11-11), renamed in the code; typecheck, admin typecheck, lint,
  format check and all 398 unit tests pass; committed as `557e1ab`. The names: config types `Layout<Node>Config` (`FieldSection` →
  `LayoutSectionConfig`, `BlockFieldSection` → `LayoutBlockSectionConfig`, `RowLayout` →
  `LayoutRowConfig`, `GroupLayout` → `LayoutGroupConfig`, `SectionItem` → `LayoutItemConfig`, the
  toolkit's `Form*` copies the same, `RegistryFieldSection` → `RegistryLayoutSection`), components
  `Layout<Node>`, and `admin.tabs` → `admin.mainTabs`. The steps of 1a and 1b keep the names they were
  built with.
