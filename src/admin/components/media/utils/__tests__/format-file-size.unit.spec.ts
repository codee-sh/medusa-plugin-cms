import { formatFileSize } from "../format-file-size"

describe("formatFileSize", () => {
  it("writes a byte count in the largest unit that fits", () => {
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB")
    expect(formatFileSize(512)).toBe("512 B")
  })
})
