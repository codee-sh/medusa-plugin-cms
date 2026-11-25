import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { deleteCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/delete-cms-document"
import { listCmsReferencesWorkflow } from "../../../../src/workflows/cms/workflows/list-cms-references"
import { TEST_CONTENT_MODULE } from "../../../modules/test-content"
import type TestContentModuleService from "../../../modules/test-content/service"

jest.setTimeout(60 * 1000)

/**
 * The references of a document: the live rows of every collection whose relationship points at it, the
 * document itself left out, and a delete the plugin does not refuse for them.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    let content: TestContentModuleService

    beforeEach(() => {
      content =
        getContainer().resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
    })

    /**
     * Creates a recipe in the database.
     *
     * @param values - Its values over a title and notes.
     * @returns Its id.
     */
    const createRecipe = async (
      values: Record<string, unknown> = {}
    ): Promise<string> =>
      (
        await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer", ...values },
        ])
      )[0].id

    it("lists the settings and the recipes pointing at a recipe, itself left out", async () => {
      const id = await createRecipe()
      await content.updateTestRecipes({ id, related_recipe_id: id })
      const relatedId = await createRecipe({ related_recipe_id: id })
      const [settings] = await content.createTestSettings([
        { featured_recipe_id: id },
      ])

      const { result } = await listCmsReferencesWorkflow(getContainer()).run({
        input: { collection: "recipe", id },
      })

      expect(result).toEqual(
        expect.arrayContaining([
          {
            collection: "settings",
            field: "featured_recipe_id",
            id: settings.id,
          },
          { collection: "recipe", field: "related_recipe_id", id: relatedId },
        ])
      )
      expect(result).toHaveLength(2)
    })

    it("leaves a soft-deleted row out of the references", async () => {
      const id = await createRecipe()
      const relatedId = await createRecipe({ related_recipe_id: id })
      await content.softDeleteTestRecipes([relatedId])

      const { result } = await listCmsReferencesWorkflow(getContainer()).run({
        input: { collection: "recipe", id },
      })

      expect(result).toEqual([])
    })

    it("deletes a referenced recipe as before, the referencing row keeping its id", async () => {
      const id = await createRecipe()
      const [settings] = await content.createTestSettings([
        { featured_recipe_id: id },
      ])

      await deleteCmsDocumentWorkflow(getContainer()).run({
        input: { collection: "recipe", id },
      })
      const [kept] = await content.listTestSettings({ id: settings.id })

      expect(kept.featured_recipe_id).toBe(id)
    })

    it("refuses the references of a deleted recipe as not found", async () => {
      const id = await createRecipe()
      await content.softDeleteTestRecipes([id])

      await expect(
        listCmsReferencesWorkflow(getContainer()).run({
          input: { collection: "recipe", id },
        })
      ).rejects.toMatchObject({ type: "not_found" })
    })
  },
})
