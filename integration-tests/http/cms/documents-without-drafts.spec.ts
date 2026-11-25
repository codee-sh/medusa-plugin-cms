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
 * The routes of a collection without drafts, the test module's tags: a create answers a published
 * document the store lists at once, a save changes what the store answers at once, a create without
 * what a publish needs is refused, and the routes of drafts and versions answer 400.
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
        .clear({ tags: [buildCollectionCacheTag({ key: "TestTag" })] })
    })

    /**
     * Creates a tag through the Admin.
     *
     * @param body - The tag's columns.
     * @returns The response.
     */
    const createTag = (body: Record<string, unknown>) =>
      api
        .post("/admin/cms/collections/tag/documents", body, admin)
        .catch((error: ResponseError) => error.response) as Promise<{
        status: number
        data: Record<string, any>
      }>

    it("answers a created tag published, and the store lists it at once", async () => {
      const emptyList = await api.get("/store/cms/tag", store)
      const created = await createTag({ name: "Spicy", description: "Hot" })
      const list = await api.get("/store/cms/tag", store)

      expect(emptyList.data.documents).toEqual([])
      expect(created.status).toBe(200)
      expect(created.data.document).toMatchObject({
        name: "Spicy",
        status: "published",
      })
      expect(created.data.latest_version).toBeNull()
      expect(list.data.documents.map(({ name }) => name)).toEqual(["Spicy"])
    })

    it("changes what the store answers at the save", async () => {
      const created = await createTag({ name: "Spicy", description: "Hot" })
      const id = created.data.document.id
      const before = await api.get(`/store/cms/tag/${id}`, store)

      await api.post(
        `/admin/cms/collections/tag/documents/${id}`,
        { name: "Mild", base_version: null },
        admin
      )
      const after = await api.get(`/store/cms/tag/${id}`, store)

      expect(before.data.document.name).toBe("Spicy")
      expect(after.data.document.name).toBe("Mild")
    })

    it.each([
      ["POST", "publish", { base_version: null }],
      ["POST", "unpublish", {}],
      ["POST", "discard", { base_version: null }],
      ["GET", "versions", undefined],
      ["GET", "versions/cmsver_1", undefined],
      ["POST", "versions/cmsver_1/restore", { base_version: null }],
    ])("answers 400 to %s .../%s on a tag", async (method, path, body) => {
      const created = await createTag({ name: "Spicy", description: "Hot" })
      const url = `/admin/cms/collections/tag/documents/${created.data.document.id}/${path}`
      const response = await (
        method === "GET" ? api.get(url, admin) : api.post(url, body, admin)
      ).catch((error: ResponseError) => error.response)

      expect(response.status).toBe(400)
      expect(response.data.message).toBe(
        "Drafts and versions are off for this collection, so changes go live when saved."
      )
    })

    it("refuses a tag without what a publish needs", async () => {
      const created = await createTag({ name: "Spicy" })

      expect(created.status).toBe(400)
      expect(created.data.message).toContain("description")
    })
  },
})
