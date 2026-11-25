import { model } from "@medusajs/framework/utils"
import { TestSection } from "./test-section"

export const TestStep = model
  .define("test_step", {
    id: model.id({ prefix: "tstep" }).primaryKey(),
    heading: model.text().nullable(),
    area: model.belongsTo(() => TestSection, { mappedBy: "steps" }),
    rank: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_test_step_area_id_rank",
      on: ["area_id", "rank"],
      where: "deleted_at IS NULL",
    },
  ])
