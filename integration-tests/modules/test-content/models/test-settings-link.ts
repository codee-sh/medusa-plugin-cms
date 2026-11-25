import { model } from "@medusajs/framework/utils"

export const TestSettingsLink = model.define("test_settings_link", {
  id: model.id({ prefix: "tslink" }).primaryKey(),
  label: model.text().searchable().nullable(),
  url: model.text().nullable(),
  status: model.enum(["draft", "published"]).default("draft"),
  published_at: model.dateTime().nullable(),
  created_by: model.text().nullable(),
  updated_by: model.text().nullable(),
})
