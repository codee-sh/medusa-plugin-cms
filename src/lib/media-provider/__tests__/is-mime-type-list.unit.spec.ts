import { isMimeTypeList } from "../is-mime-type-list"

describe("isMimeTypeList", () => {
  it("takes exact types and a type with every subtype", () => {
    expect(isMimeTypeList(["image/png", "image/*"])).toBe(true)
  })

  it.each([
    ["an empty list", []],
    ["a list with something no MIME type", ["image/png", "png"]],
    ["a single type, not in a list", "image/png"],
  ])("refuses %s", (_label, value) => {
    expect(isMimeTypeList(value)).toBe(false)
  })
})
