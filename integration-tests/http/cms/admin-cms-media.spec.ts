import type { IFileModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminHeaders } from "../../utils/admin"

jest.setTimeout(60 * 1000)

/**
 * `POST` and `GET /admin/cms/media` with the test config's `FileMediaProvider`, over the test app's
 * local file provider: an upload stores the file and answers its record, a file over the limit and a
 * body without a file answer 400, and a search answers 400, as the provider has no `list`.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const uploadedKeys: string[] = []

    /**
     * Builds a multipart body holding one file.
     *
     * @param content - The file's bytes.
     * @param filename - The file's name.
     * @returns The body.
     */
    const formOf = (content: Buffer, filename = "photo.png") => {
      const form = new FormData()
      form.append(
        "file",
        new Blob([new Uint8Array(content)], { type: "image/png" }),
        filename
      )
      return form
    }

    afterEach(async () => {
      if (uploadedKeys.length) {
        await getContainer()
          .resolve<IFileModuleService>(Modules.FILE)
          .deleteFiles(uploadedKeys.splice(0))
      }
    })

    describe("POST /admin/cms/media", () => {
      it("stores the file and answers its record", async () => {
        const headers = await createAdminHeaders(getContainer())
        const content = Buffer.from("png bytes")
        const response = await api.post(
          "/admin/cms/media",
          formOf(content),
          headers
        )
        const { media } = response.data

        uploadedKeys.push(media.id)

        expect(response.status).toBe(200)
        expect(media).toEqual({
          id: expect.stringContaining("photo.png"),
          url: expect.stringContaining(media.id),
          filename: "photo.png",
          mime_type: "image/png",
          size: content.length,
        })
        await expect(
          getContainer()
            .resolve<IFileModuleService>(Modules.FILE)
            .retrieveFile(media.id)
        ).resolves.toMatchObject({ id: media.id })
      })

      it("answers 400 to a file over the provider's limit", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/media",
            formOf(Buffer.alloc(10 * 1024 * 1024 + 1)),
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe(
          "The file is larger than 10485760 bytes"
        )
      })

      it("answers 400 to a body without a file", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post("/admin/cms/media", new FormData(), headers)
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe('The body holds no "file"')
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .post("/admin/cms/media", formOf(Buffer.from("png bytes")))
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("GET /admin/cms/media", () => {
      it("answers 400, as FileMediaProvider cannot be searched", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .get("/admin/cms/media?q=photo", headers)
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe(
          'The media provider "file" does not support search'
        )
      })
    })
  },
})
