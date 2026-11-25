import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ChevronDownMini } from "@medusajs/icons"
import { Button, DropdownMenu } from "@medusajs/ui"
import { useManagerFormFieldsTranslation } from "../../../../hooks/use-manager-form-fields-translation"
import type { RichTextBlockType, ToolbarControlProps } from "../types"
import { getBlockTypeOptions } from "../utils/get-block-type-options"
import { $setBlockType } from "../utils/set-block-type"

/**
 * The menu turning the selected blocks into a paragraph, a heading of one of the field's levels, or a
 * quote. Its button names the current block, one the field does not allow included; it is disabled in a
 * list, which the list buttons turn back into paragraphs.
 *
 * @param props - What every toolbar control gets; it reads the field's heading and blockquote features
 * and the block the selection sits in.
 */
export const BlockTypeMenu = ({
  settings,
  selection,
  disabled,
}: ToolbarControlProps) => {
  const [editor] = useLexicalComposerContext()
  const { t } = useManagerFormFieldsTranslation()
  const current = selection.block
  const { options } = getBlockTypeOptions(settings.features, current)
  const shown = current === null || current === "list" ? "paragraph" : current

  /**
   * Names a block type in the menu.
   *
   * @param type - The block type.
   * @returns Its label.
   */
  const labelOf = (type: RichTextBlockType): string =>
    type === "paragraph" || type === "quote"
      ? t(`richText.${type}`)
      : t("richText.heading", { level: type.slice(1) })

  /**
   * Turns the selected blocks into the chosen type, then gives the editor its focus back.
   *
   * @param type - The chosen block type.
   */
  const setBlockType = (type: RichTextBlockType) => {
    editor.update(() => $setBlockType(type))
    editor.focus()
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          size="small"
          variant="transparent"
          type="button"
          disabled={disabled || current === "list"}
          aria-label={t("richText.blockType")}
          className="gap-x-1"
        >
          {labelOf(shown)}
          <ChevronDownMini />
        </Button>
      </DropdownMenu.Trigger>
      {/* The editor takes the focus back, so the menu does not return it to its button. */}
      <DropdownMenu.Content
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {options.map((type) => (
          <DropdownMenu.Item key={type} onClick={() => setBlockType(type)}>
            {labelOf(type)}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
