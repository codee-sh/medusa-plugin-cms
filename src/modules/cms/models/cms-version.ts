import { model } from "@medusajs/framework/utils"

/** What made a version: a save, a publish, an unpublish or a restore. */
export type CmsVersionChangeType = "save" | "publish" | "unpublish" | "restore"

/**
 * One saved state of a document of any collection: its whole content as a write body, its number, and
 * whether it is a draft or the state a publish made live.
 *
 * `latest` marks the version the Admin edits, at most one per document; `changed_fields` names what
 * differs from the version before it; `change_type` tells the history what made the version, one of
 * `CmsVersionChangeType`, and `restored_from` the number of the version a restore brought back. As in
 * Medusa's `OrderChange`, the type is text, so a new one needs no migration.
 */
export const CmsVersion = model
  .define("cms_version", {
    id: model.id({ prefix: "cmsver" }).primaryKey(),
    collection: model.text(),
    document_id: model.text(),
    version: model.number(),
    snapshot: model.json(),
    status: model.enum(["draft", "published"]),
    latest: model.boolean().default(false),
    changed_fields: model.array(),
    change_type: model.text(),
    restored_from: model.number().nullable(),
    created_by: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_cms_version_document",
      on: ["collection", "document_id", "created_at"],
      where: { deleted_at: null },
    },
    {
      name: "IDX_cms_version_latest",
      on: ["collection", "document_id"],
      unique: true,
      where: "latest = true AND deleted_at IS NULL",
    },
    {
      name: "IDX_cms_version_number",
      on: ["collection", "document_id", "version"],
      unique: true,
      where: { deleted_at: null },
    },
  ])
