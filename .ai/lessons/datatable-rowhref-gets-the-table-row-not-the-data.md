---
{"title": "DataTable rowHref gets the table row, not the data", "modules": [], "areas": ["admin"], "topics": ["typescript"]}
---

# DataTable rowHref gets the table row, not the data

The dashboard's `DataTable` (`@medusajs/dashboard/components`, 2.22.7) types `rowHref` as
`(row: TData) => string`, but calls it with the TanStack row: `@medusajs/ui` hands `onRowClick` the
`row` it renders (`dist/esm/blocks/data-table/components/data-table-table.js:195`), and the dashboard
passes that straight to `rowHref`. A field of the data reads as `undefined`; only `row.id` holds a
value, the one `getRowId` returned.

Found when the CMS collection list linked every row to `/cms/undefined` through
`rowHref={(collection) => \`/cms/${collection.slug}\`}`, which typechecks. The core pages never show
it, because they all write `row.id` and their `getRowId` returns the entity's id.

Rule: build `rowHref` from `row.id` only, and make `getRowId` return what the link needs. Reading
`id` needs a cast, since the type claims the row is the data.
