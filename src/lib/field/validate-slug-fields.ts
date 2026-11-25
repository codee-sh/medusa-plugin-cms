import { buildConfigError } from "../config/build-config-error"
import type { ContentTypeConfig } from "../config/types"
import type { ModelDescription } from "../model/types"

/**
 * Checks that every slug field and its source are text columns, its source not a `url` field, and that its
 * `serverTransform` is a function.
 *
 * @param model - The model the fields belong to.
 * @param config - Its config, whose `fields` hold the slug fields.
 * @param path - Where the config sits, for error messages.
 * @throws At the first slug field that does not fit.
 */
export const validateSlugFields = (
  model: ModelDescription,
  config: Pick<ContentTypeConfig, "fields">,
  path: string
): void => {
  /**
   * Tells whether the model has a text column of a name.
   *
   * @param name - The column's name.
   * @returns Whether it is a text column.
   */
  const isText = (name: string) =>
    model.columns.some(
      (column) => column.name === name && column.dataType === "text"
    )

  for (const [name, override] of Object.entries(config.fields ?? {})) {
    if (override.type !== "slug") {
      continue
    }

    if (!isText(name)) {
      throw buildConfigError(`${path}: slug "${name}" needs a text column`)
    }

    if (!isText(override.from)) {
      throw buildConfigError(
        `${path}: slug "${name}" is built from "${override.from}", which is not a text column`
      )
    }

    if (config.fields?.[override.from]?.type === "url") {
      throw buildConfigError(
        `${path}: slug "${name}" is built from "${override.from}", a url field, whose links make no slug`
      )
    }

    if (config.fields?.[override.from]?.type === "richtext") {
      throw buildConfigError(
        `${path}: slug "${name}" is built from "${override.from}", a richtext field, whose document makes no slug`
      )
    }

    if (
      override.serverTransform !== undefined &&
      typeof override.serverTransform !== "function"
    ) {
      throw buildConfigError(
        `${path}: slug "${name}" has a "serverTransform" that is not a function`
      )
    }
  }
}
