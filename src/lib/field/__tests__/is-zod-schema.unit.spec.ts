import { z } from "@medusajs/framework/zod"
import { isZodSchema } from "../is-zod-schema"

describe("isZodSchema", () => {
  it("takes a Zod schema", () => {
    expect(isZodSchema(z.string())).toBe(true)
  })

  it.each([
    ["a plain object", { type: "string" }],
    ["null", null],
    ["undefined", undefined],
  ])("refuses %s", (_label, value) => {
    expect(isZodSchema(value)).toBe(false)
  })
})
