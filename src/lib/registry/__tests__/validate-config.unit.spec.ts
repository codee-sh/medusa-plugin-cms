import { buildTestConfig } from "../../__tests__/fixtures"
import { validateConfig } from "../validate-config"

describe("validateConfig", () => {
  it("accepts a config that fits its models", () => {
    expect(() => validateConfig(buildTestConfig())).not.toThrow()
  })

  it("throws the registry's error for a config that does not fit", () => {
    const config = buildTestConfig()
    config.collections[0].slug = "Bad-Slug"

    expect(() => validateConfig(config)).toThrow(
      'The CMS config is invalid: collection "Bad-Slug": not snake_case, or repeated'
    )
  })
})
