import { model } from "@medusajs/framework/utils"
import { TestCallout } from "./test-callout"
import { TestRecipe } from "./test-recipe"
import { TestStep } from "./test-step"
import { TestTip } from "./test-tip"

export const TestSection = model
  .define("test_section", {
    id: model.id({ prefix: "tsec" }).primaryKey(),
    name: model.text(),
    parent_id: model.text().nullable(),
    recipe: model.belongsTo(() => TestRecipe, { mappedBy: "areas" }).nullable(),
    steps: model.hasMany(() => TestStep, { mappedBy: "area" }),
    callouts: model.hasMany(() => TestCallout, { mappedBy: "area" }),
    tips: model.hasMany(() => TestTip, { mappedBy: "area" }),
  })
  .cascades({ delete: ["steps", "callouts", "tips"] })
  .checks([{ name: "CHK_owner", expression: "num_nonnulls(recipe_id) = 1" }])
  .indexes([
    {
      name: "IDX_test_section_recipe_id_name_unique",
      on: ["recipe_id", "name"],
      unique: true,
      where:
        "recipe_id IS NOT NULL AND parent_id IS NULL AND deleted_at IS NULL",
    },
    {
      name: "IDX_test_section_parent_id_name_unique",
      on: ["parent_id", "name"],
      unique: true,
      where: "parent_id IS NOT NULL AND deleted_at IS NULL",
    },
  ])
