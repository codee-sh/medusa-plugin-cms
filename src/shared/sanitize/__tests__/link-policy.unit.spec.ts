import { validateLinkPolicy, DEFAULT_LINK_POLICY } from "../link-policy"

describe("validateLinkPolicy", () => {
  it("finds nothing wrong with the default policy or a narrowed one", () => {
    expect(validateLinkPolicy(DEFAULT_LINK_POLICY)).toBeUndefined()
    expect(
      validateLinkPolicy({ protocols: ["https"], relative: false })
    ).toBeUndefined()
    expect(
      validateLinkPolicy({ protocols: [], relative: true })
    ).toBeUndefined()
  })

  it.each(["javascript", "data", "vbscript"])(
    "refuses %s, which runs code or embeds content",
    (protocol) => {
      expect(
        validateLinkPolicy({ protocols: ["https", protocol], relative: true })
      ).toBe(
        `"${protocol}" can run code or embed content, so no link may use it`
      )
    }
  )

  it.each(["https:", "HTTPS", "1http", ""])(
    "refuses %j, which is not a lowercase scheme name",
    (protocol) => {
      expect(
        validateLinkPolicy({ protocols: [protocol], relative: true })
      ).toBe(`"${protocol}" is not a lowercase scheme name, such as "https"`)
    }
  )

  it("refuses a policy that allows no link", () => {
    expect(validateLinkPolicy({ protocols: [], relative: false })).toBe(
      "allows no link: list a protocol or set relative to true"
    )
  })
})
