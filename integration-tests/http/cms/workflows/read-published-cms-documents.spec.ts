import type { ICachingModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import type { Knex } from "knex"
import { buildCollectionCacheTag } from "../../../../src/lib/cache/build-collection-cache-tag"
import { getCollection } from "../../../../src/lib/registry/get-collection"
import { getPublishedCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/get-published-cms-document"
import { listPublishedCmsDocumentsWorkflow } from "../../../../src/workflows/cms/workflows/list-published-cms-documents"
import { TEST_CONTENT_MODULE } from "../../../modules/test-content"
import type TestContentModuleService from "../../../modules/test-content/service"

jest.setTimeout(60 * 1000)

/**
 * `get-published-cms-document` and `list-published-cms-documents`: the store's shape, a draft not
 * found, a second read served from the cache and `cache: false` reading past it, and the collection's
 * cache tag being the one Medusa computes for its documents.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    let content: TestContentModuleService
    let caching: ICachingModuleService

    beforeEach(async () => {
      content =
        getContainer().resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
      caching = getContainer().resolve<ICachingModuleService>(Modules.CACHING)

      // The database is emptied between tests without events, so the cache is cleared by hand.
      await caching.clear({
        tags: [buildCollectionCacheTag({ key: "TestRecipe" })],
      })
    })

    /**
     * Creates a published recipe.
     *
     * @param title - Its title.
     * @returns The recipe.
     */
    const publishRecipe = async (title: string) => {
      const [recipe] = await content.createTestRecipes([
        {
          title,
          slug: title.toLowerCase().replace(/ /g, "-"),
          notes: "Simmer",
          status: "published",
          published_at: new Date(),
        },
      ])

      return recipe
    }

    /**
     * Renames a recipe in the database, past the module and its events, so only a read of the
     * database sees it.
     *
     * @param id - The recipe's id.
     * @param title - Its new title.
     */
    const renameInDatabase = async (id: string, title: string) => {
      await getContainer()
        .resolve<Knex>(ContainerRegistrationKeys.PG_CONNECTION)("test_recipe")
        .where({ id })
        .update({ title })
    }

    describe("getPublishedCmsDocumentWorkflow", () => {
      it("answers the store's document by id and by slug", async () => {
        const recipe = await publishRecipe("Bean stew")
        const run = getPublishedCmsDocumentWorkflow(getContainer()).run

        const byId = await run({
          input: { collection: "recipe", id: recipe.id },
        })
        const bySlug = await run({
          input: { collection: "recipe", slug: "bean-stew" },
        })

        expect(byId.result.document).toMatchObject({
          id: recipe.id,
          title: "Bean stew",
          sections: [],
        })
        expect(byId.result.document).not.toHaveProperty("status")
        expect(bySlug.result).toEqual(byId.result)
      })

      it("finds no draft", async () => {
        const [draft] = await content.createTestRecipes([
          { title: "Draft", notes: "Simmer" },
        ])

        await expect(
          getPublishedCmsDocumentWorkflow(getContainer()).run({
            input: { collection: "recipe", id: draft.id },
          })
        ).rejects.toMatchObject({ type: "not_found" })
      })

      it("serves a second read from the cache, and reads past it with cache false", async () => {
        const recipe = await publishRecipe("Bean stew")
        const input = { collection: "recipe", id: recipe.id }

        await getPublishedCmsDocumentWorkflow(getContainer()).run({ input })
        await renameInDatabase(recipe.id, "Bean soup")
        const cached = await getPublishedCmsDocumentWorkflow(
          getContainer()
        ).run({ input })
        const fresh = await getPublishedCmsDocumentWorkflow(getContainer()).run(
          { input: { ...input, cache: false } }
        )

        expect(cached.result.document.title).toBe("Bean stew")
        expect(fresh.result.document.title).toBe("Bean soup")
      })
    })

    describe("listPublishedCmsDocumentsWorkflow", () => {
      it("answers a page of published recipes without their areas, with the count", async () => {
        const recipe = await publishRecipe("Bean stew")
        await content.createTestRecipes([{ title: "Draft", notes: "Simmer" }])

        const { result } = await listPublishedCmsDocumentsWorkflow(
          getContainer()
        ).run({ input: { collection: "recipe", limit: 20, offset: 0 } })

        expect(result.count).toBe(1)
        expect(result.documents).toEqual([
          expect.objectContaining({ id: recipe.id, title: "Bean stew" }),
        ])
        expect(result.documents[0]).not.toHaveProperty("sections")
      })

      it("serves a second read from the cache, and reads past it with cache false", async () => {
        const recipe = await publishRecipe("Bean stew")
        const input = { collection: "recipe", limit: 20, offset: 0 }

        await listPublishedCmsDocumentsWorkflow(getContainer()).run({ input })
        await renameInDatabase(recipe.id, "Bean soup")
        const cached = await listPublishedCmsDocumentsWorkflow(
          getContainer()
        ).run({ input })
        const fresh = await listPublishedCmsDocumentsWorkflow(
          getContainer()
        ).run({ input: { ...input, cache: false } })

        expect(cached.result.documents[0].title).toBe("Bean stew")
        expect(fresh.result.documents[0].title).toBe("Bean soup")
      })
    })

    describe("the collection's cache tag", () => {
      it("is the list tag Medusa computes for the collection's documents", async () => {
        const recipe = await publishRecipe("Bean stew")
        const { collection } = getCollection(getContainer(), "recipe")

        const tags = await caching.computeTags(
          { id: recipe.id },
          { operation: "updated" }
        )

        expect(tags).toContain(buildCollectionCacheTag(collection))
      })
    })
  },
})
