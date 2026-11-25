import type { IEventBusModuleService, Message } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { DocumentEvents } from "../../../../src/lib/document-events"
import { CMS_MODULE } from "../../../../src/modules/cms"
import type CmsModuleService from "../../../../src/modules/cms/service"
import { createCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/create-cms-document"
import { discardCmsDocumentDraftWorkflow } from "../../../../src/workflows/cms/workflows/discard-cms-document-draft"
import { getCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/get-cms-document"
import { getCmsDocumentVersionWorkflow } from "../../../../src/workflows/cms/workflows/get-cms-document-version"
import { listCmsDocumentVersionsWorkflow } from "../../../../src/workflows/cms/workflows/list-cms-document-versions"
import { publishCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/publish-cms-document"
import { restoreCmsDocumentVersionWorkflow } from "../../../../src/workflows/cms/workflows/restore-cms-document-version"
import { unpublishCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/unpublish-cms-document"
import { updateCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/update-cms-document"
import { TEST_CONTENT_MODULE } from "../../../modules/test-content"
import type TestContentModuleService from "../../../modules/test-content/service"

jest.setTimeout(60 * 1000)

/**
 * The writes of a collection without drafts, the test module's tags: a create published at once and
 * checked as a publish, a save live at once, no version recorded or read, and the events saying so; a
 * publish, an unpublish, a discard, a restore and the version reads refused. A collection with drafts
 * keeps its draft and its first version.
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
     * Lists the CMS events emitted since the spy was last cleared.
     *
     * @returns Each event's name and data.
     */
    const listCmsEvents = () =>
      emit.mock.calls
        .flatMap(([messages]: [Message | Message[]]) =>
          Array.isArray(messages) ? messages : [messages]
        )
        .filter(({ name }) => name.startsWith("cms.document."))
        .map(({ name, data }) => ({ name, data }))

    /**
     * Lists the versions a document has.
     *
     * @param collection - The collection's slug.
     * @param id - The document's id.
     * @returns Its versions.
     */
    const listVersions = (collection: string, id: string) =>
      getContainer()
        .resolve<CmsModuleService>(CMS_MODULE)
        .listCmsVersions({ collection, document_id: id })

    /**
     * Creates a tag through its workflow, then forgets the events it emitted.
     *
     * @returns The created document.
     */
    const createTag = async () => {
      const { result } = await createCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "tag",
          actor_id: "user_1",
          document: { name: "Spicy", description: "Hot" },
        },
      })
      emit.mockClear()

      return result.document
    }

    describe("createCmsDocumentWorkflow", () => {
      it("publishes a tag at once, records no version, and emits created as published", async () => {
        const { result } = await createCmsDocumentWorkflow(getContainer()).run({
          input: {
            collection: "tag",
            actor_id: "user_1",
            document: { name: "Spicy", description: "Hot" },
          },
        })

        expect(result.document).toMatchObject({
          name: "Spicy",
          slug: "spicy",
          status: "published",
          published_at: expect.any(String),
        })
        expect(result.latest_version).toBeNull()
        expect(await listVersions("tag", result.document.id)).toEqual([])
        expect(listCmsEvents()).toEqual([
          {
            name: DocumentEvents.DOCUMENT_CREATED,
            data: {
              collection: "tag",
              id: result.document.id,
              status: "published",
            },
          },
        ])
      })

      it("refuses a tag without what a publish needs, writing nothing", async () => {
        await expect(
          createCmsDocumentWorkflow(getContainer()).run({
            input: {
              collection: "tag",
              actor_id: "user_1",
              document: { name: "Spicy" },
            },
          })
        ).rejects.toMatchObject({ type: "invalid_data" })

        const [tags] = await getContainer()
          .resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
          .listAndCountTestTags()

        expect(tags).toEqual([])
        expect(listCmsEvents()).toEqual([])
      })

      it("keeps a recipe a draft with its first version", async () => {
        const { result } = await createCmsDocumentWorkflow(getContainer()).run({
          input: {
            collection: "recipe",
            actor_id: "user_1",
            document: { title: "Bean stew", notes: "Simmer" },
          },
        })

        expect(result.document.status).toBe("draft")
        expect(result.latest_version?.version).toBe(1)
      })
    })

    describe("updateCmsDocumentWorkflow", () => {
      it("writes a tag's row at once, records no version, and emits updated as a publish", async () => {
        const tag = await createTag()

        const { result } = await updateCmsDocumentWorkflow(getContainer()).run({
          input: {
            collection: "tag",
            id: tag.id,
            actor_id: "user_1",
            document: { name: "Mild" },
            base_version: null,
          },
        })

        expect(result.document).toMatchObject({
          name: "Mild",
          status: "published",
        })
        expect(result.latest_version).toBeNull()
        expect(await listVersions("tag", tag.id)).toEqual([])
        expect(listCmsEvents()).toEqual([
          {
            name: DocumentEvents.DOCUMENT_UPDATED,
            data: {
              collection: "tag",
              id: tag.id,
              action: "publish",
              status: "published",
            },
          },
        ])
      })

      it("refuses a save that breaks what a publish needs", async () => {
        const tag = await createTag()

        await expect(
          updateCmsDocumentWorkflow(getContainer()).run({
            input: {
              collection: "tag",
              id: tag.id,
              actor_id: "user_1",
              document: { description: null },
              base_version: null,
            },
          })
        ).rejects.toMatchObject({ type: "invalid_data" })
        expect(listCmsEvents()).toEqual([])
      })
    })

    describe("the workflows of drafts and versions", () => {
      /** Each one's run on a tag, by its name in the test's title. */
      const runs: [string, (id: string) => Promise<unknown>][] = [
        [
          "publishCmsDocumentWorkflow",
          (id) =>
            publishCmsDocumentWorkflow(getContainer()).run({
              input: {
                collection: "tag",
                id,
                actor_id: "user_1",
                base_version: null,
              },
            }),
        ],
        [
          "unpublishCmsDocumentWorkflow",
          (id) =>
            unpublishCmsDocumentWorkflow(getContainer()).run({
              input: { collection: "tag", id, actor_id: "user_1" },
            }),
        ],
        [
          "discardCmsDocumentDraftWorkflow",
          (id) =>
            discardCmsDocumentDraftWorkflow(getContainer()).run({
              input: { collection: "tag", id, base_version: null },
            }),
        ],
        [
          "restoreCmsDocumentVersionWorkflow",
          (id) =>
            restoreCmsDocumentVersionWorkflow(getContainer()).run({
              input: {
                collection: "tag",
                id,
                version_id: "cmsver_1",
                actor_id: "user_1",
                base_version: null,
              },
            }),
        ],
        [
          "listCmsDocumentVersionsWorkflow",
          (id) =>
            listCmsDocumentVersionsWorkflow(getContainer()).run({
              input: { collection: "tag", id, limit: 20, offset: 0 },
            }),
        ],
        [
          "getCmsDocumentVersionWorkflow",
          (id) =>
            getCmsDocumentVersionWorkflow(getContainer()).run({
              input: { collection: "tag", id, version_id: "cmsver_1" },
            }),
        ],
      ]

      it.each(runs)("%s refuses a tag, writing nothing", async (_name, run) => {
        const tag = await createTag()

        await expect(run(tag.id)).rejects.toMatchObject({
          type: "not_allowed",
          message:
            "Drafts and versions are off for this collection, so changes go live when saved.",
        })

        const [stored] = await getContainer()
          .resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
          .listTestTags({ id: tag.id })

        expect(stored).toMatchObject({ name: "Spicy", status: "published" })
        expect(await listVersions("tag", tag.id)).toEqual([])
        expect(listCmsEvents()).toEqual([])
      })
    })

    describe("getCmsDocumentWorkflow", () => {
      it("reads a tag with no version", async () => {
        const tag = await createTag()

        const { result } = await getCmsDocumentWorkflow(getContainer()).run({
          input: { collection: "tag", id: tag.id },
        })

        expect(result.document).toMatchObject({ id: tag.id, name: "Spicy" })
        expect(result.latest_version).toBeNull()
      })
    })
  },
})
