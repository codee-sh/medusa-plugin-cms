import { prepareAreas } from "../area/prepare-areas"
import { buildConfigError } from "../config/build-config-error"
import { prepareLabels } from "../config/prepare-labels"
import { prepareFields } from "../field/prepare-fields"
import type { FieldDefaults } from "../field/types"
import { validateColumnTypes } from "../model/validate-column-types"
import { validateDmlModel } from "../model/validate-dml-model"
import { describeModel } from "../model/describe-model"
import type { BlockConfig } from "../config/types"
import type { ModelDescription } from "../model/types"
import type { RegistryBlock } from "./types"
import { prepareBlockSections } from "./prepare-block-sections"
import { validateBlockFields } from "./validate-block-fields"
import { validateBlockRelation } from "./validate-block-relation"

/** The column the plugin writes on every block: its position in its area. */
const BLOCK_COLUMN_TYPES: Record<string, string> = {
  rank: "number",
}

/** The columns the plugin writes on every block, kept out of the fields. */
const BLOCK_COLUMNS = Object.keys(BLOCK_COLUMN_TYPES)

/**
 * Checks that a block does not declare its areas under `repeaters`, their earlier key, which a JS
 * config can still give and which would otherwise be dropped without a word.
 *
 * @param config - The block's config.
 * @param path - Where the config sits, for error messages.
 * @throws When the block has `repeaters`.
 */
const validateBlockAreasKey = (config: BlockConfig, path: string): void => {
  if ("repeaters" in config) {
    throw buildConfigError(`${path}: "repeaters" is now "areas"`)
  }
}

/**
 * Describes a block type from its model and checks the config against it, its texts prepared.
 *
 * @param config - The block's config.
 * @param areaModel - The area model.
 * @param blocks - The config's block types, which its areas may allow.
 * @param fieldDefaults - What the config gives every field.
 * @param translationNs - The config's `admin.translationNs`, which its texts' `t` takes.
 * @returns The block type.
 * @throws At the first problem of the model or the config.
 */
export const prepareBlock = (
  config: BlockConfig,
  areaModel: ModelDescription,
  blocks: BlockConfig[],
  fieldDefaults: FieldDefaults,
  translationNs: string | undefined
): RegistryBlock => {
  const path = `block "${config.slug}"`

  validateDmlModel(config.model, path)
  validateBlockAreasKey(config, path)

  const description = describeModel(config.model)

  validateColumnTypes(description, BLOCK_COLUMN_TYPES, path)
  validateBlockFields(config, path)

  const { fields, slugTransforms, schemas } = prepareFields(
    description,
    config,
    BLOCK_COLUMNS,
    path,
    fieldDefaults,
    translationNs
  )

  return {
    key: description.name,
    slug: config.slug,
    idPrefix: description.idPrefix ?? "",
    labels: prepareLabels(config.labels, translationNs, path),
    relation: validateBlockRelation(description, areaModel),
    fields,
    slugTransforms,
    schemas,
    areas: prepareAreas(config.areas, description, blocks, translationNs, path),
    admin: {
      sections: prepareBlockSections(
        fields,
        config.admin?.sections ?? [],
        translationNs,
        path
      ),
    },
  }
}
