import { buildConfigError } from "../config/build-config-error"
import type { MediaConfig, MediaProviderClass } from "../config/types"
import { MEDIA_STORES } from "../media-provider/media-stores"
import type { RegistryMedia } from "./types"

const PATH = "media.provider"

/** The members every provider instance has. */
const PROVIDER_METHODS = ["retrieve", "upload", "delete"]

/**
 * Checks the config's media provider: a media provider class - one with `retrieve`, `upload`, `delete`
 * and `validateOptions` - with an `identifier` and `stores`, whose `validateOptions` takes the options.
 *
 * @param resolve - The config's `resolve`.
 * @param options - The config's `options`.
 * @returns The class.
 * @throws At the first problem, or with the message `validateOptions` threw.
 */
const validateMediaProvider = (
  resolve: MediaProviderClass | undefined,
  options: Record<string, unknown>
): MediaProviderClass => {
  // Checked by shape, not `instanceof`: a second copy of the plugin, or a test's isolated modules,
  // brings its own AbstractCmsMediaProvider.
  if (
    typeof resolve !== "function" ||
    PROVIDER_METHODS.some(
      (method) =>
        typeof (resolve.prototype as unknown as Record<string, unknown>)[
          method
        ] !== "function"
    ) ||
    typeof resolve.validateOptions !== "function"
  ) {
    throw buildConfigError(
      `${PATH}: resolve must be a class extending AbstractCmsMediaProvider`
    )
  }

  if (!resolve.identifier) {
    throw buildConfigError(`${PATH}: the provider needs a static identifier`)
  }

  const stores = resolve.stores ?? []

  if (!stores.length || stores.some((store) => !MEDIA_STORES.includes(store))) {
    throw buildConfigError(
      `${PATH}: ${resolve.identifier} needs static stores of "id", "url" or both`
    )
  }

  try {
    resolve.validateOptions(options)
  } catch (error) {
    throw buildConfigError(`${PATH}: ${(error as Error).message}`)
  }

  return resolve
}

/**
 * Checks the config's media provider and records what the CMS needs of it: the class to create, its
 * options, and what its fields may store.
 *
 * @param media - The config's `media`.
 * @returns The registry's media, or none for a config without one.
 * @throws When `resolve` is not a media provider class - one with `retrieve`, `upload`, `delete` and
 * `validateOptions` - when it has no `identifier` or `stores`, or when its `validateOptions` refuses
 * the options.
 */
export const prepareMedia = (
  media: MediaConfig | undefined
): RegistryMedia | undefined => {
  if (!media) {
    return undefined
  }

  const { resolve: given, options = {} } = media.provider ?? {}
  const resolve = validateMediaProvider(given, options)

  return {
    resolve,
    options,
    identifier: resolve.identifier,
    stores: resolve.stores,
  }
}
