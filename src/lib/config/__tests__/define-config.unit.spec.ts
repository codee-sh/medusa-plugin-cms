import { defineConfig } from "../define-config"
import type { Config } from "../types"

describe("defineConfig", () => {
  it("returns the config it was given", () => {
    const config: Config = {
      module: "test",
      collections: [],
      blocks: [],
    }

    expect(defineConfig(config)).toBe(config)
  })
})
