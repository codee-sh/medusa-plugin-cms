import { mediaName } from "../media-name"

describe("mediaName", () => {
  it("shows the file name, or without one the URL's last segment", () => {
    expect(mediaName({ filename: "photo.png", url: "/x" })).toBe("photo.png")
    expect(
      mediaName({ url: "http://localhost/static/my%20photo.png?v=1" })
    ).toBe("my photo.png")
  })
})
