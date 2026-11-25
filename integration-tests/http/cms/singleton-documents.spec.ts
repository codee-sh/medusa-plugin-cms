import type { ICachingModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { buildCollectionCacheTag } from "../../../src/lib/cache/build-collection-cache-tag"
import { createAdminHeaders } from "../../utils/admin"
import { createStoreHeaders } from "../../utils/store"

jest.setTimeout(60 * 1000)

type Headers = { headers: Record<string, string> }

/** An error the test client throws, with the response it got. */
type ResponseError = { response: { status: number; data: { message: string } } }

/**
 * The routes of a singleton, the test module's settings: the store reads none before the first create,
 * the first create and an update pass, and a second create and a delete answer 400.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let admin: Headers
    let store: Headers

    beforeEach(async () => {
      admin = await createAdminHeaders(getContainer())
      store = await createStoreHeaders(getContainer())

      // The database is emptied between tests without events, so the cache is cleared by hand.
      await getContainer()
        .resolve<ICachingModuleService>(Modules.CACHING)
        .clear({ tags: [buildCollectionCacheTag({ key: "TestSettings" })] })
    })

    /**
     * Creates the settings document through the Admin.
     *
     * @param body - The document's columns.
     * @returns The response.
     */
    const createSettings = (body: Record<string, unknown>) =>
      api
        .post("/admin/cms/collections/settings/documents", body, admin)
        .catch((error: ResponseError) => error.response) as Promise<{
        status: number
        data: Record<string, any>
      }>

    it("answers the store no settings before the first create", async () => {
      const response = await api.get("/store/cms/settings?limit=1", store)

      expect(response.data).toMatchObject({ documents: [], count: 0 })
    })

    it("creates the settings and saves a change the store reads", async () => {
      const created = await createSettings({ title: "Main" })
      const id = created.data.document.id
      const updated = await api.post(
        `/admin/cms/collections/settings/documents/${id}`,
        { featured_note: "Free delivery", base_version: null },
        admin
      )
      const read = await api.get("/store/cms/settings?limit=1", store)

      expect(created.status).toBe(200)
      expect(updated.status).toBe(200)
      expect(read.data.documents).toMatchObject([
        { title: "Main", featured_note: "Free delivery" },
      ])
    })

    it("answers 400 to a second create", async () => {
      await createSettings({ title: "Main" })
      const second = await createSettings({ title: "Second" })

      expect(second.status).toBe(400)
      expect(second.data.message).toBe(
        "This collection holds one document, which already exists. Edit it instead."
      )
    })

    it("answers 400 to a delete", async () => {
      const created = await createSettings({ title: "Main" })
      const response = await api
        .delete(
          `/admin/cms/collections/settings/documents/${created.data.document.id}`,
          admin
        )
        .catch((error: ResponseError) => error.response)

      expect(response.status).toBe(400)
      expect(response.data.message).toBe(
        "This collection holds one document, which cannot be deleted. Edit it instead."
      )
    })
  },
})
