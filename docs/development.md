# Development

Running the plugin linked into a Medusa project while you change it. For contributors; the tests are in [Tests](./tests.md), and how a change reaches a release is in [SDLC.md](../SDLC.md).

## Requirements

- Node.js `>=22.22.0`
- Yarn 4, through Corepack: `corepack enable`
- A Medusa v2 project to link the plugin into

## Linking the plugin into a project

In the plugin:

```bash
yarn install
npx medusa plugin:publish   # once, to the local yalc registry
yarn dev                    # recompiles and pushes on every change
```

In the project, once:

```bash
npx medusa plugin:add @codee-sh/medusa-plugin-cms
```

Register the plugin in the project's `medusa-config.ts` as the README's [Basic setup](../README.md#basic-setup) shows, and start the project with `medusa develop`.

## How `yarn dev` reaches the project

`yarn dev` runs `medusa plugin:develop`. It compiles the backend into `.medusa/server` on every change and pushes it to the linked project, which restarts on its own. The plugin's Admin is not bundled: the project serves it straight from the plugin's `src/admin`, so an Admin change shows on reload.

- Do not run `yarn build` while `yarn dev` runs. A build replaces `.medusa/server` with a bundled Admin and cuts the link to the source until `yarn dev` starts again.
- `yarn dev` writes no type declarations. When a change to a config type must reach the project's typecheck, run `npx tsc -p tsconfig.json --emitDeclarationOnly`, then `npx yalc publish --push --no-scripts`.
- A push carries what `yarn dev` last compiled. With `yarn dev` stopped, start it before pushing.
- The project's Vite keeps its own pre-bundled copy of `@codee-sh/medusa-plugin-cms/admin-extensions`. After a change there, or after `yarn dev` restarts, stop the project, delete its `node_modules/.vite`, and start it again.

## Before you open a pull request

Run the validation gate, as [SDLC.md](../SDLC.md) lists it:

```bash
yarn lint
yarn typecheck
yarn typecheck:admin
yarn format:check
yarn test:unit
```

Add a changeset for a change a project would notice: `yarn changeset`.
