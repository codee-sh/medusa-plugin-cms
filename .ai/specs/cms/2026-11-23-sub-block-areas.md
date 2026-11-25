# Block Areas

**Date:** 2026-11-23
**Status:** active
**Area:** cross-cutting
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-23-sub-block-areas.md`

## TLDR

A collection's lists of blocks are `areas`, and a block's are `repeaters`. They are one thing: the same
`AreaConfig`, the same `content_area` rows, the same editing. The only difference is what owns the row: a
document, through its foreign key, or a block, through `parent_id`. Two names for one thing hide that
(user, 2026-11-23). This sub-spec names both `areas`, as the host already reads them in
`CmsBlockValue.areas`.

It also brings two things a collection's sections already have to a block's sections:

- a block's section may hold its areas, so a list of blocks may stand between sections and not only at
  the card's end;
- a block with sections lays out every field in them, so no field is drawn outside a section without the
  config saying so.

Storage, the store API and saved versions do not change.

## Problem

- **Two names for one mechanism.** D32 renamed a block's `areas` to `repeaters` on 2026-11-12, while a
  collection kept `areas`. The config, the registry, the Admin projection and about 270 places in the
  code call one mechanism by two names. A reader of the first host's config cannot tell that `items` of
  `grid` is the same kind of thing as `sections` of `page`.
- **A block's lists of blocks always stand last.** A block card draws its fields in no section, then its
  sections, then its repeaters. A block section holds fields only, and the start refuses `areas` on it.
- **A block's fields in no section are drawn above its sections.** The first host's `hero` lays out
  `image`, `image_alt`, `cta_*` in two sections, and the card draws `label`, `title` and `description`
  above them, though the config never places them there.

## Current State and Evidence

- `src/lib/config/types.ts` - `BlockConfig.repeaters?: Record<string, AreaConfig>`, "each stored as an
  area row whose `parent_id` is the block's id; the block's model needs no relation for it". A
  collection's `areas` is the same `AreaConfig`. `LayoutBlockSectionConfig` is `LayoutSectionConfig`
  without `areas` and `position`, and its JSDoc says "a field in none of them shows before them".
- `src/lib/block/prepare-block.ts` - prepares a block's repeaters through `prepareAreas`, the function a
  collection's areas go through, with the kind `"repeater"` for its messages.
- `src/lib/block/prepare-block-sections.ts` - `validateBlockSectionKeys` refuses `position` and `areas` on
  a block's section ("a card has no columns and lays no areas out"); `validateFieldSections` runs with no
  area names.
- `src/lib/area/prepare-areas.ts` - one checker for "a collection's areas or a block's repeaters": no
  column of the holder shares a name, none is called `areas`, every block type is registered.
- `src/admin/cms/common/area-blocks/block-content.tsx` - draws the fields in no section, then each
  section, then each repeater as an `AreaBlocks`; none at `maxDepth`.
- `src/admin/cms/document-edit-form/document-edit-form.tsx` - a collection's section draws its fields,
  then the areas it names; an area no section names follows as a section of its own. The split comes
  from `sectionDocumentFields` (`src/admin/cms/common/utils/section-document-fields.ts`), a pure function
  of the collection, its fields and its areas.
- `src/lib/layout/validate-field-sections.ts` - `validateFieldSections` checks that each section names
  fields and areas that exist, each in one section at most; it does not check that every field is in a
  section, for a collection or a block.
- `jest.config.js` - unit tests run in `node` on `*.unit.spec.[jt]s`; no React component is unit-tested,
  so the Admin's logic is tested through its pure functions.
- `src/admin-extensions/types.ts` - `CmsBlockValue.areas`, "the block's repeaters, each under its name":
  the host already reads a block's lists as `areas`.
- `src/lib/block/types.ts` - `RegistryBlock.repeaters`, and `ClientBlock` picks it, so
  `GET /admin/cms/collections` answers `blocks[].repeaters`
  (`integration-tests/http/cms/admin-cms-collections.spec.ts`).
- `src/lib/document/build-store-document.ts` - a store read keys a block's lists by their names (`items`,
  `content`), not under `repeaters`; a write and a version snapshot do the same
  (`prepare-document-write.ts`, `prepare-cms-version-snapshot.ts`).
- 28 source files, 16 unit test files, 4 integration files (`admin-cms-collections`, `admin-cms-documents`,
  `store-cms-documents`, the test module's `cms-config.ts`) and `README.md` use `repeater(s)`.
- `.ai/` - the active `sub-collections-and-documents` (121 mentions), the main spec (25), the active
  `sub-rich-text` (2) and two lessons (`a-query-filter-on-a-relation-narrows-the-parents-not-the-relation`,
  `db-generate-misses-a-changed-where-of-a-partial-index`) use `repeater(s)`.
- [sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md) - gives `LayoutSectionConfig` a
  `key`, so that a structure entry names a singleton's section, and from its Phase 2c requires every
  field of a collection in exactly one section.
- The first host (`apps/backend/src/cms/config.ts` in the first host): `grid` and `grid_item` declare
  `repeaters`; `hero` has fields outside its two sections, while `image_text` has all of its in its one
  section; its storefront reads lists by their names, and no file of it says `repeater`. Its
  `src/cms/__tests__/cms-config.unit.spec.ts` runs `validateConfig(cmsConfig)`, so a config the start
  refuses fails a unit test; `src/modules/content/models/content-area.ts` says "repeater" in a comment.
- In the common CMS shape a list of blocks is a field of type `blocks` among a collection's or a
  block's `fields`, so it sits in any tab or collapsible. The CMS's fields are a model's columns (D28)
  and an area is a table of its own (D4), so the CMS keeps areas apart from fields and places them
  through sections instead.
- **Inference:** the rename touches names only. No row, no store response and no snapshot carries the word
  `repeaters`, so nothing stored or served changes shape except the Admin projection's key.

## Target Behavior

- A block declares its lists of blocks as `areas`, with the `AreaConfig` a collection's areas take. A
  config with `repeaters` stops the start with an error naming the block and saying to write `areas`.
- `GET /admin/cms/collections` answers a block type's lists as `blocks[].areas`. Everything else the
  Admin and store routes answer is unchanged, and documents saved before read and save as before.
- A block's section may name the block's areas in `areas`, drawn after the section's fields, as a
  collection's section draws them. An area no section names follows the sections, as today.
- A block either has no sections, and its card draws its fields in their order, or has sections, and each
  of its fields sits in exactly one of them. A field left out of a block's sections stops the start with
  an error naming the block and the fields.
- A block's section still takes no `position`, as a card has no columns, and takes no `key`, as no
  structure entry names it.

## Proposed Solution

### One name

`areas` everywhere, as decided over `blocks`, `slots`, `zones`, `regions` and `slices` (user, 2026-11-23):

- `blocks` already means two things in the config: the registered block types at the root, and the types
  an area takes. A third meaning for the container would read `blocks: { items: { blocks: [...] } }`.
- `zones` collides with Medusa's widget zones and `regions` with Medusa's Regions.
- `areas` is the storage's name (`content_area`, D4, D26), the host's model's name, a collection's key
  and the host's `CmsBlockValue.areas` already.

```ts
{
  slug: "grid",
  model: ContentBlockGrid,
  fields: { title: { type: "text", label: text("fields.title") } },
  areas: {
    items: { label: text("grid.items"), blocks: ["grid_item", "image_text"], minRows: 1 },
  },
}
```

The rename runs through the code too: `RegistryBlock.areas`, the Admin's props and comments.
`prepareAreas` loses its `kind` parameter, since every holder now calls them areas. One thing keeps one
name in the code, as in the config. The only `repeaters` left is the start's refusal of the old key and
its test.

### A block's sections place its areas

`LayoutBlockSectionConfig` becomes `LayoutSectionConfig` without `position` and `key`: a block's section
is never a structure entry, so it needs no key ([sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md)
gives one to a collection's section; if this phase lands first, the `key` is left out where that
sub-spec adds it). `validateBlockSectionKeys` refuses `position` and `key` and no longer `areas`. `prepareBlockSections` hands the block's area names to `validateFieldSections`, which
already checks a collection's sections against its areas: each named area exists and sits in one
section.

In the Admin, `sectionDocumentFields` takes the sections instead of the collection, so a block splits its
fields and areas the way a collection does. `BlockContent` draws a section's fields, then its areas
through `AreaBlocks`, then the areas no section names. `maxDepth` still hides a block's areas at the last
level, wherever they stand.

```ts
{
  slug: "hero",
  admin: {
    sections: [
      { label: text("hero.sections.content"), fields: ["label", "title", "description"] },
      { label: text("hero.sections.media"), fields: [/* … */] },
      { label: text("hero.sections.callToAction"), fields: [/* … */] },
    ],
  },
}
```

### A block's fields: all in sections, or none

A block with `admin.sections` lists every field in them; a block without draws its fields in order, as a
small block such as `grid_item` should. The rule matches the collections' explicit sections of
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md) (Phase 2c), kept looser for blocks:
a block is one card, and sections only divide it, so a block of two fields needs none (user, 2026-11-23).
`BlockContent` keeps its path for a block without sections and drops the one for fields outside a block's
sections.

The rule is one check, in `validateFieldSections`, which this sub-spec and Phase 2c of
[sub-admin-building-blocks](./2026-11-22-sub-admin-building-blocks.md) both use: given the fields of what
it lays out, it names those in no section. A block calls it when it has sections; a collection, from
Phase 2c, always. Whichever phase lands first writes the check and its tests, and the other only calls
it.

### Alternatives Considered

- **Keep `repeaters`:** the D32 name. It names the editing gesture, not the
  thing, and leaves two names for one mechanism.
- **A field of type `blocks`, as the common CMS shape has it:** a list of blocks could then sit in any tab or row.
  It breaks D28 (a field is a column of the model) and D4 (an area is a table of its own); sections that
  hold areas give the placement without it.
- **`blocks`, `slots`, `zones`, `regions`, `slices`:** see "One name".
- **A bridge that reads `repeaters` as `areas`:** the plugin is unreleased (AGENTS.md, "Plugin Contract"),
  so a config with `repeaters` is refused with a message instead.
- **Explicit sections for every block:** a block of one or two fields would need a heading inside its own
  card. Left to "all or none" (user, 2026-11-23).

## Data Model and Persistence

None. A block's area is a `content_area` row whose `parent_id` is the block, as before (D26, D32). No
migration, no backfill: rows, store responses and version snapshots key a block's lists by their names.

## Contracts

- **Config** (`src/lib/config/types.ts`): `BlockConfig.areas` replaces `BlockConfig.repeaters`;
  `LayoutBlockSectionConfig` takes `areas` and neither `position` nor `key`; a block with sections lays
  out every field in them.
- **Admin projection** (`GET /admin/cms/collections`): `blocks[].areas` replaces `blocks[].repeaters`.
  The plugin's Admin is the route's only client.
- **Unchanged:** the store routes, the Admin document routes' bodies and responses, the events, the
  exported workflows' inputs and outputs, `CmsBlockValue`.
- **Start checks:** `repeaters` on a block refused with "use `areas`"; a block section's `areas` checked
  as a collection's are; a block with sections and a field outside them refused, naming the fields;
  `position` and `key` on a block section refused.
- Before the first release to npm the contract changes freely, so none of this is marked breaking.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A host's config still says `repeaters` | The start stops: `block "grid": "repeaters" is now "areas"` | Registry unit test |
| A document saved before the rename | Reads, edits and saves as before; its blocks' lists keep their names | `admin-cms-documents` HTTP test, unchanged |
| A store read through a block's lists | The same response as before | `store-cms-documents` HTTP test, unchanged |
| A version saved before the rename | Opens and restores as before | `admin-cms-documents` versions cases, unchanged |
| A block section names an area of another block | The start stops, naming the section and the area | Registry unit test |
| A block section names an area at `maxDepth` | The section draws its fields; the area is hidden at that level, as today | Admin check by the user |
| A block section of areas alone | Kept, drawn as the areas' heading and lists | `sectionDocumentFields` unit test |
| A block with sections leaves a field out | The start stops, naming the block and the fields | Registry unit test |
| A block section with `position` or `key` | Refused | Registry unit test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A use of `repeaters` missed in the rename | low | Plugin | Typecheck and the unit and HTTP suites; a search for `repeater` in `src/` and `integration-tests/` finds only the refusal and its test | A comment or a message, caught in review |
| The first host's start fails until its config moves | medium | First host | Its two `repeaters` (Phase 1) and its `hero` sections (Phase 3) change with the plugin, through `yalc`, with the user's approval; its `cms-config.unit.spec.ts` fails until they do | - |
| The specs and lessons keep the old name after the code drops it | low | `.ai/` | P1.2 renames the lessons and the main spec's Current Status, and points the active sub-specs at this one | A dated decision keeps its wording, read through D32's amendment |
| The two specs write the "every field in a section" check twice | low | `src/lib/layout/` | One check in `validateFieldSections`, written by whichever phase lands first | - |
| Areas inside a block's sections change the card's layout for an existing block | low | Admin | Only a section that names an area changes; no config does today | - |

**Rollout:** Phase 1 in the plugin and the first host's config together; Phases 2 and 3 after it.

**Rollback:** each phase is its own commits. Nothing stored changes, so reverting the code and the host's
config restores the earlier names.

## Dependencies

- D4, D26, D32 of the main spec; D32 is amended by this sub-spec.
- Independent of `sub-admin-building-blocks` in order: either may land first. Its Phase 2c and this
  sub-spec's Phase 3 share the check in `validateFieldSections`, and its `key` on a section is what a
  block's section leaves out.

## Acceptance Criteria

- [ ] No `repeater` is left in `src/`, `integration-tests/` or `README.md` but the refusal of the old key
  and its test case, and a config with `repeaters` stops the start with its message.
- [ ] The lessons and the main spec's Current Status say `areas`; the active sub-specs that say
  `repeaters` point at this one.
- [ ] `GET /admin/cms/collections` answers `blocks[].areas`; every other route answers as before.
- [ ] The first host's documents, saved before, read, save and publish as before.
- [ ] A block's section draws the areas it names after its fields; areas no section names follow.
- [ ] A block with sections and a field outside them stops the start, and so does a block section with
  `position` or `key`.
- [ ] The first host's `hero` lays out all its fields in sections, and `grid` and `grid_item` use `areas`.

## Phasing

### Phase 1 - One name

**Goal:** a block's lists of blocks are `areas` in the config, the registry, the Admin projection and the
code, and nothing stored or served changes.

**Prerequisites:** none.

**Exit gate:** `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`,
`yarn test:unit`; the three HTTP files named for the user to run; no `repeater` left but the refusal
and its test; the first host's `cms-config.unit.spec.ts` passes, and the host starts on `areas` and its
pages open and save.

### Phase 2 - Areas in a block's sections

**Goal:** a block's section places the block's areas, as a collection's does.

**Prerequisites:** Phase 1.

**Exit gate:** registry unit tests (a block section's areas, `position` and `key` refused) and
`sectionDocumentFields` unit tests in a new
`src/admin/cms/common/utils/__tests__/section-document-fields.unit.spec.ts` (a block's sections with
areas, a section of areas alone, an area in no section); the validation commands; an area placed between two sections of a block in the test
module, and hidden at `maxDepth`, checked in the Admin by the user.

### Phase 3 - All or none

**Goal:** a block with sections lays out all its fields in them.

**Prerequisites:** Phase 1.

**Exit gate:** registry unit tests, through the check in `validateFieldSections` shared with Phase 2c of
`sub-admin-building-blocks`; the validation commands; the first host's `hero` in three sections, its
`cms-config.unit.spec.ts` passing, checked in the Admin by the user.

## Implementation Plan

### Phase 1

1. **P1.1 - Rename in the plugin**
   - **Outcome:** `BlockConfig.areas`, `RegistryBlock.areas`, `ClientBlock` and `ClientCollection`
     picking `areas`, `prepareAreas` without its `kind` parameter, and every internal name, comment and
     test that said repeater; a config with `repeaters` refused by name.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/block/`, `src/lib/area/`, `src/lib/document/`,
     `src/lib/collection/` (`types.ts`, `prepare-store-query.ts`), `src/workflows/cms/steps/`
     (`list-cms-collections`, `get-cms-document`, `prepare-cms-version-snapshot`,
     `validate-cms-document`), `src/admin/cms/` (`area-blocks`, `document-edit-form/config.ts`,
     `document-version-view`, `common/utils/build-document-value.ts`), `src/admin-extensions/types.ts`'s
     comment, their `__tests__`, `src/lib/registry/__tests__/prepare-registry.unit.spec.ts`,
     `src/admin/utils/__tests__/translate-collection-list.unit.spec.ts`, and
     `integration-tests/modules/test-content/cms-config.ts`.
   - **Changes:** a mechanical rename; the refusal of `repeaters` sits in `prepare-block.ts` beside the
     other config checks of a block.
   - **Verification:** the refusal's case in `src/lib/registry/__tests__/prepare-registry.unit.spec.ts`,
     beside the block's other refused configs; every existing unit test passing under the new name;
     `yarn test:unit`, `yarn typecheck`, `yarn typecheck:admin`, `yarn lint`, `yarn format:check`; a
     search for `repeater` in `src/` finds only the refusal and its test case.

2. **P1.2 - The integration tests and the docs**
   - **Outcome:** the HTTP tests assert `blocks[].areas` and keep every other assertion; `README.md`, the
     lessons and the main spec's Current Status say `areas`; the active sub-specs that say `repeaters`
     point at this one.
   - **Areas:** `integration-tests/http/cms/admin-cms-collections.spec.ts`, `admin-cms-documents.spec.ts`,
     `store-cms-documents.spec.ts`, `README.md`, the two lessons named in "Current State and Evidence",
     the main spec's Current Status, `sub-collections-and-documents` and `sub-rich-text`.
   - **Changes:** the projection's key and the test names; no response other than the projection
     changes. The lessons and the main spec's Current Status take the new name. The main spec's decisions
     and changelog keep their dated wording, read through D32's amendment. `sub-collections-and-documents`
     and `sub-rich-text` get one Short Tracker line each saying a block's `repeaters` are `areas` from
     this sub-spec on, with a link, as `admin.groups` was noted there, and their text stays as written.
   - **Verification:** the three files named for the user to run, one at a time
     (`yarn test:integration:http`); a search for `repeater` in `integration-tests/`, `README.md` and
     `.ai/lessons/` returns nothing; `yarn lessons:check` passes.

3. **P1.3 - The first host's config**
   - **Outcome:** `grid` and `grid_item` declare `areas`.
   - **Areas:** the first host's `apps/backend/src/cms/config.ts` and the comment in
     `apps/backend/src/modules/content/models/content-area.ts`, in its own repository, with the user's
     approval.
   - **Changes:** two keys renamed, one comment reworded.
   - **Verification:** after a `yalc` push, the host's `src/cms/__tests__/cms-config.unit.spec.ts`
     passes; the user starts the host, opens a page with a grid, saves it, and reads it from the store.

## Short Tracker

- `done` - Phase 1 / P1.1 and P1.2 in the plugin: typecheck, admin typecheck, lint, format and unit
  tests pass; the three HTTP files wait for the user to run.
- `done` - Phase 1 / P1.3: the first host's `grid` and `grid_item` declare `areas`, pushed through yalc;
  its `cms-config.unit.spec.ts` passes, and its typecheck shows no CMS error.
- `done` - Phase 1 exit gate (2026-11-23): `admin-cms-collections` (9), `admin-cms-documents` (103) and
  `store-cms-documents` (23) pass, run one at a time; in the first host a page with a grid opened,
  saved and read from the store (user).
- `pending` - Phase 2 or Phase 3, on the user's word.
