import { prepareConfigValue } from "../prepare-config-value"

describe("prepareConfigValue", () => {
  it("returns a value as it is", () => {
    const value = ["bold"]

    expect(prepareConfigValue(value, { defaults: [] }, "field")).toBe(value)
  })

  it("calls a function once with the params and returns what it returns", () => {
    const params = { prefix: "a" }
    const value = jest.fn(({ prefix }: { prefix: string }) => `${prefix}b`)

    expect(prepareConfigValue(value, params, "field")).toBe("ab")
    expect(value).toHaveBeenCalledTimes(1)
    expect(value).toHaveBeenCalledWith(params)
  })

  it("names the function's place when it throws", () => {
    const value = () => {
      throw new Error("boom")
    }

    expect(() =>
      prepareConfigValue(value, {}, 'field "body": the "features" function')
    ).toThrow(
      'The CMS config is invalid: field "body": the "features" function threw: boom'
    )
  })
})
