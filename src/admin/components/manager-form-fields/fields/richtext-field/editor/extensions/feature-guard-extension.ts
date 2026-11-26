import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list"
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  defineExtension,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  safeCast,
  type TextFormatType,
} from "lexical"
import { RICH_TEXT_FEATURE_DEFINITIONS } from "../../../../../../../shared/rich-text/features/rich-text-feature-definitions"
import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import type { ResolvedRichTextFeature } from "../../../../../../../shared/rich-text/types"

/** What the guard lets through: the field's features. */
export type FeatureGuardConfig = {
  features: ResolvedRichTextFeature[]
}

/**
 * Tells whether a text format command removes the format. Lexical toggles a format against the
 * selection's own, which at a caret is what it types with and over a range what the selected text
 * starts with.
 *
 * @param format - The format the command toggles.
 * @returns Whether the command takes the format away.
 */
const $isRemovingFormat = (format: TextFormatType): boolean => {
  const selection = $getSelection()

  return $isRangeSelection(selection) && selection.hasFormat(format)
}

/**
 * Registers the guard's handlers, each returning `true` to stop a command the field does not take.
 *
 * @param editor - The editor.
 * @param config - The field's features.
 * @returns What unregisters them.
 */
const registerFeatureGuard = (
  editor: LexicalEditor,
  { features }: FeatureGuardConfig
): (() => void) => {
  // A format feature's key is Lexical's name of its format.
  const formats: string[] = features
    .filter(
      (feature) =>
        RICH_TEXT_FEATURE_DEFINITIONS[feature.key].formatBit !== undefined
    )
    .map((feature) => feature.key)
  const refuseUnordered = () => !findRichTextFeature(features, "unorderedList")
  const refuseOrdered = () => !findRichTextFeature(features, "orderedList")
  const unregisters = [
    editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (format) => !formats.includes(format) && !$isRemovingFormat(format),
      COMMAND_PRIORITY_CRITICAL
    ),
    // No feature aligns text; clearing an alignment a stored document holds is let through.
    editor.registerCommand(
      FORMAT_ELEMENT_COMMAND,
      (format) => format !== "",
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      INSERT_UNORDERED_LIST_COMMAND,
      refuseUnordered,
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand(
      INSERT_ORDERED_LIST_COMMAND,
      refuseOrdered,
      COMMAND_PRIORITY_CRITICAL
    ),
  ]

  return () => unregisters.forEach((unregister) => unregister())
}

/**
 * Stops every command that would add what the field's features do not allow - a text format, from the
 * toolbar or a shortcut such as Cmd+U, an alignment, or a list of a list feature the field lacks - and
 * lets one that removes it run, so a document saved before the field lost a feature can be cleaned up.
 * Headings and quotes need no guard:
 * only the block type menu sets them, and it offers the field's own. Links are guarded by
 * `LinkExtension`'s `validateUrl`.
 */
export const FeatureGuardExtension = defineExtension({
  name: "@mostrajs/cms/feature-guard",
  config: safeCast<FeatureGuardConfig>({ features: [] }),
  register: registerFeatureGuard,
})
