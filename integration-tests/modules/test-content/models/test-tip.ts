import { model } from "@medusajs/framework/utils"
import { TestSection } from "./test-section"

export const TestTip = model
  .define("test_tip", {
    id: model.id({ prefix: "ttip" }).primaryKey(),
    text: model.text().nullable(),
    area: model.belongsTo(() => TestSection, { mappedBy: "tips" }),
    rank: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_test_tip_area_id_rank",
      on: ["area_id", "rank"],
      where: "deleted_at IS NULL",
    },
  ])
