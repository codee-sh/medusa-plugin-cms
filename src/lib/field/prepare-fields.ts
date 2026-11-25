import type { ContentTypeConfig } from "../config/types"
import type { ModelDescription } from "../model/types"
import { normalizeSlug } from "../../shared/slug/normalize-slug"
import { findFieldColumn } from "./find-field-column"
import { findRequired } from "./find-required"
import { prepareField } from "./prepare-field"
import type { RegistryField, FieldDefaults, PreparedFields } from "./types"
import { validateFieldColumn } from "./validate-field-column"
import { validateFieldSchema } from "./validate-field-schema"
import { validateMetadataColumn } from "./validate-metadata-column"
import { validateModelSchema } from "./validate-model-schema"
import { validateRequiredColumns } from "./validate-required-columns"
import { validateRelationshipField } from "./validate-relationship-field"
import { validateRequiredField } from "./validate-required-field"
import { validateSlugFields } from "./validate-slug-fields"
import { validateTextFields } from "./validate-text-fields"

type FieldsConfig = Pick<
  ContentTypeConfig,
  "fields" | "serverValidation" | "serverPublishValidation"
>

const SYSTEM_COLUMNS = ["created_at", "updated_at", "deleted_at"]

/**
 * Builds the fields of a model from its config's `fields`, in their order, with their schemas and slug
 * functions, the same for a collection and a block. Each field carries when it must be filled, as its
 * schemas say. A column the config does not list is no field: the Admin does not show it and a write
 * refuses it, though a read still returns it.
 *
 * @param model - The model.
 * @param config - The `fields` of its config.
 * @param cmsColumns - The columns the plugin owns on this model.
 * @param path - Where the config sits, for error messages.
 * @param defaults - What the config gives every field: the `linkPolicy` a `url` field falls back to, and
 * the features a `richtext` field takes when it sets none.
 * @param translationNs - The config's `admin.translationNs`, which a field's texts' `t` takes.
 * @returns The fields, per field the slug function of its config, and the schemas of each field and of
 * the model.
 * @throws At the first field that does not fit the model, at a column the model requires that the
 * config does not list or that its field may leave empty, as no write could fill it, or at a model's
 * rule that is not an object of its fields.
 */
export const prepareFields = (
  model: ModelDescription,
  config: FieldsConfig,
  cmsColumns: string[],
  path: string,
  defaults: FieldDefaults,
  translationNs: string | undefined
): PreparedFields => {
  const entries = Object.entries(config.fields ?? {})
  const managedColumns = [...SYSTEM_COLUMNS, ...cmsColumns, "metadata"]

  validateMetadataColumn(model, path)
  validateSlugFields(model, config, path)
  validateTextFields(config, path)

  const fields = entries.map(([name, override]): RegistryField => {
    const column = findFieldColumn(model, name, path)

    validateFieldColumn(column, name, override, managedColumns, path)
    validateRelationshipField(model, name, override, path)

    const field = prepareField(column, override, defaults, translationNs, path)

    validateFieldSchema(
      field,
      "serverValidation",
      override.serverValidation,
      path
    )
    validateFieldSchema(
      field,
      "serverPublishValidation",
      override.serverPublishValidation,
      path
    )

    const required = findRequired({
      save: override.serverValidation,
      publish: override.serverPublishValidation,
    })

    validateRequiredField(column, required, name, path)

    return required ? { ...field, required } : field
  })

  validateModelSchema(fields, "serverValidation", config.serverValidation, path)
  validateModelSchema(
    fields,
    "serverPublishValidation",
    config.serverPublishValidation,
    path
  )

  validateRequiredColumns(model, fields, managedColumns, path)

  return {
    fields,
    slugTransforms: Object.fromEntries(
      entries.flatMap(([name, override]) =>
        override.type === "slug"
          ? [[name, override.serverTransform ?? normalizeSlug]]
          : []
      )
    ),
    schemas: {
      fields: Object.fromEntries(
        entries.flatMap(([name, override]) =>
          override.serverValidation || override.serverPublishValidation
            ? [
                [
                  name,
                  {
                    save: override.serverValidation,
                    publish: override.serverPublishValidation,
                  },
                ],
              ]
            : []
        )
      ),
      model: {
        save: config.serverValidation,
        publish: config.serverPublishValidation,
      },
    },
  }
}
