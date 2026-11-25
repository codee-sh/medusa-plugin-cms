import { model } from "@medusajs/framework/utils"
import { TestRecipe } from "./test-recipe"

export const TestSettings = model.define("test_settings", {
  id: model.id({ prefix: "tset" }).primaryKey(),
  title: model.text().nullable(),
  featured_note: model.text().nullable(),
  // A singleton without drafts pointing at a collection with drafts.
  featured_recipe: model
    .belongsTo(() => TestRecipe, { mappedBy: "featured_in" })
    .nullable(),
  status: model.enum(["draft", "published"]).default("draft"),
  published_at: model.dateTime().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})
