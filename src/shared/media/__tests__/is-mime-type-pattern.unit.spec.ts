import { isMimeTypePattern } from "../is-mime-type-pattern"

describe("isMimeTypePattern", () => {
  it.each([
    "image/png",
    "image/*",
    "image/svg+xml",
    "application/vnd.ms-excel",
  ])("accepts %s", (value) => {
    expect(isMimeTypePattern(value)).toBe(true)
  })

  it.each([["png"], ["*/*"], ["image/"], ["/png"], ["image/png "], [""], [3]])(
    "refuses %p",
    (value) => {
      expect(isMimeTypePattern(value)).toBe(false)
    }
  )
})
