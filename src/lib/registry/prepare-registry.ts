import { findAreaModel } from "../area/find-area-model"
import { prepareAreaModel } from "../area/prepare-area-model"
import { prepareBlock } from "../block/prepare-block"
import { prepareCollection } from "../collection/prepare-collection"
import { buildConfigError } from "../config/build-config-error"
import type { Config } from "../config/types"
import type { RegistryBlock } from "../block/types"
import type { PreparedCollection } from "../collection/types"
import { prepareMedia } from "../media/prepare-media"
import { prepareLinkPolicy } from "../field/prepare-link-policy"
import { prepareRichTextFeatures } from "../field/prepare-rich-text-features"
import {
  CMS_I18N_NS,
  MANAGER_FORM_FIELDS_I18N_NS,
} from "../../shared/admin-i18n-ns"
import { DEFAULT_LINK_POLICY } from "../../shared/sanitize/link-policy"
import { DEFAULT_RICH_TEXT_FEATURES } from "../../shared/rich-text/features/default-rich-text-features"
import { validateMediaProviderFields } from "./validate-media-provider-fields"
import type { Registry } from "./types"
import { prepareRoutes } from "./prepare-routes"
import { validateContentTypeSlug } from "./validate-content-type-slug"
import { validateIdPrefixes } from "./validate-id-prefixes"

/** How many levels of areas a document can nest when the config does not say. */
const DEFAULT_MAX_DEPTH = 4

/**
 * Checks how deep a document's areas can nest: a positive whole number.
 *
 * @param depth - The depth, the default filled in.
 * @throws When it is not one.
 */
const validateMaxDepth = (depth: number): void => {
  if (!Number.isInteger(depth) || depth < 1) {
    throw buildConfigError(`maxDepth: needs a positive whole number`)
  }
}

/**
 * Resolves how deep a document's areas can nest.
 *
 * @param maxDepth - The config's `maxDepth`.
 * @returns The depth, 4 when left out.
 * @throws When it is not a positive whole number.
 */
const prepareMaxDepth = (maxDepth: number | undefined): number => {
  const depth = maxDepth ?? DEFAULT_MAX_DEPTH

  validateMaxDepth(depth)

  return depth
}

/**
 * The namespaces of Medusa's Admin texts and of the plugin's own, where the dashboard's deep merge would
 * put a project's keys over theirs.
 */
const RESERVED_TRANSLATION_NS = [
  "translation",
  CMS_I18N_NS,
  MANAGER_FORM_FIELDS_I18N_NS,
]

/**
 * Checks the namespace of the config's Admin texts.
 *
 * @param translationNs - The config's `admin.translationNs`.
 * @returns The namespace, or `undefined` when left out.
 * @throws When it is empty, Medusa's or one of the plugin's own.
 */
const validateTranslationNs = (
  translationNs: string | undefined
): string | undefined => {
  if (
    translationNs === "" ||
    (translationNs !== undefined &&
      RESERVED_TRANSLATION_NS.includes(translationNs))
  ) {
    throw buildConfigError(
      `admin: "translationNs" needs a namespace of the project's own, not "${translationNs}"`
    )
  }

  return translationNs
}

/**
 * Checks a config against its models and resolves it into the registry.
 *
 * @param config - The project's CMS config.
 * @returns The registry, frozen at its top level only: its collections and blocks are plain objects that
 * no code changes.
 * @throws At the first problem found, as Medusa's DML does.
 */
export const prepareRegistry = (config: Config): Registry => {
  const areaEntity = findAreaModel(config)
  const areaModel = areaEntity ? prepareAreaModel(areaEntity) : undefined
  const blockConfigs = config.blocks ?? []
  const prepared: Record<string, PreparedCollection> = {}
  const blocks: Record<string, RegistryBlock> = {}
  const fieldDefaults = {
    linkPolicy: prepareLinkPolicy(
      config.linkPolicy,
      DEFAULT_LINK_POLICY,
      "config"
    ),
    richTextFeatures: prepareRichTextFeatures(
      config.richText?.features,
      { defaultFeatures: DEFAULT_RICH_TEXT_FEATURES },
      DEFAULT_RICH_TEXT_FEATURES,
      "config: richText"
    ),
  }

  const maxDepth = prepareMaxDepth(config.maxDepth)
  const translationNs = validateTranslationNs(config.admin?.translationNs)

  // Without an area model the config has no blocks: a block would have pointed at one.
  if (areaModel) {
    for (const entry of blockConfigs) {
      validateContentTypeSlug(entry.slug, blocks, `block "${entry.slug}"`)

      blocks[entry.slug] = prepareBlock(
        entry,
        areaModel.description,
        blockConfigs,
        fieldDefaults,
        translationNs
      )
    }
  }

  for (const entry of config.collections) {
    validateContentTypeSlug(entry.slug, prepared, `collection "${entry.slug}"`)

    prepared[entry.slug] = prepareCollection(
      entry,
      areaModel?.description,
      blockConfigs,
      fieldDefaults,
      { blocks, maxDepth },
      config.collections,
      translationNs
    )
  }

  const { collections, routes } = prepareRoutes(config, prepared, translationNs)

  validateIdPrefixes(areaModel?.area, collections, blocks)

  const media = prepareMedia(config.media)

  validateMediaProviderFields(
    [
      ...Object.values(collections).map(({ slug, fields }) => ({
        path: `collection "${slug}"`,
        fields,
      })),
      ...Object.values(blocks).map(({ slug, fields }) => ({
        path: `block "${slug}"`,
        fields,
      })),
    ],
    media
  )

  return Object.freeze({
    module: config.module,
    area: areaModel?.area,
    collections,
    routes,
    blocks,
    maxDepth,
    media,
    translationNs,
  })
}
