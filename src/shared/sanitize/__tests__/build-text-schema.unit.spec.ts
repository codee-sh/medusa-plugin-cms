import { z } from "zod"
import {
  buildTextSchema,
  CONTROL_CHARACTERS_MESSAGE,
} from "../build-text-schema"

describe("buildTextSchema", () => {
  it("takes a text without control characters as it is", () => {
    const text = "  Soup <b>hot</b>  "

    expect(buildTextSchema(z, { multiline: false }).safeParse(text)).toEqual({
      success: true,
      data: text,
    })
  })

  it("refuses a text with a control character, with its message", () => {
    const result = buildTextSchema(z, { multiline: false }).safeParse(
      "Soup\u0000"
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(CONTROL_CHARACTERS_MESSAGE)
  })

  it("keeps the line breaks of a text of several lines", () => {
    const text = "Line one\r\nLine two\tend"

    expect(buildTextSchema(z, { multiline: true }).safeParse(text)).toEqual({
      success: true,
      data: text,
    })
    expect(
      buildTextSchema(z, { multiline: false }).safeParse(text).success
    ).toBe(false)
  })

  it("refuses a value that is not a text", () => {
    expect(buildTextSchema(z, { multiline: false }).safeParse(3).success).toBe(
      false
    )
  })
})
