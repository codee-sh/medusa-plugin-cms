import { HistoryExtension } from "@lexical/history"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useExtensionSignalValue } from "@lexical/react/useExtensionSignalValue"
import { ArrowUturnLeft } from "@medusajs/icons"
import { REDO_COMMAND, UNDO_COMMAND } from "lexical"
import { useManagerFormFieldsTranslation } from "../../../../hooks/use-manager-form-fields-translation"
import type { ToolbarControlProps } from "../types"
import { ToolbarButton } from "./toolbar-button"

/**
 * Undo and redo, each disabled while the history holds nothing to undo or redo.
 *
 * @param props - What every toolbar control gets; it reads whether the editor is disabled.
 */
export const HistoryButtons = ({ disabled }: ToolbarControlProps) => {
  const [editor] = useLexicalComposerContext()
  const { t } = useManagerFormFieldsTranslation()
  const canUndo = useExtensionSignalValue(HistoryExtension, "canUndo")
  const canRedo = useExtensionSignalValue(HistoryExtension, "canRedo")

  return (
    <>
      <ToolbarButton
        label={t("richText.undo")}
        disabled={disabled || !canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <ArrowUturnLeft />
      </ToolbarButton>
      <ToolbarButton
        label={t("richText.redo")}
        disabled={disabled || !canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        {/* Mirrored inline: the dashboard's styles hold no `-scale-x-100`, and Medusa has no redo icon. */}
        <ArrowUturnLeft style={{ transform: "scaleX(-1)" }} />
      </ToolbarButton>
    </>
  )
}
