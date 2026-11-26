import { buildConfigError } from "../config/build-config-error"
import type { RegistryField } from "../field/types"
import type { RegistryMedia } from "../media/types"

/**
 * Checks every media field against the config's provider: there must be one, and it must read back
 * what the field stores.
 *
 * @param models - Each collection's and block's fields, with where its config sits.
 * @param media - The registry's media, if the config has one.
 * @throws At the first media field without a provider, or storing what the provider cannot read.
 */
export const validateMediaProviderFields = (
  models: { path: string; fields: RegistryField[] }[],
  media: RegistryMedia | undefined
): void => {
  for (const { path, fields } of models) {
    for (const field of fields) {
      if (field.kind !== "media") {
        continue
      }

      if (!media) {
        throw buildConfigError(
          `${path}: media "${field.name}" needs media.provider in the config`
        )
      }

      if (!media.stores.includes(field.stores!)) {
        throw buildConfigError(
          `${path}: media "${field.name}" stores "${field.stores}", but the media provider "${media.identifier}" stores only ${media.stores.map((store) => `"${store}"`).join(" and ")}`
        )
      }
    }
  }
}
