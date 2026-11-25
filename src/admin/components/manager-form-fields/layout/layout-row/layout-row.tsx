import type { ReactNode } from "react"

type LayoutRowProps = {
  /** The row's items, rendered by the form. */
  children: ReactNode
}

/**
 * Shows a form's items side by side, each at least 200px wide, so a narrow column stacks them.
 *
 * @param props - The row's items.
 */
export const LayoutRow = ({ children }: LayoutRowProps) => (
  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
    {children}
  </div>
)
