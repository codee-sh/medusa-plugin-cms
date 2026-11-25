import { formatStoredValue } from "../format-stored-value"

describe("formatStoredValue", () => {
  it("writes a text as it is", () => {
    expect(formatStoredValue("prod_1")).toBe("prod_1")
  })

  it("joins a list with commas", () => {
    expect(formatStoredValue(["prod_1", "prod_2"])).toBe("prod_1, prod_2")
  })

  it("writes a number and a boolean as text", () => {
    expect(formatStoredValue(3)).toBe("3")
    expect(formatStoredValue(false)).toBe("false")
  })

  it("writes nothing for an empty value", () => {
    expect(formatStoredValue(null)).toBe("")
    expect(formatStoredValue(undefined)).toBe("")
  })
})
