import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import type { RichTextSettings } from "../../../../../../../shared/rich-text/types"
import type { SelectionState } from "../types"

/** A text format the toolbar toggles, and how its button shows it. */
export type TextFormat = {
  /** The feature that adds it, which is Lexical's name of the format too. */
  format: "bold" | "italic"
  /** The translation key of the button's label. */
  labelKey: string
  /** The letter the button shows, as no icon exists for it. */
  glyph: string
  /** The classes that draw the letter in its format. */
  glyphClassName: string
}

/** The text formats, in the toolbar's order. */
const TEXT_FORMATS: TextFormat[] = [
  {
    format: "bold",
    labelKey: "richText.bold",
    glyph: "B",
    glyphClassName: "font-semibold",
  },
  {
    format: "italic",
    labelKey: "richText.italic",
    glyph: "I",
    glyphClassName: "font-serif italic",
  },
]

/**
 * Lists the text formats a field's toolbar shows: those of its features, and any the selection holds,
 * so a stored format can be removed.
 *
 * @param settings - The field's features.
 * @param selection - What the selection holds.
 * @returns The formats, in the toolbar's order.
 */
export const listTextFormats = (
  settings: RichTextSettings,
  selection: SelectionState
): TextFormat[] =>
  TEXT_FORMATS.filter(
    ({ format }) =>
      findRichTextFeature(settings.features, format) !== undefined ||
      selection[format]
  )
