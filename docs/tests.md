# Tests

This page covers how the plugin's tests run and where a new test goes. The `codee-medusa-testing` skill decides which test a change owes.

## Unit tests

```bash
yarn test:unit
```

Unit tests sit next to the code they test, as `src/**/__tests__/<name>.unit.spec.ts`. They need no database. The `Test*` models and the config over them come from the test module, and `src/lib/__tests__/fixtures.ts` re-exports them.

## Integration tests

Integration tests boot a Medusa app with a real Postgres, so they run manually, and only when the risk is real. One cycle looks like this:

```bash
yarn test:db:up                 # Postgres 16 in Docker on localhost:5432
yarn test:db:generate           # only after a change to a Test* model - the user runs it
yarn test:integration:http      # integration-tests/http/**/*.spec.ts
yarn test:integration:modules   # src/modules/*/__tests__/**/*.integration.spec.ts
yarn test:db:down               # stop it and drop its volume, freeing port 5432
```

The user runs the cycle. An agent runs an integration test only when asked, as `AGENTS.md` sets out under "Validation Commands".

`medusaIntegrationTestRunner` creates a database per run and drops it afterwards. It reaches Postgres through `DB_HOST`, `DB_USERNAME`, and `DB_PASSWORD`. `integration-tests/setup.js` sets them to the values in `docker-compose.test.yml`, unless the environment or a `.env.test` file sets other values. The runner always connects on port `5432`, so stop any other Postgres listening there.

### The test app

The test app is the `medusa-config.ts` in the plugin's root. It loads the plugin's own `src`, with its routes, its workflows, and the `cms` module. It also loads a test module in `integration-tests/modules/test-content/`, which stands in for a project's content module. The test module holds the `Test*` models, their `MedusaService`, and `cms-config.ts`, the CMS config over them. Neither the test app nor the test module is in the published package, because `tsconfig.json` keeps both out of the build.

### Migrations of the test module

`medusaIntegrationTestRunner` creates the tables by running migrations, so the test module keeps its own migrations in `integration-tests/modules/test-content/migrations/`. The user generates them from the plugin's root while the test database is up:

```bash
yarn test:db:generate
```

`db:generate` checks the database connection before it diffs the models against the snapshot. The test app has no `databaseUrl`, so the `test:db:generate` script points `db:generate` at the Docker Postgres. The command writes nothing to the database.

Regenerate the migrations after any change to a `Test*` model. Commit the new migration together with `.snapshot-test-content.json`, because the next `db:generate` diffs the models against that snapshot.

### Writing an integration test

- An HTTP test goes in `integration-tests/http/<area>/<name>.spec.ts`. A workflow test goes in the file of the route that runs the workflow, or in a file of its own in that folder.
- `createAdminHeaders(container)` from `integration-tests/utils/admin.ts` signs an admin token for `/admin` routes.
- Each file sets `jest.setTimeout(60 * 1000)` and states in its JSDoc that it runs manually.
