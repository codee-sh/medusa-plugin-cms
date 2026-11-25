import { model } from "@medusajs/framework/utils"
import { TestSection } from "./test-section"

export const TestCallout = model
  .define("test_callout", {
    id: model.id({ prefix: "tcall" }).primaryKey(),
    body: model.text().nullable(),
    image: model.text().nullable(),
    metadata: model.json().nullable(),
    area: model.belongsTo(() => TestSection, { mappedBy: "callouts" }),
    rank: model.number().default(0),
  })
  .indexes([
    {
      name: "IDX_test_callout_area_id_rank",
      on: ["area_id", "rank"],
      where: "deleted_at IS NULL",
    },
  ])
