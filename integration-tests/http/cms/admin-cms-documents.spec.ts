import type {
  IFileModuleService,
  IUserModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { CMS_MODULE } from "../../../src/modules/cms"
import type CmsModuleService from "../../../src/modules/cms/service"
import { checkCmsTakenValueWorkflow } from "../../../src/workflows/cms/workflows/check-cms-taken-value"
import { deleteCmsDocumentContentStep } from "../../../src/workflows/cms/steps/delete-cms-document-content"
import { getCmsDocumentStep } from "../../../src/workflows/cms/steps/get-cms-document"
import { prepareCmsDeleteStep } from "../../../src/workflows/cms/steps/prepare-cms-delete"
import { prepareCmsWriteStep } from "../../../src/workflows/cms/steps/prepare-cms-write"
import { updateCmsDocumentContentStep } from "../../../src/workflows/cms/steps/update-cms-document-content"
import { createCmsDocumentWorkflow } from "../../../src/workflows/cms/workflows/create-cms-document"
import { listCmsDocumentsWorkflow } from "../../../src/workflows/cms/workflows/list-cms-documents"
import { publishCmsDocumentWorkflow } from "../../../src/workflows/cms/workflows/publish-cms-document"
import { unpublishCmsDocumentWorkflow } from "../../../src/workflows/cms/workflows/unpublish-cms-document"
import { updateCmsDocumentWorkflow } from "../../../src/workflows/cms/workflows/update-cms-document"
import { TEST_CONTENT_MODULE } from "../../modules/test-content"
import type TestContentModuleService from "../../modules/test-content/service"
import { createAdminHeaders } from "../../utils/admin"

jest.setTimeout(60 * 1000)

/** A step that always fails, so the steps before it are compensated. */
const failStep = createStep("test-fail-after-delete", async () => {
  throw new Error("Stop after the delete")
})

/**
 * Deletes a recipe as `delete-cms-document` does, then fails, so the delete's compensation restores it.
 */
const deleteThenFailWorkflow = createWorkflow(
  "test-delete-cms-recipe-then-fail",
  (input: { id: string }) => {
    const stored = getCmsDocumentStep({ collection: "recipe", id: input.id })
    const write = prepareCmsDeleteStep({ collection: "recipe", stored })

    deleteCmsDocumentContentStep({
      collection: "recipe",
      delete: write.delete,
      stored,
    })
    failStep()
  }
)

/**
 * Saves a recipe's summary as `update-cms-document` writes it, then fails, so the content step's
 * compensation writes the stored values back.
 */
const updateThenFailWorkflow = createWorkflow(
  "test-update-cms-recipe-then-fail",
  (input: { id: string; summary: Record<string, unknown> }) => {
    const stored = getCmsDocumentStep({ collection: "recipe", id: input.id })
    const document = transform({ input }, (data) => ({
      values: { summary: data.input.summary },
      areas: {},
      updated_by: "user_test",
    }))
    const write = prepareCmsWriteStep({
      collection: "recipe",
      document,
      stored,
    })

    updateCmsDocumentContentStep({
      collection: "recipe",
      update: write.update,
      stored,
    })
    failStep()
  }
)

/**
 * Builds a rich text document of one paragraph.
 *
 * @param text - The paragraph's text.
 * @param format - The text's format bits, bold as 1.
 * @returns The document.
 */
const buildRichText = (text: string, format = 0) => ({
  root: {
    type: "root",
    children: [
      { type: "paragraph", children: [{ type: "text", text, format }] },
    ],
  },
})

/** A callout's body. */
const HOT = buildRichText("Hot")

/**
 * `GET` and `POST /admin/cms/collections/:collection/documents`, with `listCmsDocumentsWorkflow`: the
 * recipe collection's page of documents, its search, status filter, field filters and order; a created draft with its
 * slug and authorship, the 400 and 422 a body can get; `GET` and `POST .../documents/:id`, with
 * `updateCmsDocumentWorkflow`: a document read and saved, a column left out kept, the edited document's
 * own slug not taken; `POST .../publish` and `.../unpublish`, with their workflows: a draft published
 * once its fields required at publish are filled, then unpublished; `DELETE .../documents/:id`, a
 * document deleted and its slug freed; `GET .../taken-values`, with `checkCmsTakenValueWorkflow`, the
 * check the Admin runs while a unique value is typed; blocks in an area created, reordered, removed and
 * replaced through those routes, and the compensation of `deleteCmsDocumentContentStep` in a workflow that
 * fails after it; rich text saved, read, refused, validated, restored, and written back by the
 * compensation of `updateCmsDocumentContentStep`;
 * `POST .../validate`, the check without a write the Admin runs while the editor types; and the 404 and
 * 401 around them.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let content: TestContentModuleService

    beforeEach(async () => {
      content =
        getContainer().resolve<TestContentModuleService>(TEST_CONTENT_MODULE)

      // Created one by one, so each is updated after the one before.
      await content.createTestRecipes([
        { title: "Tomato soup", notes: "Simmer", status: "published" },
      ])
      await content.createTestRecipes([{ title: "Apple pie", notes: "Bake" }])
      await content.createTestRecipes([{ title: "Pea soup", notes: "Boil" }])
    })

    describe("listCmsDocumentsWorkflow", () => {
      it("leaves a soft-deleted recipe out of the page and the count", async () => {
        const [removed] = await content.createTestRecipes([
          { title: "Gone", notes: "Gone" },
        ])

        await content.softDeleteTestRecipes([removed.id])

        const { result } = await listCmsDocumentsWorkflow(getContainer()).run({
          input: { collection: "recipe", limit: 20, offset: 0 },
        })

        expect(result.count).toBe(3)
        expect(result.documents.map(({ id }) => id)).not.toContain(removed.id)
      })
    })

    describe("GET /admin/cms/collections/:collection/documents", () => {
      it("returns the first page, newest edits first, without areas", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/documents",
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data).toMatchObject({ count: 3, limit: 20, offset: 0 })
        expect(
          response.data.documents.map(({ title }: { title: string }) => title)
        ).toEqual(["Pea soup", "Apple pie", "Tomato soup"])
        expect(response.data.documents[0]).toMatchObject({ status: "draft" })
        expect(response.data.documents[0]).not.toHaveProperty("sections")
      })

      it("pages with limit and offset", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/documents?limit=1&offset=1",
          headers
        )

        expect(response.data).toMatchObject({ count: 3, limit: 1, offset: 1 })
        expect(response.data.documents).toHaveLength(1)
        expect(response.data.documents[0].title).toBe("Apple pie")
      })

      it("searches the searchable columns with q", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/documents?q=soup",
          headers
        )

        expect(response.data.count).toBe(2)
        expect(
          response.data.documents.map(({ title }: { title: string }) => title)
        ).toEqual(expect.arrayContaining(["Tomato soup", "Pea soup"]))
      })

      it.each([
        ["published", ["Tomato soup"]],
        ["draft", ["Pea soup", "Apple pie"]],
      ])("filters by status %s", async (status, titles) => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          `/admin/cms/collections/recipe/documents?status=${status}`,
          headers
        )

        expect(
          response.data.documents.map(({ title }: { title: string }) => title)
        ).toEqual(titles)
      })

      it("reads the documents of the ids it is given, one or several", async () => {
        const headers = await createAdminHeaders(getContainer())
        const [soup, pie] = (
          await api.get("/admin/cms/collections/recipe/documents", headers)
        ).data.documents
        const several = await api.get(
          `/admin/cms/collections/recipe/documents?id[]=${soup.id}&id[]=${pie.id}`,
          headers
        )
        const one = await api.get(
          `/admin/cms/collections/recipe/documents?id=${pie.id}`,
          headers
        )

        expect(
          several.data.documents.map(({ id }: { id: string }) => id).sort()
        ).toEqual([soup.id, pie.id].sort())
        expect(several.data.count).toBe(2)
        expect(one.data.documents.map(({ id }: { id: string }) => id)).toEqual([
          pie.id,
        ])
      })

      it("reads no document for an id none has", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/documents?id=trec_missing",
          headers
        )

        expect(response.data).toMatchObject({ documents: [], count: 0 })
      })

      describe("filters", () => {
        /**
         * Gives the recipes values to filter by: both soups vegan, the pea soup hard and related to the
         * tomato soup, the apple pie easy and not vegan.
         *
         * @returns The id of each recipe, by its title.
         */
        const seedFilterValues = async (): Promise<Record<string, string>> => {
          const recipes = await content.listTestRecipes({})
          const ids = Object.fromEntries(
            recipes.map(({ title, id }) => [title as string, id])
          )

          await content.updateTestRecipes({
            id: ids["Tomato soup"],
            vegan: true,
            difficulty: "easy",
          })
          await content.updateTestRecipes({
            id: ids["Pea soup"],
            vegan: true,
            difficulty: "hard",
            related_recipe_id: ids["Tomato soup"],
          })
          await content.updateTestRecipes({
            id: ids["Apple pie"],
            vegan: false,
            difficulty: "easy",
          })

          return ids
        }

        /**
         * Lists the recipes a query matches, by title in order.
         *
         * @param query - The query string.
         * @returns The titles, sorted.
         */
        const titlesOf = async (query: string): Promise<string[]> => {
          const headers = await createAdminHeaders(getContainer())
          const response = await api.get(
            `/admin/cms/collections/recipe/documents?${query}`,
            headers
          )

          return response.data.documents
            .map(({ title }: { title: string }) => title)
            .sort()
        }

        it.each([
          ["a boolean", "filters[vegan]=true", ["Pea soup", "Tomato soup"]],
          [
            "a select's one value",
            "filters[difficulty]=easy",
            ["Apple pie", "Tomato soup"],
          ],
          [
            "a select's two values",
            "filters[difficulty][]=easy&filters[difficulty][]=hard",
            ["Apple pie", "Pea soup", "Tomato soup"],
          ],
          [
            "two fields at once",
            "filters[vegan]=true&filters[difficulty]=easy",
            ["Tomato soup"],
          ],
        ])("filters by %s", async (_name, query, titles) => {
          await seedFilterValues()

          expect(await titlesOf(query)).toEqual(titles)
        })

        it("filters by a relationship's id", async () => {
          const ids = await seedFilterValues()

          expect(
            await titlesOf(`filters[related_recipe_id]=${ids["Tomato soup"]}`)
          ).toEqual(["Pea soup"])
        })

        it.each([
          ["a field of another kind", "filters[title]=Soup"],
          ["a field the collection does not have", "filters[nope]=easy"],
          ["a boolean that is no boolean", "filters[vegan]=maybe"],
        ])("answers 400 to %s", async (_name, query) => {
          const headers = await createAdminHeaders(getContainer())
          const { response } = await api
            .get(`/admin/cms/collections/recipe/documents?${query}`, headers)
            .catch((error: { response: unknown }) => error)

          expect(response.status).toBe(400)
          expect(response.data.type).toBe("invalid_data")
        })
      })

      it("orders by a scalar column", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/documents?order=title",
          headers
        )

        expect(
          response.data.documents.map(({ title }: { title: string }) => title)
        ).toEqual(["Apple pie", "Pea soup", "Tomato soup"])
      })

      it.each([
        ["an order by a json column", "order=extra"],
        ["an unknown status", "status=archived"],
        ["an unknown parameter", "fields=id"],
      ])("answers 400 to %s", async (_name, query) => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .get(`/admin/cms/collections/recipe/documents?${query}`, headers)
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
      })

      it("answers 404 for an unknown collection", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .get("/admin/cms/collections/nope/documents", headers)
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
        expect(response.data.message).toBe('Collection "nope" was not found')
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .get("/admin/cms/collections/recipe/documents")
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("POST /admin/cms/collections/:collection/documents", () => {
      it("creates a draft with its slug filled and the admin as author", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          "/admin/cms/collections/recipe/documents",
          { title: "Żurek z jajkiem", notes: "Simmer" },
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data.document).toMatchObject({
          id: expect.stringMatching(/^trec_/),
          title: "Żurek z jajkiem",
          slug: "zurek-z-jajkiem",
          status: "draft",
          created_by: expect.stringMatching(/^user_/),
        })
        expect(response.data.document.updated_by).toBe(
          response.data.document.created_by
        )
      })

      it("gives a second document of the same title the next free slug", async () => {
        const headers = await createAdminHeaders(getContainer())
        const body = { title: "Bean stew", notes: "Simmer" }

        await api.post("/admin/cms/collections/recipe/documents", body, headers)
        const response = await api.post(
          "/admin/cms/collections/recipe/documents",
          body,
          headers
        )

        expect(response.data.document.slug).toBe("bean-stew-2")
      })

      it("answers 422 to a slug a live document holds", async () => {
        await content.createTestRecipes([{ slug: "soup", notes: "Simmer" }])
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            { slug: "soup", notes: "Boil" },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(422)
        expect(response.data.message).toBe(
          'slug: "soup" is used by another document'
        )
      })

      it("takes the slug of a soft-deleted document", async () => {
        const [removed] = await content.createTestRecipes([
          { slug: "soup", notes: "Simmer" },
        ])
        await content.softDeleteTestRecipes([removed.id])
        const headers = await createAdminHeaders(getContainer())

        const response = await api.post(
          "/admin/cms/collections/recipe/documents",
          { slug: "soup", notes: "Boil" },
          headers
        )

        expect(response.data.document.slug).toBe("soup")
      })

      it("answers 400 with the message of a field's validation schema", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            { title: "ab", notes: "Simmer" },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe("title: Use at least 3 characters")
      })

      it("answers 400 at the field to a control character, not a server error, and writes nothing", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            {
              title: "Soup\u0000",
              notes: "Simmer",
              sections: [{ block_type: "step", heading: "Chop\u0000" }],
            },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message.split("\n")).toEqual(
          expect.arrayContaining([
            "title: Remove the control characters from this text",
            "sections.0.heading: Remove the control characters from this text",
          ])
        )

        const [, count] = await content.listAndCountTestRecipes()

        expect(count).toBe(3)
      })

      it("answers 400 with a line per problem of the body", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            { servings: "four", status: "published" },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message.split("\n")).toEqual(
          expect.arrayContaining([
            "status: Unknown field",
            expect.stringMatching(/^servings: /),
            "notes: Required",
          ])
        )
      })

      it("answers 404 for an unknown collection", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post("/admin/cms/collections/nope/documents", {}, headers)
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .post("/admin/cms/collections/recipe/documents", { notes: "Boil" })
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("updateCmsDocumentWorkflow", () => {
      it("saves a change to a created document and keeps what the change leaves out", async () => {
        const [author, editor] = await getContainer()
          .resolve<IUserModuleService>(Modules.USER)
          .createUsers([
            { email: "author@cms.test" },
            { email: "editor@cms.test" },
          ])
        const { result: created } = await createCmsDocumentWorkflow(
          getContainer()
        ).run({
          input: {
            collection: "recipe",
            actor_id: author.id,
            document: { title: "Bean stew", notes: "Simmer" },
          },
        })

        const { result: updated } = await updateCmsDocumentWorkflow(
          getContainer()
        ).run({
          input: {
            collection: "recipe",
            id: created.document.id,
            actor_id: editor.id,
            document: { notes: "Simmer slowly" },
            base_version: created.latest_version!.version,
          },
        })

        expect(created.latest_version).toMatchObject({
          version: 1,
          status: "draft",
        })
        expect(updated.document).toMatchObject({
          id: created.document.id,
          title: "Bean stew",
          slug: "bean-stew",
          notes: "Simmer slowly",
          created_by: author.id,
          updated_by: editor.id,
        })
        expect(updated.latest_version).toMatchObject({
          version: 2,
          snapshot: expect.objectContaining({ notes: "Simmer slowly" }),
        })
      })
    })

    describe("GET /admin/cms/collections/:collection/documents/:id", () => {
      it("returns the document's columns", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", slug: "bean-stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data.document).toMatchObject({
          id: recipe.id,
          title: "Bean stew",
          slug: "bean-stew",
          status: "draft",
          sections: [],
        })
      })

      it("returns the area's live blocks in rank order across block types, without the area rows", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const [section] = await content.createTestSections([
          { name: "sections", recipe_id: recipe.id },
        ])
        const [chop, removed, cook] = await content.createTestSteps([
          { heading: "Chop", rank: 0, area_id: section.id },
          { heading: "Gone", rank: 1, area_id: section.id },
          { heading: "Cook", rank: 3, area_id: section.id },
        ])
        const [callout] = await content.createTestCallouts([
          { body: JSON.stringify(HOT), rank: 2, area_id: section.id },
        ])
        await content.softDeleteTestSteps([removed.id])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          headers
        )
        const { document } = response.data
        const { sections } = document

        expect(sections).toEqual([
          expect.objectContaining({
            id: chop.id,
            block_type: "step",
            heading: "Chop",
          }),
          expect.objectContaining({
            id: callout.id,
            block_type: "callout",
            body: HOT,
          }),
          expect.objectContaining({
            id: cook.id,
            block_type: "step",
            heading: "Cook",
          }),
        ])
        expect(sections[0]).not.toHaveProperty("rank")
        expect(sections[0]).not.toHaveProperty("area_id")
        expect(sections[0]).not.toHaveProperty("allowed")
        expect(document).not.toHaveProperty("areas")
      })

      it("answers 404 for an unknown or soft-deleted document", async () => {
        const [removed] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        await content.softDeleteTestRecipes([removed.id])
        const headers = await createAdminHeaders(getContainer())

        for (const id of [removed.id, "trec_unknown"]) {
          const { response } = await api
            .get(`/admin/cms/collections/recipe/documents/${id}`, headers)
            .catch((error: { response: unknown }) => error)

          expect(response.status).toBe(404)
        }
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .get("/admin/cms/collections/recipe/documents/trec_1")
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("POST /admin/cms/collections/:collection/documents/:id", () => {
      it("saves the columns sent, keeps the rest and stamps the editor", async () => {
        const [recipe] = await content.createTestRecipes([
          {
            title: "Bean stew",
            slug: "bean-stew",
            notes: "Simmer",
            created_by: "user_author",
          },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          { title: "Bean soup", slug: "bean-stew" },
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data.document).toMatchObject({
          id: recipe.id,
          title: "Bean soup",
          slug: "bean-stew",
          notes: "Simmer",
          created_by: "user_author",
          updated_by: expect.stringMatching(/^user_/),
        })
      })

      it("answers the saved change at the next read, as the Admin reads past the cache", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", slug: "bean-stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const url = `/admin/cms/collections/recipe/documents/${recipe.id}`

        await api.get(url, headers)
        await api.get("/admin/cms/collections/recipe/documents", headers)
        await api.post(url, { title: "Bean soup" }, headers)
        const document = await api.get(url, headers)
        const list = await api.get(
          "/admin/cms/collections/recipe/documents",
          headers
        )

        expect(document.data.document.title).toBe("Bean soup")
        expect(list.data.documents).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: recipe.id, title: "Bean soup" }),
          ])
        )
      })

      it("clears a column sent as null", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          { title: null },
          headers
        )

        expect(response.data.document.title).toBeNull()
      })

      it("fills a slug sent empty from the stored source", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", slug: "old-slug", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          { slug: null },
          headers
        )

        expect(response.data.document.slug).toBe("bean-stew")
      })

      it("answers 400 to a required column sent empty", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            `/admin/cms/collections/recipe/documents/${recipe.id}`,
            { notes: null, title: "ab" },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message.split("\n")).toEqual(
          expect.arrayContaining([
            "notes: Required",
            "title: Use at least 3 characters",
          ])
        )
      })

      it("answers 422 to the slug of another document, not to its own", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", slug: "bean-stew", notes: "Simmer" },
          { title: "Soup", slug: "soup", notes: "Boil" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            `/admin/cms/collections/recipe/documents/${recipe.id}`,
            { slug: "soup" },
            headers
          )
          .catch((error: { response: unknown }) => error)
        const own = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          { slug: "bean-stew", notes: "Simmer slowly" },
          headers
        )

        expect(response.status).toBe(422)
        expect(response.data.message).toBe(
          'slug: "soup" is used by another document'
        )
        expect(own.status).toBe(200)
      })

      it("saves a published document as a draft version, its row left to the store", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer", status: "published" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          { title: null },
          headers
        )

        expect(response.data.document).toMatchObject({
          title: "Bean stew",
          has_unpublished_changes: true,
        })
        expect(response.data.latest_version).toMatchObject({
          version: 1,
          status: "draft",
          snapshot: expect.objectContaining({ title: null }),
        })
        expect((await content.retrieveTestRecipe(recipe.id)).title).toBe(
          "Bean stew"
        )
      })

      it("answers 404 for an unknown document", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents/trec_unknown",
            { notes: "Boil" },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .post("/admin/cms/collections/recipe/documents/trec_1", {})
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("blocks in an area", () => {
      /**
       * Creates a draft recipe with a step, a callout and a step through the API.
       *
       * @param headers - The admin's headers.
       * @returns The created document as the API answers it.
       */
      const createRecipeWithBlocks = async (
        headers: Awaited<ReturnType<typeof createAdminHeaders>>
      ) =>
        (
          await api.post(
            "/admin/cms/collections/recipe/documents",
            {
              title: "Bean stew",
              notes: "Simmer",
              sections: [
                { block_type: "step", heading: "Chop" },
                { block_type: "callout", body: HOT },
                { block_type: "step", heading: "Cook" },
              ],
            },
            headers
          )
        ).data.document

      /**
       * Lists a recipe's live steps and callouts, as the test module's service reads them.
       *
       * @param recipeId - The recipe's id.
       * @returns The ids of its live blocks of each type.
       */
      const listLiveBlocks = async (recipeId: string) => {
        const sections = await content.listTestSections({ recipe_id: recipeId })
        const areaIds = sections.map(({ id }) => id)
        const steps = await content.listTestSteps({ area_id: areaIds })
        const callouts = await content.listTestCallouts({ area_id: areaIds })

        return {
          sections: areaIds,
          steps: steps.map(({ id }) => id),
          callouts: callouts.map(({ id }) => id),
        }
      }

      it("creates a document with blocks and answers them in order, with their ids", async () => {
        const headers = await createAdminHeaders(getContainer())
        const document = await createRecipeWithBlocks(headers)

        expect(document.sections).toEqual([
          expect.objectContaining({
            id: expect.stringMatching(/^tstep_/),
            block_type: "step",
            heading: "Chop",
          }),
          expect.objectContaining({
            id: expect.stringMatching(/^tcall_/),
            block_type: "callout",
            body: HOT,
          }),
          expect.objectContaining({
            id: expect.stringMatching(/^tstep_/),
            block_type: "step",
            heading: "Cook",
          }),
        ])
        expect(document).not.toHaveProperty("areas")
      })

      it("reorders the blocks sent with their ids, keeping one row per block", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithBlocks(headers)
        const [chop, hot, cook] = created.sections
        const reordered = [
          { id: cook.id, block_type: "step", heading: "Cook" },
          { id: chop.id, block_type: "step", heading: "Chop" },
          { id: hot.id, block_type: "callout", body: HOT },
        ]

        await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          { sections: reordered, base_version: 1 },
          headers
        )
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          { sections: reordered, base_version: 2 },
          headers
        )

        expect(
          response.data.document.sections.map(({ id }: { id: string }) => id)
        ).toEqual([cook.id, chop.id, hot.id])
        const live = await listLiveBlocks(created.id)

        expect(live.sections).toHaveLength(1)
        expect(live.steps.sort()).toEqual([chop.id, cook.id].sort())
        expect(live.callouts).toEqual([hot.id])
      })

      it("removes a block the area no longer carries, and replaces one whose type changed", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithBlocks(headers)
        const [chop, hot] = created.sections

        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          {
            sections: [
              { id: chop.id, block_type: "step", heading: "Chop" },
              { id: hot.id, block_type: "step", heading: "Rest" },
            ],
            base_version: 1,
          },
          headers
        )
        const [kept, replaced] = response.data.document.sections

        expect(kept).toMatchObject({ id: chop.id, heading: "Chop" })
        expect(replaced).toMatchObject({ block_type: "step", heading: "Rest" })
        expect(replaced.id).not.toBe(hot.id)
        expect(await listLiveBlocks(created.id)).toEqual({
          sections: [expect.any(String)],
          steps: expect.arrayContaining([chop.id, replaced.id]),
          callouts: [],
        })
      })

      it("keeps an area the body leaves out", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithBlocks(headers)

        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          { title: "Bean soup", base_version: 1 },
          headers
        )

        expect(
          response.data.document.sections.map(({ id }: { id: string }) => id)
        ).toEqual(created.sections.map(({ id }: { id: string }) => id))
      })

      it.each([
        [
          "a block of an unknown type with values",
          [{ block_type: "video", url: "x" }],
          /^sections\.0/,
        ],
        [
          "a block of an unknown type sent as an id and a type",
          [{ id: "tvid_1", block_type: "video" }],
          /^sections\.0: This block type is not allowed here$/,
        ],
        [
          "a block field of the wrong type",
          [{ block_type: "step", heading: 3 }],
          /^sections\.0\.heading: /,
        ],
      ])("answers 400 at its path to %s", async (_name, sections, line) => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            { title: "Bean stew", notes: "Simmer", sections },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message.split("\n")).toEqual(
          expect.arrayContaining([expect.stringMatching(line)])
        )
      })

      it("deletes a document's areas and blocks with it", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithBlocks(headers)

        await api.delete(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          headers
        )

        expect(await listLiveBlocks(created.id)).toEqual({
          sections: [],
          steps: [],
          callouts: [],
        })
      })
    })

    describe("areas in a block", () => {
      /**
       * Creates a draft recipe with a step holding, in its tips, a tip and a step with a tip of its own.
       *
       * @param headers - The admin's headers.
       * @returns The created document as the API answers it.
       */
      const createRecipeWithTips = async (
        headers: Awaited<ReturnType<typeof createAdminHeaders>>
      ) =>
        (
          await api.post(
            "/admin/cms/collections/recipe/documents",
            {
              title: "Bean stew",
              notes: "Simmer",
              sections: [
                {
                  block_type: "step",
                  heading: "Chop",
                  tips: [
                    { block_type: "tip", text: "Sharp knife" },
                    {
                      block_type: "step",
                      heading: "Halve",
                      tips: [{ block_type: "tip", text: "Cut side down" }],
                    },
                  ],
                },
              ],
            },
            headers
          )
        ).data.document

      /**
       * Lists a recipe's live area rows, steps and tips, as the test module's service reads them.
       *
       * @param recipeId - The recipe's id.
       * @returns The ids of its live rows of each kind.
       */
      const listLiveRows = async (recipeId: string) => {
        const sections = await content.listTestSections({ recipe_id: recipeId })
        const areaIds = sections.map(({ id }) => id)
        const steps = await content.listTestSteps({ area_id: areaIds })
        const tips = await content.listTestTips({ area_id: areaIds })

        return {
          sections: areaIds.sort(),
          steps: steps.map(({ id }) => id).sort(),
          tips: tips.map(({ id }) => id).sort(),
        }
      }

      it("creates a step's tips two levels deep and answers them under their steps, with their ids", async () => {
        const headers = await createAdminHeaders(getContainer())
        const document = await createRecipeWithTips(headers)
        const [chop] = document.sections

        expect(chop.tips).toEqual([
          expect.objectContaining({
            id: expect.stringMatching(/^ttip_/),
            block_type: "tip",
            text: "Sharp knife",
          }),
          expect.objectContaining({
            id: expect.stringMatching(/^tstep_/),
            block_type: "step",
            heading: "Halve",
            tips: [
              expect.objectContaining({
                block_type: "tip",
                text: "Cut side down",
              }),
            ],
          }),
        ])
        expect(chop.tips[0]).not.toHaveProperty("rank")
        expect(chop.tips[0]).not.toHaveProperty("area_id")
        expect((await listLiveRows(document.id)).sections).toHaveLength(3)
      })

      it("moves a tip between steps and saves again with the returned ids, writing no new rows", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithTips(headers)
        const before = await listLiveRows(created.id)
        const [chop] = created.sections
        const [sharp, halve] = chop.tips
        const body = {
          sections: [
            {
              id: chop.id,
              block_type: "step",
              heading: "Chop",
              tips: [
                {
                  id: halve.id,
                  block_type: "step",
                  heading: "Halve",
                  tips: [
                    {
                      id: halve.tips[0].id,
                      block_type: "tip",
                      text: "Cut side down",
                    },
                    { id: sharp.id, block_type: "tip", text: "Sharp knife" },
                  ],
                },
              ],
            },
          ],
        }

        await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          { ...body, base_version: 1 },
          headers
        )
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          { ...body, base_version: 2 },
          headers
        )
        const [saved] = response.data.document.sections

        expect(saved.tips.map(({ id }: { id: string }) => id)).toEqual([
          halve.id,
        ])
        expect(saved.tips[0].tips.map(({ id }: { id: string }) => id)).toEqual([
          halve.tips[0].id,
          sharp.id,
        ])
        expect(await listLiveRows(created.id)).toEqual(before)
      })

      it("answers 400 at its path to a type the block's area does not list", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            {
              title: "Bean stew",
              notes: "Simmer",
              sections: [
                {
                  block_type: "step",
                  tips: [{ block_type: "callout", body: HOT }],
                },
              ],
            },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message.split("\n")).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/^sections\.0\.tips\.0/),
          ])
        )
      })

      it("removes a step with everything its tips hold, at two levels", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithTips(headers)

        await api.post(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          { sections: [], base_version: 1 },
          headers
        )

        expect(await listLiveRows(created.id)).toEqual({
          sections: [expect.any(String)],
          steps: [],
          tips: [],
        })
      })

      it("deletes a document's nested areas and blocks with it", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await createRecipeWithTips(headers)

        await api.delete(
          `/admin/cms/collections/recipe/documents/${created.id}`,
          headers
        )

        expect(await listLiveRows(created.id)).toEqual({
          sections: [],
          steps: [],
          tips: [],
        })
      })
    })

    describe("deleteCmsDocumentContentStep compensation", () => {
      it("restores a deleted recipe without the step an earlier save removed", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const [section] = await content.createTestSections([
          { name: "sections", recipe_id: recipe.id },
        ])
        const [removed, kept] = await content.createTestSteps([
          { heading: "Gone", rank: 0, area_id: section.id },
          { heading: "Kept", rank: 1, area_id: section.id },
        ])

        await content.softDeleteTestSteps([removed.id])

        const { errors } = await deleteThenFailWorkflow(getContainer()).run({
          input: { id: recipe.id },
          throwOnError: false,
        })
        const steps = await content.listTestSteps({ area_id: section.id })

        expect(errors[0].error.message).toBe("Stop after the delete")
        expect(steps.map(({ id }) => id)).toEqual([kept.id])
        expect(await content.listTestRecipes({ id: recipe.id })).toHaveLength(1)
        expect(await content.listTestSections({ id: section.id })).toHaveLength(
          1
        )
      })

      it("restores a deleted recipe's step tips without the tip an earlier save removed", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const [section] = await content.createTestSections([
          { name: "sections", recipe_id: recipe.id },
        ])
        const [step] = await content.createTestSteps([
          { heading: "Chop", rank: 0, area_id: section.id },
        ])
        const [tips] = await content.createTestSections([
          { name: "tips", parent_id: step.id, recipe_id: recipe.id },
        ])
        const [removed, kept] = await content.createTestTips([
          { text: "Gone", rank: 0, area_id: tips.id },
          { text: "Kept", rank: 1, area_id: tips.id },
        ])

        await content.softDeleteTestTips([removed.id])

        const { errors } = await deleteThenFailWorkflow(getContainer()).run({
          input: { id: recipe.id },
          throwOnError: false,
        })
        const live = await content.listTestTips({ area_id: tips.id })

        expect(errors[0].error.message).toBe("Stop after the delete")
        expect(live.map(({ id }) => id)).toEqual([kept.id])
        expect(await content.listTestSections({ id: tips.id })).toHaveLength(1)
      })
    })

    describe("publishCmsDocumentWorkflow and unpublishCmsDocumentWorkflow", () => {
      it("refuses a publish without the fields it needs, then publishes and unpublishes", async () => {
        const [recipe] = await content.createTestRecipes([{ notes: "Simmer" }])

        const input = {
          collection: "recipe",
          id: recipe.id,
          actor_id: "user_1",
        }
        const refused = await publishCmsDocumentWorkflow(getContainer())
          .run({ input })
          .catch((error: { message: string }) => error)

        expect(refused).toMatchObject({ message: "title: Required" })
        expect((await content.retrieveTestRecipe(recipe.id)).status).toBe(
          "draft"
        )

        await content.updateTestRecipes({ id: recipe.id, title: "Bean stew" })
        const { result: published } = await publishCmsDocumentWorkflow(
          getContainer()
        ).run({ input })

        expect(published.document).toMatchObject({
          id: recipe.id,
          status: "published",
          published_at: expect.anything(),
        })

        const { result: unpublished } = await unpublishCmsDocumentWorkflow(
          getContainer()
        ).run({ input })

        expect(published.latest_version).toMatchObject({
          version: 1,
          status: "published",
        })
        expect(unpublished.latest_version).toMatchObject({
          version: 2,
          status: "draft",
        })
        expect(unpublished.document).toMatchObject({
          id: recipe.id,
          status: "draft",
          published_at: null,
        })
      })
    })

    describe("POST /admin/cms/collections/:collection/documents/:id/publish", () => {
      it("publishes a draft", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}/publish`,
          {},
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data.document).toMatchObject({
          id: recipe.id,
          status: "published",
          published_at: expect.any(String),
        })
      })

      it("answers 400 with a line per field the publish needs", async () => {
        const [recipe] = await content.createTestRecipes([{ notes: "Simmer" }])
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            `/admin/cms/collections/recipe/documents/${recipe.id}/publish`,
            {},
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe("title: Required")
      })

      it("answers 400 to a document already published", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer", status: "published" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            `/admin/cms/collections/recipe/documents/${recipe.id}/publish`,
            {},
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe(
          `Document "${recipe.id}" is already published`
        )
      })

      it("answers 404 for an unknown document", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents/trec_unknown/publish",
            {},
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .post("/admin/cms/collections/recipe/documents/trec_1/publish", {})
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("POST /admin/cms/collections/:collection/documents/:id/unpublish", () => {
      it("turns a published document back into a draft", async () => {
        const [recipe] = await content.createTestRecipes([
          {
            title: "Bean stew",
            notes: "Simmer",
            status: "published",
            published_at: new Date(),
          },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/documents/${recipe.id}/unpublish`,
          {},
          headers
        )

        expect(response.data.document).toMatchObject({
          status: "draft",
          published_at: null,
        })
      })

      it("answers 400 to a draft", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            `/admin/cms/collections/recipe/documents/${recipe.id}/unpublish`,
            {},
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .post("/admin/cms/collections/recipe/documents/trec_1/unpublish", {})
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("DELETE /admin/cms/collections/:collection/documents/:id", () => {
      it("deletes a published document, which then answers 404 and leaves the list", async () => {
        const [recipe] = await content.createTestRecipes([
          {
            title: "Bean stew",
            slug: "bean-stew",
            notes: "Simmer",
            status: "published",
          },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.delete(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          headers
        )
        const { response: read } = await api
          .get(`/admin/cms/collections/recipe/documents/${recipe.id}`, headers)
          .catch((error: { response: unknown }) => error)
        const list = await api.get(
          "/admin/cms/collections/recipe/documents",
          headers
        )

        expect(response.data).toEqual({
          id: recipe.id,
          object: "cms_document",
          deleted: true,
        })
        expect(read.status).toBe(404)
        expect(
          list.data.documents.map(({ id }: { id: string }) => id)
        ).not.toContain(recipe.id)
      })

      it("frees the deleted document's slug for another document", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", slug: "bean-stew", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        await api.delete(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          headers
        )
        const response = await api.post(
          "/admin/cms/collections/recipe/documents",
          { title: "Bean stew", slug: "bean-stew", notes: "Boil" },
          headers
        )

        expect(response.data.document.slug).toBe("bean-stew")
      })

      it("answers 404 for an unknown document", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .delete(
            "/admin/cms/collections/recipe/documents/trec_unknown",
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .delete("/admin/cms/collections/recipe/documents/trec_1")
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("rich text fields", () => {
      const SUMMARY = buildRichText("Slow cooked", 1)

      /**
       * Posts to a recipe's route and answers the response, a refused one included.
       *
       * @param path - The path under the recipe collection.
       * @param body - The body.
       * @param headers - The admin's request options.
       * @returns The response.
       */
      const postRecipe = async (
        path: string,
        body: Record<string, unknown>,
        headers: Record<string, unknown>
      ) =>
        api
          .post(`/admin/cms/collections/recipe/${path}`, body, headers)
          .catch((error: { response: unknown }) => error.response)

      it("saves a document's and a block's rich text, stores their JSON and answers them as objects", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await postRecipe(
          "documents",
          {
            title: "Bean stew",
            notes: "Simmer",
            summary: SUMMARY,
            sections: [{ block_type: "callout", body: HOT }],
          },
          headers
        )
        const { document, latest_version } = response.data
        const [recipe] = await content.listTestRecipes({ id: document.id })
        const [callout] = await content.listTestCallouts({})

        expect(response.status).toBe(200)
        expect(document.summary).toEqual(SUMMARY)
        expect(document.sections[0].body).toEqual(HOT)
        expect(latest_version.snapshot.summary).toEqual(SUMMARY)
        expect(JSON.parse(recipe.summary!)).toEqual(SUMMARY)
        expect(JSON.parse(callout.body!)).toEqual(HOT)
      })

      it("stores an emptied editor as null, and leaves an unchanged one out of the changed fields", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await postRecipe(
          "documents",
          { title: "Bean stew", notes: "Simmer", summary: SUMMARY },
          headers
        )
        const id = created.data.document.id
        const unchanged = await postRecipe(
          `documents/${id}`,
          { title: "Bean soup", summary: SUMMARY, base_version: 1 },
          headers
        )
        const emptied = await postRecipe(
          `documents/${id}`,
          {
            summary: {
              root: {
                type: "root",
                children: [{ type: "paragraph", children: [] }],
              },
            },
            base_version: 2,
          },
          headers
        )
        const [recipe] = await content.listTestRecipes({ id })
        const { versions } = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            headers
          )
        ).data

        expect(unchanged.status).toBe(200)
        expect(emptied.data.document.summary).toBeNull()
        expect(recipe.summary).toBeNull()
        expect(versions[1].changed_fields).toEqual(["title"])
        expect(versions[0].changed_fields).toEqual(["summary"])
      })

      it("reads a column holding plain text as one paragraph per line", async () => {
        const [recipe] = await content.createTestRecipes([
          { title: "Bean stew", notes: "Simmer", summary: "Soak\nSimmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          `/admin/cms/collections/recipe/documents/${recipe.id}`,
          headers
        )

        expect(
          response.data.document.summary.root.children.map(
            ({ children }: { children: { text: string }[] }) =>
              children.map(({ text }) => text)
          )
        ).toEqual([["Soak"], ["Simmer"]])
      })

      it("answers 400 at the field's path to a node, a link and a heading the field does not take, and writes nothing", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await postRecipe(
          "documents",
          {
            title: "Bean stew",
            notes: "Simmer",
            summary: {
              root: {
                type: "root",
                children: [{ type: "heading", tag: "h1", children: [] }],
              },
            },
            sections: [
              {
                block_type: "callout",
                body: {
                  root: {
                    type: "root",
                    children: [
                      {
                        type: "paragraph",
                        children: [
                          {
                            type: "link",
                            url: "javascript:alert(1)",
                            children: [{ type: "text", text: "a" }],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                block_type: "callout",
                body: {
                  root: {
                    type: "root",
                    children: [{ type: "table", children: [] }],
                  },
                },
              },
            ],
          },
          headers
        )
        const [, count] = await content.listAndCountTestRecipes()

        expect(response.status).toBe(400)
        expect(response.data.message.split("\n")).toEqual(
          expect.arrayContaining([
            "summary: Use a heading level of h2, h3 or h4",
            "sections.0.body: Use a link starting with http://, https://, mailto:, tel: or /",
            'sections.1.body: Remove the "table" element: this field does not allow it',
          ])
        )
        expect(count).toBe(3)
      })

      it("answers a refused document at its field from the validate route", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await postRecipe(
          "validate",
          { notes: "Simmer", summary: "Plain text" },
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data.errors).toEqual([
          {
            path: "summary",
            message: "This value is not a rich text document",
          },
        ])
      })

      it("restores an older version's rich text into the column", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = await postRecipe(
          "documents",
          { title: "Bean stew", notes: "Simmer", summary: SUMMARY },
          headers
        )
        const id = created.data.document.id
        await postRecipe(
          `documents/${id}`,
          { summary: buildRichText("Quick"), base_version: 1 },
          headers
        )
        const first = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            headers
          )
        ).data.versions.at(-1)

        const restored = await postRecipe(
          `documents/${id}/versions/${first.id}/restore`,
          { base_version: 2 },
          headers
        )
        const [recipe] = await content.listTestRecipes({ id })

        expect(restored.status).toBe(200)
        expect(restored.data.document.summary).toEqual(SUMMARY)
        expect(JSON.parse(recipe.summary!)).toEqual(SUMMARY)
      })

      it("writes the stored text back when a save fails after the content step", async () => {
        const [recipe] = await content.createTestRecipes([
          {
            title: "Bean stew",
            notes: "Simmer",
            summary: JSON.stringify(SUMMARY),
          },
        ])

        const { errors } = await updateThenFailWorkflow(getContainer()).run({
          input: { id: recipe.id, summary: buildRichText("Quick") },
          throwOnError: false,
        })
        const [after] = await content.listTestRecipes({ id: recipe.id })

        expect(errors).toHaveLength(1)
        expect(after.summary).toBe(JSON.stringify(SUMMARY))
      })
    })

    describe("media fields", () => {
      const createdKeys: string[] = []

      /**
       * Stores a file through the File Module, as `FileMediaProvider` uploads it, and keeps its key so
       * the file is deleted after the test.
       *
       * @param filename - The file's name.
       * @returns The File Module's key and URL.
       */
      const createFile = async (filename: string) => {
        const file = await getContainer()
          .resolve<IFileModuleService>(Modules.FILE)
          .createFiles({
            filename,
            mimeType: "image/png",
            content: Buffer.from("png bytes").toString("base64"),
            access: "public",
          })

        createdKeys.push(file.id)
        return file
      }

      afterEach(async () => {
        await getContainer()
          .resolve<IFileModuleService>(Modules.FILE)
          .deleteFiles(createdKeys.splice(0))
      })

      it("saves the files' keys and reads each record back in place of its key", async () => {
        const cover = await createFile("cover.png")
        const photo = await createFile("photo.png")
        const headers = await createAdminHeaders(getContainer())
        const created = await api.post(
          "/admin/cms/collections/recipe/documents",
          { notes: "Simmer", cover: cover.id, gallery: [photo.id, cover.id] },
          headers
        )
        const read = await api.get(
          `/admin/cms/collections/recipe/documents/${created.data.document.id}`,
          headers
        )
        const stored = await content.retrieveTestRecipe(
          created.data.document.id
        )

        expect(stored.cover).toBe(cover.id)
        expect(stored.gallery).toEqual([photo.id, cover.id])
        for (const answer of [created.data, read.data]) {
          expect(answer.document.cover).toEqual({
            id: cover.id,
            url: cover.url,
          })
          expect(answer.document.gallery).toEqual([
            { id: photo.id, url: photo.url },
            { id: cover.id, url: cover.url },
          ])
          expect(answer.latest_version.snapshot.cover).toEqual({
            id: cover.id,
            url: cover.url,
          })
        }
      })

      it("answers 400 at the field's path to a key the File Module does not hold", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            { notes: "Simmer", cover: "lost.png" },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toBe(
          'cover: The file "lost.png" was not found'
        )
      })

      it("answers 400 to more files than the field's max", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post(
            "/admin/cms/collections/recipe/documents",
            { notes: "Simmer", gallery: ["a.png", "b.png", "c.png", "d.png"] },
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
        expect(response.data.message).toContain("gallery: Keep at most 3 files")
      })
    })

    describe("versions of a document", () => {
      /**
       * Creates a recipe through the API, as its version 1.
       *
       * @param headers - The admin's request options.
       * @param body - The recipe's columns.
       * @returns The recipe's id.
       */
      const createRecipe = async (
        headers: Record<string, unknown>,
        body: Record<string, unknown> = { title: "Bean stew", notes: "Simmer" }
      ): Promise<string> =>
        (
          await api.post(
            "/admin/cms/collections/recipe/documents",
            body,
            headers
          )
        ).data.document.id

      /**
       * Posts to a recipe's route and answers the response, a refused one included.
       *
       * @param path - The path under the recipe.
       * @param body - The body.
       * @param headers - The admin's request options.
       * @returns The response.
       */
      const post = async (
        path: string,
        body: Record<string, unknown>,
        headers: Record<string, unknown>
      ) =>
        api
          .post(
            `/admin/cms/collections/recipe/documents/${path}`,
            body,
            headers
          )
          .catch((error: { response: unknown }) => error.response)

      it("keeps a published document's row until its draft is published", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(`${id}/publish`, { base_version: 1 }, headers)

        const saved = await post(
          id,
          { title: "Bean soup", base_version: 2 },
          headers
        )
        const read = await api.get(
          `/admin/cms/collections/recipe/documents/${id}`,
          headers
        )
        const list = await api.get(
          "/admin/cms/collections/recipe/documents",
          headers
        )

        expect(saved.data.latest_version).toMatchObject({
          version: 3,
          status: "draft",
        })
        expect(read.data.document).toMatchObject({
          title: "Bean stew",
          has_unpublished_changes: true,
        })
        expect(read.data.latest_version.snapshot.title).toBe("Bean soup")
        expect(
          list.data.documents.find(
            (document: { id: string }) => document.id === id
          ).has_unpublished_changes
        ).toBe(true)

        const published = await post(
          `${id}/publish`,
          { base_version: 3 },
          headers
        )

        expect(published.data.document).toMatchObject({
          title: "Bean soup",
          status: "published",
          has_unpublished_changes: false,
        })
        expect(published.data.latest_version).toMatchObject({
          version: 4,
          status: "published",
        })
      })

      it("lists each document with its newest published version and its live title", async () => {
        const headers = await createAdminHeaders(getContainer())
        const published = await createRecipe(headers)
        const draft = await createRecipe(headers, {
          title: "Pie",
          notes: "Bake",
        })
        await post(`${published}/publish`, { base_version: 1 }, headers)
        await post(published, { title: "Bean soup", base_version: 2 }, headers)

        const list = await api.get(
          "/admin/cms/collections/recipe/documents",
          headers
        )
        const listed = (id: string) =>
          list.data.documents.find(
            (document: { id: string }) => document.id === id
          )

        expect(listed(published)).toMatchObject({
          title: "Bean stew",
          published_version: 2,
          has_unpublished_changes: true,
        })
        expect(listed(draft)).toMatchObject({
          title: "Pie",
          published_version: null,
        })

        await post(`${published}/unpublish`, {}, headers)
        const afterUnpublish = await api.get(
          "/admin/cms/collections/recipe/documents",
          headers
        )

        expect(
          afterUnpublish.data.documents.find(
            (document: { id: string }) => document.id === published
          ).published_version
        ).toBeNull()
      })

      it("refuses a save and a publish from a version that is no longer the latest", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(id, { notes: "Boil", base_version: 1 }, headers)

        const save = await post(id, { notes: "Bake", base_version: 1 }, headers)
        const publish = await post(
          `${id}/publish`,
          { base_version: 1 },
          headers
        )

        for (const response of [save, publish]) {
          expect(response.status).toBe(400)
          expect(response.data.message).toMatch(
            /^Version 2 was saved by user_\w+ after the one you edited\. Reload to see it\.$/
          )
        }
      })

      it("refuses a publish with nothing new to publish", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(`${id}/publish`, { base_version: 1 }, headers)

        const again = await post(`${id}/publish`, { base_version: 2 }, headers)

        expect(again.status).toBe(400)
        expect(again.data.message).toBe(`Document "${id}" is already published`)
      })

      it("checks a draft's slug against the other documents only at publish", async () => {
        await content.createTestRecipes([{ slug: "soup", notes: "Boil" }])
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(`${id}/publish`, { base_version: 1 }, headers)

        const saved = await post(id, { slug: "soup", base_version: 2 }, headers)
        const publish = await post(
          `${id}/publish`,
          { base_version: 3 },
          headers
        )

        expect(saved.status).toBe(200)
        expect(publish.status).toBe(422)
        expect(publish.data.message).toBe(
          'slug: "soup" is used by another document'
        )
      })

      it("records an unpublish, keeping a waiting draft as what the Admin edits", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(`${id}/publish`, { base_version: 1 }, headers)
        await post(id, { title: "Bean soup", base_version: 2 }, headers)

        const unpublished = await post(`${id}/unpublish`, {}, headers)
        const versions = await getContainer()
          .resolve<CmsModuleService>(CMS_MODULE)
          .listCmsVersions(
            { collection: "recipe", document_id: id },
            { order: { version: "ASC" } }
          )

        expect(unpublished.data.document.status).toBe("draft")
        expect(unpublished.data.latest_version.snapshot.title).toBe("Bean soup")
        expect(versions.map(({ change_type }) => change_type)).toEqual([
          "save",
          "publish",
          "save",
          "unpublish",
        ])
      })

      it("lists the history newest first and reads one version with its snapshot", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(id, { title: "Bean soup", base_version: 1 }, headers)

        const history = await api.get(
          `/admin/cms/collections/recipe/documents/${id}/versions?limit=1`,
          headers
        )
        const first = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            headers
          )
        ).data.versions.at(-1)
        const version = await api.get(
          `/admin/cms/collections/recipe/documents/${id}/versions/${first.id}`,
          headers
        )

        expect(history.data).toMatchObject({ count: 2, limit: 1, offset: 0 })
        expect(history.data.versions[0]).toMatchObject({
          version: 2,
          change_type: "save",
          changed_fields: ["title"],
          latest: true,
        })
        expect(history.data.versions[0]).not.toHaveProperty("snapshot")
        expect(version.data.version).toMatchObject({
          version: 1,
          snapshot: expect.objectContaining({ title: "Bean stew" }),
        })
      })

      it("keeps a published page's blocks until its draft is published, then gives a new block its id for later saves", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = (
          await api.post(
            "/admin/cms/collections/recipe/documents",
            {
              title: "Bean stew",
              notes: "Simmer",
              sections: [{ block_type: "step", heading: "Chop" }],
            },
            headers
          )
        ).data.document
        const [chop] = created.sections
        await post(`${created.id}/publish`, { base_version: 1 }, headers)

        const draft = await post(
          created.id,
          {
            sections: [
              { block_type: "callout", body: HOT },
              { id: chop.id, block_type: "step", heading: "Dice" },
            ],
            base_version: 2,
          },
          headers
        )
        const stepsBefore = await content.listTestSteps({ id: chop.id })
        const calloutsBefore = await content.listTestCallouts({})

        expect(draft.data.document.sections).toEqual([
          expect.objectContaining({ id: chop.id, heading: "Chop" }),
        ])
        expect(draft.data.latest_version).toMatchObject({
          version: 3,
          status: "draft",
          snapshot: expect.objectContaining({
            sections: [
              { block_type: "callout", body: HOT },
              { id: chop.id, block_type: "step", heading: "Dice" },
            ],
          }),
        })
        expect(stepsBefore[0].heading).toBe("Chop")
        expect(calloutsBefore).toEqual([])

        const published = await post(
          `${created.id}/publish`,
          { base_version: 3 },
          headers
        )
        const [hot, dice] = published.data.document.sections

        expect(hot).toMatchObject({
          id: expect.stringMatching(/^tcall_/),
          body: HOT,
        })
        expect(dice).toMatchObject({ id: chop.id, heading: "Dice" })
        expect(published.data.latest_version.snapshot.sections).toEqual([
          { id: hot.id, block_type: "callout", body: HOT, image: null },
          { id: chop.id, block_type: "step", heading: "Dice", tips: [] },
        ])

        const saved = await post(
          created.id,
          {
            sections: published.data.latest_version.snapshot.sections,
            base_version: 4,
          },
          headers
        )
        const republished = await post(
          `${created.id}/publish`,
          { base_version: 5 },
          headers
        )

        expect(saved.status).toBe(200)
        expect(
          republished.data.document.sections.map(({ id }: { id: string }) => id)
        ).toEqual([hot.id, chop.id])
        expect(await content.listTestCallouts({})).toHaveLength(1)
      })

      it("gives a tip added to a step in a draft its id at publish, kept by a later save", async () => {
        const headers = await createAdminHeaders(getContainer())
        const created = (
          await api.post(
            "/admin/cms/collections/recipe/documents",
            {
              title: "Bean stew",
              notes: "Simmer",
              sections: [{ block_type: "step", heading: "Chop", tips: [] }],
            },
            headers
          )
        ).data.document
        const [chop] = created.sections
        await post(`${created.id}/publish`, { base_version: 1 }, headers)
        await post(
          created.id,
          {
            sections: [
              {
                id: chop.id,
                block_type: "step",
                heading: "Chop",
                tips: [{ block_type: "tip", text: "Sharp knife" }],
              },
            ],
            base_version: 2,
          },
          headers
        )

        const published = await post(
          `${created.id}/publish`,
          { base_version: 3 },
          headers
        )
        const [tip] = published.data.document.sections[0].tips

        expect(tip).toMatchObject({
          id: expect.stringMatching(/^ttip_/),
          text: "Sharp knife",
        })

        const saved = await post(
          created.id,
          {
            sections: published.data.latest_version.snapshot.sections,
            base_version: 4,
          },
          headers
        )
        const republished = await post(
          `${created.id}/publish`,
          { base_version: 5 },
          headers
        )

        expect(saved.status).toBe(200)
        expect(republished.data.document.sections[0].tips).toEqual([
          expect.objectContaining({ id: tip.id }),
        ])
        expect(await content.listTestTips({})).toHaveLength(1)
      })

      it("counts an area in a version's changed fields when its blocks change", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)

        await post(
          id,
          {
            sections: [{ block_type: "step", heading: "Chop" }],
            base_version: 1,
          },
          headers
        )
        const [newest] = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            headers
          )
        ).data.versions

        expect(newest.changed_fields).toEqual(["sections"])
      })

      it("restores a version without the blocks of a type its area no longer allows", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        const cms = getContainer().resolve<CmsModuleService>(CMS_MODULE)
        const [first] = await cms.listCmsVersions({
          collection: "recipe",
          document_id: id,
        })

        await cms.updateCmsVersions({
          id: first.id,
          snapshot: {
            ...first.snapshot,
            sections: [
              { id: "tvid_1", block_type: "video", url: "x" },
              { block_type: "step", heading: "Chop" },
            ],
          },
        })

        const restored = await post(
          `${id}/versions/${first.id}/restore`,
          { base_version: 1 },
          headers
        )

        expect(restored.status).toBe(200)
        expect(restored.data.document.sections).toEqual([
          expect.objectContaining({ block_type: "step", heading: "Chop" }),
        ])
      })

      it("restores an older version as a new draft, the published row left to the store", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        await post(`${id}/publish`, { base_version: 1 }, headers)
        await post(id, { title: "Bean soup", base_version: 2 }, headers)
        const first = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            headers
          )
        ).data.versions.at(-1)

        const restored = await post(
          `${id}/versions/${first.id}/restore`,
          { base_version: 3 },
          headers
        )
        const stale = await post(
          `${id}/versions/${first.id}/restore`,
          { base_version: 3 },
          headers
        )
        const [newest] = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${id}/versions`,
            headers
          )
        ).data.versions

        expect(restored.data.document).toMatchObject({
          title: "Bean stew",
          has_unpublished_changes: true,
        })
        expect(restored.data.latest_version).toMatchObject({
          version: 4,
          status: "draft",
          snapshot: expect.objectContaining({ title: "Bean stew" }),
        })
        expect(newest).toMatchObject({
          change_type: "restore",
          restored_from: 1,
          changed_fields: ["title"],
        })
        expect(stale.status).toBe(400)
      })

      it("discards a draft back to the published version, and refuses a draft never published", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        const neverPublished = await post(
          `${id}/discard`,
          { base_version: 1 },
          headers
        )
        await post(`${id}/publish`, { base_version: 1 }, headers)
        await post(id, { title: "Bean soup", base_version: 2 }, headers)

        const discarded = await post(
          `${id}/discard`,
          { base_version: 3 },
          headers
        )
        const saved = await post(
          id,
          { notes: "Boil", base_version: 2 },
          headers
        )

        expect(neverPublished.status).toBe(400)
        expect(discarded.data.document.has_unpublished_changes).toBe(false)
        expect(discarded.data.latest_version).toMatchObject({
          version: 2,
          status: "published",
          snapshot: expect.objectContaining({ title: "Bean stew" }),
        })
        expect(saved.data.latest_version.version).toBe(4)
      })

      it("answers 404 for a version of another document", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)
        const other = await createRecipe(headers, {
          title: "Pie",
          notes: "Bake",
        })
        const [version] = (
          await api.get(
            `/admin/cms/collections/recipe/documents/${other}/versions`,
            headers
          )
        ).data.versions

        const { response } = await api
          .get(
            `/admin/cms/collections/recipe/documents/${id}/versions/${version.id}`,
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("deletes a document's versions with it", async () => {
        const headers = await createAdminHeaders(getContainer())
        const id = await createRecipe(headers)

        await api.delete(
          `/admin/cms/collections/recipe/documents/${id}`,
          headers
        )

        const versions = await getContainer()
          .resolve<CmsModuleService>(CMS_MODULE)
          .listCmsVersions({ collection: "recipe", document_id: id })

        expect(versions).toEqual([])
      })
    })

    describe("checkCmsTakenValueWorkflow", () => {
      it("suggests the first free suffixed form of a taken slug", async () => {
        await content.createTestRecipes([
          { slug: "soup", notes: "Simmer" },
          { slug: "soup-2", notes: "Boil" },
        ])

        const { result } = await checkCmsTakenValueWorkflow(getContainer()).run(
          {
            input: { collection: "recipe", column: "slug", value: "soup" },
          }
        )

        expect(result).toEqual({ taken: true, suggestion: "soup-3" })
      })

      it("tells a value of a column without a unique index free", async () => {
        await content.createTestRecipes([{ title: "Soup", notes: "Simmer" }])

        const { result } = await checkCmsTakenValueWorkflow(getContainer()).run(
          {
            input: { collection: "recipe", column: "notes", value: "Simmer" },
          }
        )

        expect(result).toEqual({ taken: false })
      })
    })

    describe("GET /admin/cms/collections/:collection/taken-values", () => {
      it("tells a taken slug, with its first free suffixed form", async () => {
        await content.createTestRecipes([
          { slug: "soup", notes: "Simmer" },
          { slug: "soup-2", notes: "Boil" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/taken-values?column=slug&value=soup",
          headers
        )

        expect(response.data).toEqual({ taken: true, suggestion: "soup-3" })
      })

      it("tells the edited document's own slug free", async () => {
        const [recipe] = await content.createTestRecipes([
          { slug: "soup", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          `/admin/cms/collections/recipe/taken-values?column=slug&value=soup&id=${recipe.id}`,
          headers
        )

        expect(response.data).toEqual({ taken: false })
      })

      it("tells a free slug, with no suggestion", async () => {
        await content.createTestRecipes([{ slug: "soup", notes: "Simmer" }])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/taken-values?column=slug&value=stew",
          headers
        )

        expect(response.data).toEqual({ taken: false })
      })

      it("tells the slug of a soft-deleted document free", async () => {
        const [removed] = await content.createTestRecipes([
          { slug: "soup", notes: "Simmer" },
        ])
        await content.softDeleteTestRecipes([removed.id])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get(
          "/admin/cms/collections/recipe/taken-values?column=slug&value=soup",
          headers
        )

        expect(response.data).toEqual({ taken: false })
      })

      it("answers 400 without a value", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .get(
            "/admin/cms/collections/recipe/taken-values?column=slug",
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(400)
      })

      it("answers 404 for an unknown collection", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .get(
            "/admin/cms/collections/nope/taken-values?column=slug&value=soup",
            headers
          )
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .get("/admin/cms/collections/recipe/taken-values?column=slug&value=a")
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })

    describe("POST /admin/cms/collections/:collection/validate", () => {
      it("answers every problem a save would meet, without writing", async () => {
        await content.createTestRecipes([{ slug: "soup", notes: "Simmer" }])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          "/admin/cms/collections/recipe/validate",
          { title: "ab", slug: "soup", servings: "four" },
          headers
        )

        expect(response.status).toBe(200)
        expect(response.data.errors).toEqual(
          expect.arrayContaining([
            { path: "title", message: "Use at least 3 characters" },
            { path: "notes", message: "Required" },
            expect.objectContaining({ path: "servings" }),
            { path: "slug", message: '"soup" is used by another document' },
          ])
        )

        const [, count] = await content.listAndCountTestRecipes()

        expect(count).toBe(4)
      })

      it("does not count the edited document's own slug as taken", async () => {
        const [recipe] = await content.createTestRecipes([
          { slug: "soup", notes: "Simmer" },
        ])
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          `/admin/cms/collections/recipe/validate?id=${recipe.id}`,
          { title: "Soup", slug: "soup", notes: "Simmer" },
          headers
        )

        expect(response.data).toEqual({ errors: [] })
      })

      it("answers a control character at its field", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          "/admin/cms/collections/recipe/validate",
          { title: "Bean\u000bstew", notes: "Simmer\r\nslowly" },
          headers
        )

        expect(response.data).toEqual({
          errors: [
            {
              path: "title",
              message: "Remove the control characters from this text",
            },
          ],
        })
      })

      it("answers no errors for a document a save would take", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.post(
          "/admin/cms/collections/recipe/validate",
          { title: "Bean stew", notes: "Simmer" },
          headers
        )

        expect(response.data).toEqual({ errors: [] })
      })

      it("answers 404 for an unknown collection", async () => {
        const headers = await createAdminHeaders(getContainer())
        const { response } = await api
          .post("/admin/cms/collections/nope/validate", {}, headers)
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(404)
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .post("/admin/cms/collections/recipe/validate", {})
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })
  },
})
