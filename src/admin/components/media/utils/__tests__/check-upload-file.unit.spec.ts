import { checkUploadFile } from "../check-upload-file"

describe("checkUploadFile", () => {
  const accept = ["image/png", "application/pdf"]

  it("accepts a file of an accepted type within the limit", () => {
    expect(
      checkUploadFile({ type: "image/png", size: 100 }, accept, 100)
    ).toEqual({ accepted: true })
  })

  it("refuses a type the field does not accept", () => {
    expect(
      checkUploadFile({ type: "image/jpeg", size: 1 }, accept, 100)
    ).toEqual({ accepted: false, reason: "type" })
  })

  it("accepts every subtype of a wildcard, and refuses another type", () => {
    expect(
      checkUploadFile({ type: "image/gif", size: 1 }, ["image/*"], 100)
    ).toEqual({ accepted: true })
    expect(
      checkUploadFile({ type: "application/pdf", size: 1 }, ["image/*"], 100)
    ).toEqual({ accepted: false, reason: "type" })
  })

  it("refuses a file over the limit", () => {
    expect(
      checkUploadFile({ type: "application/pdf", size: 101 }, accept, 100)
    ).toEqual({ accepted: false, reason: "size" })
  })
})
