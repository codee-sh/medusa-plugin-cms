import { lazy, type LazyExoticComponent } from "react"
import type { CustomFieldComponent, CustomFieldLoader } from "../types"

/**
 * The lazy component made for each loader. One per loader, as a component made anew on each render
 * would load and mount again.
 */
const lazyComponents = new WeakMap<
  CustomFieldLoader,
  LazyExoticComponent<CustomFieldComponent>
>()

/**
 * Gives the lazy component of a loader, made on its first call.
 *
 * @param load - The loader, which resolves to a module with the component as its default export.
 * @returns The lazy component, the same for every call with the same loader.
 */
export const getLazyComponent = (
  load: CustomFieldLoader
): LazyExoticComponent<CustomFieldComponent> => {
  const known = lazyComponents.get(load)

  if (known) {
    return known
  }

  const component = lazy(load)

  lazyComponents.set(load, component)

  return component
}
