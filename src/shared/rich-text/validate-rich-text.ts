import { CONTROL_CHARACTERS_MESSAGE } from "../sanitize/build-text-schema"
import { hasControlCharacters } from "../sanitize/has-control-characters"
import { RICH_TEXT_FEATURE_DEFINITIONS } from "./features/rich-text-feature-definitions"
import { findRichTextFeature } from "./find-rich-text-feature"
import { isRichTextDocument } from "./is-rich-text-document"
import { listWords } from "./list-words"
import type {
  ResolvedRichTextFeature,
  RichTextError,
  RichTextFeatureDefinition,
  RichTextNode,
  RichTextSettings,
} from "./types"
import { UNREADABLE_NODE_MESSAGE } from "./unreadable-node-message"

type Path = RichTextError["path"]

/** The message of a value that is not a document at all. */
export const NOT_A_DOCUMENT_MESSAGE = "This value is not a rich text document"

const INLINE_TYPES = ["text", "linebreak", "link", "autolink"]

/**
 * Per node type, the types it may hold; a type missing here holds nothing. A type neither in
 * `PLAIN_TYPES` nor registered by a feature is refused wherever it sits.
 */
const CHILD_TYPES: Record<string, string[]> = {
  root: ["paragraph", "heading", "quote", "list"],
  paragraph: INLINE_TYPES,
  heading: INLINE_TYPES,
  quote: INLINE_TYPES,
  list: ["listitem"],
  listitem: [...INLINE_TYPES, "list"],
  link: ["text", "linebreak"],
  autolink: ["text", "linebreak"],
}

/** The node types every field takes, which no feature registers. */
const PLAIN_TYPES = ["paragraph", "text", "linebreak"]

/** Per node type features register, the message of a node of it no feature owns. */
const UNOWNED_NODE_MESSAGES: Record<string, string> = {
  list: "Use a bulleted or a numbered list",
}

/** Every built-in feature's definition. */
const DEFINITIONS = Object.values(
  RICH_TEXT_FEATURE_DEFINITIONS
) as RichTextFeatureDefinition[]

/** The text formats Lexical numbers, by their bit in a text node's `format`. */
const FORMAT_NAMES: [number, string][] = [
  [1, "bold"],
  [2, "italic"],
  [4, "strikethrough"],
  [8, "underline"],
  [16, "code"],
  [32, "subscript"],
  [64, "superscript"],
  [128, "highlight"],
  [256, "lowercase"],
  [512, "uppercase"],
  [1024, "capitalize"],
]

/** What checking one document reads at every node, and the errors it collects. */
type ValidationContext = {
  settings: RichTextSettings
  /** The bits of `format` the field's features allow. */
  allowedFormats: number
  errors: RichTextError[]
}

/**
 * Adds an error at a node.
 *
 * @param context - The check, with its errors.
 * @param path - The node's path.
 * @param message - Why the node is refused.
 */
const pushError = (
  context: ValidationContext,
  path: Path,
  message: string
): void => {
  context.errors.push({ path, message })
}

/**
 * Writes the message of a `format` holding bits the field does not allow, naming each format.
 *
 * @param bits - The refused bits.
 * @returns The message.
 */
const describeRefusedFormats = (bits: number): string => {
  const names = FORMAT_NAMES.filter(([bit]) => bits & bit).map(
    ([, name]) => name
  )

  return names.length
    ? `Remove the ${listWords(names, "and")} formatting: this field does not allow it`
    : "Remove the text formatting this field does not allow"
}

/**
 * Checks a `format` or a `textFormat`: a whole number, holding only the bits the field allows.
 *
 * @param context - The check, with its errors.
 * @param format - The value; nothing when the node leaves it out.
 * @param path - The node's path.
 */
const validateTextFormat = (
  context: ValidationContext,
  format: unknown,
  path: Path
): void => {
  if (format === undefined) {
    return
  }

  if (!Number.isInteger(format) || (format as number) < 0) {
    pushError(context, path, UNREADABLE_NODE_MESSAGE)
    return
  }

  const refused = (format as number) & ~context.allowedFormats

  if (refused) {
    pushError(context, path, describeRefusedFormats(refused))
  }
}

/**
 * Checks a `style` or a `textStyle`, which must be empty: a field takes no inline CSS.
 *
 * @param context - The check, with its errors.
 * @param style - The value; nothing when the node leaves it out.
 * @param path - The node's path.
 */
const validateTextStyle = (
  context: ValidationContext,
  style: unknown,
  path: Path
): void => {
  if (style !== undefined && style !== "") {
    pushError(context, path, "Remove the inline styles from the text")
  }
}

/**
 * Checks a text node: a text without control characters, the formats of the field's features only, and
 * no inline CSS.
 *
 * @param context - The check, with its errors.
 * @param node - The text node.
 * @param path - Its path.
 */
const validateTextNode = (
  context: ValidationContext,
  node: RichTextNode,
  path: Path
): void => {
  if (typeof node.text !== "string") {
    pushError(context, path, UNREADABLE_NODE_MESSAGE)
    return
  }

  if (hasControlCharacters(node.text, { multiline: true })) {
    pushError(context, path, CONTROL_CHARACTERS_MESSAGE)
  }

  validateTextFormat(context, node.format, path)
  validateTextStyle(context, node.style, path)
}

/**
 * Checks what every element carries: no alignment, no indent outside a list item, whose indent nests a
 * list, and the format and style of the text typed next within the field's features.
 *
 * @param context - The check, with its errors.
 * @param node - The element.
 * @param path - Its path.
 */
const validateElementAttributes = (
  context: ValidationContext,
  node: RichTextNode,
  path: Path
): void => {
  if (node.format !== undefined && node.format !== "") {
    pushError(context, path, "Remove the text alignment")
  }

  const indent = node.indent

  if (
    indent !== undefined &&
    indent !== 0 &&
    !(
      node.type === "listitem" &&
      Number.isInteger(indent) &&
      (indent as number) > 0
    )
  ) {
    pushError(context, path, "Remove the indent")
  }

  validateTextFormat(context, node.textFormat, path)
  validateTextStyle(context, node.textStyle, path)
}

/**
 * Runs the check of each of the field's features owning a node against the feature's options: a
 * heading level among its sizes, a link its policy allows, opening in this tab or a new one.
 *
 * @param context - The check, with its errors.
 * @param node - The node.
 * @param path - Its path.
 * @param features - The field's features owning the node.
 */
const validateFeatureNodes = (
  context: ValidationContext,
  node: RichTextNode,
  path: Path,
  features: ResolvedRichTextFeature[]
): void => {
  for (const feature of features) {
    const definition = RICH_TEXT_FEATURE_DEFINITIONS[
      feature.key
    ] as RichTextFeatureDefinition

    definition
      .findNodeErrors?.(node, feature.props as never)
      .forEach((message) => pushError(context, path, message))
  }
}

/**
 * Finds the field's features owning a node, or the error refusing it: a type no feature registers, a
 * node of a registered type none owns, such as a list of another `listType`, or one owned only by
 * features the field lacks.
 *
 * @param context - The check, with its errors.
 * @param node - The node.
 * @returns The field's features owning it, none for a plain node, or the message refusing it.
 */
const findNodeFeatures = (
  context: ValidationContext,
  node: RichTextNode
): ResolvedRichTextFeature[] | string => {
  const { type } = node
  const registering = DEFINITIONS.filter((definition) =>
    definition.nodeTypes.includes(type)
  )

  if (!registering.length) {
    return PLAIN_TYPES.includes(type)
      ? []
      : `Remove the "${type}" element: this field does not allow it`
  }

  const owning = registering.filter(
    (definition) => definition.ownsNode?.(node) ?? true
  )

  if (!owning.length) {
    return UNOWNED_NODE_MESSAGES[type] ?? UNREADABLE_NODE_MESSAGE
  }

  const features = owning
    .map((definition) =>
      findRichTextFeature(context.settings.features, definition.key)
    )
    .filter((feature): feature is ResolvedRichTextFeature => !!feature)

  return features.length ? features : owning[0].missingMessage!
}

/**
 * Checks a node and everything it holds: a type the field's features allow, in a place its parent may
 * hold it, passing the checks of the features owning it.
 *
 * @param context - The check, with its errors.
 * @param node - The node.
 * @param path - Its path.
 * @param parentType - The type of the node holding it.
 */
const validateNode = (
  context: ValidationContext,
  node: unknown,
  path: Path,
  parentType: string
): void => {
  if (
    typeof node !== "object" ||
    node === null ||
    typeof (node as RichTextNode).type !== "string"
  ) {
    pushError(context, path, UNREADABLE_NODE_MESSAGE)
    return
  }

  const element = node as RichTextNode
  const { type } = element
  const features = findNodeFeatures(context, element)

  if (typeof features === "string") {
    pushError(context, path, features)
    return
  }

  if (!CHILD_TYPES[parentType]?.includes(type)) {
    pushError(
      context,
      path,
      `Move the "${type}" element out of the "${parentType}" element`
    )
    return
  }

  if (type === "text") {
    validateTextNode(context, element, path)
    return
  }

  validateFeatureNodes(context, element, path, features)

  if (type in CHILD_TYPES) {
    validateElement(context, element, path)
  }
}

/**
 * Checks an element's own attributes and each node it holds.
 *
 * @param context - The check, with its errors.
 * @param element - The element, the root included.
 * @param path - Its path.
 */
const validateElement = (
  context: ValidationContext,
  element: RichTextNode,
  path: Path
): void => {
  validateElementAttributes(context, element, path)

  if (!Array.isArray(element.children)) {
    pushError(context, path, UNREADABLE_NODE_MESSAGE)
    return
  }

  element.children.forEach((child, index) =>
    validateNode(context, child, [...path, "children", index], element.type)
  )
}

/**
 * Checks a rich text document against what its field allows, without Lexical: every node a type the
 * field's features allow, where its parent may hold it; no alignment, no indent outside a list item, no
 * inline CSS, and only the text formats of the field's features; a heading level among the heading
 * feature's sizes, a list of a list feature the field has, a link the link feature's policy allows
 * opening in this tab or a new one, and text
 * without control characters other than tab and line breaks. Nothing is changed: a document breaking a
 * rule is refused.
 *
 * @param document - The document, or any value sent as one.
 * @param settings - The field's features, each with its options.
 * @returns Each error, at the node that breaks a rule; none for a document the field takes.
 */
export const validateRichText = (
  document: unknown,
  settings: RichTextSettings
): RichTextError[] => {
  if (!isRichTextDocument(document)) {
    return [{ path: [], message: NOT_A_DOCUMENT_MESSAGE }]
  }

  const context: ValidationContext = {
    settings,
    allowedFormats: settings.features.reduce(
      (bits, feature) =>
        bits | (RICH_TEXT_FEATURE_DEFINITIONS[feature.key].formatBit ?? 0),
      0
    ),
    errors: [],
  }

  validateElement(context, document.root, ["root"])

  return context.errors
}
