import { mimeTypesLabel } from "../mime-type-label"

describe("mimeTypesLabel", () => {
  it("lists the short labels, an unknown type by its subtype in capitals", () => {
    expect(
      mimeTypesLabel([
        "image/jpeg",
        "image/png",
        "application/pdf",
        "video/mp4",
      ])
    ).toBe("JPG, PNG, PDF, MP4")
  })

  it("shows a wildcard as written", () => {
    expect(mimeTypesLabel(["image/*", "application/pdf"])).toBe("image/*, PDF")
  })
})
