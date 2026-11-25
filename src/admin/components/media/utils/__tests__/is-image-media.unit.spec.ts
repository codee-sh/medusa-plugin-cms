import { isImageMedia } from "../is-image-media"

describe("isImageMedia", () => {
  it("reads the MIME type, or without one the URL's extension", () => {
    expect(isImageMedia({ mime_type: "image/png", url: "/a" })).toBe(true)
    expect(isImageMedia({ mime_type: "application/pdf", url: "/a.png" })).toBe(
      false
    )
    expect(isImageMedia({ url: "http://localhost/static/a.webp?v=1" })).toBe(
      true
    )
    expect(isImageMedia({ url: "http://localhost/static/a.pdf" })).toBe(false)
  })
})
