import { prepareAreas } from "../area/prepare-areas"
import { prepareCmsText } from "../config/prepare-cms-text"
import { prepareLabels } from "../config/prepare-labels"
import { validateAreaLink } from "../area/validate-area-link"
import { prepareFieldSections } from "../layout/prepare-field-sections"
import { prepareFields } from "../field/prepare-fields"
import type { FieldDefaults } from "../field/types"
import { validateStatusColumn } from "./validate-status-column"
import { listStoreColumns } from "./list-store-columns"
import { prepareCollectionTable } from "./prepare-collection-table"
import { prepareAdminListFilters } from "./prepare-admin-list-filters"
import { prepareStoreQuery } from "./prepare-store-query"
import { validateRelationshipTargets } from "./validate-relationship-targets"
import { validateSingleton } from "./validate-singleton"
import { validateEditMode } from "./validate-edit-mode"
import { validateTableColumns } from "./validate-table-columns"
import { validateColumnTypes } from "../model/validate-column-types"
import { validateDmlModel } from "../model/validate-dml-model"
import { describeModel } from "../model/describe-model"
import type { BlockConfig, CollectionConfig } from "../config/types"
import type { ModelDescription } from "../model/types"
import type { PreparedCollection, StoreQueryInput } from "./types"

/** The columns the plugin writes on every document, with the DML type each must have. */
const DOCUMENT_COLUMN_TYPES: Record<string, string> = {
  status: "enum",
  published_at: "dateTime",
  created_by: "text",
  updated_by: "text",
}

/** The columns the plugin writes on every document, kept out of the fields. */
const DOCUMENT_COLUMNS = Object.keys(DOCUMENT_COLUMN_TYPES)

/** Column types a table cell cannot show as one value. */
const NON_SCALAR_TYPES = ["json", "array"]

/**
 * Describes a collection from its model and checks the config against it, its texts prepared.
 *
 * @param config - The collection's config.
 * @param areaModel - The area model, `undefined` for a config with no areas.
 * @param blocks - The config's block types, which its areas may allow.
 * @param fieldDefaults - What the config gives every field.
 * @param reach - The registry's block types and how deep areas nest, which the store's queries follow.
 * @param collections - Every collection's config, in config order, which its relationships name.
 * @param translationNs - The config's `admin.translationNs`, which its texts' `t` takes.
 * @returns The collection.
 * @throws At the first problem of the model or the config.
 */
export const prepareCollection = (
  config: CollectionConfig,
  areaModel: ModelDescription | undefined,
  blocks: BlockConfig[],
  fieldDefaults: FieldDefaults,
  reach: Pick<StoreQueryInput, "blocks" | "maxDepth">,
  collections: CollectionConfig[],
  translationNs: string | undefined
): PreparedCollection => {
  const path = `collection "${config.slug}"`

  validateDmlModel(config.model, path)

  const description = describeModel(config.model)
  const admin = config.admin ?? {}
  // A `belongsTo`'s foreign key is a column of the row too, which a table shows and a list orders by.
  const rowColumns = [...description.columns, ...description.foreignKeyColumns]
  const columns = rowColumns
    .filter(({ dataType }) => !NON_SCALAR_TYPES.includes(dataType))
    .map(({ name }) => name)

  validateSingleton(config, path)
  validateEditMode(config, path)
  validateColumnTypes(description, DOCUMENT_COLUMN_TYPES, path)
  validateStatusColumn(description, path)

  const prepared = prepareFields(
    description,
    config,
    DOCUMENT_COLUMNS,
    path,
    fieldDefaults,
    translationNs
  )
  const { slugTransforms, schemas } = prepared

  // The table names fields, so it is checked once they are.
  validateTableColumns(columns, config, path)

  validateRelationshipTargets(
    description,
    prepared.fields,
    collections,
    blocks,
    path
  )

  // Without drafts every write is live, so a field a publish needs is needed at every save; the Admin,
  // which has no schemas, reads it from `required`.
  const fields =
    config.drafts !== true
      ? prepared.fields.map((field) =>
          field.required === "publish"
            ? { ...field, required: "always" as const }
            : field
        )
      : prepared.fields
  const areas = prepareAreas(
    config.areas,
    description,
    blocks,
    translationNs,
    path
  )
  const unique = rowColumns
    .filter((column) => column.unique)
    .map(({ name }) => name)
  const areaLink =
    areas.length && areaModel
      ? validateAreaLink(description, areaModel, path)
      : undefined
  const storeColumns = listStoreColumns(
    fields,
    description.columns.some(({ name }) => name === "metadata")
  )

  return {
    // MedusaService names its generated methods after the key, which must be the model's name.
    key: description.name,
    slug: config.slug,
    idPrefix: description.idPrefix ?? "",
    labels: prepareLabels(config.labels, translationNs, path),
    drafts: config.drafts === true,
    singleton: config.singleton === true,
    store: config.store !== false,
    admin: {
      useAsTitle: admin.useAsTitle,
      table: prepareCollectionTable(config, translationNs, path),
      edit: config.singleton ? undefined : (admin.edit ?? "page"),
      description:
        admin.description === undefined
          ? undefined
          : prepareCmsText(
              admin.description,
              translationNs,
              `${path}: admin description`
            ),
      sections: prepareFieldSections(
        fields,
        areas.map(({ name }) => name),
        unique,
        admin.sections,
        translationNs,
        path
      ),
    },
    columns,
    unique,
    fields,
    schemas,
    slugTransforms,
    areas,
    areaLink,
    storeColumns,
    adminListFilters: prepareAdminListFilters(fields),
    storeQuery: prepareStoreQuery(
      {
        fields,
        columns: storeColumns,
        areas,
        ...reach,
      },
      config.store || undefined,
      path
    ),
  }
}
