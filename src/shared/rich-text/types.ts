import type { LinkPolicy } from "../sanitize/link-policy"

/** A heading level a rich text field may offer. */
export type RichTextHeading = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

/** The props of a feature that takes no option. */
type NoProps = Record<string, never>

/** Per feature key, the options its factory takes; each left out takes the feature's own default. */
export type RichTextFeatureProps = {
  bold: NoProps
  italic: NoProps
  heading: {
    /** The heading levels the field offers; `h1` to `h6` when left out. */
    enabledHeadingSizes?: RichTextHeading[]
  }
  unorderedList: NoProps
  orderedList: NoProps
  blockquote: NoProps
  link: {
    /**
     * The links the field takes, each key replacing the default policy's - `http`, `https`, `mailto`,
     * `tel` and relative links. The config's `linkPolicy` is the `url` fields' and does not reach it.
     */
    linkPolicy?: Partial<LinkPolicy>
  }
}

/** Per feature key, its options as the registry resolves them, every one filled. */
export type ResolvedRichTextFeatureProps = {
  bold: NoProps
  italic: NoProps
  heading: { enabledHeadingSizes: RichTextHeading[] }
  unorderedList: NoProps
  orderedList: NoProps
  blockquote: NoProps
  link: { linkPolicy: LinkPolicy }
}

/** The key of a built-in rich text feature. */
export type RichTextFeatureKey = keyof RichTextFeatureProps

/** A feature of one key, as its factory returns it. */
export type RichTextFeatureOf<TKey extends RichTextFeatureKey> = {
  key: TKey
  props?: RichTextFeatureProps[TKey]
}

/** A feature of one key, its options resolved. */
export type ResolvedRichTextFeatureOf<TKey extends RichTextFeatureKey> = {
  key: TKey
  props: ResolvedRichTextFeatureProps[TKey]
}

/**
 * A named part of the rich text editor and of the check of its documents, with its options, as a
 * factory such as `HeadingFeature({ enabledHeadingSizes: ["h2"] })` returns it.
 */
export type RichTextFeature = {
  [TKey in RichTextFeatureKey]: RichTextFeatureOf<TKey>
}[RichTextFeatureKey]

/** A rich text feature as the registry resolves it: every option filled. */
export type ResolvedRichTextFeature = {
  [TKey in RichTextFeatureKey]: ResolvedRichTextFeatureOf<TKey>
}[RichTextFeatureKey]

/**
 * What the check of a document and the editor read for a feature's key: the nodes it registers, the
 * text format it adds, and the check of its own nodes against its options.
 */
export type RichTextFeatureDefinition<
  TKey extends RichTextFeatureKey = RichTextFeatureKey,
> = {
  key: TKey
  /** The node types it registers; none for a text format. */
  nodeTypes: string[]
  /**
   * Whether a node of its types is its own; every one when left out. A `list` is the feature of its
   * `listType`.
   *
   * @param node - The node.
   * @returns Whether the feature owns it.
   */
  ownsNode?: (node: RichTextNode) => boolean
  /** The bit it sets in a text node's `format`, as Lexical numbers them. */
  formatBit?: number
  /** The message of a node of its own in a field without the feature. */
  missingMessage?: string
  /**
   * Finds why the feature's options refuse a node of its own.
   *
   * @param node - The node.
   * @param props - The feature's resolved options.
   * @returns Why the node is refused; none for a node the feature takes.
   */
  findNodeErrors?: (
    node: RichTextNode,
    props: ResolvedRichTextFeatureProps[TKey]
  ) => string[]
}

/**
 * A node of a rich text document, as Lexical serializes it: its `type`, the keys of that type, and the
 * nodes it holds when it is an element.
 */
export type RichTextNode = {
  type: string
  children?: RichTextNode[]
  [key: string]: unknown
}

/** A rich text document, as Lexical serializes its editor's state. */
export type RichTextDocument = {
  root: RichTextNode & { type: "root"; children: RichTextNode[] }
}

/** What a rich text field allows: its features, each with its options. */
export type RichTextSettings = {
  features: ResolvedRichTextFeature[]
}

/** Why a document is refused, at the node that breaks a rule. */
export type RichTextError = {
  /** The keys from the document to the node, e.g. `["root", "children", 0]`. */
  path: (string | number)[]
  message: string
}
