# CMS Draft Read

**Date:** 2026-11-06
**Status:** review
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md),
[sub-versions-and-drafts](./ended/2026-11-06-sub-versions-and-drafts.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-06-sub-draft-read.md`

## TLDR

Version 0.0.3 of the plugin (main spec D22). An editor sees a draft on the storefront before publishing.
The Admin issues a short-lived signed token for one document, and a store route returns that document's
latest draft in the same shape as a published read, with the same `fields`. A **Preview** button opens a
URL built from a template in the collection's config. Turning the token into a preview mode is each
storefront's work (main spec D17), in its own project.

**Paths.** As in `sub-collections-and-documents`.

## Problem

- After 0.0.2 a draft is visible only as a form in Admin. An editor cannot see how a page with blocks
  looks before publishing it.
- The store API serves published documents only, and is public, so a draft read needs its own proof of
  access that a storefront can carry without an admin session.

## Current State and Evidence

- `sub-versions-and-drafts` - the latest version of a document is its draft; its snapshot has the shape
  of a write body, and a block added in the draft has no `id`.
- `@medusajs/utils` 2.21.2 `dist/auth/token.js` - `generateJwtToken(payload, { secret, expiresIn })`
  signs with `jsonwebtoken`, which Medusa already ships; a project's `medusa-config.ts` sets
  `http.jwtSecret`, read through `ContainerRegistrationKeys.CONFIG_MODULE`.
- Medusa's auth verifies bearer tokens with the same `jwtSecret`, so a token signed with it directly
  would be a valid JWT for that check, even if its payload holds no actor.
- `/store` routes need a publishable key, and `applyLocale` runs on them
  (`@medusajs/framework` `dist/http/router.js:98-99`).
- **Route shape.** `GET /store/cms/:collection/:id/draft` would collide with `/:collection/slug/:slug`
  for a page whose slug is `draft`. The route below puts the static segment first.

## Target Behavior

- An admin gets a token for one document, valid for 15 minutes.
- With a valid token, a store read returns that document's latest draft, in the shape of a published
  read, honouring `fields`.
- Without one, or with an expired, tampered or foreign token, the route answers 401 and reveals nothing,
  not even whether the document exists.
- A draft read is never cached, and never changes what a public read returns.
- A token reads one document and does nothing else. It is not accepted by any Admin route.
- Related documents and media fields in a draft are shown as in a published read: a related draft stays
  hidden.
- **Preview** appears only on a collection with `admin.previewUrl`.

## Proposed Solution

### The token

`src/lib/document/preview-token.ts`, plain functions:

- `signCmsPreviewToken({ collection, document_id }, jwtSecret)` signs
  `{ purpose: "cms-preview", collection, document_id }` for 15 minutes with `generateJwtToken`;
- `verifyCmsPreviewToken(token, jwtSecret)` verifies it with `jsonwebtoken` and checks `purpose`.

The signing key is `HMAC-SHA256(jwtSecret, "cms-preview")`, not `jwtSecret` itself, so a preview token
never passes Medusa's own token check, and an auth token never passes this one. `jsonwebtoken` is a
Medusa dependency, declared by the plugin as a peer, so no new package enters the project.

### The read

`verify-cms-preview-token` (`src/api/middlewares/`) reads the `x-cms-preview-token` header, verifies it,
and compares `collection` and `document_id` with the route. Any failure answers 401 with one message.

Workflow `get-draft-cms-document` (store):

`get-cms-document` (uncached, any status) -> `get-cms-latest-version` -> `prepare-cms-draft-document` ->
`prepare-cms-reference-ids` -> `list-cms-reference-targets` (uncached) -> `prepare-cms-store-documents`.

`prepare-cms-draft-document` lays the latest snapshot over the document, or leaves it when there is no
version, and orders blocks by their position in the snapshot. A block with no row keeps `id: null`.
`verify-cms-store-query` serves `fields` as on any read, and the list and filter rules do not apply.

### Config

`admin.previewUrl?: string` on a collection: a template with `{id}`, `{slug}` and `{token}`, so the
config stays plain data.

```ts
admin: { useAsTitle: "title", previewUrl: `${process.env.STOREFRONT_URL}/preview?path=/{slug}&token={token}` },
```

The registry refuses a template without `{token}`, or with `{slug}` on a collection with no slug field.
The projection carries it; the Admin fills it in.

### Alternatives Considered

- **Signing with `jwtSecret` directly.** Rejected: the token would be a JWT Medusa's own check can verify.
- **An admin session on the storefront.** Another origin, and a storefront should not hold admin
  credentials. Rejected.
- **`?draft=true` on the existing routes.** Mixes a guarded read into the cached public path. Rejected
  for a separate route.
- **Tokens stored in the database, so they can be revoked.** A table for a 15-minute lifetime. Rejected.
- **A token for a whole collection, or for all drafts.** A leak would expose more. Rejected: one document.
- **A function for the preview URL.** The Admin only reads the projection (main spec D6); a template
  stays plain data.
- **Only copying the token.** Rejected by the user for the template; a copy-paste step for every preview.

## Data Model and Persistence

None. Tokens are stateless.

## Contracts

### Admin API

| Method and path | Body / query | Answer |
|---|---|---|
| `POST /admin/cms/collections/:collection/documents/:id/preview-token` | - | `{ token, expires_at, url }`; `url` is `null` without `admin.previewUrl` |

A read route with no write, but `POST` because each call issues a credential. It runs a workflow
`create-cms-preview-token`, per the backend rule. No `policies` until `sub-cms-permissions`: any admin
can issue one (main spec D12).

### Store API

| Method and path | Headers / query | Answer |
|---|---|---|
| `GET /store/cms/:collection/draft/:id` | `x-cms-preview-token`; `fields` | `{ document }` with areas, `Cache-Control: no-store` |

`document` has the shape of a published read, plus `status` and `has_unpublished_changes`, so a
storefront can label the preview. 401 for any token failure; 404 for a document deleted since the token
was issued; `store: false` collections answer 404.

## UI/UX

- A **Preview** button in the side column of the document page, on a collection with `admin.previewUrl`.
  It saves nothing by itself: when the form has unsaved changes it is disabled with "Save a draft to
  preview it."
- It issues a token and opens `url` in a new tab. A failure shows a toast.
- A preview is valid for 15 minutes; the storefront decides what to do after that.

## Performance and Cache

- One uncached document read per preview, by an editor. No effect on public reads.
- The route never passes `cache` to `query.graph`; related documents are read uncached too.

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| No token, a tampered one or an expired one | 401, the same message | HTTP test |
| A token for another document or collection | 401 | HTTP test |
| A token used on an Admin route | 401 | HTTP test |
| An admin auth token used here | 401 | HTTP test |
| A document with no version | the row is returned | HTTP test |
| A block added in the draft | returned with `id: null`, in position | step test |
| A draft naming a deleted asset or unpublished related document | `null`, or left out of a list, as a published read | step test |
| A public read after a preview | unchanged, and the cache holds no draft | HTTP test |
| A slug `draft` on a page | `/slug/draft` returns the page | HTTP test |
| The document deleted after the token was issued | 404 | HTTP test |
| `previewUrl` without `{token}` | the registry refuses it | unit test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| A token leaks through a URL, a log or a shared link. | medium | content | 15 minutes, one document, read only; a storefront swaps it for a cookie. | Unpublished content of one document for 15 minutes. |
| A draft read lands in a shared cache. | high | content | `Cache-Control: no-store`, no `cache` on the query; a storefront keeps previews dynamic. | A storefront ignoring it. |
| Any admin can issue a token (main spec D12). | low | access | Accepted until `sub-cms-permissions`. | Open until then. |
| Changing `jwtSecret` invalidates tokens. | low | operations | Tokens live 15 minutes. | None. |

**Rollout:** additive: one Admin route, one store route, an optional config key. Nothing changes without
`admin.previewUrl` and a storefront that uses the route.

**Rollback:** remove the routes; no data to undo.

## Dependencies

- `sub-versions-and-drafts` (0.0.2), complete.
- A storefront preview route in a host project, to see it end to end.
- `jsonwebtoken` as a peer dependency of the plugin; already shipped by Medusa.

## Acceptance Criteria

- [ ] A valid token returns the latest draft in the shape of a published read, with `fields`. (P1.3, P1.4)
- [ ] Any bad token answers 401 with the same message. (P1.1, P1.4)
- [ ] A preview token is refused by Admin routes, and an admin token by the draft route. (P1.4)
- [ ] A draft read is never cached and a public read is unchanged. (P1.4)
- [ ] **Preview** opens the template's URL, and is disabled with unsaved changes. (P2.2)

## Phasing

### Phase 1 - Token and store read

**Goal:** a token reads a draft through the store API.

**Prerequisites:** 0.0.2 complete.

**Exit gate:** unit and step tests pass; HTTP integration tests pass in a manual run; lint, typecheck and
format pass.

### Phase 2 - Admin preview

**Goal:** an editor opens a preview from a document.

**Prerequisites:** Phase 1.

**Exit gate:** walkthrough on `page` on a local backend; the plugin `build` passes; guide page and README
updated.

## Implementation Plan

### Phase 1

1. **P1.1 - Token functions**
   - **Outcome:** `signCmsPreviewToken`, `verifyCmsPreviewToken`.
   - **Areas:** `src/lib/document/preview-token.ts`, the plugin's `package.json`
   - **Changes:** per The token; `jsonwebtoken` as a peer dependency.
   - **Verification:** unit tests: sign and verify, expired, tampered, a wrong `purpose`, a token signed
     with `jwtSecret` directly refused.

2. **P1.2 - Config**
   - **Outcome:** `admin.previewUrl`, its registry rules, the projection.
   - **Areas:** `src/lib/config/types.ts`, `build-cms-registry.ts`, `to-cms-client-collection.ts`
   - **Changes:** per Config.
   - **Verification:** unit tests of the refusals.

3. **P1.3 - Workflow and step**
   - **Outcome:** `prepare-cms-draft-document`, `get-draft-cms-document`, `create-cms-preview-token`.
   - **Areas:** `src/workflows/cms/`
   - **Changes:** per The read.
   - **Verification:** step unit tests: no version, a block with no row, order; a workflow integration test in a
     host project (manual run).

4. **P1.4 - Routes and HTTP tests**
   - **Outcome:** the two routes, `verify-cms-preview-token`, and an HTTP integration test in a host
     project (manual run).
   - **Areas:** `src/api/**`
   - **Changes:** per Contracts.
   - **Verification:** each row of Edge Cases marked HTTP test; manual `test:integration:http`; lint,
     typecheck, format.

### Phase 2

1. **P2.1 - Admin hook**
   - **Outcome:** a mutation for the token.
   - **Areas:** `src/admin/hooks/`
   - **Verification:** the plugin's `build`.

2. **P2.2 - Preview button**
   - **Outcome:** the button per UI/UX; the template in a host project's config.
   - **Areas:** `src/admin/routes/cms/[collection]/[id]/`, a host project's config
   - **Verification:** walkthrough: enabled, disabled with unsaved changes, opens the URL.

3. **P2.3 - README**
   - **Outcome:** the README describes previews and what a storefront must do.
   - **Areas:** `README.md`
   - **Verification:** the user reads the section.

## Short Tracker

- `pending` - Phase 1 / P1.1: starts once 0.0.2 is complete and this sub-spec is approved.
