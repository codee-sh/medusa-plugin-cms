import {
  formatStaleVersionMessage,
  isStaleVersionMessage,
} from "../stale-version"

describe("formatStaleVersionMessage", () => {
  it("names the newer version and who saved it, and is told apart from other errors", () => {
    const message = formatStaleVersionMessage(3, "user_2")

    expect(message).toBe(
      "Version 3 was saved by user_2 after the one you edited. Reload to see it."
    )
    expect(isStaleVersionMessage(message)).toBe(true)
    expect(isStaleVersionMessage("title: Required")).toBe(false)
  })

  it("speaks of a change when the document has no version", () => {
    expect(isStaleVersionMessage(formatStaleVersionMessage(null))).toBe(true)
  })
})
