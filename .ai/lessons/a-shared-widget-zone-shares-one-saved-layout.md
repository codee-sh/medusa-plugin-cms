---
{"title": "A shared widget zone shares one saved layout", "modules": ["cms"], "areas": ["admin"], "topics": ["ui"]}
---

# A shared widget zone shares one saved layout

`LayoutComposer` from `@medusajs/dashboard/components` does more than expose a widget zone: it saves
the page's arrangement under the same name. `LayoutComposerRoot` reads and writes it through
`useLayoutPreference(widgetsZonePrefix)`, which calls `/admin/layouts/:zone/configuration` and stores
`{ hidden, section, order }` per entry id, either the editor's own (`user_id`) or the store's default
(`is_default`) (`@medusajs/dashboard` 2.22.7, `dist/chunk-IAQO2TGC.mjs`; `@medusajs/types`,
`dist/http/layout-configuration/admin/`).

So every page drawn with one `widgetsZonePrefix` shares one saved arrangement. The CMS draws every
singleton's page in `cms.singleton.details`, with its cards under `cms.section.<index>`: moving or
hiding `cms.section.0` on one singleton moves or hides the first card of every other singleton too. It
stays unseen while a host has one singleton.

An entry is not only a `LayoutComposer.Entry`. `LayoutComposer` takes the fragments of its `sections`
apart and makes an entry of every element in them: an `Entry` under its `id`, any other element under
its component's name (`core:<name>`, which a production build minifies). The saved `hidden`, `section`
and `order` apply to every entry, edit mode gives each a hide toggle, and `disableWidgets` only leaves
the widgets out (`collectElements` and `buildCoreEntries` in the same chunk; the 2.21.2 dashboard holds
the same code in `dist/chunk-GVVNJYF3.mjs`). A single block per column is one entry, hidden with all it
holds, and `LayoutEntry` offers no way to keep an entry from being hidden.

Give an entry an id that names what it belongs to when its zone is shared, such as
`cms.<slug>.section.<key>`, or give each page a zone of its own. What no editor may move or hide cannot
be an element of `sections`: it has to be drawn outside them, such as by a layout of the page's own,
registered with `defineLayoutConfig` from `@medusajs/admin-sdk` and collected from
`src/admin/layouts/`, whose component gets the sections' widgets and may draw anything else beside
them. A widget's id is the same on every page of a shared zone, so it stands in the same place on each
of them.

The CMS draws its pages so: `src/admin/layouts/cms-two-column-layout.tsx` registers `cms:two-column`,
the page hands `LayoutComposer` empty sections and its blocks through a React context, and the layout
draws them before each column's widgets. Checked on the first host (dashboard 2.21.2, the plugin's
Admin served from source under `yarn dev`, 2026-11-23): the page renders, and Customize Layout moves and
hides a widget alone. `LayoutComposer`'s `layoutProps` cannot carry the blocks instead, as its type takes
`className` alone. A layout id the dashboard has not registered renders nothing at all
(`DashboardApp.getLayout`), so a blank page means the layout was not collected: a new `layouts/` folder
needs the host's `medusa develop` restarted (inferred; the check ran after a restart).
