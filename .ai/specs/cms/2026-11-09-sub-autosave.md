# CMS Autosave

**Date:** 2026-11-09
**Status:** review
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-versions-and-drafts](./ended/2026-11-06-sub-versions-and-drafts.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-09-sub-autosave.md`

## TLDR

The document page of a collection that opts in saves the editor's changes on its own, 2.5 s after the
editor stops typing, so a closed tab or a lost session does not lose work. An autosave is a save
through the versions of `sub-versions-and-drafts`: it never changes what the store serves, and one
editing session is one version, overwritten in place. **Save draft** stays and closes the
session. Requested by the user on 2026-11-09; every decision below follows the recommendations the user
accepted that day.

## Decisions

| # | Decision |
|---|---|
| A1 | One version per editing session: an autosave overwrites the latest version in place while it is the same editor's open autosave; it needs an `autosave` flag on `cms_version`. |
| A2 | It saves 2.5 s after the editor's last change, while the form holds changes. |
| A3 | Drafts and published documents alike: a draft's row is written as by a manual save, as it is not public. |
| A4 | It waits until the form is valid - no field error, no taken unique value, no server error - and says "Not saved: fix the errors" meanwhile. |
| A5 | The stale-edit check compares the version's number and its `updated_at`, so an overwritten version is still told apart. |
| A6 | **Save draft** stays, closes the session, and the page shows "Saved at <time>". |
| A7 | Off by default; a collection opts in with `autosave` in the config. |

## Problem

- Work exists only in the browser until the editor clicks **Save draft**; a closed tab, an expired
  session or a crash loses it.
- An editor who saves often to be safe fills the history with versions that differ by a word, and
  reaches the 50-version limit quickly.

## Current State and Evidence

- `sub-versions-and-drafts` (built through P2.3): every save records a version through
  `create-cms-document-version` - snapshot, `create-cms-version`, the limit - with `change_type`,
  `changed_fields` and the author. A save sends `base_version`, which `validate-cms-base-version`
  compares with the latest version's number. A draft's save writes its row too; a published
  document's save records a draft version only.
- `createCmsVersion` takes `latest` and numbers the version in one transaction; a generated `update`
  only persists, so ordered writes need a flush
  ([lesson](../../lessons/mikro-orm-writes-inserts-before-updates-in-one-flush.md)).
- `cms_version` rows carry `created_at` and `updated_at` from DML; an update sets `updated_at`.

## Target Behavior

- In a collection with `autosave`, the document page saves 2.5 s after the editor's last change, while
  the form holds changes and is valid; the page shows "Saving…", then "Saved at 14:02".
- The first autosave of a session records a new draft version marked `autosave`; later autosaves of the
  same editor overwrite it in place - its snapshot, its changed fields, its `updated_at` - and the history
  keeps one entry for the session.
- A session ends with **Save draft**, which writes over the autosave version one last time and clears
  its `autosave` mark; with a save, publish, restore or discard by anyone; or after 30 minutes without an
  autosave. The next autosave then starts a new version.
- An autosave never changes what the store serves for a published document; on a draft it writes the
  row, as a manual save does.
- A form with errors is not saved; the page says "Not saved: fix the errors" until it is valid again.
- A save, an autosave or a publish made from a form whose version was overwritten or replaced since it
  was read is refused with the stale message, and autosave stops until the editor reloads.
- A collection without `autosave` behaves as before.

## Proposed Solution

### Config and projection

`CollectionConfig` gains `autosave?: boolean | { delay?: number }`: `true` takes the 2500 ms default,
`delay` sets it in milliseconds, at least 1000. The registry resolves it to `autosave: { delay } | false`
and checks the delay; the projection carries it.

### Model

`CmsVersion` gains `autosave: model.boolean().default(false)`. The migration comes from the user's
`plugin:db:generate` in the plugin and `db:migrate` in the host project.

### The session rule

`prepare-cms-version-write` decides, from the latest version, the actor and the call:

| Latest version | Call | Decision |
|---|---|---|
| a draft marked `autosave`, by the same actor, its `updated_at` within 30 minutes | autosave | overwrite it, `autosave` kept |
| the same | manual save | overwrite it, `autosave` cleared - the session ends |
| anything else | autosave | a new version, `autosave` set |
| anything else | manual save | a new version, as today |

Publish, unpublish, restore and discard always record a new version or move `latest`, as today, so they
end a session by leaving it behind.

An overwrite's `changed_fields` compares the new snapshot with the version before the overwritten one,
so the entry names everything the session changed; the version keeps its number.

### Steps and workflows

- `prepare-cms-version-write` (decision, above) returns `{ action: "create" }` or
  `{ action: "overwrite", version }`, per `codee-medusa-backend-conventions`, "Step shape".
- `update-cms-version` (write) overwrites a version's snapshot, changed fields and `autosave` flag;
  before writing it reads the values it replaces, and its compensation writes them back.
- `create-cms-document-version` branches with two named `when()`: `create-cms-version` as today, or
  `update-cms-version`; the limit runs after a create only.
- `update-cms-document` takes `autosave?: boolean` and passes it on; its row write and validation are
  unchanged, so a draft's autosave writes the row.
- `validate-cms-base-version` takes `base_updated_at` beside `base_version` and refuses either mismatch.

### Stale edits

The single read's `latest_version` adds `updated_at`. Every save, autosave, publish, restore and discard
sends `base_version` and `base_updated_at`; an overwrite changes `updated_at`, so a colleague's form on
the same number is refused. A document without versions sends `null` for both.

### Alternatives Considered

- **A new version per autosave.** No migration and no session rule, but the history and the limit fill
  within minutes. Rejected (A1).
- **A new number for every overwrite.** Keeps `base_version` alone, but numbers then jump by tens per
  session and stop meaning saves. Rejected for `updated_at` (A5).
- **Autosave replaces Save draft.** Simpler page, but no way to close a session on purpose or to see that
  work is saved before leaving. Rejected (A6).
- **Saving invalid content.** Loses nothing, but the history then holds versions no publish can use.
  Rejected (A4).

## Data Model and Persistence

- One column, `cms_version.autosave`, boolean, default `false`; existing versions read as not autosaved.
  No backfill.
- An overwritten session keeps one row; no content outside the editor's document is stored.

## Contracts

### Config

`autosave?: boolean | { delay?: number }` on a collection; additive.

### Admin API

- `GET /admin/cms/collections` - each collection's projection adds `autosave: { delay } | false`.
- `POST .../documents/:id` - the body gains `autosave?: boolean` and `base_updated_at`, beside
  `base_version`; `autosave` on a collection without it answers 400.
- `POST .../publish`, `.../versions/:version_id/restore`, `.../discard` - the body gains
  `base_updated_at`.
- `latest_version` adds `updated_at` and `autosave`; the history's versions add `autosave` and
  `updated_at`.
- A stale `base_updated_at` answers 400 with the stale message, as a stale `base_version` does.

## UI/UX

Copy per `codee-ui-copy`.

- Beside **Save draft**: "Saving…", "Saved at <time>", or "Not saved: fix the errors".
- Autosave runs only on the form of the latest version: not while a version is viewed from the history,
  not while a save or publish is pending, and not after a stale message until **Reload**.
- **Publish changes** stays disabled while the form holds unsaved changes; with autosave that lasts
  until the next autosave.
- The history marks an open session "Autosaving", and shows its time as its `updated_at`.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| Two autosaves of one editor in a session | one version, its snapshot the latest; its changed fields against the version before it | workflow test |
| An autosave after 30 minutes idle | a new version | step test of `prepare-cms-version-write` |
| Another editor saves during a session | the first editor's next autosave is refused as stale and autosave stops | HTTP test |
| **Save draft** after autosaves | the session's version overwritten, `autosave` cleared; the next autosave starts a new version | workflow test |
| An autosave fails mid-write | `update-cms-version` writes the old snapshot back | step test (invoke and compensate) |
| The form is invalid | no request; "Not saved: fix the errors" | the user's walkthrough |
| `autosave` sent for a collection without it | 400 | HTTP test |
| A tab closed before the delay ends | the last 2.5 s are lost | documented |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Autosaves load the server while many editors type. | low | backend | One request per 2.5 s pause per editor; a few editors expected. | Measured in the walkthrough. |
| A draft's row is rewritten every few seconds, so its `updated_at` and lists move while typing. | low | admin | The row is not public; the table orders by `updated_at`, which is what an editor expects. | Lists reorder while someone types. |
| An editor expects autosave on a collection without it. | low | content | The indicator shows only where autosave is on. | Habit. |

**Rollout:** additive; the user runs the `cms` migration, then opts collections in.

**Rollback:** remove `autosave` from the config; autosave versions stay as ordinary drafts. The column can
be dropped with the module's migration down.

## Dependencies

- `sub-versions-and-drafts` phases 1 to 3 (P2.3 and P3.2 included), complete.
- No Medusa upgrade.

## Acceptance Criteria

- [ ] A collection with `autosave` saves the page 2.5 s after the editor stops typing; one without it does
      not. (P1.1, P2.1)
- [ ] One editing session is one version in the history; **Save draft** closes it. (P1.2, P2.1)
- [ ] An autosave never changes the store's answer for a published document. (P1.2)
- [ ] A form with errors is not autosaved. (P2.1)
- [ ] A save over a colleague's overwritten version is refused. (P1.2)

## Phasing

### Phase 1 - Backend

**Goal:** a save can be an autosave that overwrites the session's version; the stale check covers
overwrites.

**Prerequisites:** `sub-versions-and-drafts` complete.

**Exit gate:** step tests pass; the workflow and HTTP tests pass in a manual run; the user ran the `cms`
migration.

### Phase 2 - Admin

**Goal:** the document page autosaves and shows its state.

**Prerequisites:** Phase 1.

**Exit gate:** the user's walkthrough on a collection with `autosave`.

## Implementation Plan

### Phase 1

1. **P1.1 - Model and config**
   - **Outcome:** `cms_version.autosave`; `autosave` in the config types, the registry and the projection.
   - **Areas:** `src/modules/cms/models/`, `src/lib/`
   - **Verification:** unit tests of the registry's check of `autosave`. **Stop: the user generates and
     runs the `cms` migration.**
2. **P1.2 - The session and the stale check**
   - **Outcome:** `prepare-cms-version-write`, `update-cms-version`, the branches of
     `create-cms-document-version`, `autosave` through `update-cms-document` and its route,
     `base_updated_at` on every write route.
   - **Areas:** `src/workflows/cms/`, `src/api/admin/cms/`
   - **Verification:** step tests of both steps, invoke and compensate for the write; workflow and HTTP
     tests of the edge cases above.

### Phase 2

1. **P2.1 - Autosave on the document page**
   - **Outcome:** the timer, the validity check, the indicator, `base_updated_at` in every write, the
     "Autosaving" mark in the history.
   - **Areas:** `src/admin/cms/`, `src/admin/hooks/`
   - **Verification:** the user's walkthrough.

## Short Tracker

- `pending` - Phase 1 / P1.1: waits for `sub-versions-and-drafts` to close and this sub-spec's
  approval.
