import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ListBullet } from "@medusajs/icons"
import { useManagerFormFieldsTranslation } from "../../../../hooks/use-manager-form-fields-translation"
import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import type { ToolbarControlProps } from "../types"
import { ToolbarButton } from "./toolbar-button"

/**
 * The bulleted and numbered list buttons: each turns the selected blocks into its list, pressed while
 * the selection sits in one, and turns that list back into paragraphs when pressed. Each shows when the
 * field has its list feature or the selection sits in its list, so a stored list can be removed.
 *
 * @param props - What every toolbar control gets; it reads the field's list features and the list the
 * selection sits in.
 */
export const ListButtons = ({
  settings,
  selection,
  disabled,
}: ToolbarControlProps) => {
  const [editor] = useLexicalComposerContext()
  const { listType } = selection
  const { t } = useManagerFormFieldsTranslation()
  const showsBullet =
    findRichTextFeature(settings.features, "unorderedList") !== undefined ||
    listType === "bullet"
  const showsNumber =
    findRichTextFeature(settings.features, "orderedList") !== undefined ||
    listType === "number"

  return (
    <>
      {showsBullet && (
        <ToolbarButton
          label={t("richText.bulletList")}
          pressed={listType === "bullet"}
          disabled={disabled}
          onClick={() =>
            listType === "bullet"
              ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
              : editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
          }
        >
          <ListBullet />
        </ToolbarButton>
      )}
      {showsNumber && (
        <ToolbarButton
          label={t("richText.numberedList")}
          pressed={listType === "number"}
          disabled={disabled}
          onClick={() =>
            listType === "number"
              ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
              : editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
          }
        >
          <span className="txt-compact-xsmall-plus">1.</span>
        </ToolbarButton>
      )}
    </>
  )
}
