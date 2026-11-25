import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { listCmsCollectionsWorkflow } from "../../../src/workflows/cms/workflows/list-cms-collections"
import { TEST_CONTENT_MODULE } from "../../modules/test-content"
import type TestContentModuleService from "../../modules/test-content/service"
import { createAdminHeaders } from "../../utils/admin"

jest.setTimeout(60 * 1000)

/** The recipe's labels as the test config gives them: two translations beside a plain text. */
const EXPECTED_LABELS = {
  title: "Title",
  servings: { type: "translation", key: "recipe.servings", ns: "cms-test" },
  cooked_at: {
    type: "translation",
    key: "fields.cookedAt",
    ns: "translation",
    options: { context: "short" },
  },
}

/**
 * Picks the labels of the recipe's fields the test config translates.
 *
 * @param fields - The recipe's fields, as the list answers them.
 * @returns Per field name, its label.
 */
const labelsOf = (fields: { name: string; label: unknown }[]) =>
  Object.fromEntries(
    fields
      .filter(({ name }) => name in EXPECTED_LABELS)
      .map(({ name, label }) => [name, label])
  )

/**
 * `GET /admin/cms/collections` and `listCmsCollectionsWorkflow`: the recipe collection with its fields,
 * its count of live documents, and the admin session the route needs.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("listCmsCollectionsWorkflow", () => {
      it("counts the live recipes and leaves a soft-deleted one out", async () => {
        const content =
          getContainer().resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
        const [, removed] = await content.createTestRecipes([
          { notes: "Simmer" },
          { notes: "Bake" },
        ])

        await content.softDeleteTestRecipes([removed.id])

        const { result } =
          await listCmsCollectionsWorkflow(getContainer()).run()

        expect(
          result.collections.find(({ slug }) => slug === "recipe")?.count
        ).toBe(1)
      })

      it("answers a text as a string, or as a translation for the Admin", async () => {
        const { result } =
          await listCmsCollectionsWorkflow(getContainer()).run()
        const recipe = result.collections.find(({ slug }) => slug === "recipe")

        expect(labelsOf(recipe!.fields)).toEqual(EXPECTED_LABELS)
        expect(result).not.toHaveProperty("translation_ns")
      })
    })

    describe("GET /admin/cms/collections", () => {
      it("returns the recipe collection with its fields and no service key", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const recipe = response.data.collections.find(
          ({ slug }: { slug: string }) => slug === "recipe"
        )

        expect(response.status).toBe(200)
        expect(recipe).toMatchObject({
          labels: { singular: "Recipe", plural: "Recipes" },
          store: true,
          count: 0,
        })
        expect(recipe.fields.map(({ name }: { name: string }) => name)).toEqual(
          expect.arrayContaining(["title", "slug", "notes"])
        )
        expect(recipe).not.toHaveProperty("key")
      })

      it("marks a singleton and leaves a list collection unmarked", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const singletonOf = (slug: string) =>
          response.data.collections.find(
            (collection: { slug: string }) => collection.slug === slug
          )?.singleton

        expect(singletonOf("settings")).toBe(true)
        expect(singletonOf("recipe")).toBe(false)
      })

      it("returns each collection's header actions, a singleton's none", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const actionsOf = (slug: string) =>
          response.data.collections.find(
            (collection: { slug: string }) => collection.slug === slug
          )?.admin.actions

        expect(actionsOf("recipe")).toEqual([{ type: "create" }])
        expect(actionsOf("settings")).toEqual([])
      })

      it("returns the routes in the tree's order, the settings and their links on one route, and each collection's route", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const adminOf = (slug: string) =>
          response.data.collections.find(
            (collection: { slug: string }) => collection.slug === slug
          )?.admin

        expect(
          response.data.routes.map(
            ({
              slug,
              label,
              collections,
            }: {
              slug: string
              label: string
              collections: { collection: string; key: string }[]
            }) => ({ slug, label, collections })
          )
        ).toEqual([
          {
            slug: "recipe",
            label: "Recipes",
            collections: [
              expect.objectContaining({ collection: "recipe", key: "recipe" }),
            ],
          },
          {
            slug: "tag",
            label: "Tags",
            collections: [
              expect.objectContaining({ collection: "tag", key: "tag" }),
            ],
          },
          {
            slug: "settings",
            label: "Settings",
            collections: [
              { collection: "settings", key: "settings" },
              {
                collection: "settings_link",
                key: "settings_link",
                position: "main",
                table: {
                  columns: [
                    { field: "label" },
                    { field: "url" },
                    { system: "updated_at" },
                  ],
                  defaultSort: { column: "label", direction: "asc" },
                },
              },
            ],
          },
        ])
        expect(adminOf("settings")).toMatchObject({
          route: "settings",
          sections: [{ key: "main", position: "main" }],
        })
        expect(adminOf("settings").sections[0]).not.toHaveProperty("type")
        expect(adminOf("settings_link")).toMatchObject({ route: "settings" })
        expect(adminOf("settings_link")).not.toHaveProperty("node")
        expect(adminOf("recipe")).toMatchObject({ route: "recipe" })
      })

      it("returns the recipe's areas with every block type they reach, a block's areas and maxDepth included", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const recipe = response.data.collections.find(
          ({ slug }: { slug: string }) => slug === "recipe"
        )

        expect(recipe.areas).toEqual([
          { name: "sections", label: "Sections", blocks: ["step", "callout"] },
        ])
        expect(recipe.blocks.map(({ slug }: { slug: string }) => slug)).toEqual(
          ["step", "callout", "tip"]
        )
        expect(recipe.blocks[0].areas).toEqual([
          { name: "tips", label: "Tips", blocks: ["tip", "step"] },
        ])
        expect(recipe.maxDepth).toBe(4)
        expect(recipe).not.toHaveProperty("areaLink")
      })

      it("returns what the media picker needs of FileMediaProvider, and the texts as strings or translations", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const recipe = response.data.collections.find(
          ({ slug }: { slug: string }) => slug === "recipe"
        )

        expect(response.data.media_provider).toEqual({
          searchable: false,
          maxFileSize: 10 * 1024 * 1024,
        })
        expect(labelsOf(recipe.fields)).toEqual(EXPECTED_LABELS)
        expect(response.data).not.toHaveProperty("translation_ns")
        expect(
          recipe.fields.find(({ name }: { name: string }) => name === "gallery")
        ).toMatchObject({
          kind: "media",
          stores: "id",
          mimeTypes: ["image/png", "application/pdf"],
          multiple: true,
          max: 3,
        })
      })

      it("returns a rich text field's resolved built-in features, its links in the link feature", async () => {
        const headers = await createAdminHeaders(getContainer())
        const response = await api.get("/admin/cms/collections", headers)
        const recipe = response.data.collections.find(
          ({ slug }: { slug: string }) => slug === "recipe"
        )
        const body = recipe.blocks
          .find(({ slug }: { slug: string }) => slug === "callout")
          .fields.find(({ name }: { name: string }) => name === "body")

        expect(body.features).toEqual([
          { key: "bold", props: {} },
          { key: "italic", props: {} },
          {
            key: "heading",
            props: { enabledHeadingSizes: ["h2", "h3", "h4"] },
          },
          { key: "unorderedList", props: {} },
          { key: "orderedList", props: {} },
          { key: "blockquote", props: {} },
          {
            key: "link",
            props: {
              linkPolicy: {
                protocols: ["http", "https", "mailto", "tel"],
                relative: true,
              },
            },
          },
        ])
        expect(body).not.toHaveProperty("headings")
        expect(body).not.toHaveProperty("linkPolicy")
      })

      it("refuses a request without an admin session", async () => {
        const { response } = await api
          .get("/admin/cms/collections")
          .catch((error: { response: unknown }) => error)

        expect(response.status).toBe(401)
      })
    })
  },
})
