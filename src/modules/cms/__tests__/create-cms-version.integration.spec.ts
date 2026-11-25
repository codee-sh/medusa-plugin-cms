import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { CMS_MODULE } from ".."
import { CmsVersion } from "../models"
import type CmsModuleService from "../service"
import type { CreateCmsVersionInput } from "../service"

jest.setTimeout(60 * 1000)

/**
 * Builds a draft version of one recipe.
 *
 * @param overrides - The keys to change.
 * @returns The version's input.
 */
const versionOf = (
  overrides: Partial<CreateCmsVersionInput> = {}
): CreateCmsVersionInput => ({
  collection: "recipe",
  document_id: "trec_1",
  snapshot: { title: "Soup" },
  status: "draft",
  changed_fields: [],
  change_type: "save",
  created_by: "user_1",
  ...overrides,
})

/**
 * `createCmsVersion` on the `cms` module's own table: numbers, the single `latest` version of a
 * document, and the unique indexes under two calls at once.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:modules`.
 */
moduleIntegrationTestRunner<CmsModuleService>({
  moduleName: CMS_MODULE,
  moduleModels: [CmsVersion],
  resolve: "./src/modules/cms",
  testSuite: ({ service }) => {
    /**
     * Lists a document's versions, oldest first.
     *
     * @param documentId - The document's id.
     * @returns Each version's number and whether it is the latest.
     */
    const versionsOf = async (documentId = "trec_1") =>
      (
        await service.listCmsVersions(
          { collection: "recipe", document_id: documentId },
          { order: { version: "ASC" } }
        )
      ).map(({ version, latest }) => ({ version, latest }))

    describe("createCmsVersion", () => {
      it("numbers a document's versions from 1 and keeps the newest one latest", async () => {
        await service.createCmsVersion(versionOf())
        const second = await service.createCmsVersion(
          versionOf({ changed_fields: ["title"] })
        )

        expect(second).toMatchObject({
          version: 2,
          latest: true,
          changed_fields: ["title"],
        })
        expect(await versionsOf()).toEqual([
          { version: 1, latest: false },
          { version: 2, latest: true },
        ])
      })

      it("numbers each document apart", async () => {
        await service.createCmsVersion(versionOf())
        const other = await service.createCmsVersion(
          versionOf({ document_id: "trec_2" })
        )

        expect(other).toMatchObject({ version: 1, latest: true })
        expect(await versionsOf()).toEqual([{ version: 1, latest: true }])
      })

      it("keeps one latest version and distinct numbers under two calls at once", async () => {
        await service.createCmsVersion(versionOf())

        const results = await Promise.allSettled([
          service.createCmsVersion(versionOf({ snapshot: { title: "A" } })),
          service.createCmsVersion(versionOf({ snapshot: { title: "B" } })),
        ])
        const versions = await versionsOf()
        const numbers = versions.map(({ version }) => version)

        // Whether the second call is refused depends on whether the two overlap in the database.
        expect(results.some(({ status }) => status === "fulfilled")).toBe(true)
        expect(versions.filter(({ latest }) => latest)).toHaveLength(1)
        expect(new Set(numbers).size).toBe(numbers.length)
        expect(versions.at(-1)).toMatchObject({ latest: true })
      })

      it("numbers a version after the highest one, when latest was moved back", async () => {
        const first = await service.createCmsVersion(versionOf())
        const second = await service.createCmsVersion(versionOf())
        // One at a time, as the unique index refuses two latest versions even for a moment.
        await service.updateCmsVersions({ id: second.id, latest: false })
        await service.updateCmsVersions({ id: first.id, latest: true })

        const third = await service.createCmsVersion(versionOf())

        expect(third).toMatchObject({ version: 3, latest: true })
        expect(await versionsOf()).toEqual([
          { version: 1, latest: false },
          { version: 2, latest: false },
          { version: 3, latest: true },
        ])
      })

      it("never gives the number of a deleted version again", async () => {
        await service.createCmsVersion(versionOf())
        const second = await service.createCmsVersion(versionOf())
        await service.softDeleteCmsVersions([second.id])

        const third = await service.createCmsVersion(versionOf())

        expect(third.version).toBe(3)
      })
    })
  },
})
