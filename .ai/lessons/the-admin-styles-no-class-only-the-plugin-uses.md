---
{"title": "The Admin styles no class only the plugin uses", "modules": ["cms"], "areas": ["admin"], "topics": ["ui", "tooling"]}
---

# The Admin styles no class only the plugin uses

A project that installs the plugin from npm builds the Admin's CSS with Tailwind, and Tailwind generates
only the classes it finds in the files it scans. `@medusajs/admin-bundler` 2.22.7 (`createTailwindConfig`)
scans the project's `src/admin`, `@medusajs/dashboard`, `@medusajs/ui` and, for each plugin, the folder of
its Admin entry with the pattern `**/*.{js,ts,jsx,tsx}`. The plugin's built Admin lives in
`.medusa/server/src/admin/_chunks/`, in files with no extension (`__admin-extensions__-BPOovmBX`), so the
pattern matches none of them. Any class the plugin uses that the dashboard, `@medusajs/ui` or the
project does not also use is never generated.

It shows only on a project that installs the package. Under `yarn dev` the project serves the plugin's
Admin from its `src`, as a local source whose `.tsx` files Tailwind scans
([yarn-dev-serves-the-plugin-admin-from-its-source](yarn-dev-serves-the-plugin-admin-from-its-source.md)),
so the first host looked right. A new host on `0.1.1` from npm, on 2026-11-27, showed every
tab of a form at once: `LayoutTabs` hid a closed tab with `data-[state=inactive]:hidden`, which no CSS
held. Five more classes were missing the same way: `-scale-x-100` on the redo icon, `border-l-2` on a
quote, `underline` on a link, `min-h-[96px]` on the rich text editor, and `first:border-t-0` between a
block's sections.

**Rule:** the plugin's Admin uses only classes the dashboard or `@medusajs/ui` already use. When none
fits, take a state the component holds (`open !== index && "hidden"`), compute the case in code instead
of a variant (`index > 0 && "border-t pt-4"`), or set an inline `style`. To check, look a class up in
`node_modules/@medusajs/dashboard/dist` and `node_modules/@medusajs/ui/dist`: a class found in neither
does not exist in a project's Admin. Check the Admin on a project that installs the package, not only
through yalc.
