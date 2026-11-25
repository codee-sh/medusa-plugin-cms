// The CMS's own layout, registered by `src/admin/layouts/cms-two-column-layout.tsx`: its id and the
// sections `LayoutComposer` takes for it. Only the plugin's pages name it.
import "@medusajs/admin-shared"

declare module "@medusajs/admin-shared" {
  interface LayoutSectionRegistry {
    "cms:two-column": "main" | "side"
  }
}
