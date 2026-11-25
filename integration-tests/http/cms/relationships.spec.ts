import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { TEST_CONTENT_MODULE } from "../../modules/test-content"
import type TestContentModuleService from "../../modules/test-content/service"
import { createAdminHeaders } from "../../utils/admin"

jest.setTimeout(60 * 1000)

type Headers = { headers: Record<string, string> }

/** A response, a refused one included. */
type Response = { status: number; data: Record<string, any> }

/**
 * The relationship fields of the test module: the settings' featured recipe and a recipe's related one.
 * A write takes an id that names a live recipe, a draft included, and refuses one that names none, at
 * the create, the update, the publish of a draft, the restore of a version and the `validate` route; the
 * references route answers the rows pointing at a document.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let admin: Headers
    let content: TestContentModuleService

    beforeEach(async () => {
      admin = await createAdminHeaders(getContainer())
      content =
        getContainer().resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
    })

    /**
     * Posts to a collection's Admin route and answers the response, a refused one included.
     *
     * @param path - The path under `/admin/cms/collections/`.
     * @param body - The body.
     * @returns The response.
     */
    const post = (path: string, body: Record<string, unknown>) =>
      api
        .post(`/admin/cms/collections/${path}`, body, admin)
        .catch(
          (error: { response: Response }) => error.response
        ) as Promise<Response>

    /**
     * Creates a draft recipe in the database.
     *
     * @param title - Its title.
     * @returns Its id.
     */
    const createDraftRecipe = async (title: string): Promise<string> =>
      (await content.createTestRecipes([{ title, notes: "Simmer" }]))[0].id

    /**
     * Creates a recipe and soft-deletes it.
     *
     * @returns Its id.
     */
    const createDeletedRecipe = async (): Promise<string> => {
      const id = await createDraftRecipe("Gone soup")

      await content.softDeleteTestRecipes([id])

      return id
    }

    describe("the settings' featured recipe", () => {
      it("takes a draft recipe's id and answers it in the Admin's read", async () => {
        const recipeId = await createDraftRecipe("Bean stew")

        const created = await post("settings/documents", {
          featured_recipe_id: recipeId,
        })
        const read = await api.get(
          `/admin/cms/collections/settings/documents/${created.data.document.id}`,
          admin
        )

        expect(created.status).toBe(200)
        expect(read.data.document.featured_recipe_id).toBe(recipeId)
      })

      it("takes null for no recipe", async () => {
        const created = await post("settings/documents", {
          featured_recipe_id: null,
        })

        expect(created.status).toBe(200)
        expect(created.data.document.featured_recipe_id).toBeNull()
      })

      it("refuses a deleted recipe's id, at its field", async () => {
        const recipeId = await createDeletedRecipe()

        const created = await post("settings/documents", {
          featured_recipe_id: recipeId,
        })

        expect(created.status).toBe(400)
        expect(created.data.message).toBe(
          `featured_recipe_id: The document "${recipeId}" was not found`
        )
      })

      it("refuses an empty id", async () => {
        const created = await post("settings/documents", {
          featured_recipe_id: "",
        })

        expect(created.status).toBe(400)
        expect(created.data.message).toContain(
          "featured_recipe_id: Send null for no document, not an empty id"
        )
      })

      it("refuses a deleted recipe's id at an update", async () => {
        const created = await post("settings/documents", { title: "Main" })
        const recipeId = await createDeletedRecipe()

        const updated = await post(
          `settings/documents/${created.data.document.id}`,
          { featured_recipe_id: recipeId, base_version: null }
        )

        expect(updated.status).toBe(400)
        expect(updated.data.message).toBe(
          `featured_recipe_id: The document "${recipeId}" was not found`
        )
      })

      it("reports a deleted recipe's id through the validate route", async () => {
        const recipeId = await createDeletedRecipe()

        const validated = await post("settings/validate", {
          featured_recipe_id: recipeId,
        })

        expect(validated.status).toBe(200)
        expect(validated.data.errors).toContainEqual({
          path: "featured_recipe_id",
          message: `The document "${recipeId}" was not found`,
        })
      })
    })

    describe("GET /admin/cms/collections/:collection/documents/:id/references", () => {
      it("answers the settings pointing at a recipe", async () => {
        const recipeId = await createDraftRecipe("Bean stew")
        const settings = await post("settings/documents", {
          featured_recipe_id: recipeId,
        })

        const response = await api.get(
          `/admin/cms/collections/recipe/documents/${recipeId}/references`,
          admin
        )

        expect(response.status).toBe(200)
        expect(response.data).toEqual({
          references: [
            {
              collection: "settings",
              field: "featured_recipe_id",
              id: settings.data.document.id,
            },
          ],
        })
      })

      it("answers 404 for a deleted recipe", async () => {
        const recipeId = await createDeletedRecipe()

        const response = await api
          .get(
            `/admin/cms/collections/recipe/documents/${recipeId}/references`,
            admin
          )
          .catch((error: { response: Response }) => error.response)

        expect(response.status).toBe(404)
      })
    })

    describe("a recipe's related recipe", () => {
      /**
       * Creates a recipe through the Admin, its first version recorded.
       *
       * @param body - Its values over a title and notes.
       * @returns Its id.
       */
      const createRecipe = async (
        body: Record<string, unknown> = {}
      ): Promise<string> =>
        (
          await post("recipe/documents", {
            title: "Bean stew",
            notes: "Simmer",
            ...body,
          })
        ).data.document.id

      it("takes the recipe itself", async () => {
        const id = await createRecipe()

        const updated = await post(`recipe/documents/${id}`, {
          related_recipe_id: id,
          base_version: 1,
        })

        expect(updated.status).toBe(200)
        expect(updated.data.document.related_recipe_id).toBe(id)
      })

      it("refuses at its publish a draft pointing at a recipe deleted since", async () => {
        const relatedId = await createDraftRecipe("Pea soup")
        const id = await createRecipe()
        await post(`recipe/documents/${id}/publish`, { base_version: 1 })
        const saved = await post(`recipe/documents/${id}`, {
          related_recipe_id: relatedId,
          base_version: 2,
        })

        await content.softDeleteTestRecipes([relatedId])

        const published = await post(`recipe/documents/${id}/publish`, {
          base_version: 3,
        })

        expect(saved.status).toBe(200)
        expect(published.status).toBe(400)
        expect(published.data.message).toBe(
          `related_recipe_id: The document "${relatedId}" was not found`
        )
      })

      it("refuses a restore of a version whose related recipe is gone", async () => {
        const relatedId = await createDraftRecipe("Pea soup")
        const id = await createRecipe({ related_recipe_id: relatedId })
        await post(`recipe/documents/${id}`, {
          related_recipe_id: null,
          base_version: 1,
        })
        const first = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            admin
          )
        ).data.versions.at(-1)

        await content.softDeleteTestRecipes([relatedId])

        const restored = await post(
          `recipe/documents/${id}/versions/${first.id}/restore`,
          { base_version: 2 }
        )

        expect(restored.status).toBe(400)
        expect(restored.data.message).toBe(
          `related_recipe_id: The document "${relatedId}" was not found`
        )
      })
    })
  },
})
