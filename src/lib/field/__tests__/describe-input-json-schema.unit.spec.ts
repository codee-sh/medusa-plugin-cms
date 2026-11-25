import { z } from "@medusajs/framework/zod"
import { describeInputJsonSchema } from "../describe-input-json-schema"

describe("describeInputJsonSchema", () => {
  it("describes a transform by the type it takes, not the one it gives", () => {
    expect(
      describeInputJsonSchema(z.string().transform((value) => value.length))
    ).toMatchObject({ type: "string" })
  })

  it("describes an object's properties", () => {
    expect(
      describeInputJsonSchema(z.object({ title: z.string() }))?.properties
    ).toHaveProperty("title")
  })

  it("answers undefined for a schema JSON Schema cannot describe", () => {
    expect(describeInputJsonSchema(z.date())).toBeUndefined()
  })
})
