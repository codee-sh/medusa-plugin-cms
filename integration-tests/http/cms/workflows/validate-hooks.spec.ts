import type { IEventBusModuleService, Message } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/create-cms-document"
import { deleteCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/delete-cms-document"
import { getCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/get-cms-document"
import { publishCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/publish-cms-document"
import { restoreCmsDocumentVersionWorkflow } from "../../../../src/workflows/cms/workflows/restore-cms-document-version"
import { unpublishCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/unpublish-cms-document"
import { updateCmsDocumentWorkflow } from "../../../../src/workflows/cms/workflows/update-cms-document"
import { TEST_CONTENT_MODULE } from "../../../modules/test-content"
import type TestContentModuleService from "../../../modules/test-content/service"
import { createAdminHeaders } from "../../../utils/admin"

jest.setTimeout(60 * 1000)

/** The write workflows a host's handler is registered on, by a short name. */
type WriteWorkflow = "create" | "update" | "publish" | "unpublish" | "delete"

/** What a handler got, kept by the test. */
type ValidateCall = {
  workflow: WriteWorkflow
  collection: string
  document_id: string | null
  document_status: string | null
  change_type: string | null
}

/** An error the test client throws, with the response it got. */
type ResponseError = { response: { status: number; data: { message: string } } }

const calls: ValidateCall[] = []
let refusing: WriteWorkflow | null = null

/**
 * Records a handler's input, and refuses the write while a test refuses that workflow.
 *
 * @param workflow - The workflow the handler is registered on.
 * @param data - The hook's input.
 * @param data.collection - The collection's slug.
 * @param data.document - The document as stored, `null` for a create.
 * @param data.input - The workflow's input.
 * @throws `NOT_ALLOWED` while `refusing` names the workflow.
 */
const validateWrite = (
  workflow: WriteWorkflow,
  {
    collection,
    document,
    input,
  }: {
    collection: string
    document: { id: string; status: string } | null
    input: { collection: string; change_type?: string }
  }
) => {
  calls.push({
    workflow,
    collection,
    document_id: document?.id ?? null,
    document_status: document?.status ?? null,
    change_type: input.change_type ?? null,
  })

  if (refusing === workflow) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `The host refuses this ${workflow}.`
    )
  }
}

// The test app's `src` is the package itself, so a host's handlers are registered here, not in
// `src/workflows/hooks/`, where they would ship.
createCmsDocumentWorkflow.hooks.validate((data) =>
  validateWrite("create", data)
)
updateCmsDocumentWorkflow.hooks.validate((data) =>
  validateWrite("update", data)
)
publishCmsDocumentWorkflow.hooks.validate((data) =>
  validateWrite("publish", data)
)
unpublishCmsDocumentWorkflow.hooks.validate((data) =>
  validateWrite("unpublish", data)
)
deleteCmsDocumentWorkflow.hooks.validate((data) =>
  validateWrite("delete", data)
)

/**
 * The `validate` hook of each write workflow, with a host's handler: it gets the input, the collection
 * and the stored document after the plugin's checks, and a throw refuses the write with nothing written
 * and no event emitted - through the workflow and through the Admin route alike.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let emit: jest.SpyInstance

    beforeEach(() => {
      calls.length = 0
      refusing = null
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
     * Creates a draft recipe through its workflow.
     *
     * @returns The workflow's run.
     */
    const createRecipe = () =>
      createCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          actor_id: "user_1",
          document: { title: "Bean stew", notes: "Simmer" },
        },
      })

    /**
     * Saves a recipe's title through its workflow.
     *
     * @param id - The recipe's id.
     * @param baseVersion - The number of its latest version.
     * @returns The workflow's run.
     */
    const saveRecipe = (id: string, baseVersion: number) =>
      updateCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id,
          actor_id: "user_1",
          document: { title: "Bean soup" },
          base_version: baseVersion,
        },
      })

    /**
     * Publishes a recipe's latest version through its workflow.
     *
     * @param id - The recipe's id.
     * @param baseVersion - The number of its latest version.
     * @returns The workflow's run.
     */
    const publishRecipe = (id: string, baseVersion: number) =>
      publishCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id,
          actor_id: "user_1",
          base_version: baseVersion,
        },
      })

    /**
     * Unpublishes a recipe through its workflow.
     *
     * @param id - The recipe's id.
     * @returns The workflow's run.
     */
    const unpublishRecipe = (id: string) =>
      unpublishCmsDocumentWorkflow(getContainer()).run({
        input: { collection: "recipe", id, actor_id: "user_1" },
      })

    /**
     * Reads a recipe as the Admin does.
     *
     * @param id - The recipe's id.
     * @returns Its row and its latest version.
     */
    const getRecipe = async (id: string) => {
      const { result } = await getCmsDocumentWorkflow(getContainer()).run({
        input: { collection: "recipe", id },
      })

      return result
    }

    /**
     * Creates a recipe and publishes it, with no handler refusing.
     *
     * @returns The published recipe's id and the number of its latest version.
     */
    const createPublishedRecipe = async () => {
      const { result: created } = await createRecipe()
      const { result: published } = await publishRecipe(
        created.document.id,
        created.latest_version!.version
      )

      return {
        id: created.document.id,
        version: published.latest_version!.version,
      }
    }

    /**
     * Starts the test's own refusal, forgetting the calls and events of what the test set up.
     *
     * @param workflow - The workflow whose handler refuses from now on.
     */
    const refuse = (workflow: WriteWorkflow) => {
      refusing = workflow
      calls.length = 0
      emit.mockClear()
    }

    it("gives the create's handler the input and no document, and refuses the create", async () => {
      refuse("create")

      await expect(createRecipe()).rejects.toMatchObject({
        type: "not_allowed",
        message: "The host refuses this create.",
      })
      expect(calls).toEqual([
        {
          workflow: "create",
          collection: "recipe",
          document_id: null,
          document_status: null,
          change_type: null,
        },
      ])
      expect(listCmsEventNames()).toEqual([])

      const recipes = await getContainer()
        .resolve<TestContentModuleService>(TEST_CONTENT_MODULE)
        .listTestRecipes()
      expect(recipes).toEqual([])
    })

    it("refuses a draft's save, leaving its row and versions as they were", async () => {
      const { result } = await createRecipe()
      const { id } = result.document
      refuse("update")

      await expect(
        saveRecipe(id, result.latest_version!.version)
      ).rejects.toMatchObject({ type: "not_allowed" })
      expect(calls).toEqual([
        expect.objectContaining({
          workflow: "update",
          document_id: id,
          document_status: "draft",
        }),
      ])
      expect(listCmsEventNames()).toEqual([])

      const read = await getRecipe(id)
      expect(read.document.title).toBe("Bean stew")
      expect(read.latest_version!.version).toBe(result.latest_version!.version)
    })

    it("refuses a published document's save, recording no draft version", async () => {
      const recipe = await createPublishedRecipe()
      refuse("update")

      await expect(saveRecipe(recipe.id, recipe.version)).rejects.toMatchObject(
        { type: "not_allowed" }
      )
      expect(calls).toEqual([
        expect.objectContaining({
          workflow: "update",
          document_status: "published",
        }),
      ])
      expect(listCmsEventNames()).toEqual([])
      expect((await getRecipe(recipe.id)).latest_version!.version).toBe(
        recipe.version
      )
    })

    it("refuses a publish, leaving the recipe a draft", async () => {
      const { result } = await createRecipe()
      const { id } = result.document
      refuse("publish")

      await expect(
        publishRecipe(id, result.latest_version!.version)
      ).rejects.toMatchObject({ type: "not_allowed" })
      expect(calls).toEqual([
        expect.objectContaining({ workflow: "publish", document_id: id }),
      ])
      expect(listCmsEventNames()).toEqual([])
      expect((await getRecipe(id)).document.status).toBe("draft")
    })

    it("refuses an unpublish, leaving the recipe published", async () => {
      const recipe = await createPublishedRecipe()
      refuse("unpublish")

      await expect(unpublishRecipe(recipe.id)).rejects.toMatchObject({
        type: "not_allowed",
      })
      expect(calls).toEqual([
        expect.objectContaining({
          workflow: "unpublish",
          document_status: "published",
        }),
      ])
      expect(listCmsEventNames()).toEqual([])
      expect((await getRecipe(recipe.id)).document.status).toBe("published")
    })

    it("refuses a delete, leaving the recipe live", async () => {
      const { result } = await createRecipe()
      const { id } = result.document
      refuse("delete")

      await expect(
        deleteCmsDocumentWorkflow(getContainer()).run({
          input: { collection: "recipe", id },
        })
      ).rejects.toMatchObject({ type: "not_allowed" })
      expect(calls).toEqual([
        expect.objectContaining({ workflow: "delete", document_id: id }),
      ])
      expect(listCmsEventNames()).toEqual([])
      expect((await getRecipe(id)).document.id).toBe(id)
    })

    it("runs the update's handler for a restore, with its change type", async () => {
      const { result } = await createRecipe()
      const { id } = result.document
      const { result: saved } = await saveRecipe(
        id,
        result.latest_version!.version
      )
      calls.length = 0

      await restoreCmsDocumentVersionWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          id,
          version_id: result.latest_version!.id,
          actor_id: "user_1",
          base_version: saved.latest_version!.version,
        },
      })

      expect(calls).toEqual([
        expect.objectContaining({ workflow: "update", change_type: "restore" }),
      ])
    })

    it("runs no handler when a plugin check refuses first", async () => {
      const { result } = await createRecipe()
      calls.length = 0

      await expect(unpublishRecipe(result.document.id)).rejects.toMatchObject({
        type: "not_allowed",
      })
      expect(calls).toEqual([])
    })

    it("answers 400 with the handler's message to an Admin delete it refuses", async () => {
      const admin = await createAdminHeaders(getContainer())
      const { result } = await createRecipe()
      refuse("delete")

      const response = await api
        .delete(
          `/admin/cms/collections/recipe/documents/${result.document.id}`,
          admin
        )
        .catch((error: ResponseError) => error.response)

      expect(response.status).toBe(400)
      expect(response.data.message).toBe("The host refuses this delete.")
    })
  },
})
