# CMS Translations

**Date:** 2026-11-06
**Status:** draft
**Area:** backend | admin
**Related:** [main-spec](./2026-11-04-main-spec.md)

> Folder: `.ai/specs/cms/`
> Filename: `2026-11-06-sub-cms-translations.md`

## TLDR

Version 0.0.4 of the plugin (main spec D22). Content is served in the language a storefront asks for,
through Medusa's Translation module. The models are ready for it (main spec D3): the project marks text
columns `.translatable()`, editors translate them, and the store workflows pass the request's locale to
`query.graph`. This is a skeleton: the Open Questions decide its scope, and phases come after them.

## Open Questions

1. **When is this version needed?** No host project serves a second language yet. The answer sets the
   priority of this version, not its design.
2. ~~Where do editors translate?~~ **Settled (user, 2026-11-17):** in the plugin's Admin, a document
   edited in one language at a time, with the language shown in the list; Medusa's **Settings ->
   Translations** would show blocks without their page and a `richtext` field as its JSON. The data stays
   Medusa's: one row per document and block, translations in the Translation module (main spec D3).
3. **One slug for all languages, or one per language?** Proposed: one, because `/slug/:slug` looks up the
   base column and translations are applied after the read. If SEO needs per-language URLs, that has to
   be designed here: it changes the read path and the unique index.

## Problem

Content exists in one language. A market with another language would need separate pages, with no link
between them.

## Current State and Evidence

- A host project turns on the `translation` flag and registers the Translation module; neither is the
  plugin's to do.
- [Translation Module](https://docs.medusajs.com/resources/commerce-modules/translation) - enabled by
  adding `@medusajs/medusa/translation` to `modules`, the `translation` flag, and a migration.
- [Translate Custom Data Models](https://docs.medusajs.com/resources/commerce-modules/translation/custom-data-models) -
  `.translatable()` puts a model in **Settings → Translations**; a route passes `locale` to `query.graph`.
- `@medusajs/framework` 2.21.2 `dist/http/router.js:99` applies `applyLocale` to `/store`, and
  `dist/http/middlewares/apply-locale.js` reads `?locale=` or `x-medusa-locale` into `req.locale` and
  removes the query key, so `verify-cms-store-query`'s refusal of unknown keys does not see it.
- `@medusajs/utils` 2.21.2 `dist/translations/apply-translations.js`:
  - walks nested objects and arrays by `id`, so blocks reached through `areas.*` are translated;
  - applies a value only when `typeof` matches the stored one, so **a translation of a `null` column is
    ignored**: the base language has to be filled;
  - ignores an empty translation, keeping the base value, and skips `metadata`.
- **Not established:** whether `query.graph`'s cache key includes `locale`, and whether a translation
  write clears a cached read. This is the first thing to prove (Target Behavior). Without it, cached
  store reads could return one language to another.

## Target Behavior (draft)

- `GET /store/cms/...?locale=<code>`, or `x-medusa-locale`, returns translated text columns, on documents,
  blocks, list rows and populated relations.
- A field without a translation returns the base value. There is no chain of fallback languages.
- Without a locale, the API answers as today.
- Search and filters work on base values.
- Cached reads never mix languages, and a saved translation shows on the next read.

## Proposed Solution (outline)

- Host project: register the module and flag; mark columns `.translatable()`: headings, descriptions, labels,
  `image_alt`, `cta_label`, `seo_title`, `seo_description`. Not `slug`, `cta_href`, or enums.
- Plugin: store workflows pass `locale` into every `query.graph`, including `list-cms-reference-targets`.
  Introspection reports `translatable` in the projection, so the Admin can mark the fields.
- Versions (0.0.2): a translation is keyed by the row's id and is not versioned. A block added in a draft
  can be translated only after publish; a block deleted by a publish leaves its translation behind.
- Draft read (0.0.3): a draft shows translations for rows that exist, base text for the rest.

## Dependencies

- `sub-collections-and-documents` (0.0.1).
- The user's migration for the Translation module and for any column change.

## Short Tracker

- `blocked` - design: Open Questions 1-3 unanswered, and the cache question to prove.
