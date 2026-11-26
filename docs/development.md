# Development

This page shows how to run the plugin linked into a Medusa project while you change it. It is for contributors. [Tests](./tests.md) covers the tests, and [SDLC.md](../SDLC.md) covers how a change reaches a release.

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
npx medusa plugin:add @mostrajs/cms
```

Register the plugin in the project's `medusa-config.ts`, as [Basic setup](../README.md#basic-setup) in the README shows. Then start the project with `medusa develop`.

## How `yarn dev` reaches the project

`yarn dev` runs `medusa plugin:develop`. On every change, it compiles the backend into `.medusa/server` and pushes the result to the linked project, which restarts on its own. The plugin's Admin is not bundled. The project serves the Admin straight from `src/admin` in the plugin, so you see an Admin change when you reload the page.

- Do not run `yarn build` while `yarn dev` runs. `yarn build` replaces `.medusa/server` with a bundled Admin and cuts the link to the source until you start `yarn dev` again.
- `yarn dev` writes no type declarations. When the project's typecheck must see a change to a config type, run `npx tsc -p tsconfig.json --emitDeclarationOnly`, then `npx yalc publish --push --no-scripts`.
- When you push to the project, you push what `yarn dev` compiled last. If `yarn dev` is stopped, start it before you push.
- Vite in the project keeps its own pre-bundled copy of `@mostrajs/cms/admin-extensions`. After you change that entry point, or after `yarn dev` restarts, stop the project, delete `node_modules/.vite` in the project, and start the project again.

## Before you open a pull request

Run the validation gate, as [SDLC.md](../SDLC.md) lists it:

```bash
yarn lint
yarn typecheck
yarn typecheck:admin
yarn format:check
yarn test:unit
```

When a project would notice your change, add a changeset with `yarn changeset`.
