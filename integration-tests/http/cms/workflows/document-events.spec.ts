import type { IEventBusModuleService, Message } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { DocumentEvents } from "../../../../src/lib/document-events"
import { createCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/create-cms-document"
import { deleteCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/delete-cms-document"
import { discardCmsDocumentDraftWorkflow } from "../../../../src/workflows/cms/workflows/discard-cms-document-draft"
import { publishCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/publish-cms-document"
import { restoreCmsDocumentVersionWorkflow } from "../../../../src/workflows/cms/workflows/restore-cms-document-version"
import { unpublishCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/unpublish-cms-document"
import { updateCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/update-cms-document"

jest.setTimeout(60 * 1000)

/**
 * The CMS events of every write workflow: one per write, emitted after its last write step, named and
 * shaped as main spec D38 says. A spy on the event bus's `emit` sees what `emitEventStep` hands it.
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
     * Lists the CMS events emitted since the spy was last cleared, leaving out the module events of the
     * written models.
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
     * Creates a draft recipe through its workflow, then forgets the events it emitted.
     *
     * @returns Its id, and its version's id and number.
     */
    const createRecipe = async () => {
      const { result } = await createCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          actor_id: "user_1",
          document: { title: "Bean stew", notes: "Simmer" },
        },
      })
      emit.mockClear()

      return {
        id: result.document.id,
        versionId: result.latest_version!.id,
        version: result.latest_version!.version,
      }
    }

    /**
     * Saves a recipe's title, then forgets the events it emitted.
     *
     * @param id - The recipe's id.
     * @param baseVersion - The number of its latest version.
     * @returns The number of the version the save recorded.
     */
    const saveRecipe = async (id: string, baseVersion: number) => {
      const { result } = await updateCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id,
          actor_id: "user_1",
          document: { title: "Bean soup" },
          base_version: baseVersion,
        },
      })
      emit.mockClear()

      return result.latest_version!.version
    }

    /**
     * Publishes a recipe's latest version, then forgets the events it emitted.
     *
     * @param id - The recipe's id.
     * @param baseVersion - The number of its latest version.
     * @returns The number of the published version.
     */
    const publishRecipe = async (id: string, baseVersion: number) => {
      const { result } = await publishCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id,
          actor_id: "user_1",
          base_version: baseVersion,
        },
      })
      emit.mockClear()

      return result.latest_version!.version
    }

    it("emits created with the draft's status when a recipe is created", async () => {
      const { result } = await createCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          actor_id: "user_1",
          document: { title: "Bean stew", notes: "Simmer" },
        },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_CREATED,
          data: {
            collection: "recipe",
            id: result.document.id,
            status: "draft",
          },
        },
      ])
    })

    it("emits updated with save when a draft is saved", async () => {
      const recipe = await createRecipe()

      await updateCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id: recipe.id,
          actor_id: "user_1",
          document: { title: "Bean soup" },
          base_version: recipe.version,
        },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_UPDATED,
          data: {
            collection: "recipe",
            id: recipe.id,
            action: "save",
            status: "draft",
          },
        },
      ])
    })

    it("emits updated with publish when a recipe is published", async () => {
      const recipe = await createRecipe()

      await publishCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id: recipe.id,
          actor_id: "user_1",
          base_version: recipe.version,
        },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_UPDATED,
          data: {
            collection: "recipe",
            id: recipe.id,
            action: "publish",
            status: "published",
          },
        },
      ])
    })

    it("emits updated with save and the published status when a published recipe is saved", async () => {
      const recipe = await createRecipe()
      const published = await publishRecipe(recipe.id, recipe.version)

      await updateCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id: recipe.id,
          actor_id: "user_1",
          document: { title: "Bean soup" },
          base_version: published,
        },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_UPDATED,
          data: {
            collection: "recipe",
            id: recipe.id,
            action: "save",
            status: "published",
          },
        },
      ])
    })

    it("emits updated with discard when a published recipe's draft is discarded", async () => {
      const recipe = await createRecipe()
      const published = await publishRecipe(recipe.id, recipe.version)
      const draft = await saveRecipe(recipe.id, published)

      await discardCmsDocumentDraftWorkflow(getContainer()).run({
        input: { collection: "recipe", id: recipe.id, base_version: draft },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_UPDATED,
          data: {
            collection: "recipe",
            id: recipe.id,
            action: "discard",
            status: "published",
          },
        },
      ])
    })

    it("emits one updated with restore when a version is restored", async () => {
      const recipe = await createRecipe()
      const saved = await saveRecipe(recipe.id, recipe.version)

      await restoreCmsDocumentVersionWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id: recipe.id,
          version_id: recipe.versionId,
          actor_id: "user_1",
          base_version: saved,
        },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_UPDATED,
          data: {
            collection: "recipe",
            id: recipe.id,
            action: "restore",
            status: "draft",
          },
        },
      ])
    })

    it("emits updated with unpublish when a recipe is unpublished", async () => {
      const recipe = await createRecipe()
      await publishRecipe(recipe.id, recipe.version)

      await unpublishCmsDocumentWorkflow(getContainer()).run({
        input: { collection: "recipe", id: recipe.id, actor_id: "user_1" },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_UPDATED,
          data: {
            collection: "recipe",
            id: recipe.id,
            action: "unpublish",
            status: "draft",
          },
        },
      ])
    })

    it("emits deleted when a recipe is deleted", async () => {
      const recipe = await createRecipe()

      await deleteCmsDocumentWorkflow(getContainer()).run({
        input: { collection: "recipe", id: recipe.id },
      })

      expect(listCmsEvents()).toEqual([
        {
          name: DocumentEvents.DOCUMENT_DELETED,
          data: { collection: "recipe", id: recipe.id },
        },
      ])
    })

    it("emits nothing when a save is refused", async () => {
      const recipe = await createRecipe()
      await saveRecipe(recipe.id, recipe.version)

      await expect(
        updateCmsDocumentWorkflow(getContainer()).run({
          input: {
            collection: "recipe",
            id: recipe.id,
            actor_id: "user_1",
            document: { title: "Bean broth" },
            base_version: recipe.version,
          },
        })
      ).rejects.toMatchObject({ type: "not_allowed" })
      expect(listCmsEvents()).toEqual([])
    })
  },
})
