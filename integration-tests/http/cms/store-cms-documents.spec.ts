import type {
  ICachingModuleService,
  IFileModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { buildCollectionCacheTag } from "../../../src/lib/cache/build-collection-cache-tag"
import { TEST_CONTENT_MODULE } from "../../modules/test-content"
import type TestContentModuleService from "../../modules/test-content/service"
import { createAdminHeaders } from "../../utils/admin"
import { createStoreHeaders } from "../../utils/store"

jest.setTimeout(60 * 1000)

/**
 * Builds a rich text document of one paragraph.
 *
 * @param text - The paragraph's text.
 * @returns The document.
 */
const buildRichText = (text: string) => ({
  root: {
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", text, format: 0 }] },
    ],
  },
})

/** A callout's body. */
const HOT = buildRichText("Hot")

type Headers = { headers: Record<string, string> }

/** An error the test client throws, with the response it got. */
type ResponseError = { response: { status: number; data: { message: string } } }

/**
 * `GET /store/cms/:collection`, `/:collection/:id` and `/:collection/slug/:slug`: published recipes in
 * the store's shape, by id, by slug and in a list, with their blocks, a block's area, an image and rich text;
 * a draft, an unpublished and a deleted recipe never served; paging and its limits; the query keys the
 * routes refuse; the publishable key; and the cached reads answering every write at once, a draft of a
 * published recipe left out until it is published. `store: false` and a collection without a slug field
 * wait for the second collection of 1i.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let content: TestContentModuleService
    let admin: Headers
    let store: Headers
    const createdKeys: string[] = []

    beforeEach(async () => {
      content =
        getContainer().resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
      admin = await createAdminHeaders(getContainer())
      store = await createStoreHeaders(getContainer())

      // The database is emptied between tests without events, so the cache is cleared by hand.
      await getContainer()
        .resolve<ICachingModuleService>(Modules.CACHING)
        .clear({ tags: [buildCollectionCacheTag({ key: "TestRecipe" })] })
    })

    afterEach(async () => {
      await getContainer()
        .resolve<IFileModuleService>(Modules.FILE)
        .deleteFiles(createdKeys.splice(0))
    })

    /**
     * Reads a store route, answering an error's response instead of throwing it.
     *
     * @param url - The route.
     * @param headers - The request's headers; the store's key by default.
     * @returns The response.
     */
    const read = (url: string, headers: Headers = store) =>
      api
        .get(url, headers)
        .catch((error: ResponseError) => error.response) as Promise<{
        status: number
        data: Record<string, any>
      }>

    /**
     * Creates a recipe through the Admin and publishes it.
     *
     * @param document - The recipe's columns and areas.
     * @returns Its id and its latest version's number.
     */
    const publishRecipe = async (document: Record<string, unknown>) => {
      const created = (
        await api.post(
          "/admin/cms/collections/recipe/documents",
          { notes: "Simmer", ...document },
          admin
        )
      ).data
      const published = (
        await api.post(
          `/admin/cms/collections/recipe/documents/${created.document.id}/publish`,
          { base_version: created.latest_version.version },
          admin
        )
      ).data

      return {
        id: created.document.id as string,
        version: published.latest_version.version as number,
      }
    }

    describe("GET /store/cms/:collection/:id, /slug/:slug and the list", () => {
      it("serves a published recipe in the store's shape by id, by slug and in a list", async () => {
        const image = await getContainer()
          .resolve<IFileModuleService>(Modules.FILE)
          .createFiles({
            filename: "callout.png",
            mimeType: "image/png",
            content: Buffer.from("png bytes").toString("base64"),
            access: "public",
          })
        createdKeys.push(image.id)
        const recipe = await publishRecipe({
          title: "Bean stew",
          summary: HOT,
          sections: [
            {
              block_type: "step",
              heading: "Chop",
              tips: [{ block_type: "tip", text: "Sharp" }],
            },
            { block_type: "callout", body: HOT, image: image.id },
          ],
        })

        const byId = await read(`/store/cms/recipe/${recipe.id}`)
        const bySlug = await read("/store/cms/recipe/slug/bean-stew")
        const list = await read("/store/cms/recipe")

        expect(byId.status).toBe(200)
        expect(byId.data.document).toEqual(
          expect.objectContaining({
            id: recipe.id,
            title: "Bean stew",
            slug: "bean-stew",
            summary: HOT,
            published_at: expect.any(String),
            updated_at: expect.any(String),
            sections: [
              {
                id: expect.stringMatching(/^tstep_/),
                block_type: "step",
                heading: "Chop",
                tips: [
                  {
                    id: expect.stringMatching(/^ttip_/),
                    block_type: "tip",
                    text: "Sharp",
                  },
                ],
              },
              {
                id: expect.stringMatching(/^tcall_/),
                block_type: "callout",
                body: HOT,
                image: { id: image.id, url: image.url },
              },
            ],
          })
        )
        for (const key of [
          "notes",
          "status",
          "created_by",
          "updated_by",
          "created_at",
          "deleted_at",
          "areas",
        ]) {
          expect(byId.data.document).not.toHaveProperty(key)
        }
        expect(bySlug.data).toEqual(byId.data)
        expect(list.data).toEqual({
          documents: [
            expect.objectContaining({ id: recipe.id, title: "Bean stew" }),
          ],
          count: 1,
          limit: 20,
          offset: 0,
        })
        expect(list.data.documents[0]).not.toHaveProperty("sections")
      })

      it("never serves a draft, an unpublished or a deleted recipe", async () => {
        const draft = (
          await api.post(
            "/admin/cms/collections/recipe/documents",
            { title: "Draft stew", notes: "Simmer" },
            admin
          )
        ).data.document
        const unpublished = await publishRecipe({ title: "Gone stew" })
        const deleted = await publishRecipe({ title: "Lost stew" })

        await api.post(
          `/admin/cms/collections/recipe/documents/${unpublished.id}/unpublish`,
          {},
          admin
        )
        await api.delete(
          `/admin/cms/collections/recipe/documents/${deleted.id}`,
          admin
        )

        for (const url of [
          `/store/cms/recipe/${draft.id}`,
          "/store/cms/recipe/slug/draft-stew",
          `/store/cms/recipe/${unpublished.id}`,
          `/store/cms/recipe/${deleted.id}`,
          "/store/cms/recipe/slug/lost-stew",
        ]) {
          expect((await read(url)).status).toBe(404)
        }
        expect((await read("/store/cms/recipe")).data.documents).toEqual([])
      })

      it("pages the newest published first, counting every published recipe", async () => {
        await content.createTestRecipes(
          [1, 2, 3].map((day) => ({
            title: `Soup ${day}`,
            notes: "Simmer",
            status: "published" as const,
            published_at: new Date(`2026-11-0${day}T10:00:00.000Z`),
          }))
        )
        await content.createTestRecipes([{ title: "Draft", notes: "Simmer" }])

        const page = await read("/store/cms/recipe?limit=2&offset=1")

        expect(page.data).toMatchObject({ count: 3, limit: 2, offset: 1 })
        expect(
          page.data.documents.map(({ title }: { title: string }) => title)
        ).toEqual(["Soup 2", "Soup 1"])
      })

      it.each([
        ["a limit over 100", "/store/cms/recipe?limit=101"],
        ["a key the list does not take", "/store/cms/recipe?nope=1"],
        ["a key a document does not take", "/store/cms/recipe/trec_1?limit=1"],
      ])("answers 400 to %s", async (_label, url) => {
        expect((await read(url)).status).toBe(400)
      })

      it("answers 400 without a publishable key", async () => {
        expect((await read("/store/cms/recipe", { headers: {} })).status).toBe(
          400
        )
      })

      it("answers 404 for an unknown collection", async () => {
        expect((await read("/store/cms/nope")).status).toBe(404)
      })
    })

    describe("fields and order", () => {
      /**
       * Publishes a recipe with two steps, the first holding a tip, and a callout.
       *
       * @param title - Its title.
       * @returns Its id.
       */
      const publishRecipeWithBlocks = async (title: string) =>
        (
          await publishRecipe({
            title,
            sections: [
              {
                block_type: "step",
                heading: "Chop",
                tips: [{ block_type: "tip", text: "Sharp" }],
              },
              { block_type: "callout", body: HOT },
              { block_type: "step", heading: "Cook" },
            ],
          })
        ).id

      it("answers only the columns selected, id always", async () => {
        const id = await publishRecipeWithBlocks("Bean stew")

        const answer = await read(`/store/cms/recipe/${id}?fields=title`)

        expect(answer.data.document).toEqual({ id, title: "Bean stew" })
      })

      it("answers a list with its areas when fields add them", async () => {
        const id = await publishRecipeWithBlocks("Bean stew")

        const list = await read("/store/cms/recipe?fields=title,*sections")

        expect(list.data.documents).toEqual([
          {
            id,
            title: "Bean stew",
            sections: [
              expect.objectContaining({ block_type: "step", heading: "Chop" }),
              expect.objectContaining({ block_type: "callout", body: HOT }),
              expect.objectContaining({ block_type: "step", heading: "Cook" }),
            ],
          },
        ])
      })

      it("answers only the block types and fields selected, through a block's areas", async () => {
        const id = await publishRecipeWithBlocks("Bean stew")

        const steps = await read(
          `/store/cms/recipe/${id}?fields=sections.step.heading`
        )
        const tips = await read(
          `/store/cms/recipe/${id}?fields=sections.step.tips.tip.text`
        )

        expect(steps.data.document).toEqual({
          id,
          sections: [
            { id: expect.any(String), block_type: "step", heading: "Chop" },
            { id: expect.any(String), block_type: "step", heading: "Cook" },
          ],
        })
        expect(tips.data.document.sections).toEqual([
          {
            id: expect.any(String),
            block_type: "step",
            tips: [
              { id: expect.any(String), block_type: "tip", text: "Sharp" },
            ],
          },
          { id: expect.any(String), block_type: "step", tips: [] },
        ])
      })

      it("never answers a hidden field, even when fields name it", async () => {
        const id = await publishRecipeWithBlocks("Bean stew")

        const document = await read(
          `/store/cms/recipe/${id}?fields=title,notes`
        )

        expect(document.data.document).toEqual({ id, title: "Bean stew" })
      })

      it("orders a list by a public column", async () => {
        await publishRecipe({ title: "Apple pie" })
        await publishRecipe({ title: "Bean stew" })

        const titles = async (order: string) =>
          (
            await read(`/store/cms/recipe?order=${order}&fields=title`)
          ).data.documents.map(({ title }: { title: string }) => title)

        expect(await titles("title")).toEqual(["Apple pie", "Bean stew"])
        expect(await titles("-title")).toEqual(["Bean stew", "Apple pie"])
      })

      it.each([
        ["an order on rich text", "/store/cms/recipe?order=summary"],
        ["an order on an area", "/store/cms/recipe?order=sections"],
        [
          "an area on a list of more than 50",
          "/store/cms/recipe?fields=*sections&limit=51",
        ],
      ])("answers 400 to %s", async (_label, url) => {
        expect((await read(url)).status).toBe(400)
      })

      it("answers 400 to a block path deeper than the relations limit", async () => {
        const id = await publishRecipeWithBlocks("Bean stew")

        const deep = await read(
          `/store/cms/recipe/${id}?fields=sections.step.tips.step.tips.tip.text`
        )

        expect(deep.status).toBe(400)
      })
    })

    describe("filters", () => {
      it("lists only the recipes whose filterable boolean matches", async () => {
        const vegan = await publishRecipe({ title: "Bean stew", vegan: true })
        const meat = await publishRecipe({ title: "Beef stew", vegan: false })

        const ids = async (query: string) =>
          (await read(`/store/cms/recipe?${query}`)).data.documents.map(
            ({ id }: { id: string }) => id
          )

        expect(await ids("vegan=true")).toEqual([vegan.id])
        expect(await ids("vegan=false")).toEqual([meat.id])
        expect((await read("/store/cms/recipe?vegan=true")).data.count).toBe(1)
      })

      it.each([
        ["a value that is no boolean", "/store/cms/recipe?vegan=maybe"],
        ["a field that is not filterable", "/store/cms/recipe?title=Soup"],
      ])("answers 400 to %s", async (_label, url) => {
        expect((await read(url)).status).toBe(400)
      })
    })

    describe("cached reads", () => {
      it("lists a recipe published after an empty list was read", async () => {
        const empty = await read("/store/cms/recipe")
        const recipe = await publishRecipe({ title: "Bean stew" })
        const list = await read("/store/cms/recipe")

        expect(empty.data.documents).toEqual([])
        expect(list.data.documents).toEqual([
          expect.objectContaining({ id: recipe.id }),
        ])
      })

      it("stops serving a recipe unpublished after it was read", async () => {
        const recipe = await publishRecipe({ title: "Bean stew" })
        const before = await read(`/store/cms/recipe/${recipe.id}`)

        await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}/unpublish`,
          {},
          admin
        )

        expect(before.status).toBe(200)
        expect((await read(`/store/cms/recipe/${recipe.id}`)).status).toBe(404)
      })

      it("keeps the published answer while a draft waits, and answers the draft once published", async () => {
        const recipe = await publishRecipe({
          title: "Bean stew",
          sections: [
            { block_type: "step", heading: "Chop" },
            { block_type: "step", heading: "Cook" },
          ],
        })
        const url = `/store/cms/recipe/${recipe.id}`
        const before = await read(url)
        const [kept] = before.data.document.sections

        const draft = (
          await api.post(
            `/admin/cms/collections/recipe/documents/${recipe.id}`,
            {
              title: "Bean soup",
              sections: [{ id: kept.id, block_type: "step", heading: "Chop" }],
              base_version: recipe.version,
            },
            admin
          )
        ).data
        const waiting = await read(url)

        await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}/publish`,
          { base_version: draft.latest_version.version },
          admin
        )
        const after = await read(url)

        expect(waiting.data).toEqual(before.data)
        expect(after.data.document.title).toBe("Bean soup")
        expect(after.data.document.sections).toEqual([
          { id: kept.id, block_type: "step", heading: "Chop", tips: [] },
        ])
      })
    })
  },
})
