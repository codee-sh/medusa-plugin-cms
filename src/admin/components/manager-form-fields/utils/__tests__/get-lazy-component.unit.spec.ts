import type { CustomFieldLoader } from "../../types"
import { getLazyComponent } from "../get-lazy-component"

/**
 * Builds a loader that resolves to a component.
 *
 * @returns The loader.
 */
const buildLoader = (): CustomFieldLoader => async () => ({
  default: () => null,
})

describe("getLazyComponent", () => {
  it("gives one lazy component per loader", () => {
    const load = buildLoader()

    expect(getLazyComponent(load)).toBe(getLazyComponent(load))
  })

  it("gives another lazy component for another loader", () => {
    expect(getLazyComponent(buildLoader())).not.toBe(
      getLazyComponent(buildLoader())
    )
  })
})
