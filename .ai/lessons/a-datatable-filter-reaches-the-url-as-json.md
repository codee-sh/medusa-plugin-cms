---
{"title": "A DataTable filter reaches the URL as JSON", "modules": ["cms"], "areas": ["admin"], "topics": ["api-routes"]}
---

# A DataTable filter reaches the URL as JSON

The dashboard's `DataTable` (`@medusajs/dashboard/components`, 2.22.7) keeps its state in the URL, and
a page builds its API query by reading the same keys with `useQueryParams`. `q`, `order` and `offset` are
plain strings. A filter is not: `handleFilteringChange` writes `JSON.stringify(value)`, so a radio
filter on `status` puts `?status=%22draft%22` in the URL, and `useQueryParams` hands back `"draft"`
with its quotes (`dist/chunk-VRKZYAEV.mjs`, `handleFilteringChange` and `parseFilterValue`).

Passed on as it is, the quoted value would fail the route's `z.enum(["draft", "published"])` with a
400, so the table breaks only once a filter is used, while search, sorting and paging keep working.
Found while reading the dashboard's code for the CMS documents table; its own table queries
`JSON.parse` each filter key (`useSalesChannelTableQuery`).

Rule: in the hook that turns the table's URL state into a query, `JSON.parse` every filter key and
leave `q`, `order` and `offset` as strings.
