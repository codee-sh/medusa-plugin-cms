import type { ComponentType, ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"

/** The values of a document form: the document's fields under one path, the one each field is rendered under. */
export type DocumentFormValues = {
  document: Record<string, unknown>
}

/**
 * What wraps a form core's `<form>` in its modal or drawer. On the plugin's pages it is the route's
 * form, `RouteFocusModal.Form` or `RouteDrawer.Form`, which asks before a route change drops unsaved
 * changes; the core draws every other part of the modal or drawer itself.
 */
export type DocumentFormFrame = ComponentType<{
  form: UseFormReturn<DocumentFormValues>
  children: ReactNode
}>
