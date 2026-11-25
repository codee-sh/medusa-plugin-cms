# Tests

How the plugin's tests run, and where a new one goes. Which test a change owes is decided by the `codee-medusa-testing` skill.

## Unit tests

```bash
yarn test:unit
```

Colocated as `src/**/__tests__/<name>.unit.spec.ts`. They need no database. The `Test*` models and the config over them come from the test module, re-exported by `src/lib/__tests__/fixtures.ts`.

## Integration tests

They boot a Medusa app with a real Postgres, so they run manually, when the risk is real. One cycle:

```bash
yarn test:db:up                 # Postgres 16 in Docker on localhost:5432
yarn test:db:generate           # only after a change to a Test* model - the user runs it
yarn test:integration:http      # integration-tests/http/**/*.spec.ts
yarn test:integration:modules   # src/modules/*/__tests__/**/*.integration.spec.ts
yarn test:db:down               # stop it and drop its volume, freeing port 5432
```

The user runs the cycle; an agent runs an integration test only when asked - see `AGENTS.md`, "Validation Commands".

`medusaIntegrationTestRunner` creates a database per run and drops it afterwards. It reaches Postgres through `DB_HOST`, `DB_USERNAME` and `DB_PASSWORD`, which `integration-tests/setup.js` sets to the values of `docker-compose.test.yml` unless the environment or a `.env.test` file says otherwise. The runner always connects on port `5432`, so stop any other Postgres listening there.

### The test app

The app is `medusa-config.ts` in the plugin's root. It loads the plugin's own `src` - routes, workflows, the `cms` module - and a test module in `integration-tests/modules/test-content/` that plays a project's content module: the `Test*` models, their `MedusaService`, and `cms-config.ts`, the CMS config over them. None of it is in the published package; `tsconfig.json` keeps both out of the build.

### Migrations of the test module

`medusaIntegrationTestRunner` creates the tables through migrations, so the test module carries its own in `integration-tests/modules/test-content/migrations/`. The user generates them, from the plugin's root, with the test database up:

```bash
yarn test:db:generate
```

`db:generate` checks the connection before it diffs the models against the snapshot, and the test app has no `databaseUrl`, so the script points it at the Docker Postgres. It writes nothing to the database.

Regenerate them after any change to a `Test*` model, and commit the new migration together with `.snapshot-test-content.json`: the next `db:generate` diffs the models against that snapshot.

### Writing one

- An HTTP test goes to `integration-tests/http/<area>/<name>.spec.ts`; a workflow test sits in the same file as the route that runs it, or in its own file there.
- `createAdminHeaders(container)` from `integration-tests/utils/admin.ts` signs an admin token for `/admin` routes.
- Each file sets `jest.setTimeout(60 * 1000)` and says in its JSDoc that it is a manual run.
