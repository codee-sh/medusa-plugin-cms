import { Modules } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import type { CmsMedia } from "../../../../lib/media-provider/types"
import { CMS_MODULE } from "../../../../modules/cms"
import {
  type CreateCmsMediaInput,
  createCmsMediaStep,
} from "../create-cms-media"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  const actual = jest.requireActual("@medusajs/framework/workflows-sdk")

  return {
    ...actual,
    createStep: (
      _nameOrConfig: unknown,
      invoke: unknown,
      compensate: unknown
    ) => [invoke, compensate],
  }
})

type Container = { resolve: (name: string) => unknown }

const [invoke, compensate] = createCmsMediaStep as unknown as [
  (
    input: CreateCmsMediaInput,
    context: { container: Container }
  ) => Promise<{ output: CmsMedia; compensateInput: CmsMedia }>,
  (
    media: CmsMedia | undefined,
    context: { container: Container }
  ) => Promise<void>,
]

/**
 * Builds a container holding the CMS module and a File Module stub.
 *
 * @returns The container and the stub.
 */
const buildContainer = () => {
  const fileModule = {
    createFiles: jest.fn(async () => ({
      id: "photo-01.png",
      url: "http://localhost/static/photo-01.png",
    })),
    deleteFiles: jest.fn(async () => undefined),
  }
  const dependencies: Record<string, unknown> = {
    [CMS_MODULE]: { getConfig: () => buildTestConfig() },
    [Modules.FILE]: fileModule,
  }
  const container = {
    resolve: (name: string) => {
      if (name in dependencies) {
        return dependencies[name]
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
  }

  return { container, fileModule }
}

describe("createCmsMediaStep", () => {
  it("stores the file through the provider and answers its record", async () => {
    const { container, fileModule } = buildContainer()
    const content = Buffer.from("png bytes")

    const { output, compensateInput } = await invoke(
      {
        filename: "photo.png",
        mimeType: "image/png",
        content: content.toString("base64"),
      },
      { container }
    )

    expect(output).toEqual({
      id: "photo-01.png",
      url: "http://localhost/static/photo-01.png",
      filename: "photo.png",
      mime_type: "image/png",
      size: content.length,
    })
    expect(compensateInput).toEqual(output)
    expect(fileModule.createFiles).toHaveBeenCalledWith(
      expect.objectContaining({ content: content.toString("base64") })
    )
  })

  it("refuses a file over the provider's limit", async () => {
    const { container, fileModule } = buildContainer()

    await expect(
      invoke(
        {
          filename: "big.png",
          mimeType: "image/png",
          content: Buffer.alloc(10 * 1024 * 1024 + 1).toString("base64"),
        },
        { container }
      )
    ).rejects.toMatchObject({
      type: "invalid_data",
      message: "The file is larger than 10485760 bytes",
    })
    expect(fileModule.createFiles).not.toHaveBeenCalled()
  })

  describe("with the provider's mimeTypes", () => {
    /**
     * Loads the step afresh over a config whose provider takes images only, as the registry is built
     * once per module load.
     *
     * @returns The step's invoke.
     */
    const loadImagesOnlyInvoke = (): typeof invoke => {
      let step: unknown
      let FileMediaProvider: unknown

      jest.isolateModules(() => {
        ;({ FileMediaProvider } = require("../../../../lib"))
        step = require("../create-cms-media").createCmsMediaStep
      })

      const config = buildTestConfig()
      config.media = {
        provider: {
          resolve: FileMediaProvider as never,
          options: { mimeTypes: ["image/*"] },
        },
      }

      return (input, { container }) =>
        (step as [typeof invoke])[0](input, {
          container: {
            resolve: (name: string) =>
              name === CMS_MODULE
                ? { getConfig: () => config }
                : container.resolve(name),
          },
        })
    }

    it("stores a file whose type a wildcard matches", async () => {
      const { container, fileModule } = buildContainer()

      await loadImagesOnlyInvoke()(
        {
          filename: "photo.png",
          mimeType: "image/png",
          content: Buffer.from("png bytes").toString("base64"),
        },
        { container }
      )

      expect(fileModule.createFiles).toHaveBeenCalled()
    })

    it("refuses a file of another type and stores nothing", async () => {
      const { container, fileModule } = buildContainer()

      await expect(
        loadImagesOnlyInvoke()(
          {
            filename: "terms.pdf",
            mimeType: "application/pdf",
            content: Buffer.from("pdf bytes").toString("base64"),
          },
          { container }
        )
      ).rejects.toMatchObject({
        type: "invalid_data",
        message: 'The file type "application/pdf" is not allowed',
      })
      expect(fileModule.createFiles).not.toHaveBeenCalled()
    })
  })

  it("stores a file of any type when the provider names no mimeTypes", async () => {
    const { container, fileModule } = buildContainer()

    await invoke(
      {
        filename: "terms.pdf",
        mimeType: "application/pdf",
        content: Buffer.from("pdf bytes").toString("base64"),
      },
      { container }
    )

    expect(fileModule.createFiles).toHaveBeenCalled()
  })

  it("deletes the stored file during compensation", async () => {
    const { container, fileModule } = buildContainer()

    await compensate(
      { id: "photo-01.png", url: "http://localhost/static/photo-01.png" },
      { container }
    )

    expect(fileModule.deleteFiles).toHaveBeenCalledWith("photo-01.png")
  })

  it("does nothing during compensation when nothing was stored", async () => {
    const { container, fileModule } = buildContainer()

    await compensate(undefined, { container })

    expect(fileModule.deleteFiles).not.toHaveBeenCalled()
  })
})
