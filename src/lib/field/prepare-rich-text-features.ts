import { RICH_TEXT_FEATURE_DEFINITIONS } from "../../shared/rich-text/features/rich-text-feature-definitions"
import { RICH_TEXT_HEADINGS } from "../../shared/rich-text/features/heading-feature"
import type {
  ResolvedRichTextFeature,
  RichTextFeature,
  RichTextFeatureKey,
  RichTextHeading,
} from "../../shared/rich-text/types"
import {
  DEFAULT_LINK_POLICY,
  type LinkPolicy,
} from "../../shared/sanitize/link-policy"
import { buildConfigError } from "../config/build-config-error"
import { prepareConfigValue } from "../config/prepare-config-value"
import type { ConfigValue } from "../config/types"
import { prepareLinkPolicy } from "./prepare-link-policy"

/** Every built-in feature's key. */
const FEATURE_KEYS = Object.keys(
  RICH_TEXT_FEATURE_DEFINITIONS
) as RichTextFeatureKey[]

/**
 * Checks that a value is a plain object, as a feature and its props are.
 *
 * @param value - The value.
 * @returns Whether it is one.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Checks the heading feature's `enabledHeadingSizes`: a list of `h1` to `h6`.
 *
 * @param sizes - The levels the feature was given.
 * @param path - Where the feature sits, for error messages.
 * @returns The levels.
 * @throws When they are not such a list.
 */
const validateHeadingSizes = (
  sizes: unknown,
  path: string
): RichTextHeading[] => {
  if (
    !Array.isArray(sizes) ||
    !sizes.every((size) => RICH_TEXT_HEADINGS.includes(size))
  ) {
    throw buildConfigError(
      `${path}: "enabledHeadingSizes" must be a list of h1 to h6`
    )
  }

  return sizes
}

/**
 * Resolves the heading feature's `enabledHeadingSizes`: in order, each once, all six when left out.
 *
 * @param sizes - The levels the feature was given.
 * @param path - Where the feature sits, for error messages.
 * @returns The levels.
 * @throws When the levels are not a list of `h1` to `h6`.
 */
const prepareHeadingSizes = (
  sizes: unknown,
  path: string
): RichTextHeading[] => {
  if (sizes === undefined) {
    return [...RICH_TEXT_HEADINGS]
  }

  const given = validateHeadingSizes(sizes, path)

  return RICH_TEXT_HEADINGS.filter((size) => given.includes(size))
}

/**
 * Checks one feature: a built-in feature's key, and props that are an object when it gives any.
 *
 * @param feature - The feature, as the config gives it.
 * @param path - Where the list sits, for error messages.
 * @returns Its key, its props, and its place for the messages of its options.
 * @throws When the key is not a built-in feature's, or its props are not an object.
 */
const validateFeature = (
  feature: unknown,
  path: string
): {
  key: RichTextFeatureKey
  props: Record<string, unknown>
  where: string
} => {
  if (
    !isPlainObject(feature) ||
    !FEATURE_KEYS.includes(feature.key as RichTextFeatureKey)
  ) {
    throw buildConfigError(
      `${path}: "features" must hold the plugin's features, such as BoldFeature(); their keys are ${FEATURE_KEYS.join(", ")}`
    )
  }

  const key = feature.key as RichTextFeatureKey
  const where = `${path}: the "${key}" feature`
  const props = feature.props ?? {}

  if (!isPlainObject(props)) {
    throw buildConfigError(`${where}: its props must be an object`)
  }

  return { key, props, where }
}

/**
 * Resolves one feature: a known key, props an object, and every option filled with the feature's own
 * default.
 *
 * @param feature - The feature, as the config gives it.
 * @param path - Where the list sits, for error messages.
 * @returns The feature, resolved.
 * @throws When the key is not a built-in feature's, its props are not an object, or an option cannot
 * be used.
 */
const prepareRichTextFeature = (
  feature: unknown,
  path: string
): ResolvedRichTextFeature => {
  const { key, props, where } = validateFeature(feature, path)

  switch (key) {
    case "heading":
      return {
        key,
        props: {
          enabledHeadingSizes: prepareHeadingSizes(
            props.enabledHeadingSizes,
            where
          ),
        },
      }
    case "link":
      return {
        key,
        props: {
          linkPolicy: prepareLinkPolicy(
            props.linkPolicy as Partial<LinkPolicy> | undefined,
            DEFAULT_LINK_POLICY,
            where
          ),
        },
      }
    default:
      return { key, props: {} }
  }
}

/**
 * Checks that the features are a list.
 *
 * @param features - The list, as the config or its function gives it.
 * @param path - Where the list sits, for error messages.
 * @returns The list.
 * @throws When the value is not a list.
 */
const validateFeatureList = (features: unknown, path: string): unknown[] => {
  if (!Array.isArray(features)) {
    throw buildConfigError(
      `${path}: "features" must be a list of features, such as [BoldFeature(), LinkFeature()]`
    )
  }

  return features
}

/**
 * Resolves a list of features: each resolved, and of two with one key the last kept, at its own
 * position.
 *
 * @param features - The list, as the config or its function gives it.
 * @param path - Where the list sits, for error messages.
 * @returns The features, resolved.
 * @throws When the value is not a list, or a feature cannot be used.
 */
const prepareRichTextFeatureList = (
  features: unknown,
  path: string
): ResolvedRichTextFeature[] => {
  const resolved = validateFeatureList(features, path).map((feature) =>
    prepareRichTextFeature(feature, path)
  )

  return resolved.filter(
    (feature, index) =>
      !resolved.slice(index + 1).some((later) => later.key === feature.key)
  )
}

/**
 * Resolves the `features` of the config's `richText` or of a `richtext` field: a list, or a function of
 * the params, run once, each feature resolved; the fallback when left out. The function gets a copy of
 * the params, so it cannot change them.
 *
 * @param features - The `features`, or nothing to take the fallback.
 * @param params - What a `features` function gets: `defaultFeatures`, and at a field `rootFeatures`.
 * @param fallback - The features when it is left out.
 * @param path - Where the `features` sit, for error messages.
 * @returns The features, resolved.
 * @throws When a function throws or returns anything but a list, or a feature cannot be used.
 */
export const prepareRichTextFeatures = <
  TParams extends Record<string, ResolvedRichTextFeature[]>,
>(
  features: ConfigValue<RichTextFeature[], TParams> | undefined,
  params: TParams,
  fallback: ResolvedRichTextFeature[],
  path: string
): ResolvedRichTextFeature[] => {
  if (features === undefined) {
    return fallback
  }

  const list: unknown = prepareConfigValue(
    features,
    structuredClone(params),
    `${path}: the "features" function`
  )

  return prepareRichTextFeatureList(list, path)
}
