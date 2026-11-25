import type { ResolvedRichTextFeature, RichTextFeatureKey } from "./types"

/**
 * Finds a field's feature of one key, with its options.
 *
 * @param features - The field's resolved features.
 * @param key - The feature's key.
 * @returns The feature, or nothing when the field lacks it.
 */
export const findRichTextFeature = <TKey extends RichTextFeatureKey>(
  features: ResolvedRichTextFeature[],
  key: TKey
): Extract<ResolvedRichTextFeature, { key: TKey }> | undefined =>
  features.find(
    (feature): feature is Extract<ResolvedRichTextFeature, { key: TKey }> =>
      feature.key === key
  )
