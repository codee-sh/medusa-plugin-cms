import { sanitizeUrl } from "../sanitize-url"

describe("sanitizeUrl", () => {
  it("answers an allowed link as it is", () => {
    expect(sanitizeUrl("/about?ref=hero")).toBe("/about?ref=hero")
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com")
  })

  it("answers # for a refused link", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#")
    expect(sanitizeUrl("//evil.example")).toBe("#")
  })

  it("follows the policy it is given", () => {
    expect(
      sanitizeUrl("/about", { protocols: ["https"], relative: false })
    ).toBe("#")
  })
})
