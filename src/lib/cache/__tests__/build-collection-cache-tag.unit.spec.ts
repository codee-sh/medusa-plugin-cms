import { buildCollectionCacheTag } from "../build-collection-cache-tag"

describe("buildCollectionCacheTag", () => {
  it("tags every cached read of the collection's model under its key", () => {
    expect(buildCollectionCacheTag({ key: "TestRecipe" })).toBe(
      "TestRecipe:list:*"
    )
  })
})
