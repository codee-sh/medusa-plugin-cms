import type { IEventBusModuleService, Message } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/create-cms-document"
import { deleteCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/delete-cms-document"
import { TEST_CONTENT_MODULE } from "../../../modules/test-content"
import type TestContentModuleService from "../../../modules/test-content/service"

jest.setTimeout(60 * 1000)

/**
 * The writes of a singleton, the test module's settings: the first create passes, a second create and a
 * delete are refused with nothing written and no event emitted.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    let emit: jest.SpyInstance

    beforeEach(() => {
      emit = jest.spyOn(
        getContainer().resolve<IEventBusModuleService>(Modules.EVENT_BUS),
        "emit"
      )
    })

    afterEach(() => {
      emit.mockRestore()
    })

    /**
     * Lists the names of the CMS events emitted since the spy was last cleared.
     *
     * @returns The event names.
     */
    const listCmsEventNames = () =>
      emit.mock.calls
        .flatMap(([messages]: [Message | Message[]]) =>
          Array.isArray(messages) ? messages : [messages]
        )
        .map(({ name }) => name)
        .filter((name) => name.startsWith("cms.document."))

    /**
     * Creates the settings document through its workflow.
     *
     * @param title - The document's title.
     * @returns The workflow's run.
     */
    const createSettings = (title: string) =>
      createCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "settings",
          actor_id: "user_1",
          document: { title },
        },
      })

    /**
     * Lists the live settings documents.
     *
     * @returns Their titles.
     */
    const listSettingsTitles = async () => {
      const [documents] = await getContainer()
        .resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
        .listAndCountTestSettings()

      return documents.map(({ title }) => title)
    }

    it("creates the first settings document", async () => {
      const { result } = await createSettings("Main")

      expect(result.document).toMatchObject({
        title: "Main",
        status: "published",
      })
      expect(await listSettingsTitles()).toEqual(["Main"])
    })

    it("refuses a second settings document, writing nothing", async () => {
      await createSettings("Main")
      emit.mockClear()

      await expect(createSettings("Second")).rejects.toMatchObject({
        type: "not_allowed",
      })
      expect(await listSettingsTitles()).toEqual(["Main"])
      expect(listCmsEventNames()).toEqual([])
    })

    it("refuses to delete the settings document, keeping it", async () => {
      const { result } = await createSettings("Main")
      emit.mockClear()

      await expect(
        deleteCmsDocumentWorkflow(getContainer()).run({
          input: { collection: "settings", id: result.document.id },
        })
      ).rejects.toMatchObject({ type: "not_allowed" })
      expect(await listSettingsTitles()).toEqual(["Main"])
      expect(listCmsEventNames()).toEqual([])
    })
  },
})
