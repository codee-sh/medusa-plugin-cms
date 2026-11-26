import type { MedusaContainer, QueryConfig } from "@medusajs/framework/types"
import type { DmlEntity } from "@medusajs/framework/utils"
import type { z } from "@medusajs/framework/zod"
import type { AbstractCmsMediaProvider } from "../media-provider/abstract-media-provider"
import type { CmsMediaStore } from "../media-provider/types"
import type { LinkPolicy } from "../../shared/sanitize/link-policy"
import type {
  ResolvedRichTextFeature,
  RichTextFeature,
} from "../../shared/rich-text/types"

/** A DML model of the host project, as `model.define()` returns it. */
export type DmlModel = DmlEntity<any, any>

/**
 * A Zod schema a field's value must pass, e.g. `z.string().min(3)`. It gets a value of the field's type
 * - a date as its ISO text - or `null` for an empty one, so it also says whether the field must be
 * filled: a schema that refuses `null` makes the field required, `.nullish()` lets it stay empty. An
 * empty value it refuses shows `Required`, unless the schema gives its own message, as
 * `z.string({ error: "Add a title" })`. It runs on the server only: on a save, and when the Admin asks to
 * validate a document.
 */
export type FieldValidation = z.ZodType

/**
 * A Zod object schema over a model's own fields together, e.g. a `z.object({ cta_label, cta_href })` with
 * a `.superRefine()` that needs both. It gets every field of the model by name - an empty value as
 * `null`, a date as its ISO text - once each field passed its own schemas, and never another model's
 * fields. An issue's path names the field its error is shown at; any other path is the model's own
 * error. It runs on the server only, synchronously: it reads no data.
 */
export type ModelValidation = z.ZodType

/**
 * A config value, or a function of the params the plugin gives it, run once on the server at start; the
 * registry keeps what it returns, which may differ from the value's type. A key whose value is itself a
 * function, such as `serverTransform`, cannot take this form: a function is always read as the one to
 * call at start.
 */
export type ConfigValue<TValue, TParams, TResult = TValue> =
  TValue | ((params: TParams) => TResult)

/**
 * A value the plugin has a default for: a value, which replaces the defaults, or a function given them
 * under the name the key states, as `({ defaultFeatures }) => defaultFeatures.filter(...)`, which gets a
 * copy and cannot change them.
 */
export type DefaultsValue<T, TName extends string> = ConfigValue<
  T,
  Record<TName, T>
>

/** i18next's options a translation carries, such as `context`, `count` or a value it interpolates. */
export type TranslationOptions = Record<string, string | number | boolean>

/**
 * A text the Admin translates in the editor's language: a key of an i18next namespace, with i18next's
 * options. Only `t` makes one; the Admin resolves it as `t(key, { ...options, ns })`.
 */
export type TranslatedText = {
  type: "translation"
  key: string
  ns: string
  options?: TranslationOptions
}

/**
 * Names a translation. `options.ns` names its namespace - any, Medusa's `translation` included, as a
 * text only reads it; left out, it is the config's `admin.translationNs`.
 */
export type CmsTranslate = (
  key: string,
  options?: TranslationOptions & { ns?: string }
) => TranslatedText

/**
 * A text of the config the Admin shows: a string, shown as written in every language, or a function given
 * `{ t }`, which returns a string or a translation, e.g. `({ t }) => t("page.singular")`.
 */
export type CmsText = ConfigValue<
  string,
  { t: CmsTranslate },
  string | TranslatedText
>

/** A text of the config once the registry prepared it: a string, or a translation for the Admin. */
export type ClientText = string | TranslatedText

/**
 * How a field looks and behaves while it is edited. The Admin alone reads it: the server never checks a
 * value against it, so nothing here changes what a save accepts.
 */
export type FieldAdminConfig = {
  /** Help shown under the field's label. */
  description?: CmsText
}

/**
 * A field's config. Its top-level keys decide what is saved: the server enforces the data rules -
 * `type`, `options`, `multiple`, `max`, `features` - and the Admin mirrors them; a function -
 * `serverValidation`, `serverPublishValidation`, `serverTransform` - runs on the server only, and the
 * schemas also say whether the field must be filled; Admin code is named, never written here -
 * `options: { hook }`. `admin` holds hints for the editor only.
 */
type FieldBase = {
  /** The field's label in the Admin. */
  label: CmsText
  /**
   * The schema every save checks the field with, a draft's or a publish's. One that refuses `null`
   * makes the field required at every save, which a column the database requires needs; left out,
   * the field may stay empty. The Admin marks a required field and shows the schema's messages from the
   * validation it asks for while the editor types. A rule the Admin must act on - a limit it enforces
   * in the input - is a data rule instead, such as `max`.
   */
  serverValidation?: FieldValidation
  /**
   * The schema a publish checks the field with, beside `serverValidation`; a draft saves without it.
   * One that refuses `null` makes the field required to publish, e.g. `z.string()` on a slug.
   */
  serverPublishValidation?: FieldValidation
  admin?: FieldAdminConfig
  store?: FieldStoreConfig
}

/**
 * What a field does in the store API, as its `admin` holds what it does in the Admin: a collection's
 * field and a block's alike.
 */
export type FieldStoreConfig = {
  /**
   * Keeps the field out of every store answer: a client cannot select it with `fields`, and a block's
   * field is left out of its area. A field is public when left out.
   */
  hidden?: true
  /**
   * Makes the field a query parameter of the collection's store list, matching its value:
   * `?vegan=true`. A collection's field only, a public one, and a boolean.
   */
  filterable?: true
}

/** A field whose type says all there is: its input and the kind of column it needs. */
type PlainField = FieldBase & {
  /**
   * `number` on a number column, `boolean` on a boolean, `date` on a date and time, `text_list` on an
   * array.
   */
  type: "number" | "boolean" | "date" | "text_list"
}

/** The editor's hints of a text field. */
export type TextFieldAdminConfig = FieldAdminConfig & {
  /**
   * Shows a character counter under the input, which warns past this number; a save is never refused
   * for it. A hard limit belongs in `serverValidation`. Unused when a component node draws the field.
   */
  recommendedLength?: number
  /**
   * Another `text` or `textarea` field of the same model whose current value the Admin shows as this
   * field's placeholder while this one is empty. A hint only: the empty value is what is saved. Unused
   * when a component node draws the field.
   */
  placeholderFrom?: string
}

/** A field of free text on a text column: `text` in one line, `textarea` in several. */
type TextField = FieldBase & {
  type: "text" | "textarea"
  admin?: TextFieldAdminConfig
}

/** One choice of a select field. */
export type FieldOption<TText = CmsText> = {
  /** What is stored. */
  value: string
  /** What the Admin shows. */
  label: TText
}

/**
 * Options a hook of the host's Admin gives, registered under this name with `defineCmsOptionsHook` from
 * `@mostrajs/cms/admin-extensions`. The server checks only that the value is a
 * text.
 */
export type OptionsHookSource = {
  hook: string
}

/** A field that takes one of the few options its config lists, picked from a dropdown. */
type SelectField = FieldBase & {
  type: "select"
  options: FieldOption[]
}

/**
 * A field that takes its options searched as the editor types: the ones its config lists, or the ones a
 * hook gives, page by page. One value on a text column - or an enum one, for listed options - or several
 * on an array column with `multiple`.
 */
type ComboboxField = FieldBase & {
  type: "combobox"
  options: FieldOption[] | OptionsHookSource
  /** Several values, on an array column, in the order the editor chose them. */
  multiple?: boolean
  /** With `multiple`, the most values the field holds; the Admin offers no more once it holds them. */
  max?: number
}

/** Builds a field's value from the text of its `from` column; a slug's must pass the slug format. */
export type FieldTransform = (text: string) => string

/** The editor's hints of a slug field. */
export type SlugFieldAdminConfig = FieldAdminConfig & {
  /**
   * Shows the slug locked on the document page until the editor unlocks it, so a document's URL does
   * not change by mistake; `true` when left out. The server takes a changed slug either way.
   */
  lockOnEdit?: boolean
}

type SlugField = FieldBase & {
  type: "slug"
  /** The text column the slug is built from. */
  from: string
  /**
   * Builds the slug from the source, on the server only; `normalizeSlug` when left out, which the Admin
   * also runs to show the slug while the editor types.
   */
  serverTransform?: FieldTransform
  admin?: SlugFieldAdminConfig
}

/**
 * The editor's hints of a media field.
 */
export type MediaFieldAdminConfig = FieldAdminConfig & {
  /**
   * The MIME types the picker offers and takes, exact or `type/*`; JPG, PNG and WebP when left out. They
   * narrow the media provider's `mimeTypes`, which the server enforces on upload; the server does not
   * check them on a save, as a stored file need not carry its type.
   */
  mimeTypes?: string[]
}

/**
 * A file, or several, from the media provider: one on a text column, several on an array column with
 * `multiple`. A read returns each record in place of its value.
 */
type MediaField = FieldBase & {
  type: "media"
  /** What the column holds for a record: its id or its URL. The provider must be able to read it back. */
  stores: CmsMediaStore
  /** Several files, on an array column, in the array's order. */
  multiple?: boolean
  /** With `multiple`, the most files the field holds. */
  max?: number
  admin?: MediaFieldAdminConfig
}

/**
 * A link on a text column, checked against a link policy: the field's own `linkPolicy` over the config's,
 * over the default - `http`, `https`, `mailto`, `tel` and relative links.
 */
type UrlField = FieldBase & {
  type: "url"
  /** The links this field takes, each key replacing the config's `linkPolicy`. */
  linkPolicy?: Partial<LinkPolicy>
}

/**
 * Formatted text on a text column, edited with a rich text editor: the column holds the editor's
 * document as JSON, and a read returns the document as an object. What it allows comes from its own
 * `features`, or the config's `richText.features`; its links follow the link feature's `linkPolicy`,
 * not the config's, which is the `url` fields'.
 */
type RichTextField = FieldBase & {
  type: "richtext"
  /**
   * The features the field offers and a save accepts, written with the plugin's factories: a list,
   * which replaces the config's, or a function, run once at start, of `defaultFeatures`, the built-in
   * ones, and `rootFeatures`, the config's `richText.features`, e.g. `({ rootFeatures }) =>
   * [...rootFeatures.filter((feature) => feature.key !== "heading"), HeadingFeature({
   * enabledHeadingSizes: ["h2"] })]`. Of two features with one key, the last wins.
   */
  features?: ConfigValue<
    RichTextFeature[],
    {
      defaultFeatures: ResolvedRichTextFeature[]
      rootFeatures: ResolvedRichTextFeature[]
    }
  >
}

/**
 * A document of another registered collection, on a `belongsTo`'s foreign key: the field's key is the
 * key, e.g. `homepage_id` of a `homepage` relation. Every write checks that the id names a live document
 * of `relationTo`, a draft included.
 */
type RelationshipField = FieldBase & {
  type: "relationship"
  /** The slug of the collection the relation's model is registered under. */
  relationTo: string
  /**
   * The hook of the host's Admin whose options draw the field as a combobox; left out, the Admin draws
   * a text input. The server checks the value as a relation either way.
   */
  options?: OptionsHookSource
}

/**
 * A field of a model's form: its type and label are always given, and nothing about it is read from the
 * model, which is only checked against it.
 */
export type FieldConfig =
  | PlainField
  | TextField
  | SelectField
  | ComboboxField
  | SlugField
  | MediaField
  | UrlField
  | RichTextField
  | RelationshipField

export type Labels<TText = CmsText> = { singular: TText; plural: TText }

/** Fields side by side in the Admin's form; it stores nothing. */
export type LayoutRowConfig = {
  type: "row"
  /** At least two field names, in the order shown. */
  fields: string[]
}

/** Fields under one label in the Admin's form; it only groups them and stores nothing. */
export type LayoutGroupConfig<TText = CmsText> = {
  type: "group"
  label: TText
  description?: TText
  fields: (string | LayoutRowConfig | LayoutComponentConfig<TText>)[]
}

/**
 * Fields a host's component edits together in the Admin's form: the component registered with
 * `defineCmsFieldComponent` under its name draws every input, label and error of the fields it owns,
 * and hands back one value per field, which a save checks by its type. It stores nothing itself.
 */
export type LayoutComponentConfig<TText = CmsText> = {
  type: "component"
  /** The name the component is registered under. */
  component: string
  /**
   * The fields, neither a slug nor a media, each without a component of its own: a list, each handed
   * under its own name, or an object of the component's keys to field names, each handed under its key.
   */
  fields: string[] | Record<string, string>
  /** A header over a node of several fields, drawn as a group's; a node of one field shows the field's label. */
  label?: TText
  description?: TText
}

/** Fields under a header the editor opens and closes in the Admin's form; it stores nothing. */
export type LayoutCollapsibleConfig<TText = CmsText> = {
  type: "collapsible"
  label: TText
  description?: TText
  /** Closed when the form opens; open when left out. */
  initCollapsed?: boolean
  fields: (
    | string
    | LayoutGroupConfig<TText>
    | LayoutRowConfig
    | LayoutComponentConfig<TText>
  )[]
}

/** One tab of a section's tabs: the fields shown while it is open. */
export type LayoutTabConfig<TText = CmsText> = {
  label: TText
  description?: TText
  fields: (
    | string
    | LayoutGroupConfig<TText>
    | LayoutRowConfig
    | LayoutCollapsibleConfig<TText>
    | LayoutComponentConfig<TText>
  )[]
}

/** Tabs inside a section, showing one tab's fields at a time; it stores nothing. */
export type LayoutTabsConfig<TText = CmsText> = {
  type: "tabs"
  /** At least two tabs, the first one open. */
  tabs: LayoutTabConfig<TText>[]
}

/** What a section lays out: a field's name, or a node holding names. */
export type LayoutItemConfig<TText = CmsText> =
  | string
  | LayoutGroupConfig<TText>
  | LayoutRowConfig
  | LayoutCollapsibleConfig<TText>
  | LayoutTabsConfig<TText>
  | LayoutComponentConfig<TText>

/** A section of the Admin's form that lays the document's fields and areas out; it stores nothing. */
export type LayoutSectionConfig<TText = CmsText> = {
  /** The name the section goes by, unique among the collection's sections. */
  key: string
  /**
   * The section's heading. A section without one draws its fields with no heading, such as the one
   * section of a small form; a singleton's sections need one, as it titles their card and drawer.
   */
  label?: TText
  description?: TText
  /** The fields of the section and the nodes that hold them, in the order shown. */
  fields: LayoutItemConfig<TText>[]
  /** The areas shown in the section after its fields; a section needs a field or an area. */
  areas?: string[]
  /** `main`, the form's main column, or `side`, the column beside it; `main` when left out. */
  position?: "main" | "side"
}

/** A section of a block's card, under the card's other fields: it holds fields only. */
export type LayoutBlockSectionConfig<TText = CmsText> = Omit<
  LayoutSectionConfig<TText>,
  "key" | "areas" | "position" | "label"
> & { label: TText }

/** A column of a collection's documents table in the Admin. */
export type CmsTableColumn<TText = CmsText> =
  /**
   * A field's value, drawn by its type: a select by its option's label, a relationship by its target's
   * title. `label` defaults to the field's; the column sorts unless `sortable` is `false`.
   */
  | { field: string; label?: TText; sortable?: boolean }
  /** A column of the plugin's own; `label` defaults to the plugin's. */
  | {
      system:
        "id" | "status" | "published_version" | "created_at" | "updated_at"
      label?: TText
    }

/**
 * A collection on a route's page, with its place there: a list as its table, its heading and its
 * settings, the collection's `admin.table` keys, given here for this page; a singleton as its sections,
 * in their own columns, so it takes neither `position`, a heading nor table settings.
 *
 * @example
 * { collection: "page_settings_segment", key: "homepages", pageSize: 20 }
 */
export type CmsRouteEntryConfig<TText = CmsText> = Partial<
  CmsTableConfig<TText>
> & {
  collection: string
  /**
   * The entry's name on the page, its table's address `/cms/<route>/tables/<key>`: the collection's
   * slug when left out, unique among the page's tables.
   */
  key?: string
  /** A list's column: `main`, by default, or `side`. */
  position?: "main" | "side"
  /** A list's table heading on the page; its collection's plural label when left out. */
  label?: TText
  /** A list's table description on the page; its collection's description when left out. */
  description?: TText
}

/** A collection on a route's page: its slug, or its place and table there. */
export type CmsRouteEntry = string | CmsRouteEntryConfig

/**
 * A page of the Admin, a node of `admin.routes`: the `collections` its page shows, each drawn as its kind
 * does, a list as its table and a singleton as its sections, each on one route at most. Its name is its
 * `label`, which a route of several collections needs and a route of one takes from its collection's
 * page label when left out.
 *
 * @example
 * { slug: "pages", collections: ["page"] }
 *
 * @example
 * {
 *   slug: "site",
 *   label: "Site",
 *   collections: ["page_settings", { collection: "page_settings_segment", pageSize: 20 }],
 * }
 */
export type CmsRoute = {
  /**
   * The page's address, `/cms/<slug>`, its documents at `/cms/<slug>/<collection>/<id>`: snake_case,
   * unique among the routes.
   */
  slug: string
  /** The collections the page shows, in order: one at least. */
  collections: CmsRouteEntry[]
  label?: CmsText
  description?: CmsText
  /**
   * Pages under this one, in this one's breadcrumbs' place: on a route of one list, buttons of its
   * table's header; on any other, a list under its collections.
   */
  children?: CmsRoute[]
}

/** A collection's documents table in the Admin: exactly its columns, in order. */
export type CmsTableConfig<TText = CmsText> = {
  /** Exactly the columns shown, in order, each once. */
  columns: CmsTableColumn<TText>[]
  /** The order the table opens in: one of its columns that sorts. */
  defaultSort?: { column: string; direction: "asc" | "desc" }
  /** How many documents a page shows, from 1 to 100; the page's own size when left out. */
  pageSize?: number
  /**
   * The fields an editor may filter the table by, besides the status: `select` and `boolean` fields,
   * each once. A field named `q`, `order`, `status` or `offset` cannot be one, as the table keeps those
   * parameters in the URL beside its filters.
   *
   * @example
   * filters: ["vegan", "difficulty"]
   */
  filters?: string[]
}

/**
 * A button in the header of a list collection's table: the dashboard's **Create**, the page of a
 * collection under its page label, or any Admin path under a label of the config's own.
 */
export type CollectionAction<TText = CmsText> =
  | { type: "create" }
  | { type: "collection"; collection: string }
  /** The page of a route, under the route's label. */
  | { type: "route"; route: string }
  | {
      type: "link"
      /** A text of the config. */
      label: TText
      /** An Admin path, starting with `/`. */
      to: string
    }

/** The keys every content type shares. */
export type ContentTypeConfig = {
  /** snake_case; the name in the API and the Admin. */
  slug: string
  /** The DML model; the config's module must hold it under its name, e.g. `ContentPage`. */
  model: DmlModel
  labels: Labels
  fields?: Record<string, FieldConfig>
  /** The rule every save checks the model's fields with together, a draft's or a publish's. */
  serverValidation?: ModelValidation
  /** The rule a publish checks the model's fields with, beside `serverValidation`; a draft saves without it. */
  serverPublishValidation?: ModelValidation
}

export type AreaConfig<TText = CmsText> = {
  label: TText
  blocks: string[]
  minRows?: number
  maxRows?: number
}

/**
 * A collection's store routes, in the shape of Medusa's `QueryConfig`, as its own
 * `listProductQueryConfig` and `retrieveProductQueryConfig` are. What a client may select, `allowed`, is
 * not set here: it is every field without `store: { hidden: true }`, with the areas.
 */
export type CollectionStoreConfig = {
  /**
   * The list route. `defaults` are the fields it answers without `fields`, every public field but the
   * areas when left out, and never an area; `defaultLimit` its page size, 20 when left
   * out and at most 100.
   */
  list?: Pick<
    QueryConfig<unknown>,
    "defaults" | "defaultLimit" | "storeRelationsLimit"
  >
  /**
   * The id and slug routes. `defaults` are the fields one document answers without `fields`, every
   * public field and area when left out.
   */
  retrieve?: Pick<QueryConfig<unknown>, "defaults" | "storeRelationsLimit">
}

export type CollectionConfig = ContentTypeConfig & {
  /**
   * `true` turns drafts and versions on: a save keeps a draft and records a version, and **Publish**
   * makes it live. Left out, or `false`, a document is published when created and a save is live at
   * once, with no version recorded.
   */
  drafts?: boolean
  /**
   * `true` keeps the collection to one document, which cannot be deleted. A singleton has no areas and
   * no drafts.
   */
  singleton?: true
  /** `false` keeps the collection out of the store API; an object sets its store routes. */
  store?: false | CollectionStoreConfig
  admin: {
    /**
     * The field a document is titled by: its page's heading, the breadcrumbs, a drawer, a picker and a
     * relation's cell. It adds no column; a table that wants it lists it.
     */
    useAsTitle?: string
    /**
     * The collection's documents table. When left out: the `useAsTitle` field, or the `id` without
     * one, the status for a collection with drafts, and `updated_at`. A singleton takes none.
     *
     * @example
     * table: {
     *   columns: [
     *     { field: "title" },
     *     { field: "category_id", label: "Category" },
     *     { system: "updated_at" },
     *   ],
     *   defaultSort: { column: "title", direction: "asc" },
     *   pageSize: 50,
     * }
     */
    table?: CmsTableConfig
    /**
     * Where a row of the collection's tables is edited: `"page"`, its document's page, by default, or
     * `"drawer"`, a drawer over the table, saved live, which takes no drafts and no areas. A
     * singleton takes none; a collection with `"page"` needs a route in `admin.routes`, as its rows
     * open a page of its own.
     *
     * @example
     * edit: "drawer"
     */
    edit?: "page" | "drawer"
    description?: CmsText
    /**
     * The buttons in the header of the collection's table: a list, which replaces the defaults, or a
     * function of the defaults, run once at start - a `route` button per child of its route in
     * `admin.routes`, in order, then `create`.
     * A singleton takes none, as its page has no header.
     *
     * @example
     * actions: ({ defaultActions }) => [
     *   ...defaultActions,
     *   { type: "link", label: "Import", to: "/import-pages" },
     * ]
     */
    actions?: DefaultsValue<CollectionAction[], "defaultActions">
    /**
     * The sections of the collection's form, at least one: every field and every area sits in exactly
     * one of them. A document's page draws a card per section under its header, and a singleton a card
     * per section, each in its column, on the route that shows it. Other collections' tables stand on
     * routes, `admin.routes`, not here.
     *
     * @example
     * sections: [
     *   { key: "content", label: "Content", fields: ["title", "slug"], areas: ["sections"] },
     *   { key: "seo", label: "SEO", fields: ["seo_title"], position: "side" },
     * ]
     */
    sections: LayoutSectionConfig[]
  }
  areas?: Record<string, AreaConfig>
}

export type BlockConfig = ContentTypeConfig & {
  admin?: {
    /** Sections of the block's card; a field in none of them shows before them. */
    sections?: LayoutBlockSectionConfig[]
  }
  /**
   * Areas inside the block, by name, whose items are blocks of the types each lists. Each is stored as
   * an area row whose `parent_id` is the block's id; the block's model needs no relation for it.
   */
  areas?: Record<string, AreaConfig>
}

/** A media provider class, as the config names it: `FileMediaProvider`, or a project's own. */
export type MediaProviderClass = {
  new (
    container: MedusaContainer,
    options: Record<string, unknown>
  ): AbstractCmsMediaProvider
  identifier: string
  stores: CmsMediaStore[]
  validateOptions(options: Record<string, unknown>): void
  prototype: AbstractCmsMediaProvider
}

export type MediaConfig = {
  /** The provider media fields upload to and read from; there is no default. */
  provider: {
    resolve: MediaProviderClass
    /** Handed to the provider's `validateOptions` and constructor. */
    options?: Record<string, unknown>
  }
}

/** What every `richtext` field allows unless it sets its own. */
export type RichTextConfig = {
  /**
   * The features, written with the plugin's factories: a list, or a function, run once at start, of
   * `defaultFeatures`, the built-in ones - every feature, headings `h2` to `h4`, links by the default
   * link policy - which a field without `features` takes when this is left out. A link policy for every
   * rich text field goes here, in `LinkFeature({ linkPolicy })`.
   */
  features?: ConfigValue<
    RichTextFeature[],
    { defaultFeatures: ResolvedRichTextFeature[] }
  >
}

export type Config = {
  /** The module whose service holds every model of the config, so one service writes a document. */
  module: string
  collections: CollectionConfig[]
  /**
   * The block types areas may hold; none when left out. The area model needs no key: it is the target
   * of the `areas` relation of what holds areas and of each block's `area`.
   */
  blocks?: BlockConfig[]
  /** Needed by any media field. */
  media?: MediaConfig
  /** How many levels of areas a document can nest; 4 when left out. */
  maxDepth?: number
  /**
   * The links every `url` field takes unless it sets its own: `protocols`, the schemes before `:`, and
   * `relative`, links starting with `/`, `#` or `?`. `http`, `https`, `mailto`, `tel` and relative links
   * when left out; `javascript`, `data` and `vbscript` are never allowed. Rich text sets its own, in
   * `LinkFeature({ linkPolicy })`.
   */
  linkPolicy?: Partial<LinkPolicy>
  /** The features every `richtext` field allows unless it sets its own. */
  richText?: RichTextConfig
  versions?: {
    /** How many versions a document keeps, its latest and latest published always among them; 50. */
    maxPerDocument?: number
  }
  admin?: {
    /**
     * The i18next namespace a text's `t` names when it names none, filled by the project's
     * `src/admin/i18n/index.ts`. Not `translation`, Medusa's, nor `medusa-plugin-cms` or
     * `manager-form-fields`, the plugin's own.
     */
    translationNs?: string
    /**
     * The Admin's pages, as a tree: **Content** lists the top-level routes in order, and a route's
     * children sit under its page. Each route has its address, `/cms/<slug>`, and shows its
     * `collections`, each drawn as its kind does. A list of routes, or a
     * function of the default, run once at start. When left out, every collection is a top-level route
     * of its own slug, in config order. Every collection stands on exactly one route.
     *
     * @example
     * routes: [
     *   {
     *     slug: "pages",
     *     collections: ["page"],
     *     children: [
     *       {
     *         slug: "site",
     *         label: "Site",
     *         collections: ["page_settings", "page_settings_segment"],
     *       },
     *     ],
     *   },
     * ]
     */
    routes?: DefaultsValue<CmsRoute[], "defaultRoutes">
  }
}
