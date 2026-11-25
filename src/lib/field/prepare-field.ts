import { prepareCmsText } from "../config/prepare-cms-text"
import type {
  ClientText,
  FieldConfig,
  FieldOption,
  OptionsHookSource,
} from "../config/types"
import type { ModelColumn } from "../model/types"
import { FIELD_TYPES } from "./field-types"
import { isOptionsHookSource } from "./is-options-hook-source"
import { prepareLinkPolicy } from "./prepare-link-policy"
import { prepareRichTextFeatures } from "./prepare-rich-text-features"
import { DEFAULT_RICH_TEXT_FEATURES } from "../../shared/rich-text/features/default-rich-text-features"
import type { FieldDefaults, RegistryField } from "./types"

/** The MIME types a media field's picker takes when its config names none: JPG, PNG and WebP. */
const DEFAULT_MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Prepares the labels of a select's or a combobox's listed options; a hook's options are the host's to
 * translate.
 *
 * @param options - The field's options.
 * @param translationNs - The config's `admin.translationNs`.
 * @param where - The field's place, for error messages.
 * @returns The options, their labels prepared.
 */
const prepareFieldOptions = (
  options: FieldOption[] | OptionsHookSource,
  translationNs: string | undefined,
  where: string
): FieldOption<ClientText>[] | OptionsHookSource =>
  isOptionsHookSource(options)
    ? options
    : options.map((option) => ({
        ...option,
        label: prepareCmsText(
          option.label,
          translationNs,
          `${where} option "${option.value}" label`
        ),
      }))

/**
 * Describes a column as a field, its texts prepared.
 *
 * @param column - The column.
 * @param override - The field's config.
 * @param defaults - What the config gives every field.
 * @param translationNs - The config's `admin.translationNs`.
 * @param path - Where the config sits, for error messages.
 * @returns The field.
 * @throws At a `url` field whose `linkPolicy` cannot be used, or a `richtext` field whose features
 * cannot.
 */
export const prepareField = (
  column: ModelColumn,
  override: FieldConfig,
  defaults: FieldDefaults,
  translationNs: string | undefined,
  path: string
): RegistryField => ({
  name: column.name,
  kind: FIELD_TYPES[override.type].kind,
  label: prepareCmsText(
    override.label,
    translationNs,
    `${path}: field "${column.name}" label`
  ),
  ...(override.store && { store: override.store }),
  description:
    override.admin?.description === undefined
      ? undefined
      : prepareCmsText(
          override.admin.description,
          translationNs,
          `${path}: field "${column.name}" description`
        ),
  searchable: column.searchable,
  input: override.type === "textarea" ? "textarea" : undefined,
  ...((override.type === "text" || override.type === "textarea") && {
    recommendedLength: override.admin?.recommendedLength,
    placeholderFrom: override.admin?.placeholderFrom,
  }),
  options:
    override.type === "select" || override.type === "combobox"
      ? prepareFieldOptions(
          override.options,
          translationNs,
          `${path}: field "${column.name}"`
        )
      : override.type === "relationship"
        ? override.options
        : undefined,
  ...(override.type === "relationship" && { relationTo: override.relationTo }),
  from: override.type === "slug" ? override.from : undefined,
  transform:
    override.type === "slug"
      ? override.serverTransform
        ? "custom"
        : "default"
      : undefined,
  lockOnEdit:
    override.type === "slug" ? override.admin?.lockOnEdit !== false : undefined,
  ...(override.type === "media" && {
    stores: override.stores,
    mimeTypes: override.admin?.mimeTypes ?? DEFAULT_MEDIA_MIME_TYPES,
    multiple: Boolean(override.multiple),
    max: override.max,
  }),
  ...(override.type === "combobox" && {
    multiple: Boolean(override.multiple),
    max: override.max,
  }),
  ...(override.type === "url" && {
    linkPolicy: prepareLinkPolicy(
      override.linkPolicy,
      defaults.linkPolicy,
      `${path}: field "${column.name}"`
    ),
  }),
  ...(override.type === "richtext" && {
    features: prepareRichTextFeatures(
      override.features,
      {
        defaultFeatures: DEFAULT_RICH_TEXT_FEATURES,
        rootFeatures: defaults.richTextFeatures,
      },
      defaults.richTextFeatures,
      `${path}: field "${column.name}"`
    ),
  }),
})
