import { Fragment } from "react"
import type { RichTextSettings } from "../../../../../../../shared/rich-text/types"
import type { ToolbarControl } from "../types"
import { useSelectionState } from "../hooks/use-selection-state"

type ToolbarProps = {
  settings: RichTextSettings
  /** The controls, in the toolbar's order. */
  controls: ToolbarControl[]
  disabled?: boolean
}

/**
 * The rich text toolbar: each control that shows for the field and the selection, in the given order,
 * a separator between two. It knows no control itself, so a new one only joins the list it is given.
 *
 * @param props - The field's settings, the controls, and whether the editor is disabled.
 */
export const Toolbar = ({ settings, controls, disabled }: ToolbarProps) => {
  const selection = useSelectionState()
  const shown = controls.filter(({ isShown }) => isShown(settings, selection))

  return (
    <div className="flex flex-wrap items-center gap-x-1 border-b px-1 py-1">
      {shown.map(({ name, Component }, index) => (
        <Fragment key={name}>
          {index > 0 && (
            <div aria-hidden className="bg-ui-border-base mx-1 h-4 w-px" />
          )}
          <Component
            settings={settings}
            selection={selection}
            disabled={disabled}
          />
        </Fragment>
      ))}
    </div>
  )
}
