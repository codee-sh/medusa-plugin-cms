import { matchesMimeType } from "../matches-mime-type"

describe("matchesMimeType", () => {
  it("matches an exact type", () => {
    expect(matchesMimeType("image/png", ["image/png", "application/pdf"])).toBe(
      true
    )
  })

  it("matches every subtype of a wildcard", () => {
    expect(matchesMimeType("image/avif", ["image/*"])).toBe(true)
  })

  it("compares without regard to case", () => {
    expect(matchesMimeType("IMAGE/PNG", ["image/*"])).toBe(true)
    expect(matchesMimeType("image/png", ["Image/PNG"])).toBe(true)
  })

  it("refuses a type outside the patterns", () => {
    expect(matchesMimeType("application/pdf", ["image/*"])).toBe(false)
  })

  it("refuses a type whose main type only starts like the wildcard's", () => {
    expect(matchesMimeType("imagex/png", ["image/*"])).toBe(false)
  })

  it("refuses a type without a subtype", () => {
    expect(matchesMimeType("image", ["image/*"])).toBe(false)
  })
})
