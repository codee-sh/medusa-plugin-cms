import { type Context, createContext } from "react"
import type {
  AnyCmsFieldComponent,
  CmsBlockPlace,
  CmsDocumentSource,
  CmsFieldComponentLoader,
  CmsOptionsHook,
} from "./types"

/**
 * Where the store sits on `globalThis`. The plugin's Admin and a host's Admin load this module as two
 * copies - the plugin's from its source or its bundle, the host's from the compiled package - so the
 * store cannot be a variable of the module, and `Symbol.for` gives both copies the same key from the
 * same text. The package's name keeps the key apart from any other code in the Admin.
 *
 * The text is a contract between the plugin and a host built against another version of it: it stays
 * the same while the store's shape does. A change to that shape gives the key a new suffix
 * (`.../admin-extensions@2`), so that copies of two versions keep stores of their own instead of
 * reading each other's. A new map or context is not such a change: each copy creates the ones it knows
 * when they are missing, so a store an older copy created takes the new one and keeps the older one's
 * entries.
 */
export const ADMIN_EXTENSIONS_STORE_KEY = Symbol.for(
  "@codee-sh/medusa-plugin-cms/admin-extensions"
)

/** The entries a host registers, one map per kind, each by the name a config gives. */
type AdminExtensionStore = {
  optionsHooks: Map<string, CmsOptionsHook>
  components: Map<string, AnyCmsFieldComponent>
  /** Kept apart from `components`, so a copy of this module that knows no loader never renders one. */
  lazyComponents: Map<string, CmsFieldComponentLoader>
  /**
   * The document form a component sits in, provided by the plugin's Admin. One context object for every
   * copy of this module, as React tells contexts apart by the object.
   */
  documentContext: Context<CmsDocumentSource | null>
  /** The place of the block a component sits in, provided by the plugin's Admin. */
  blockPlaceContext: Context<CmsBlockPlace[] | undefined>
}

/**
 * Returns the store, created on first use, with each map it lacks added: a store an older copy of this
 * module created holds only the maps that copy knew.
 *
 * @returns The one store every copy of this module shares.
 */
const getStore = (): AdminExtensionStore => {
  const holder = globalThis as unknown as Record<
    symbol,
    Partial<AdminExtensionStore> | undefined
  >
  const store = (holder[ADMIN_EXTENSIONS_STORE_KEY] ??= {})

  store.optionsHooks ??= new Map()
  store.components ??= new Map()
  store.lazyComponents ??= new Map()
  store.documentContext ??= createContext<CmsDocumentSource | null>(null)
  store.blockPlaceContext ??= createContext<CmsBlockPlace[] | undefined>(
    undefined
  )

  return store as AdminExtensionStore
}

/**
 * Registers a hook that gives the options of every field whose config names it as
 * `options: { hook: name }`. A second registration of a name replaces the first. Call it from a file
 * the Admin runs at boot: the host's `src/admin/cell-renderers.tsx`, or a file it imports.
 *
 * @param name - The name a field's config gives.
 * @param useOptions - The hook.
 *
 * @example
 * defineCmsOptionsHook("products", useProductOptions)
 */
export const defineCmsOptionsHook = (
  name: string,
  useOptions: CmsOptionsHook
): void => {
  getStore().optionsHooks.set(name, useOptions)
}

/**
 * Finds the options hook registered under a name.
 *
 * @param name - The name a field's config gives.
 * @returns The hook, or `undefined` when no one registered the name.
 */
export const getCmsOptionsHook = (name: string): CmsOptionsHook | undefined =>
  getStore().optionsHooks.get(name)

/**
 * Registers a component that edits the fields of every layout node naming it, as
 * `{ type: "component", component: name, fields }`: a loader that imports it when a form first shows
 * such a node, the default way, or the component itself, for a small one. A second registration of a
 * name replaces the first, of either kind. Call it from a file the Admin runs at boot, as for an
 * options hook.
 *
 * @param name - The name a layout node gives.
 * @param component - The component, or its loader.
 *
 * @example
 * // The default way: the component's module is imported when a form first shows it.
 * defineCmsFieldComponent("category-product-picker", {
 *   load: () =>
 *     import("./category-product-picker").then((module) => ({
 *       default: module.CategoryProductPicker,
 *     })),
 * })
 *
 * @example
 * // A small component, given as it is, shows at once.
 * defineCmsFieldComponent("color-swatch", ColorSwatch)
 */
export const defineCmsFieldComponent = (
  name: string,
  component: AnyCmsFieldComponent | CmsFieldComponentLoader
): void => {
  const store = getStore()

  if (typeof component === "function") {
    store.components.set(name, component)
    store.lazyComponents.delete(name)
  } else {
    store.lazyComponents.set(name, component)
    store.components.delete(name)
  }
}

/**
 * Finds the field component registered under a name.
 *
 * @param name - The name a layout node gives.
 * @returns The component, or `undefined` when no one registered the name.
 */
export const getCmsFieldComponent = (
  name: string
): AnyCmsFieldComponent | undefined => getStore().components.get(name)

/**
 * Finds the loader of the field component registered lazily under a name.
 *
 * @param name - The name a layout node gives.
 * @returns The loader, or `undefined` when no one registered the name lazily.
 */
export const getCmsFieldComponentLoader = (
  name: string
): CmsFieldComponentLoader | undefined => getStore().lazyComponents.get(name)

/**
 * Finds the context that hands a component the document form it sits in.
 *
 * @returns The context every copy of this module shares.
 */
export const getCmsDocumentContext = (): Context<CmsDocumentSource | null> =>
  getStore().documentContext

/**
 * Finds the context that hands a component the place of the block it sits in.
 *
 * @returns The context every copy of this module shares.
 */
export const getCmsBlockPlaceContext = (): Context<
  CmsBlockPlace[] | undefined
> => getStore().blockPlaceContext
