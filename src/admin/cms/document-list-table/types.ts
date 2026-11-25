import type { ReactNode } from "react"

/** An action in a row's menu, which the page showing the table gives. */
export type DocumentRowAction = {
  icon: ReactNode
  label: string
  onClick: () => void
}
