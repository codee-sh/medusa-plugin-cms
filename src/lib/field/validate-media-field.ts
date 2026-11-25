import { buildConfigError } from "../config/build-config-error"
import { MEDIA_STORES } from "../media-provider/media-stores"
import { isMimeTypeList } from "../media-provider/is-mime-type-list"
import type { ModelColumn } from "../model/types"
import type { MediaFieldConfig } from "./types"
import { validateMultipleValues } from "./validate-multiple-values"

/**
 * Checks a media field: a known `stores`, its `admin.mimeTypes` a list of MIME types when given, no
 * `accept`, which `admin.mimeTypes` replaced, and one file on a text column or several on an array column.
 *
 * @param column - The field's column.
 * @param override - The field's config.
 * @param name - The field's name.
 * @param path - Where the config sits, for error messages.
 * @throws At the first setting that does not fit.
 */
export const validateMediaField = (
  column: ModelColumn,
  override: MediaFieldConfig,
  name: string,
  path: string
): void => {
  if (!MEDIA_STORES.includes(override.stores)) {
    throw buildConfigError(
      `${path}: media "${name}" needs stores: "id" or "url"`
    )
  }

  // The types refuse it; a config written in JavaScript can still give it.
  if ("accept" in override) {
    throw buildConfigError(
      `${path}: media "${name}" takes no "accept": its picker's types are admin.mimeTypes`
    )
  }

  const mimeTypes = override.admin?.mimeTypes

  if (mimeTypes !== undefined && !isMimeTypeList(mimeTypes)) {
    throw buildConfigError(
      `${path}: media "${name}" takes admin.mimeTypes as a list of MIME types, such as "image/png" or "image/*"`
    )
  }

  validateMultipleValues(column, override, name, path, {
    one: "file",
    several: "files",
    oneOn: "a text column",
  })
}
