# Workflow Hooks

**Date:** 2026-11-22
**Status:** active
**Area:** backend
**Related:** [main-spec](./2026-11-04-main-spec.md), [sub-relations](./2026-11-22-sub-relations.md),
[sub-singletons](./ended/2026-11-18-sub-singletons.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-22-sub-workflow-hooks.md`

## TLDR

The plugin's five write workflows - create, update, publish, unpublish and delete - expose a Medusa
`validate` hook, so a host adds its own rules to them without forking the plugin. The handler gets
`{ input, collection, document }`, runs after the plugin's own checks and before the first write, and
refuses the write by throwing. A host keeps a document in use from vanishing this way - the first host's
homepage pages - and may check what the CMS config does not know. The plugin keeps the policy out of its
own code and registers no handler (user, 2026-11-22). Built before `sub-singletons`' Phase 3.

## Problem

A host cannot add a rule to the plugin's writes: the workflows take no handler, and a subscriber runs
after the write. `sub-relations` leaves the refusal of an unpublish or a delete of a referenced document
to the host, which needs a place to put it.

## Current State and Evidence

- `validate` is Medusa's most common hook: eleven core workflows, mostly the cart's, such as
  `@medusajs/core-flows` `dist/cart/workflows/add-to-cart.js:107`, `createHook("validate", { input, cart })`.
  It sits after the entities are read and Medusa's own checks, before the first write, and is exposed
  through `new WorkflowResponse(result, { hooks: [validate] })` (`:267`).
- A hook takes one handler: `Cannot define multiple hook handlers for the <name> hook`
  (`@medusajs/workflows-sdk` `dist/utils/composer/create-hook.js:73`). Core registers none itself.
- The handlers are a `Map` the workflow object shares by reference with `WorkflowManager`
  (`dist/utils/composer/create-workflow.js:91-136`). A handler registered on a second copy of the
  package lands in a `Map` the registry does not read, and is lost without an error.
- The first host's backend resolves the plugin from `apps/backend/node_modules/@mostrajs/cms`,
  for its imports and Medusa's plugin loading alike; a stale pnpm copy sits in the workspace root
  `node_modules` (checked 2026-11-22).
- Each workflow's last check before its first write (`src/workflows/cms/workflows/`):
  `create-cms-document.ts` `prepareCmsWriteStep`; `publish-cms-document.ts` `prepareCmsPublishStep`,
  which refuses a document with nothing new; `unpublish-cms-document.ts` `prepareCmsUnpublishStep`, which
  refuses a document that is not published; `delete-cms-document.ts` `prepareCmsDeleteStep`, after
  `validateCmsSingletonStep`.
- `update-cms-document.ts` checks the body inside each of its two `when()` branches - `save-cms-draft`
  writes the rows, `save-cms-published-draft` records a draft only - each with its own
  `validateCmsDocumentStep`. The last check before both is `validateCmsBaseVersionStep`.
- A restore runs the update workflow nested (`restore-cms-document-version.ts`, step 4); a discard only
  moves `latest` back to the newest published version and deletes nothing
  (`discard-cms-document-draft.ts`).
- The plugin's integration test app is the plugin's own `src` (`medusa-config.ts`), so a handler in
  `src/workflows/hooks/` would ship in the package.

## Target Behavior

- A host registers `<workflow>.hooks.validate(handler)` on any of the five write workflows, imported
  from `@mostrajs/cms/workflows`.
- The handler gets `{ input, collection, document }`: the workflow's input, the collection's slug, and the
  document as stored - `null` for a create.
- It runs once per run, after the plugin's checks and before the first write; a throw refuses the write,
  which leaves nothing written and emits no event.
- A `MedusaError` it throws reaches the Admin route's caller as Medusa answers it: `NOT_ALLOWED` as `400`
  with the handler's message.
- A restore runs the update's handler, with `input.change_type` `"restore"`.
- A workflow without a registered handler behaves as today.

## Proposed Solution

- **`validate` only** (user, 2026-11-22). Hooks after a write (`documentCreated`, ...) wait: a side
  effect has the `cms.document.*` events (D38) and a subscriber; an after-write hook helps only an effect
  that must share the transaction, and none is known.
- **One name for every operation.** Each workflow is one operation, so the hook keeps Medusa's name
  rather than per-phase names; a `beforeDelete` is `deleteCmsDocumentWorkflow.hooks.validate`.
- **Its input, after Medusa's `{ input, cart }`:** `input`, the workflow's input as the route passed it;
  `collection`, the slug, so one handler serves several collections; `document`, the row as stored, read
  by the workflow's `getCmsDocumentStep`, or `null` for a create. For a published document in update and
  publish, the row is the live content, not the draft.
- **Where it sits:** directly before the first write step, after the plugin's last check:
  - create: after `prepareCmsWriteStep`, before `createCmsDocumentContentStep`;
  - publish: after `prepareCmsPublishStep`;
  - unpublish: after `prepareCmsUnpublishStep`;
  - delete: after `prepareCmsDeleteStep`;
  - update: after `validateCmsBaseVersionStep`, before the two branches, so it is one point. There,
    `input.document` is the body as the editor sent it, not yet checked by the plugin: a hook name
    appears once in a workflow, so it cannot sit in each branch, and after the branches the rows are
    written already.
- **No hook in discard or in the `validate` workflow** (user, 2026-11-22). A discard changes which draft
  is the latest only. The Admin's live validation therefore does not run a host's rule; a refusal shows
  when the editor saves, publishes or deletes, which is where a rule of the kind "keep this page" applies.
- **One handler per hook, as Medusa** (user, 2026-11-22). A host combines its rules in one handler per
  workflow; a rule two workflows share - a page in use, refused at an unpublish and a delete - is one
  function of the host's called from both. The plugin registers none.
- **The refusal is a `MedusaError`** the handler throws, `NOT_ALLOWED` for a rule; the Admin shows its
  message in the toast under its translated title, as other refusals today. The message's language is the
  host's (user, 2026-11-22).

### Alternatives Considered

- **Arrays of hooks per phase:** Medusa takes one handler per hook, and a list of handlers on
  top would be a second hook system the host learns beside Medusa's.
- **A hook in each branch of update, or after them:** the first is impossible, the second runs after the
  draft's rows are written, so a refusal would lean on compensation.
- **A hook in the `validate` workflow too:** a host rule would run while the editor types; left out until
  a rule needs it, which adds the hook without a break.

## Contracts

- **Additive:** each of `createCmsDocumentWorkflow`, `updateCmsDocumentWorkflow`,
  `publishCmsDocumentWorkflow`, `unpublishCmsDocumentWorkflow` and `deleteCmsDocumentWorkflow` gains
  `.hooks.validate`. Inputs, results and events are unchanged.
- **Handler:** `(data: { input: <Workflow>Input; collection: string; document: CmsDocument | null }, { container }) => void | StepResponse`;
  `document` is `null` in create only. Its result is not read.
- **One copy:** the handler reaches the plugin's routes only when the host imports the copy of the
  package Medusa loads.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| No handler registered | the five workflows run as today | the existing workflow and HTTP tests |
| A handler refuses a create | nothing created, no event | workflow test (P1.2) |
| A handler refuses an update of a draft and of a published document | rows, version and events unchanged | workflow test (P1.2) |
| A handler refuses a publish, an unpublish, a delete | the document stays as it was, no event | workflow test (P1.2) |
| A restore | the update's handler runs with `change_type: "restore"` | workflow test (P1.2) |
| A plugin check fails first: a delete in a singleton, an unpublish of a draft | the plugin's error; the handler does not run | workflow test (P1.2) |
| A handler refuses a delete through the Admin route | `400` with the handler's message | HTTP test (P1.2) |
| The host imports another copy of the package | the handler never runs, no error | the host's walkthrough, `sub-singletons` Phase 3 |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A host's handler is silently lost on a second copy of the package | medium | host rules | README note; the host's walkthrough refuses a delete through the Admin | a later install that duplicates the package |
| A host rule on update reads an unchecked body | low | host rules | stated in the contract and README | a host that trusts it anyway |
| A slow handler slows every save | low | Admin saves | README: the handler runs in the request; heavy work goes to a subscriber | a host's choice |

**Rollout:** additive; a workflow with no handler runs one no-op step more.

**Rollback:** remove the hooks; a host's registration then fails at start on an unknown hook, so the host
drops its handler with it.

## Dependencies

- None in the plugin. The first host's handler reads its homepage settings itself until `sub-relations`
  P1b.2 gives it `list-cms-references`; the README's references example is the user's (2026-11-22).

## Acceptance Criteria

- [ ] A registered handler refuses each of the five writes with nothing written and no event.
- [ ] The handler gets `{ input, collection, document }`, `document` `null` in create only.
- [ ] A restore runs the update's handler; a plugin check that fails earlier keeps the handler from running.
- [ ] The Admin's delete route answers `400` with the handler's message.
- [ ] The README documents the hooks, their input, their position and the one-copy rule.

## Phasing

### Phase 1 - The `validate` hooks

**Goal:** a host refuses any of the five writes from its own handler.

**Prerequisites:** None.

**Exit gate:** typecheck, lint, format check and unit tests pass; the user runs the hooks' integration
test; `sub-singletons`' Phase 3 walkthrough refuses a delete through the host's handler.

## Implementation Plan

### Phase 1

1. **P1.1 - The hook in the five workflows**
   - **Outcome:** `.hooks.validate` on create, update, publish, unpublish and delete.
   - **Areas:** `src/workflows/cms/workflows/{create,update,publish,unpublish,delete}-cms-document.ts`
   - **Changes:** `createHook("validate", { input, collection: input.collection, document })` at the
     position above, returned in `WorkflowResponse`'s `hooks`; each workflow's JSDoc step order names it.
   - **Verification:** `yarn typecheck`, `yarn lint`; the existing unit tests.

2. **P1.2 - The hooks' tests**
   - **Outcome:** the scenarios of the table above, but the host's copy, proven against the test app.
   - **Areas:** `integration-tests/http/cms/workflows/validate-hooks.spec.ts`
   - **Changes:** handlers registered in the test file, as the test app's `src` is the package; each
     records its input and refuses while the test asks it to. Workflow runs for each write, the restore
     and an earlier plugin refusal; one Admin `DELETE` answering `400`.
   - **Verification:** the user runs `yarn test:integration:http integration-tests/http/cms/workflows/validate-hooks.spec.ts`.

3. **P1.3 - README**
   - **Outcome:** a host's guide to the hooks.
   - **Areas:** `README.md`
   - **Changes:** a section after "Rules over a model's fields": the five hooks, the input, the position,
     update's unchecked body, one handler with a shared rule function, the `MedusaError`, the one-copy
     rule; "It reads no data" there links to it.
   - **Verification:** `yarn format:check`; read through.

## Short Tracker

- `done` - Phase 1. The open questions answered by the user on 2026-11-22. P1.1, P1.2
  and P1.3 built (2026-11-22): the hook in the five workflows, the restore's JSDoc naming it;
  `validate-hooks.spec.ts`; the README's "Your own rules at a write". 1037 unit tests, typecheck
  (integration tests included), lint and the format check pass; `validate-hooks.spec.ts`, 9 tests, passes
  (user's run, 2026-11-22).
- `done` - Phase 1 exit gate (2026-11-22): the user's walkthrough of `sub-singletons`' Phase 3, the
  host's handler in `src/workflows/hooks/validate-cms-documents.ts` refusing an unpublish and a delete of a
  homepage page through `list-cms-references`, another page passing.
