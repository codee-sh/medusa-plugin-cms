import type {
  ClientText,
  FieldConfig,
  LayoutSectionConfig,
  FieldOption,
  FieldStoreConfig,
  FieldTransform,
  FieldValidation,
  OptionsHookSource,
} from "../config/types"
import type { CmsMediaStore } from "../media-provider/types"
import type { LinkPolicy } from "../../shared/sanitize/link-policy"
import type { ResolvedRichTextFeature } from "../../shared/rich-text/types"

export type FieldKind =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "combobox"
  | "text_list"
  | "slug"
  | "media"
  | "url"
  | "richtext"
  | "relationship"

/** A field's config that takes one of its options: a select or a combobox. */
export type OptionsFieldConfig = Extract<
  FieldConfig,
  { type: "select" | "combobox" }
>

/** A `media` field's config. */
export type MediaFieldConfig = Extract<FieldConfig, { type: "media" }>

/** A field's config that may hold several values: a media field or a combobox. */
export type MultipleValuesFieldConfig = Extract<
  FieldConfig,
  { type: "media" | "combobox" }
>

/** The keys of a field's or a model's config that hold a schema. */
export type ValidationKey = "serverValidation" | "serverPublishValidation"

/**
 * A field as the Admin reads it. The registry holds its texts as `ClientText`; a screen reads them as
 * strings, once the Admin translated them, which is the default.
 */
export type Field<TText = string> = {
  name: string
  kind: FieldKind
  label: TText
  /** What the field does in the store API, as its config's `store` says. */
  store?: FieldStoreConfig
  description?: TText
  /**
   * When the field must be filled, as its schemas say: `always` at every save, `publish` at a publish;
   * left out when it may stay empty.
   */
  required?: "always" | "publish"
  searchable: boolean
  input?: "textarea"
  /** The length past which a text field's counter warns. */
  recommendedLength?: number
  /** The text field whose value a text field shows as its placeholder while it is empty. */
  placeholderFrom?: string
  /**
   * A select's or a combobox's options, as its config lists them, or, for a combobox or a relationship,
   * the hook of the host's Admin that gives them.
   */
  options?: FieldOption<TText>[] | OptionsHookSource
  /** The source column of a slug. */
  from?: string
  /** The collection a relationship's id names a document of. */
  relationTo?: string
  /**
   * How a slug is built from its source: `default` is `normalizeSlug`, which the Admin can run too;
   * `custom` is the config's own `serverTransform`, which runs on the server only.
   */
  transform?: "default" | "custom"
  /** Whether the document page shows a slug locked until the editor unlocks it. */
  lockOnEdit?: boolean
  /** What a media field's column holds for a record: its id or its URL. */
  stores?: CmsMediaStore
  /** The MIME types a media field's picker offers and takes, exact or `type/*`. */
  mimeTypes?: string[]
  /** Whether a media field or a combobox holds several values, on an array column. */
  multiple?: boolean
  /** The most values a `multiple` media field or combobox holds; no limit when left out. */
  max?: number
  /** The links a `url` field takes, its own `linkPolicy` resolved over the config's. */
  linkPolicy?: LinkPolicy
  /** The features a `richtext` field allows, its own or the config's `richText.features`, resolved. */
  features?: ResolvedRichTextFeature[]
}

/** A field of the registry, its texts prepared: strings or translations for the Admin. */
export type RegistryField = Field<ClientText>

/**
 * A field as code that reads none of its texts takes it, so the registry's fields and the Admin's, whose
 * texts are strings, both fit.
 */
export type AnyField = Field<unknown>

/** What every field of a config falls back to where its own config is silent. */
export type FieldDefaults = {
  /** The config's `linkPolicy`, resolved over the default policy: what every `url` field falls back to. */
  linkPolicy: LinkPolicy
  /**
   * The config's `richText.features`, resolved, or the built-in ones: a field's `rootFeatures`, and
   * its features when it sets none.
   */
  richTextFeatures: ResolvedRichTextFeature[]
}

/** A section of the Admin's form, with its position filled in. */
export type RegistryLayoutSection<TText = ClientText> =
  LayoutSectionConfig<TText> & {
    position: "main" | "side"
  }

/** A field's schemas, run on the server only: `save` at every save, `publish` besides it at a publish. */
export type FieldSchemas = {
  /** The config's `serverValidation`. */
  save?: FieldValidation
  /** The config's `serverPublishValidation`. */
  publish?: FieldValidation
}

/** A model's schemas, run on the server only: each field's own, and the model's over its fields together. */
export type ModelSchemas = {
  /** Per field with any, its schemas. */
  fields: Record<string, FieldSchemas>
  /** The model's `serverValidation` and `serverPublishValidation`, which get all its fields at once. */
  model: FieldSchemas
}

/** A model's fields, with what the server keeps of their config and the Admin never sees. */
export type PreparedFields<TText = ClientText> = {
  fields: Field<TText>[]
  /** Per slug field, the function that builds its slug: the config's `serverTransform`, or `normalizeSlug`. */
  slugTransforms: Record<string, FieldTransform>
  schemas: ModelSchemas
}
