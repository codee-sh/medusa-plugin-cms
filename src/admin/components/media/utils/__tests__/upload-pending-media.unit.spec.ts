import { uploadPendingMedia } from "../upload-pending-media"

/**
 * Builds an upload that answers a stored key for each chosen file, and fails for the values given.
 *
 * @param failing - The values whose upload fails.
 * @returns The upload, a mock.
 */
const buildUpload = (failing: string[] = []) =>
  jest.fn(async (value: string) => {
    if (failing.includes(value)) {
      throw new Error("upload failed")
    }
    return `key-of-${value}`
  })

describe("uploadPendingMedia", () => {
  it("puts each uploaded file's stored value in place, in fields, lists and blocks at any depth", async () => {
    const upload = buildUpload()
    const created = new Date("2026-11-11")

    const result = await uploadPendingMedia(
      {
        title: "Soup",
        cover: "pending:a",
        gallery: ["kept.png", "pending:b"],
        cooked_at: created,
        sections: [
          { block_type: "hero", image: "pending:c" },
          {
            block_type: "grid",
            items: [{ content: [{ block_type: "hero", image: "pending:d" }] }],
          },
        ],
      },
      upload
    )

    expect(result.values).toEqual({
      title: "Soup",
      cover: "key-of-pending:a",
      gallery: ["kept.png", "key-of-pending:b"],
      cooked_at: created,
      sections: [
        { block_type: "hero", image: "key-of-pending:c" },
        {
          block_type: "grid",
          items: [
            { content: [{ block_type: "hero", image: "key-of-pending:d" }] },
          ],
        },
      ],
    })
    expect(result.uploaded).toEqual([
      { path: "cover", value: "key-of-pending:a" },
      { path: "gallery", value: ["kept.png", "key-of-pending:b"] },
      { path: "sections.0.image", value: "key-of-pending:c" },
      {
        path: "sections.1.items.0.content.0.image",
        value: "key-of-pending:d",
      },
    ])
    expect(result.failed).toEqual([])
    expect(upload).toHaveBeenCalledTimes(4)
  })

  it("keeps a failed file's value and reports its field, and uploads the others all the same", async () => {
    const result = await uploadPendingMedia(
      { cover: "pending:a", gallery: ["pending:b", "pending:c"] },
      buildUpload(["pending:a", "pending:c"])
    )

    expect(result.values).toEqual({
      cover: "pending:a",
      gallery: ["key-of-pending:b", "pending:c"],
    })
    expect(result.uploaded).toEqual([
      { path: "gallery", value: ["key-of-pending:b", "pending:c"] },
    ])
    expect(result.failed).toEqual(["cover", "gallery"])
  })

  it("uploads nothing and changes nothing without chosen files", async () => {
    const upload = buildUpload()
    const values = { cover: "cover.png", gallery: ["a.png"], sections: [] }

    const result = await uploadPendingMedia(values, upload)

    expect(result).toEqual({ values, uploaded: [], failed: [] })
    expect(upload).not.toHaveBeenCalled()
  })
})
