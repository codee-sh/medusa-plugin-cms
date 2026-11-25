import { model } from "@medusajs/framework/utils"
import { TestSection } from "./test-section"
import { TestSettings } from "./test-settings"

export const TestRecipe = model
  .define("test_recipe", {
    id: model.id({ prefix: "trec" }).primaryKey(),
    title: model.text().searchable().nullable(),
    slug: model.text().nullable(),
    servings: model.number().nullable(),
    vegan: model.boolean().default(false),
    cooked_at: model.dateTime().nullable(),
    difficulty: model.enum(["easy", "hard"]).default("easy"),
    labels: model.array().nullable(),
    cover: model.text().nullable(),
    gallery: model.array().nullable(),
    notes: model.text(),
    summary: model.text().nullable(),
    extra: model.json().nullable(),
    metadata: model.json().nullable(),
    areas: model.hasMany(() => TestSection, { mappedBy: "recipe" }),
    // A recipe pointing at another, or at itself; neither side cascades, so a delete keeps the other.
    related_recipe: model
      .belongsTo(() => TestRecipe, { mappedBy: "related_by" })
      .nullable(),
    related_by: model.hasMany(() => TestRecipe, {
      mappedBy: "related_recipe",
    }),
    featured_in: model.hasMany(() => TestSettings, {
      mappedBy: "featured_recipe",
    }),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .cascades({ delete: ["areas"] })
  .indexes([
    {
      name: "IDX_test_recipe_slug_unique",
      on: ["slug"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
