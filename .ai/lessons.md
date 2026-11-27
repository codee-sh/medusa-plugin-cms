# Lessons

This catalog indexes 34 focused lessons. Route the task first, then read only
records whose modules, areas, or topics match the work.

## How to use this catalog

1. Start with the exact module id when the task names one - module ids match the folders in `.ai/specs/`.
2. Add every matching area: `backend`, `admin`, `testing`, `tooling`.
3. Use topics to narrow cross-cutting concerns such as `caching`, `orm`, `metadata`, or `migrations`.
4. Open only the linked records that match; do not bulk-read `.ai/lessons/`.

Add a lesson as one kebab-case record in `.ai/lessons/` plus one row here. Hard safety and
workflow rules belong in `AGENTS.md`; a lesson carries the evidence, the failure mode, and the
durable rule.

## admin

- [A DataTable filter reaches the URL as JSON](lessons/a-datatable-filter-reaches-the-url-as-json.md) - module:cms; area:admin; topic:api-routes
- [A menu that gives focus back scrolls to a moved trigger](lessons/a-menu-that-gives-focus-back-scrolls-to-a-moved-trigger.md) - module:cms; area:admin; topic:ui
- [A route config's translationNs must be a string literal](lessons/a-route-config-translationns-must-be-a-string-literal.md) - module:cms; area:admin; topic:i18n
- [A shared widget zone shares one saved layout](lessons/a-shared-widget-zone-shares-one-saved-layout.md) - module:cms; area:admin; topic:ui
- [An Admin i18n namespace of its own survives the merge](lessons/an-admin-i18n-namespace-of-its-own-survives-the-merge.md) - module:cms; area:admin; topic:i18n
- [A module file the Admin imports cannot import a Node module](lessons/a-module-file-the-admin-imports-cannot-import-node-modules.md) - area:admin,backend; topic:tooling,typescript
- [A unit-tested Admin helper imports the toolkit by file](lessons/a-unit-tested-admin-helper-imports-the-toolkit-by-file.md) - module:cms; area:admin,testing; topic:testing,tooling
- [An augmentation of admin-shared needs an import of it](lessons/an-augmentation-of-admin-shared-needs-an-import-of-it.md) - module:cms; area:admin; topic:typescript
- [DataTable rowHref gets the table row, not the data](lessons/datatable-rowhref-gets-the-table-row-not-the-data.md) - area:admin; topic:typescript
- [The Admin styles no class only the plugin uses](lessons/the-admin-styles-no-class-only-the-plugin-uses.md) - module:cms; area:admin; topic:ui, tooling
- [useFormContext renders its component on every form state change](lessons/useformcontext-renders-its-component-on-every-form-state-change.md) - module:cms; area:admin; topic:ui

## backend

- [A cascading restore brings back rows deleted earlier](lessons/a-cascading-restore-brings-back-rows-deleted-earlier.md) - area:backend; topic:dml,orm,workflows
- [A generated list method searches with q](lessons/a-generated-list-method-searches-with-q.md) - area:backend; topic:dml,orm
- [A unique index violation answers 400, not 422](lessons/a-unique-index-violation-answers-400-not-422.md) - area:backend; topic:orm,validation
- [A cycle of cascades makes every soft delete throw](lessons/a-cycle-of-cascades-makes-every-soft-delete-throw.md) - area:backend; topic:dml,orm
- [An empty cached query result carries no tags](lessons/an-empty-cached-query-result-carries-no-tags.md) - area:backend; topic:caching
- [A Query filter on a relation narrows the parents, not the relation](lessons/a-query-filter-on-a-relation-narrows-the-parents-not-the-relation.md) - area:backend; topic:orm
- [A module service in a step hides its class statics](lessons/a-module-service-in-a-step-hides-its-class-statics.md) - area:backend; topic:workflows
- [A model key in MedusaService must match its DML name](lessons/a-model-key-in-medusaservice-must-match-its-dml-name.md) - area:backend; topic:dml,orm
- [db:generate misses a changed WHERE of a partial index](lessons/db-generate-misses-a-changed-where-of-a-partial-index.md) - area:backend; topic:dml,migrations
- [Clear a cache key before rewriting it](lessons/clear-a-cache-key-before-rewriting-it.md) - area:backend; topic:caching
- [The File Module's listFiles fails whole on one missing key](lessons/file-module-listfiles-fails-whole-on-one-missing-key.md) - module:cms; area:backend; topic:files,media
- [jsonb does not keep the order of keys](lessons/jsonb-does-not-keep-the-order-of-keys.md) - module:cms; area:backend; topic:database,orm
- [Medusa loads models only from the top of the models folder](lessons/medusa-loads-models-only-from-the-top-of-the-models-folder.md) - area:backend; topic:dml
- [Medusa toHandle keeps letters outside ASCII](lessons/medusa-tohandle-keeps-letters-outside-ascii.md) - area:backend; topic:validation
- [MikroORM writes inserts before updates in one flush](lessons/mikro-orm-writes-inserts-before-updates-in-one-flush.md) - area:backend; topic:orm,database
- [Module events invalidate the cache only after the workflow](lessons/module-events-invalidate-the-cache-only-after-the-workflow.md) - area:backend; topic:caching,workflows
- [Zod 4 runs an array's max on a text too](lessons/zod-array-max-also-runs-on-a-text.md) - module:cms; area:backend,admin; topic:validation

## tooling

- [A host's Vite serves its own stale copy of admin-extensions](lessons/a-host-vite-serves-its-own-stale-copy-of-admin-extensions.md) - module:cms; area:tooling,admin; topic:tooling
- [git loses the rename of a one-line file whose line changes](lessons/git-loses-the-rename-of-a-one-line-file-whose-line-changes.md) - area:tooling,admin; topic:tooling
- [prettier --write during yarn dev can compile an empty file](lessons/prettier-write-during-yarn-dev-can-compile-an-empty-file.md) - area:tooling; topic:tooling
- [prettier on integration-tests rewrites the test module's migrations](lessons/prettier-on-integration-tests-rewrites-the-test-migrations.md) - area:tooling,testing; topic:tooling,migrations
- [yalc publish pushes the build yarn dev last compiled](lessons/yalc-publish-pushes-the-build-yarn-dev-last-compiled.md) - area:tooling; topic:tooling
- [yarn dev serves the plugin Admin from its source](lessons/yarn-dev-serves-the-plugin-admin-from-its-source.md) - area:tooling,admin; topic:tooling
- [yarn dev compiles a changed test into the package](lessons/yarn-dev-compiles-a-changed-test-into-the-package.md) - area:tooling,testing; topic:tooling,testing
- [pnpm in the plugin hides its Medusa CLI](lessons/pnpm-in-the-plugin-hides-its-medusa-cli.md) - area:tooling; topic:tooling
