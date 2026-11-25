import { findFreeValue } from "../find-free-value"

describe("findFreeValue", () => {
  it("keeps a base no document holds", () => {
    expect(findFreeValue("soup", ["soup-2"])).toBe("soup")
  })

  it("adds the first free suffix to a taken base", () => {
    expect(findFreeValue("soup", ["soup", "soup-2", "soup-4"])).toBe("soup-3")
  })

  it("ignores values that only start like the base", () => {
    expect(findFreeValue("soup", ["soup", "soup-pie"])).toBe("soup-2")
  })
})
