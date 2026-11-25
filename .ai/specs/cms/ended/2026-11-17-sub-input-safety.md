# Input Safety

**Date:** 2026-11-17
**Status:** done
**Area:** backend | admin
**Related:** [main-spec](../2026-11-04-main-spec.md) (D36), [sub-rich-text](../2026-11-17-sub-rich-text.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-17-sub-input-safety.md`

## TLDR

Main spec D36 in code. Every text value a save takes is refused at its path when it holds a control
character, so PostgreSQL never answers a 500 for one. A `url` field type checks a URL against one link
policy, the config's top-level `linkPolicy`, which rich text's links (`sub-rich-text` 1b) use as well. A
`./shared` entry of the package gives storefronts `sanitizeUrl`, the same policy as a function, with no
server code behind it. Text is never rewritten and HTML is not removed: it is escaped where it is shown.

## Settled

User, 2026-11-17 (main spec D36): refuse at the input, never rewrite; values reach SQL as bound
parameters; HTML stays in text and is escaped at output; URLs follow one policy; `sanitizeUrl` is
exported for renderers; the host's `cta_href` moves to `url`. Written after `sub-rich-text` 1a and before
its 1b (user, 2026-11-17).

## Problem

- A text value holding `U+0000` reaches PostgreSQL, which refuses it in a `text` column (error `22021`).
  Medusa's `dbErrorMapper` (`@medusajs/utils` 2.22.7 `dist/dal/mikro-orm/db-error-mapper.js:16-45`) maps
  `23505`, `23502`, `42703` and `23503` only, and rethrows the rest, so the save answers 500 where the
  editor's value is at fault.
- A URL lives in a plain `text` field: the host's hero and image and text blocks keep `cta_href` as
  `type: "text"` (`apps/backend/src/cms/config.ts`), so `javascript:alert(1)` is saved, and a storefront
  that writes it into `href` runs it on a click. Escaping does not help: the URL has nothing to escape.

## Current State and Evidence

- `src/lib/document/build-document-schema.ts` `buildValueSchema` - one schema per field kind: `text`
  and `media` are `z.string()`, `text_list` `z.array(z.string())`, a combobox fed by a hook takes any
  text; `slug` has its own format. The server (`find-document-errors.ts`) and the Admin's live
  validation run it alike.
- `src/lib/field/prepare-fields.ts:29-43` - each field `type` maps to a kind and the column types it
  may sit on; `textarea` is the kind `text` with `input: "textarea"`.
- `src/admin/cms/common/utils/build-field-config.ts:10-20` - each kind maps to a toolkit input type.
- `package.json` `exports` - `.` is `src/lib/index.ts`, which exports `defineConfig` and the media
  providers and so loads the framework; there is no entry a storefront can import without server code.
- Medusa core has no input sanitiser; its one URL check, `safeHttpUrl`, is internal and guards order
  tracking URLs only.

## Target Behavior

- A text value holding a control character - `U+0000` to `U+001F` or `U+007F` - is refused at its path
  with "Remove the control characters from this text", except tab, line feed and carriage return in a
  `textarea`. It applies to `text`, `textarea`, a combobox's values from a hook, each `text_list` item,
  a media value and a `url` - a select's and a listed combobox's values already match their options; `slug` keeps its stricter format; rich text applies it to its text
  nodes (`sub-rich-text` 1b).
- `fields: { cta_href: { type: "url", label: "Button link" } }` on a text column takes a URL its link
  policy allows: by default `http`, `https`, `mailto` and `tel`, and relative URLs - starting with `/`,
  `#` or `?`. `//host`, a URL with a space or a control character, and any other scheme, `javascript:`
  and `data:` included, answer 400 at the field's path with "Use a link starting with https://, mailto:,
  tel: or /" naming the allowed forms.
- The config's top-level `linkPolicy: { protocols, relative }` sets the policy for every `url` field and rich
  text link; a field's own `linkPolicy` replaces it.
- A value is never changed on its way in: no trimming, no stripping, no encoding.
- `import { sanitizeUrl } from "@codee-sh/medusa-plugin-content-cms/shared"` gives a storefront the
  policy as a function: the URL as it is when allowed, `#` otherwise; it imports nothing of Medusa.

## Proposed Solution

### Where it lives

D36's logic lives in `src/shared/` (user, 2026-11-17): the helpers the plugin and the code outside it -
a storefront - both use. It imports nothing of Medusa, not even Zod at runtime - a schema builder takes
`z` as a parameter, as `buildDocumentSchema` does, and imports `zod`'s types only - and nothing of the
plugin's other folders, which import from it; `lib/field/` could not hold it, as
`validate-field-schema.ts` and `validate-model-schema.ts` import the framework. The rule is in
`AGENTS.md`, and `eslint.config.ts` enforces it.

```
src/shared/
  sanitize/
    has-control-characters.ts   hasControlCharacters(text, { multiline })
    build-text-schema.ts        buildTextSchema(z, { multiline })
    link-policy.ts              LinkPolicy, DEFAULT_LINK_POLICY, validateLinkPolicy (1b)
    validate-url.ts             validateUrl(url, policy) (1b)
    sanitize-url.ts             sanitizeUrl(url, policy?) (1b)
    __tests__/
  index.ts                      what the "./shared" entry exposes (1b)
```

| Who | Imports from |
|---|---|
| `src/lib/`, workflows, routes, the CMS screens of the Admin | `src/shared/...` |
| the form toolkit, which may not import `src/lib/` | `src/shared/...` |
| a storefront | `@codee-sh/medusa-plugin-content-cms/shared`, what `index.ts` exports |

The rest are the places that already decide fields, changed where they decide:

| File | What it gains |
|---|---|
| `src/lib/document/build-document-schema.ts` | text kinds through `buildTextSchema`; `url` also through `validateUrl` |
| `src/lib/field/prepare-link-policy.ts` (new) | `prepareLinkPolicy`, which turns `validateLinkPolicy`'s reason into a config error, as `src/shared/` cannot import `buildConfigError` |
| `src/lib/field/prepare-fields.ts` | the `url` type, its policy resolved against `FieldDefaults` |
| `src/lib/registry/prepare-registry.ts`, `prepare-collection.ts`, `prepare-block.ts` | the config's `linkPolicy` resolved once and handed down as `FieldDefaults`, which `sub-rich-text` 1b extends with `richText` |
| `src/lib/config/types.ts`, `src/lib/field/types.ts` | `linkPolicy`, `UrlField`, the kind `url` |
| `src/admin/cms/common/utils/build-field-config.ts`, the form toolkit | the `url` input |
| `package.json`, `eslint.config.ts` | `"./shared"`; the lint rule |

`sub-rich-text`'s own pure functions go to `src/shared/rich-text/` and call `validateUrl` and
`hasControlCharacters` from `src/shared/sanitize/`.

### Control characters

`hasControlCharacters(text, { multiline })` tells whether a text holds `U+0000` to `U+001F` or `U+007F`,
tab, line feed and carriage return allowed when `multiline`. `buildTextSchema(z, { multiline })` returns
`z.string()` refined with it. `buildValueSchema` uses it for every kind that holds text; `textarea`
passes `multiline: true`. The rule lives where every other value rule does, so the Admin shows it while
the editor types and the server refuses it at a save, an import or an API call alike.

### Link policy

- `LinkPolicy = { protocols: string[]; relative: boolean }`; `DEFAULT_LINK_POLICY` is
  `{ protocols: ["http", "https", "mailto", "tel"], relative: true }`.
- `validateUrl(url, policy)` answers `true` or the reason it is refused; `http` and `https` need a host.
- `sanitizeUrl(url, policy = DEFAULT_LINK_POLICY)` answers the URL or `#`.
- `validateLinkPolicy(policy)` answers the reason a policy is refused, or nothing: a protocol that is not
  a scheme name, `javascript`, `data` or `vbscript` among the protocols, or no protocol with
  `relative: false`. `prepareLinkPolicy(links, fallback, path)` in `src/lib/field/` merges a partial
  `linkPolicy` over its fallback and throws that reason as a config error.

The registry resolves each `url` field's policy - its own `linkPolicy`, else the config's `linkPolicy`, else the
default. The projection carries the resolved policy, so the Admin's live validation and the server run
the same check.

### The `url` field type

- Config: `UrlField = FieldBase & { type: "url"; linkPolicy?: Partial<LinkPolicy> }`, on a `text` column; the
  kind `url`; a data rule by D33, as it changes what a save takes.
- Schema: `buildTextSchema` and then `validateUrl` against the field's policy.
- Admin: the toolkit input type `url`, a text input with `inputMode="url"` and no browser validation,
  so a relative URL is not refused by the browser before the schema speaks.
- The registry allows `url` as `useAsTitle` and in `defaultColumns` like `text`, refuses it as a
  slug's `from`, and lets it be `searchable`.

### The `./shared` entry

`src/shared/index.ts` exports `sanitizeUrl`, `validateUrl`, `LinkPolicy` and `DEFAULT_LINK_POLICY` (and,
from `sub-rich-text` 1b, its document types); `package.json` gains `"./shared"`. The lint rule above keeps
it loadable in a browser.

### Alternatives Considered

- **Stripping control characters or HTML on the way in:** rewrites what the editor typed, silently, and
  `a < b` is content; refusing tells them.
- **Mapping `22021` to 400 in an error handler:** answers after the database refused, with a message
  naming no field, and leaves the Admin without a live warning.
- **Medusa's `safeHttpUrl`:** internal (`dist/api/utils/common-validators`), not a public export, and
  allows `http` and `https` only, without relative URLs.
- **A URL check as `serverValidation` in the host:** each host writes it, and rich text links cannot use
  it; one policy in the plugin serves both.

## Data Model and Persistence

No model change: `url` sits on a text column. Stored values are not migrated; one the policy refuses is
refused at the document's next save, at its field, until the editor fixes it.

## Contracts

- **Config:** `Config.linkPolicy?: Partial<LinkPolicy>`; `FieldConfig` gains `UrlField`; `FieldKind` gains
  `url`.
- **Projection:** a `url` field carries its resolved `linkPolicy`.
- **APIs:** a refused value answers 400 at its path, as any field's error does; a stored value is
  returned as it is.
- **Package:** `./shared` is a public entry; `sanitizeUrl(url, policy?)` and `validateUrl(url, policy)` are
  part of the contract.
- **Compatibility:** a save of a value that worked before can now answer 400 - a control character, or a
  host's field moved to `url` holding a refused link. The changeset says so (`minor`, 0.0.x).

## Edge Cases and Failure Scenarios

| Scenario | Expected behavior | Verification |
|---|---|---|
| A title with `U+0000` sent through the API | 400 at `title`, not 500 | HTTP integration test |
| A textarea with line breaks and tabs | saved as it is | unit test of `buildTextSchema` |
| A text field with a line feed sent through the API | 400 at the field | unit test |
| `javascript:alert(1)`, `JavaScript:alert(1)`, ` javascript:` with a leading space, `//evil.example` in a `url` field | 400 at the field | unit tests of `validateUrl` |
| `/about`, `#faq`, `?page=2`, `https://example.com`, `mailto:a@b.co`, `tel:+48123` | saved | unit tests of `validateUrl` |
| `https:/example.com`, `https://` with no host | 400 at the field | unit tests of `validateUrl` |
| A stored `cta_href` the policy refuses, after the host moves it to `url` | the next save answers 400 at it; reads return it unchanged | unit test of the schema; the host's walkthrough |
| A storefront renders a stored link from before a policy narrowed | `sanitizeUrl` answers `#` | unit test |

## Risks, Rollout, and Rollback

| Risk / failure scenario | Severity | Affected area | Mitigation | Residual risk |
|---|---|---|---|---|
| Stored values with control characters block their document's next save | low | content | The error names the field and what to remove | An editor clears it by hand |
| A host's existing links fail the policy once moved to `url` | medium | content | The host checks its stored links before the switch; the error names the field | A few links fixed by hand |
| `./shared` pulls server code in by a later import | medium | api | The lint rule on `src/shared/` | None while lint runs in CI |

**Rollout:** the control character rule and `url` come in one release; a host moves its link fields to
`url` with the release, after checking its stored links.

**Rollback:** a host sets its fields back to `text`; the rule on control characters reverts with the
plugin version.

## Dependencies

- None before it. `sub-rich-text` 1b uses `buildTextSchema`, `validateUrl` and the config's `linkPolicy`.

## Acceptance Criteria

- [ ] A text value with a control character answers 400 at its path, through the API and in the Admin's
      live validation; a textarea keeps its line breaks.
- [ ] A `url` field refuses `javascript:`, `data:`, `//host` and a malformed URL, and takes the
      default policy's absolute and relative forms; the config's `linkPolicy` and a field's own change them.
- [ ] `sanitizeUrl` from `./shared` loads without Medusa and answers `#` for a refused URL.
- [ ] The host's `cta_href` fields are `url`.

## Phasing

| Sub-phase | Goal | The user can try |
|---|---|---|
| **1a Control characters** | `buildTextSchema` in every text kind, server and Admin | A title with a control character pasted is refused at the field, not a 500 |
| **1b Links** | The link policy, the `url` field type, `./shared` with `sanitizeUrl`, the host's `cta_href` on `url` | `javascript:alert(1)` as a button link is refused at the field; `/about` is saved |

## Implementation Plan

### Sub-phase 1a - Control characters

**Goal:** no text value with a control character reaches the database.

**Prerequisites:** none.

1. **P1a.1 - The text schema**
   - **Outcome:** `src/shared/sanitize/` with `hasControlCharacters` and `buildTextSchema(z, { multiline })`,
     the message "Remove the control characters from this text", and its index; the lint rule that keeps
     the folder free of Medusa.
   - **Areas:** `src/shared/sanitize/`, `eslint.config.ts`
   - **Changes:** the two functions and the rule; nothing uses them yet.
   - **Verification:** unit tests in `src/shared/sanitize/__tests__/`: each control character refused, tab,
     line feed and carriage return allowed only with `multiline`, a plain and an accented text allowed,
     nothing rewritten; a sample import of `@medusajs/framework` into the folder refused by `yarn lint`.

2. **P1a.2 - Every text kind**
   - **Outcome:** `buildValueSchema` uses it for `text` (`multiline` for `input: "textarea"`), a
     combobox's values from a hook, `text_list` items and media values.
   - **Areas:** `src/lib/document/build-document-schema.ts`
   - **Changes:** the kinds above call `buildTextSchema`; `slug` keeps its format, which already refuses
     them.
   - **Verification:** unit tests in `build-document-schema.unit.spec.ts` per kind, a block's field at
     depth included, with the error's path; `yarn test:unit`, `yarn typecheck`, `yarn typecheck:admin`,
     `yarn lint`, `yarn format:check`.

3. **P1a.3 - Through the route**
   - **Outcome:** a document save and the `validate` route answer 400 at the field for `U+0000`.
   - **Areas:** `integration-tests/http/cms/admin-cms-documents.spec.ts`
   - **Changes:** two HTTP cases, a document's title and a step's heading in an area.
   - **Verification:** `yarn test:integration:http` on that file, a manual run with the test database.

**Exit gate of 1a:** unit, typecheck, admin typecheck, lint, format and the HTTP cases pass. A control
character is hard to type, so the HTTP cases stand for the walkthrough; the user may paste one (a
vertical tab, `U+000B`) into a title in the host to see the error at its field. Then the steps of 1b are
written.

### Sub-phase 1b - Links

**Goal:** a URL a field or the config does not allow never reaches the database, and a storefront gets
the same policy as a function.

**Prerequisites:** 1a.

1. **P1b.1 - The link policy**
   - **Outcome:** `src/shared/sanitize/link-policy.ts` (`LinkPolicy`, `DEFAULT_LINK_POLICY`,
     `validateLinkPolicy`), `validate-url.ts` (`validateUrl(url, policy)`, `true` or a message that names the
     allowed forms, as "Use a link starting with http://, https://, mailto:, tel: or /") and
     `sanitize-url.ts` (`sanitizeUrl(url, policy = DEFAULT_LINK_POLICY)`, the URL or `#`).
   - **Areas:** `src/shared/sanitize/`
   - **Changes:** the three files; nothing uses them yet. A scheme is matched case-insensitively and
     only before the first `/`, `?` or `#`; `http` and `https` need a host; a URL with a space or a
     control character is refused; nothing is trimmed.
   - **Verification:** unit tests in `src/shared/sanitize/__tests__/`: every row of the Edge Cases table
     on URLs, a narrowed policy (`relative: false`, `protocols: ["https"]`), `sanitizeUrl` answering `#`;
     `validateLinkPolicy` on each refused policy.

2. **P1b.2 - `linkPolicy` and the `url` type in the registry**
   - **Outcome:** `Config.linkPolicy?: Partial<LinkPolicy>`; `UrlField` with its own `linkPolicy`; the kind `url`
     on a text column; `Field.linkPolicy` the resolved policy of a `url` field; the registry refuses a policy
     `validateLinkPolicy` refuses, and a `url` field as a slug's `from`.
   - **Areas:** `src/lib/config/types.ts`, `src/lib/field/` (`types.ts`, `prepare-fields.ts`,
     `prepare-link-policy.ts`, `validate-slug-fields.ts`), `src/lib/collection/prepare-collection.ts`,
     `src/lib/block/prepare-block.ts`, `src/lib/registry/prepare-registry.ts`
   - **Changes:** `prepareRegistry` resolves `config.linkPolicy` once against `DEFAULT_LINK_POLICY` and hands
     `FieldDefaults = { links }` to `prepareCollection` and `prepareBlock`, which pass it to
     `prepareFields`; a `url` field's `linkPolicy` is its own over the defaults.
   - **Verification:** unit tests in `src/lib/registry/__tests__/prepare-registry.unit.spec.ts`: a `url`
     field's resolved policy - default, the config's, its own - each refused policy with its path, `url`
     on a non-text column and as a slug's `from`; the projection test carries `linkPolicy`; `yarn typecheck`.

3. **P1b.3 - The schema**
   - **Outcome:** `buildValueSchema`'s `url` case: `buildTextSchema` single-line, then `validateUrl` with
     the field's `linkPolicy`, its message at the field's path.
   - **Areas:** `src/lib/document/build-document-schema.ts`
   - **Changes:** the case; the Admin's live validation runs it as it is.
   - **Verification:** unit tests in `build-document-schema.unit.spec.ts` with a copy of the test config
     whose `notes`-like text column is a `url` field - refused and allowed links, a field's own policy,
     a block's `url` at depth. The route itself needs no new HTTP test: 1a's cases already show a schema
     error at its path through the save and `validate` routes, and the test module has no spare text
     column, which a new one would need with its migration.

4. **P1b.4 - The Admin input**
   - **Outcome:** the toolkit type `url` with `UrlField`: `Input` with `type="text"`, `inputMode="url"`,
     `autoComplete="off"`, so the browser refuses nothing before the schema; `build-field-config.ts`
     maps the kind `url` to it.
   - **Areas:** `src/admin/components/manager-form-fields/` (`types.ts`, `fields/url-field/`,
     `manager-form-field.tsx`), `src/admin/cms/common/utils/build-field-config.ts`
   - **Verification:** `yarn typecheck:admin`, `yarn lint`, `yarn format:check`.

5. **P1b.5 - The `./shared` entry**
   - **Outcome:** `src/shared/index.ts` exports `sanitizeUrl`, `validateUrl`, `LinkPolicy` and
     `DEFAULT_LINK_POLICY`; `package.json` maps `"./shared"` to `./.medusa/server/src/shared/index.js`; the
     README shows the `url` type, `linkPolicy` and `sanitizeUrl` in a storefront; a `minor` changeset.
   - **Areas:** `src/shared/index.ts`, `package.json`, `README.md`, `.changeset/`
   - **Verification:** `yarn lint`; once the user's `yarn dev` compiled it, `node -e` requiring
     `.medusa/server/src/shared/index.js` from a folder without `node_modules` answers `sanitizeUrl` -
     no Medusa package loads.

6. **P1b.6 - The host's links**
   - **Outcome:** the host's hero and image and text `cta_href` are `type: "url"`; the host's config
     test passes.
   - **Areas:** the host's `src/cms/config.ts`
   - **Changes:** two field types. The host's local database holds one `cta_href`, `/`, which the
     policy takes; the user checks the Cloud databases before the release reaches them.
   - **Verification:** the host's config test and lint; the user's walkthrough: `javascript:alert(1)` as
     a hero's button link shows the error at the field and is not saved; `/about` and
     `https://example.com` are.

**Exit gate of 1b:** unit, typecheck, admin typecheck, lint and format pass; the `./shared` check and the
host's walkthrough pass. Then `sub-rich-text` 1b is written.

## Short Tracker

- `done` - **1a, control characters** (2026-11-17): `src/shared/sanitize/` with `hasControlCharacters`
  and `buildTextSchema` - moved from `src/lib/sanitize/` before its commit, `src/shared/` being one place
  for the helpers the plugin and a storefront share (user); a lint rule keeps `src/shared/` free of Medusa
  and of the plugin's other folders, `@medusajs/zod-import-source` off there for a type-only import of `zod`;
  every text kind in `buildValueSchema`; a `minor` changeset. 592 unit tests, 95 HTTP tests of the
  documents, typecheck, admin typecheck, lint and format pass.
- `done` - **1b, the links** (2026-11-17). P1b.1 to P1b.5 built: `validateUrl`,
  `sanitizeUrl` and `LinkPolicy` in `src/shared/sanitize/` - a backslash refused too, as a browser reads
  `/\host` as `//host`; the config's `linkPolicy` (named so, not `links`, user) handed down as
  `FieldDefaults`; the `url` kind in the registry, the schema - the control character check aborting
  before the link's - and the toolkit; `./shared` in `package.json`, checked by loading the compiled entry
  from a folder without `node_modules`; the README and a `minor` changeset. 649 unit tests, typecheck,
  admin typecheck, lint and format pass. P1b.6: the host's `cta_href` fields are `url`, the image and
  text block's hand-written regex replaced by `linkPolicy: { protocols: ["http", "https"] }`; the host's
  config test and typecheck pass, after its declarations were refreshed. The user's walkthrough in the
  host: `javascript:alert(1)` refused at the button link and not saved, `/about` and
  `https://example.com` saved, `mailto:` refused where the policy lists `http` and `https` only. Left to
  the user: a check of the Cloud databases' links before the release reaches them.
