import { describeText } from "../describe-text"

describe("describeText", () => {
  it("quotes a text as it is and a translation by its key", () => {
    expect(describeText("Main")).toBe("Main")
    expect(
      describeText({ type: "translation", key: "page.main", ns: "cms-test" })
    ).toBe("page.main")
  })
})
