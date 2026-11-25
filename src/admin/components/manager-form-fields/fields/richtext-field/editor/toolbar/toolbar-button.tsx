import { clx, IconButton } from "@medusajs/ui"
import { forwardRef, type ReactNode } from "react"

type ToolbarButtonProps = {
  /** The button's name, read by assistive technology and shown on hover. */
  label: string
  /** Whether the selection has what the button toggles. */
  pressed?: boolean
  /** With a popover: whether it is open. */
  expanded?: boolean
  /** With a popover: the kind of what the button opens. */
  hasPopup?: "dialog"
  disabled?: boolean
  onClick: () => void
  /** The icon, or a letter where no icon exists, hidden from assistive technology. */
  children: ReactNode
}

/**
 * A button of the rich text toolbar: transparent, small, and pressed while the selection has what it
 * toggles. It forwards its ref, so a popover can anchor to it.
 *
 * @param props - The button's label, state and action, and its icon.
 * @param ref - The button element, for a popover's anchor.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    { label, pressed, expanded, hasPopup, disabled, onClick, children },
    ref
  ) => (
    <IconButton
      ref={ref}
      size="small"
      variant="transparent"
      type="button"
      title={label}
      disabled={disabled}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-haspopup={hasPopup}
      className={clx(pressed && "bg-ui-bg-base-pressed")}
      onClick={onClick}
    >
      <span aria-hidden className="flex items-center">
        {children}
      </span>
      <span className="sr-only">{label}</span>
    </IconButton>
  )
)

ToolbarButton.displayName = "ToolbarButton"
