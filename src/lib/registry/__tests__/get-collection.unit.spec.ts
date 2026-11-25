import { MedusaError } from "@medusajs/framework/utils"
import { buildTestConfig } from "../../__tests__/fixtures"
import { CMS_MODULE } from "../../../modules/cms"
import { getCollection } from "../get-collection"

/**
 * Builds a container whose CMS module holds the test config.
 *
 * @returns The container.
 */
const buildContainer = () =>
  ({
    resolve: (name: string) =>
      name === CMS_MODULE ? { getConfig: () => buildTestConfig() } : undefined,
  }) as never

describe("getCollection", () => {
  it("answers a registered collection with the module holding its model", () => {
    const { module, collection } = getCollection(buildContainer(), "recipe")

    expect(collection.slug).toBe("recipe")
    expect(collection.key).toBe("TestRecipe")
    expect(typeof module).toBe("string")
  })

  it("throws NOT_FOUND naming an unknown slug", () => {
    expect(() => getCollection(buildContainer(), "nope")).toThrow(
      expect.objectContaining({
        type: MedusaError.Types.NOT_FOUND,
        message: 'Collection "nope" was not found',
      })
    )
  })
})
