import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { FORMAT_TEXT_COMMAND } from "lexical"
import { useManagerFormFieldsTranslation } from "../../../../hooks/use-manager-form-fields-translation"
import type { ToolbarControlProps } from "../types"
import { listTextFormats } from "../utils/list-text-formats"
import { ToolbarButton } from "./toolbar-button"

/**
 * The text format buttons, each pressed while the selection has its format.
 *
 * @param props - What every toolbar control gets; it reads the field's features and the selection's
 * formats.
 */
export const FormatButtons = ({
  settings,
  selection,
  disabled,
}: ToolbarControlProps) => {
  const [editor] = useLexicalComposerContext()
  const { t } = useManagerFormFieldsTranslation()

  return (
    <>
      {listTextFormats(settings, selection).map(
        ({ format, labelKey, glyph, glyphClassName }) => (
          <ToolbarButton
            key={format}
            label={t(labelKey)}
            pressed={selection[format]}
            disabled={disabled}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
          >
            <span className={glyphClassName}>{glyph}</span>
          </ToolbarButton>
        )
      )}
    </>
  )
}
