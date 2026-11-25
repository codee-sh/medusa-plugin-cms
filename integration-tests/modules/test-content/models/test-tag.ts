import { model } from "@medusajs/framework/utils"

export const TestTag = model
  .define("test_tag", {
    id: model.id({ prefix: "ttag" }).primaryKey(),
    name: model.text().searchable(),
    slug: model.text().nullable(),
    description: model.text().nullable(),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_test_tag_slug_unique",
      on: ["slug"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
