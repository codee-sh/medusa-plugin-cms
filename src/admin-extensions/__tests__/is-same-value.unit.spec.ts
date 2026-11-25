import { isSameValue } from "../is-same-value"

describe("isSameValue", () => {
  it("compares primitives as they are", () => {
    expect(isSameValue("Offer", "Offer")).toBe(true)
    expect(isSameValue(1, 2)).toBe(false)
    expect(isSameValue(null, undefined)).toBe(false)
  })

  it("compares lists and plain objects by content", () => {
    expect(isSameValue({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
    expect(isSameValue([1, 2], [1, 2, 3])).toBe(false)
    expect(isSameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(isSameValue({ a: 1 }, { b: 1 })).toBe(false)
  })

  it("compares dates by their time", () => {
    expect(isSameValue(new Date("2026-11-14"), new Date("2026-11-14"))).toBe(
      true
    )
    expect(isSameValue(new Date("2026-11-14"), new Date("2026-11-15"))).toBe(
      false
    )
  })
})
