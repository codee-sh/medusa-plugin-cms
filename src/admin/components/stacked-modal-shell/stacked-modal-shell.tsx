import {
  StackedFocusModal,
  useStackedModal,
} from "@medusajs/dashboard/components"
import { type ReactNode, useEffect } from "react"

type StackedModalShellProps = {
  /** Unique among the stacked modals of the route modal it opens on. */
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

/**
 * A stacked focus modal driven by an `open` prop. Stacked modals open through the route modal's
 * registry rather than a prop, so the prop is mirrored into it, and a close from inside - Escape, the
 * close button - is reported back through `onOpenChange`. The content is unmounted while closed.
 *
 * Works only inside a `RouteFocusModal` or `RouteDrawer`, which provide the registry.
 *
 * @param props - The modal's id, its open state and change handler, and its content.
 */
export const StackedModalShell = ({
  id,
  open,
  onOpenChange,
  children,
}: StackedModalShellProps) => {
  const { getIsOpen, setIsOpen } = useStackedModal()

  useEffect(() => {
    if (getIsOpen(id) !== open) {
      setIsOpen(id, open)
    }
  }, [getIsOpen, setIsOpen, id, open])

  return (
    <StackedFocusModal id={id} onOpenChangeCallback={onOpenChange}>
      <StackedFocusModal.Content aria-describedby={undefined}>
        {open && children}
      </StackedFocusModal.Content>
    </StackedFocusModal>
  )
}
