import { prepareCmsText } from "../config/prepare-cms-text"
import type {
  ClientText,
  CmsText,
  LayoutItemConfig,
  LayoutSectionConfig,
} from "../config/types"

/** A node that holds items under a label: a section, a tab, a group, a collapsible. */
type LayoutBox = {
  label?: CmsText
  description?: CmsText
  fields?: LayoutItemConfig[]
}

/**
 * Prepares a text the config may leave out.
 *
 * @param text - The text, if given.
 * @param translationNs - The config's `admin.translationNs`.
 * @param where - The text's place, for error messages.
 * @returns The prepared text, or `undefined` when left out.
 */
const prepareOptionalText = (
  text: CmsText | undefined,
  translationNs: string | undefined,
  where: string
): ClientText | undefined =>
  text === undefined ? undefined : prepareCmsText(text, translationNs, where)

/**
 * Prepares a layout node's texts and those of the nodes it holds; a field's name and a row stay as they
 * are.
 *
 * @param item - The node, or a field's name.
 * @param translationNs - The config's `admin.translationNs`.
 * @param where - The node's place, for error messages.
 * @returns The node with its texts prepared.
 */
const prepareItemTexts = (
  item: LayoutItemConfig,
  translationNs: string | undefined,
  where: string
): LayoutItemConfig<ClientText> => {
  if (typeof item === "string" || item.type === "row") {
    return item
  }

  if (item.type === "tabs") {
    return {
      ...item,
      // A JS config can leave `tabs` out; the section checks refuse the empty list.
      tabs: (item.tabs ?? []).map((tab, index) =>
        prepareBoxTexts(tab, translationNs, `${where}: tab ${index + 1}`)
      ),
    } as LayoutItemConfig<ClientText>
  }

  if (item.type === "component") {
    return {
      ...item,
      label: prepareOptionalText(
        item.label,
        translationNs,
        `${where}: component label`
      ),
      description: prepareOptionalText(
        item.description,
        translationNs,
        `${where}: component description`
      ),
    }
  }

  return prepareBoxTexts(
    item,
    translationNs,
    `${where}: ${item.type}`
  ) as LayoutItemConfig<ClientText>
}

/**
 * Prepares the texts of a node that holds items under a label, and of the nodes inside it.
 *
 * @param box - The node.
 * @param translationNs - The config's `admin.translationNs`.
 * @param where - The node's place, for error messages.
 * @param optionalLabel - Whether the node may leave its label out: a collection's section.
 * @returns The node with its texts prepared; a JS config's missing `fields` come back empty, which the
 * section checks refuse as they do a missing list.
 */
const prepareBoxTexts = <TBox extends LayoutBox>(
  box: TBox,
  translationNs: string | undefined,
  where: string,
  optionalLabel = false
) => ({
  ...box,
  label:
    optionalLabel && box.label === undefined
      ? undefined
      : prepareCmsText(box.label as CmsText, translationNs, `${where} label`),
  description: prepareOptionalText(
    box.description,
    translationNs,
    `${where} description`
  ),
  fields: (box.fields ?? []).map((item) =>
    prepareItemTexts(item, translationNs, where)
  ),
})

/**
 * Prepares the texts of a form's sections - a collection's or a block card's - and of every node inside
 * them, at any depth. It walks the node types the layout config has, which the typecheck keeps in step.
 *
 * @param sections - The `admin.sections` of the config.
 * @param translationNs - The config's `admin.translationNs`.
 * @param path - Where the config sits, for error messages.
 * @param optionalLabel - Whether a section may leave its label out: a collection's may, a block's not.
 * @returns The sections with their texts prepared, every other key as the config wrote it.
 */
export const prepareLayoutTexts = <TSection extends LayoutBox>(
  sections: TSection[],
  translationNs: string | undefined,
  path: string,
  optionalLabel = false
): (Omit<TSection, keyof LayoutBox> &
  Pick<
    LayoutSectionConfig<ClientText>,
    "label" | "description" | "fields"
  >)[] =>
  sections.map((section, index) =>
    prepareBoxTexts(
      section,
      translationNs,
      `${path}: admin section ${index + 1}`,
      optionalLabel
    )
  )
