import { validateUrl } from "../validate-url"
import { DEFAULT_LINK_POLICY } from "../link-policy"

const REFUSED = "Use a link starting with http://, https://, mailto:, tel: or /"

describe("validateUrl", () => {
  it.each([
    "https://example.com",
    "HTTPS://Example.com/path?q=1#top",
    "http://localhost:9000",
    "mailto:hello@example.com",
    "tel:+48123456789",
    "/about",
    "/about?ref=hero#team",
    "#faq",
    "?page=2",
  ])("allows %s with the default policy", (url) => {
    expect(validateUrl(url, DEFAULT_LINK_POLICY)).toBe(true)
  })

  it.each([
    ["javascript:alert(1)"],
    ["JavaScript:alert(1)"],
    [" javascript:alert(1)"],
    ["data:text/html;base64,PHNjcmlwdD4="],
    ["vbscript:msgbox(1)"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["https:/example.com"],
    ["https://"],
    ["https:example.com"],
    ["mailto:"],
    ["example.com"],
    ["about"],
    ["ftp://files.example.com"],
    ["https://example.com/a b"],
    ["https://example.com/\u0000"],
    [""],
  ])("refuses %j with the forms the policy allows", (url) => {
    expect(validateUrl(url, DEFAULT_LINK_POLICY)).toBe(REFUSED)
  })

  it("follows a narrowed policy, and names its forms", () => {
    const policy = { protocols: ["https"], relative: false }

    expect(validateUrl("https://example.com", policy)).toBe(true)
    expect(validateUrl("/about", policy)).toBe(
      "Use a link starting with https://"
    )
    expect(validateUrl("http://example.com", policy)).toBe(
      "Use a link starting with https://"
    )
  })

  it("names relative links alone for a policy without protocols", () => {
    expect(
      validateUrl("https://example.com", { protocols: [], relative: true })
    ).toBe("Use a link starting with /")
  })
})
