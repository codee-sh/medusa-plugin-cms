import { Text } from "@medusajs/ui"

type LayoutHeadingProps = {
  label: string
  description?: string
}

/**
 * Shows a label with an optional description under it: the heading of a group, of a block card's
 * section and of a collapsible.
 *
 * @param props - The label and the description.
 */
export const LayoutHeading = ({ label, description }: LayoutHeadingProps) => (
  <div className="flex flex-col gap-y-1">
    <Text size="small" leading="compact" weight="plus">
      {label}
    </Text>
    {description && (
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {description}
      </Text>
    )}
  </div>
)
