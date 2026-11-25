import { TOGGLE_LINK_COMMAND } from "@lexical/link"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { Link } from "@medusajs/icons"
import { Button, Hint, Input, Label, Popover, Switch, Text } from "@medusajs/ui"
import { $getSelection, type BaseSelection } from "lexical"
import { useId, useRef, useState } from "react"
import { useManagerFormFieldsTranslation } from "../../../../hooks/use-manager-form-fields-translation"
import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import { validateUrl } from "../../../../../../../shared/sanitize/validate-url"
import { useLinkShortcut } from "../hooks/use-link-shortcut"
import type { ToolbarControlProps } from "../types"
import { $restoreLinkSelection } from "../utils/restore-link-selection"
import { ToolbarButton } from "./toolbar-button"

/**
 * The link button and its popover: a URL checked against the field's link policy as it is typed, with
 * the message a save would give, a switch opening the link in a new tab, and apply and remove. Cmd+K
 * opens it too. In a field without the link feature it shows only over a stored link, which it can
 * remove.
 *
 * @param props - What every toolbar control gets; it reads the field's link feature, with its link
 * policy, and the link the selection sits in.
 */
export const LinkPopover = ({
  settings,
  selection,
  disabled,
}: ToolbarControlProps) => {
  const [editor] = useLexicalComposerContext()
  const { link, isCollapsed } = selection
  const linkFeature = findRichTextFeature(settings.features, "link")
  const takesLinks = linkFeature !== undefined
  const { t } = useManagerFormFieldsTranslation()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [newTab, setNewTab] = useState(false)
  const opened = useRef<BaseSelection | null>(null)
  const canOpen = !disabled && (link !== null || (takesLinks && !isCollapsed))
  const result =
    url && linkFeature ? validateUrl(url, linkFeature.props.linkPolicy) : true

  /**
   * Opens the popover over the current selection, filled from the link it sits in.
   */
  const openPopover = () => {
    opened.current = editor
      .getEditorState()
      .read(() => $getSelection()?.clone() ?? null)
    setUrl(link?.url ?? "")
    setNewTab(link?.target === "_blank")
    setOpen(true)
  }

  /**
   * Makes, changes or removes the link over the selection the popover opened over, then closes it and
   * gives the editor its focus back.
   *
   * @param payload - The link, or `null` to remove it.
   */
  const applyLink = (
    payload: { url: string; target: string | null } | null
  ) => {
    editor.update(() => {
      $restoreLinkSelection(opened.current)
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, payload)
    })
    setOpen(false)
    editor.focus()
  }

  useLinkShortcut(() => {
    if (!canOpen) {
      return false
    }

    openPopover()

    return true
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* An anchor, not a trigger: the button opens the popover itself, filled from the selection. */}
      <Popover.Anchor asChild>
        <ToolbarButton
          label={t("richText.link")}
          pressed={link !== null}
          expanded={open}
          hasPopup="dialog"
          disabled={!canOpen}
          onClick={() => (open ? setOpen(false) : openPopover())}
        >
          <Link />
        </ToolbarButton>
      </Popover.Anchor>
      <Popover.Content
        align="start"
        className="flex w-80 flex-col gap-y-3 p-3"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {takesLinks ? (
          <>
            <div className="flex flex-col gap-y-1">
              <Label size="small" htmlFor={`${id}-url`}>
                {t("richText.linkUrl")}
              </Label>
              <Input
                id={`${id}-url`}
                size="small"
                value={url}
                placeholder="https://"
                aria-invalid={result !== true}
                onChange={(event) => setUrl(event.target.value)}
              />
              {result !== true && <Hint variant="error">{result}</Hint>}
            </div>
            <div className="flex items-center gap-x-2">
              <Switch
                id={`${id}-new-tab`}
                checked={newTab}
                onCheckedChange={setNewTab}
              />
              <Label size="small" htmlFor={`${id}-new-tab`}>
                {t("richText.linkNewTab")}
              </Label>
            </div>
          </>
        ) : (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("richText.linkNotAllowed")}
          </Text>
        )}
        <div className="flex justify-end gap-x-2">
          {link && (
            <Button
              size="small"
              variant="secondary"
              type="button"
              onClick={() => applyLink(null)}
            >
              {t("richText.linkRemove")}
            </Button>
          )}
          {takesLinks && (
            <Button
              size="small"
              type="button"
              disabled={!url || result !== true}
              onClick={() =>
                applyLink({ url, target: newTab ? "_blank" : null })
              }
            >
              {t("richText.linkApply")}
            </Button>
          )}
        </div>
      </Popover.Content>
    </Popover>
  )
}
