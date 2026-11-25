import type { ICachingModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { buildCollectionCacheTag } from "../../../../src/lib/cache/build-collection-cache-tag"
import { getCmsDocumentStep } from "../../../../src/workflows/cms/steps/get-cms-document"
import { listCmsDocumentsStep } from "../../../../src/workflows/cms/steps/list-cms-documents"
import {
  type CreateCmsDocumentInput,
  createCmsDocumentWorkflow,
} from "../../../../src/workflows/cms/workflows/create-cms-document"
import {
  type DeleteCmsDocumentInput,
  deleteCmsDocumentWorkflow,
} from "../../../../src/workflows/cms/workflows/delete-cms-document"
import {
  type PublishCmsDocumentInput,
  publishCmsDocumentWorkflow,
} from "../../../../src/workflows/cms/workflows/publish-cms-document"
import {
  type UnpublishCmsDocumentInput,
  unpublishCmsDocumentWorkflow,
} from "../../../../src/workflows/cms/workflows/unpublish-cms-document"
import {
  type UpdateCmsDocumentInput,
  updateCmsDocumentWorkflow,
} from "../../../../src/workflows/cms/workflows/update-cms-document"

jest.setTimeout(60 * 1000)

/** The recipes the store would list, read through the cache. */
const LIST_PUBLISHED = {
  collection: "recipe",
  status: "published" as const,
  limit: 50,
  offset: 0,
  cache: true,
}

/** Lists the published recipes through the cache. */
const listPublishedWorkflow = createWorkflow(
  "test-list-cms-published-recipes-cached",
  () => new WorkflowResponse(listCmsDocumentsStep(LIST_PUBLISHED))
)

/** Lists every recipe through the cache. */
const listAllWorkflow = createWorkflow(
  "test-list-cms-recipes-cached",
  () =>
    new WorkflowResponse(
      listCmsDocumentsStep({ ...LIST_PUBLISHED, status: undefined })
    )
)

/** Reads one recipe through the cache. */
const readWorkflow = createWorkflow(
  "test-read-cms-recipe-cached",
  (input: { id: string }) =>
    new WorkflowResponse(
      getCmsDocumentStep({
        collection: "recipe",
        id: input.id,
        with_areas: false,
        cache: true,
      })
    )
)

// Each write below runs inside one workflow with the cached read after it. Module events wait for the
// end of that workflow, so the read sees the write only through `clear-cms-cache`.

/** Creates a recipe, then lists every recipe through the cache. */
const createThenListWorkflow = createWorkflow(
  "test-create-cms-recipe-then-list-cached",
  (input: CreateCmsDocumentInput) => {
    createCmsDocumentWorkflow.runAsStep({ input })

    return new WorkflowResponse(
      listCmsDocumentsStep({ ...LIST_PUBLISHED, status: undefined })
    )
  }
)

/** Saves a draft recipe, then reads it through the cache. */
const updateThenReadWorkflow = createWorkflow(
  "test-update-cms-recipe-then-read-cached",
  (input: UpdateCmsDocumentInput) => {
    updateCmsDocumentWorkflow.runAsStep({ input })

    return new WorkflowResponse(
      getCmsDocumentStep({
        collection: "recipe",
        id: input.id,
        with_areas: false,
        cache: true,
      })
    )
  }
)

/** Publishes a recipe, then lists the published ones through the cache. */
const publishThenListWorkflow = createWorkflow(
  "test-publish-cms-recipe-then-list-cached",
  (input: PublishCmsDocumentInput) => {
    publishCmsDocumentWorkflow.runAsStep({ input })

    return new WorkflowResponse(listCmsDocumentsStep(LIST_PUBLISHED))
  }
)

/** Unpublishes a recipe, then lists the published ones through the cache. */
const unpublishThenListWorkflow = createWorkflow(
  "test-unpublish-cms-recipe-then-list-cached",
  (input: UnpublishCmsDocumentInput) => {
    unpublishCmsDocumentWorkflow.runAsStep({ input })

    return new WorkflowResponse(listCmsDocumentsStep(LIST_PUBLISHED))
  }
)

/** Deletes a recipe, then lists every recipe through the cache. */
const deleteThenListWorkflow = createWorkflow(
  "test-delete-cms-recipe-then-list-cached",
  (input: DeleteCmsDocumentInput) => {
    deleteCmsDocumentWorkflow.runAsStep({ input })

    return new WorkflowResponse(
      listCmsDocumentsStep({ ...LIST_PUBLISHED, status: undefined })
    )
  }
)

/**
 * `clear-cms-cache` in the write workflows: after `create-`, `update-` (a draft's save), `publish-`,
 * `unpublish-` and `delete-cms-document`, a read through the cache in the same workflow answers the
 * write, an empty cached list included.
 *
 * Manual: needs the test database (`yarn test:db:up`). Run with `yarn test:integration:http`.
 */
medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    beforeEach(async () => {
      // The database is emptied between tests without events, so the cache is cleared by hand.
      await getContainer()
        .resolve<ICachingModuleService>(Modules.CACHING)
        .clear({ tags: [buildCollectionCacheTag({ key: "TestRecipe" })] })
    })

    /**
     * Creates a draft recipe through its workflow, so it has a version.
     *
     * @param title - Its title.
     * @returns Its id and the number of its version.
     */
    const createRecipe = async (title: string) => {
      const { result } = await createCmsDocumentWorkflow(getContainer()).run({
        input: {
          collection: "recipe",
          actor_id: "user_1",
          document: { title, notes: "Simmer" },
        },
      })

      return {
        id: result.document.id,
        version: result.latest_version!.version,
      }
    }

    /**
     * Lists the ids of the recipes a cached list answers.
     *
     * @param workflow - The listing workflow.
     * @returns The ids.
     */
    const listIds = async (
      workflow: typeof listPublishedWorkflow | typeof listAllWorkflow
    ) =>
      (await workflow(getContainer()).run()).result.documents.map(
        ({ id }) => id
      )

    describe("createCmsDocumentWorkflow", () => {
      it("clears the cached list, so the new recipe is listed at once", async () => {
        const before = await listIds(listAllWorkflow)

        const { result } = await createThenListWorkflow(getContainer()).run({
          input: {
            collection: "recipe",
            actor_id: "user_1",
            document: { title: "Bean stew", notes: "Simmer" },
          },
        })

        expect(before).toEqual([])
        expect(result.documents.map(({ title }) => title)).toEqual([
          "Bean stew",
        ])
      })
    })

    describe("updateCmsDocumentWorkflow", () => {
      it("clears the cached read of a draft it saves", async () => {
        const recipe = await createRecipe("Bean stew")
        const before = await readWorkflow(getContainer()).run({
          input: { id: recipe.id },
        })

        const { result } = await updateThenReadWorkflow(getContainer()).run({
          input: {
            collection: "recipe",
            id: recipe.id,
            actor_id: "user_1",
            document: { title: "Bean soup" },
            base_version: recipe.version,
          },
        })

        expect(before.result.title).toBe("Bean stew")
        expect(result.title).toBe("Bean soup")
      })
    })

    describe("publishCmsDocumentWorkflow", () => {
      it("clears a cached empty list of published recipes", async () => {
        const recipe = await createRecipe("Bean stew")
        const before = await listIds(listPublishedWorkflow)

        const { result } = await publishThenListWorkflow(getContainer()).run({
          input: {
            collection: "recipe",
            id: recipe.id,
            actor_id: "user_1",
            base_version: recipe.version,
          },
        })

        expect(before).toEqual([])
        expect(result.documents.map(({ id }) => id)).toEqual([recipe.id])
      })
    })

    describe("unpublishCmsDocumentWorkflow", () => {
      it("clears the cached list of published recipes it leaves", async () => {
        const recipe = await createRecipe("Bean stew")
        await publishCmsDocumentWorkflow(getContainer()).run({
          input: {
            collection: "recipe",
            id: recipe.id,
            actor_id: "user_1",
            base_version: recipe.version,
          },
        })
        const before = await listIds(listPublishedWorkflow)

        const { result } = await unpublishThenListWorkflow(getContainer()).run({
          input: { collection: "recipe", id: recipe.id, actor_id: "user_1" },
        })

        expect(before).toEqual([recipe.id])
        expect(result.documents).toEqual([])
      })
    })

    describe("deleteCmsDocumentWorkflow", () => {
      it("clears the cached list it removes the recipe from", async () => {
        const recipe = await createRecipe("Bean stew")
        const before = await listIds(listAllWorkflow)

        const { result } = await deleteThenListWorkflow(getContainer()).run({
          input: { collection: "recipe", id: recipe.id },
        })

        expect(before).toEqual([recipe.id])
        expect(result.documents).toEqual([])
      })
    })
  },
})
