// The package root's types: those of `src/lib`, as built, and the widget zones of the plugin's own Admin
// pages. A project's generated `.medusa/types/augmentation-refs.d.ts` references this file, so the zones
// reach `defineWidgetConfig` in its Admin.
export * from "./.medusa/server/src/lib/index"

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    /** A route's page, under its collections; the widget's `data` is `CmsRouteWidgetData`. */
    "cms.route.details": true
    /** The side column of a route's page. */
    "cms.route.details.side": true
    /** A document's page, under its form; the widget's `data` is `CmsDocumentWidgetData`. */
    "cms.document.details": true
    /** The side column of a document's page, under its status and history. */
    "cms.document.details.side": true
  }
}
