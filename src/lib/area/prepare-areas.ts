import { buildConfigError } from "../config/build-config-error"
import { prepareCmsText } from "../config/prepare-cms-text"
import type { AreaConfig, BlockConfig } from "../config/types"
import type { ModelDescription } from "../model/types"
import type { RegistryArea } from "./types"

/**
 * Checks one area: no column of the holder has its name, which a read returns beside the areas, it is
 * not named `areas`, under which a read keeps the area rows, and every block type it names is
 * configured.
 *
 * @param name - The area's name.
 * @param area - Its config.
 * @param holder - The model of what holds the area.
 * @param blocks - The config's block types.
 * @param path - Where the config sits, for error messages.
 * @throws At the first problem.
 */
const validateArea = (
  name: string,
  area: AreaConfig,
  holder: ModelDescription,
  blocks: BlockConfig[],
  path: string
): void => {
  if (holder.columns.some((column) => column.name === name)) {
    throw buildConfigError(`${path}: area "${name}" has the name of a column`)
  }

  if (name === "areas") {
    throw buildConfigError(
      `${path}: area "areas" is reserved for the area rows`
    )
  }

  for (const slug of area.blocks) {
    if (!blocks.some((block) => block.slug === slug)) {
      throw buildConfigError(
        `${path}: area "${name}" allows "${slug}", which is not a configured block`
      )
    }
  }
}

/**
 * Resolves the areas of whatever holds them - a collection or a block - with their
 * labels prepared, and checks them: every block type they name is configured, no area shares its name
 * with a column of the holder, which a read returns beside the areas, and none is named `areas`, under
 * which a read keeps the area rows.
 *
 * @param areas - The holder's `areas` config.
 * @param holder - The model of what holds the areas.
 * @param blocks - The config's block types.
 * @param translationNs - The config's `admin.translationNs`.
 * @param path - Where the config sits, for error messages.
 * @returns The areas, with their names.
 * @throws At the first area that does not fit.
 */
export const prepareAreas = (
  areas: Record<string, AreaConfig> | undefined,
  holder: ModelDescription,
  blocks: BlockConfig[],
  translationNs: string | undefined,
  path: string
): RegistryArea[] =>
  Object.entries(areas ?? {}).map(([name, area]) => {
    validateArea(name, area, holder, blocks, path)

    return {
      ...area,
      name,
      label: prepareCmsText(
        area.label,
        translationNs,
        `${path}: area "${name}" label`
      ),
    }
  })
