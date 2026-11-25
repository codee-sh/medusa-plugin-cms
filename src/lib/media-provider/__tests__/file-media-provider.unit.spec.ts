import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  DEFAULT_MAX_FILE_SIZE,
  FileMediaProvider,
} from "../file-media-provider"
import type { FileMediaProviderOptions } from "../types"

/**
 * Builds a File Module stub whose files are the keys given, each served under `/static/`, as a local
 * file provider answers them.
 *
 * @param keys - The keys of the files that exist.
 * @returns The stub, with each method a mock.
 */
const buildFileModule = (keys: string[]) => ({
  retrieveFile: jest.fn(async (id: string) => {
    if (!keys.includes(id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `File with key ${id} not found`
      )
    }
    return { id, url: `http://localhost/static/${id}` }
  }),
  createFiles: jest.fn(async () => ({
    id: "photo-01.jpg",
    url: "http://localhost/static/photo-01.jpg",
  })),
  deleteFiles: jest.fn(async () => undefined),
})

/**
 * Builds a provider over a File Module stub.
 *
 * @param fileModule - The File Module the container resolves.
 * @param options - The provider's options.
 * @returns The provider.
 */
const buildProvider = (
  fileModule: ReturnType<typeof buildFileModule>,
  options: FileMediaProviderOptions = {}
) => {
  const container = {
    resolve: (name: string) => (name === Modules.FILE ? fileModule : undefined),
  }

  return new FileMediaProvider(container as never, options)
}

describe("FileMediaProvider", () => {
  it("stores ids only and cannot be searched", () => {
    expect(FileMediaProvider.stores).toEqual(["id"])
    expect(FileMediaProvider.prototype.list).toBeUndefined()
  })

  it("reads each key and leaves out one the File Module does not find", async () => {
    const fileModule = buildFileModule(["a.jpg", "b.pdf"])

    await expect(
      buildProvider(fileModule).retrieve(["a.jpg", "gone.jpg", "b.pdf"])
    ).resolves.toEqual([
      { id: "a.jpg", url: "http://localhost/static/a.jpg" },
      { id: "b.pdf", url: "http://localhost/static/b.pdf" },
    ])
    expect(fileModule.retrieveFile).toHaveBeenCalledTimes(3)
  })

  it("makes no call for no keys", async () => {
    const fileModule = buildFileModule([])

    await expect(buildProvider(fileModule).retrieve([])).resolves.toEqual([])
    expect(fileModule.retrieveFile).not.toHaveBeenCalled()
  })

  it("leaves out a missing file whose error comes from another copy of Medusa's utils", async () => {
    const fileModule = buildFileModule([])
    fileModule.retrieveFile.mockRejectedValueOnce(
      Object.assign(new Error("File with key a.jpg not found"), {
        __isMedusaError: true,
        type: MedusaError.Types.NOT_FOUND,
      })
    )

    await expect(
      buildProvider(fileModule).retrieve(["a.jpg"])
    ).resolves.toEqual([])
  })

  it("passes on an error other than a missing file", async () => {
    const fileModule = buildFileModule([])
    fileModule.retrieveFile.mockRejectedValueOnce(new Error("bucket down"))

    await expect(buildProvider(fileModule).retrieve(["a.jpg"])).rejects.toThrow(
      "bucket down"
    )
  })

  it("uploads a public file in base64 and answers it with the upload's name, type and size", async () => {
    const fileModule = buildFileModule([])
    const content = Buffer.from("image bytes")

    await expect(
      buildProvider(fileModule).upload({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        content,
      })
    ).resolves.toEqual({
      id: "photo-01.jpg",
      url: "http://localhost/static/photo-01.jpg",
      filename: "photo.jpg",
      mime_type: "image/jpeg",
      size: content.length,
    })
    expect(fileModule.createFiles).toHaveBeenCalledWith({
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      content: content.toString("base64"),
      access: "public",
    })
  })

  it("deletes a file by its key", async () => {
    const fileModule = buildFileModule([])

    await buildProvider(fileModule).delete({
      id: "photo-01.jpg",
      url: "http://localhost/static/photo-01.jpg",
    })

    expect(fileModule.deleteFiles).toHaveBeenCalledWith("photo-01.jpg")
  })

  it("takes 10 MB as the upload limit unless the options give one", () => {
    const fileModule = buildFileModule([])

    expect(buildProvider(fileModule).maxFileSize).toBe(DEFAULT_MAX_FILE_SIZE)
    expect(DEFAULT_MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
    expect(buildProvider(fileModule, { maxFileSize: 2048 }).maxFileSize).toBe(
      2048
    )
  })

  it("takes the options' mimeTypes, and any type without them", () => {
    const fileModule = buildFileModule([])

    expect(buildProvider(fileModule).mimeTypes).toBeUndefined()
    expect(
      buildProvider(fileModule, { mimeTypes: ["image/*", "application/pdf"] })
        .mimeTypes
    ).toEqual(["image/*", "application/pdf"])
  })

  it.each([[[]], ["image/png"], [["png"]], [["image/png", 3]]])(
    "refuses mimeTypes of %p",
    (mimeTypes) => {
      expect(() => FileMediaProvider.validateOptions({ mimeTypes })).toThrow(
        '"mimeTypes" must list MIME types'
      )
    }
  )

  it.each([0, -1, Number.POSITIVE_INFINITY, "10mb"])(
    "refuses a maxFileSize of %p",
    (maxFileSize) => {
      expect(() => FileMediaProvider.validateOptions({ maxFileSize })).toThrow(
        '"maxFileSize" must be a positive number of bytes'
      )
    }
  )

  it("accepts options without maxFileSize", () => {
    expect(() => FileMediaProvider.validateOptions({})).not.toThrow()
  })
})
