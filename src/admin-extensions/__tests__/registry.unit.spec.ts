import { ADMIN_EXTENSIONS_STORE_KEY } from "../registry"
import type {
  CmsFieldComponent,
  CmsFieldComponentLoader,
  CmsOptionsHook,
} from "../types"

/** A copy of the registry module of its own, as a second bundle would load it. */
type RegistryModule = typeof import("../registry")

/**
 * Loads the registry module as a fresh copy.
 *
 * @returns The new copy.
 */
const loadRegistryCopy = (): RegistryModule => {
  let copy: RegistryModule | undefined

  jest.isolateModules(() => {
    copy = require("../registry")
  })

  return copy!
}

/**
 * Builds an options hook that returns fixed options.
 *
 * @param label - The label of its one option.
 * @returns The hook.
 */
const buildHook =
  (label: string): CmsOptionsHook =>
  () => ({
    options: [{ value: "id_1", label }],
    isPending: false,
    isError: false,
  })

/**
 * Builds a field component that draws its value as text.
 *
 * @returns The component.
 */
const buildComponent = (): CmsFieldComponent => (props) =>
  String(Object.values(props.values)[0])

/**
 * Builds a loader that resolves to a component.
 *
 * @returns The loader.
 */
const buildLoader = (): CmsFieldComponentLoader => ({
  load: async () => ({ default: buildComponent() }),
})

afterEach(() => {
  delete (globalThis as unknown as Record<symbol, unknown>)[
    ADMIN_EXTENSIONS_STORE_KEY
  ]
})

describe("the options hook registry", () => {
  it("finds a hook under the name it was registered with", () => {
    const registry = loadRegistryCopy()
    const hook = buildHook("Shirt")

    registry.defineCmsOptionsHook("products", hook)

    expect(registry.getCmsOptionsHook("products")).toBe(hook)
  })

  it("replaces a hook registered again under the same name", () => {
    const registry = loadRegistryCopy()
    const later = buildHook("Trousers")

    registry.defineCmsOptionsHook("products", buildHook("Shirt"))
    registry.defineCmsOptionsHook("products", later)

    expect(registry.getCmsOptionsHook("products")).toBe(later)
  })

  it("finds nothing under a name no one registered", () => {
    expect(loadRegistryCopy().getCmsOptionsHook("products")).toBeUndefined()
  })

  it("finds a hook registered through another copy of the module", () => {
    const hostCopy = loadRegistryCopy()
    const pluginCopy = loadRegistryCopy()
    const hook = buildHook("Shirt")

    hostCopy.defineCmsOptionsHook("products", hook)

    expect(pluginCopy).not.toBe(hostCopy)
    expect(pluginCopy.getCmsOptionsHook("products")).toBe(hook)
  })
})

describe("the field component registry", () => {
  it("finds a component under the name it was registered with", () => {
    const registry = loadRegistryCopy()
    const component = buildComponent()

    registry.defineCmsFieldComponent("product-picker", component)

    expect(registry.getCmsFieldComponent("product-picker")).toBe(component)
  })

  it("replaces a component registered again under the same name", () => {
    const registry = loadRegistryCopy()
    const later = buildComponent()

    registry.defineCmsFieldComponent("product-picker", buildComponent())
    registry.defineCmsFieldComponent("product-picker", later)

    expect(registry.getCmsFieldComponent("product-picker")).toBe(later)
  })

  it("finds nothing under a name no one registered", () => {
    expect(
      loadRegistryCopy().getCmsFieldComponent("product-picker")
    ).toBeUndefined()
  })

  it("finds a component registered through another copy of the module", () => {
    const hostCopy = loadRegistryCopy()
    const pluginCopy = loadRegistryCopy()
    const component = buildComponent()

    hostCopy.defineCmsFieldComponent("product-picker", component)

    expect(pluginCopy.getCmsFieldComponent("product-picker")).toBe(component)
  })

  it("keeps an options hook and a component under one name apart", () => {
    const registry = loadRegistryCopy()
    const hook = buildHook("Shirt")
    const component = buildComponent()

    registry.defineCmsOptionsHook("products", hook)
    registry.defineCmsFieldComponent("products", component)

    expect(registry.getCmsOptionsHook("products")).toBe(hook)
    expect(registry.getCmsFieldComponent("products")).toBe(component)
  })

  it("adds components to a store an older copy created with options hooks alone", () => {
    const hook = buildHook("Shirt")
    const component = buildComponent()

    ;(globalThis as unknown as Record<symbol, unknown>)[
      ADMIN_EXTENSIONS_STORE_KEY
    ] = { optionsHooks: new Map([["products", hook]]) }

    const registry = loadRegistryCopy()

    registry.defineCmsFieldComponent("product-picker", component)

    expect(registry.getCmsOptionsHook("products")).toBe(hook)
    expect(registry.getCmsFieldComponent("product-picker")).toBe(component)
  })
})

describe("the lazy field component registry", () => {
  it("finds a loader under the name it was registered with, and no component", () => {
    const registry = loadRegistryCopy()
    const loader = buildLoader()

    registry.defineCmsFieldComponent("rich-text", loader)

    expect(registry.getCmsFieldComponentLoader("rich-text")).toBe(loader)
    expect(registry.getCmsFieldComponent("rich-text")).toBeUndefined()
  })

  it("replaces a component registered again as a loader, and a loader as a component", () => {
    const registry = loadRegistryCopy()
    const loader = buildLoader()
    const component = buildComponent()

    registry.defineCmsFieldComponent("rich-text", buildComponent())
    registry.defineCmsFieldComponent("rich-text", loader)

    expect(registry.getCmsFieldComponent("rich-text")).toBeUndefined()
    expect(registry.getCmsFieldComponentLoader("rich-text")).toBe(loader)

    registry.defineCmsFieldComponent("rich-text", component)

    expect(registry.getCmsFieldComponent("rich-text")).toBe(component)
    expect(registry.getCmsFieldComponentLoader("rich-text")).toBeUndefined()
  })

  it("adds loaders to a store an older copy created without them", () => {
    const component = buildComponent()
    const loader = buildLoader()

    ;(globalThis as unknown as Record<symbol, unknown>)[
      ADMIN_EXTENSIONS_STORE_KEY
    ] = {
      optionsHooks: new Map(),
      components: new Map([["product-picker", component]]),
    }

    const registry = loadRegistryCopy()

    registry.defineCmsFieldComponent("rich-text", loader)

    expect(registry.getCmsFieldComponent("product-picker")).toBe(component)
    expect(registry.getCmsFieldComponentLoader("rich-text")).toBe(loader)
  })

  it("hands every copy the same document and block place contexts", () => {
    const first = loadRegistryCopy()
    const second = loadRegistryCopy()

    expect(second.getCmsDocumentContext()).toBe(first.getCmsDocumentContext())
    expect(second.getCmsBlockPlaceContext()).toBe(
      first.getCmsBlockPlaceContext()
    )
  })
})
