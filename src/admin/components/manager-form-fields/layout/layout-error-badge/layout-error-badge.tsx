import { Badge } from "@medusajs/ui"
import { useManagerFormFieldsTranslation } from "../../hooks/use-manager-form-fields-translation"

type LayoutErrorBadgeProps = {
  /** The number of errors; nothing shows for none. */
  count: number
}

/**
 * Shows how many errors sit in a part of a form the editor cannot see, such as a closed collapsible or
 * another tab.
 *
 * @param props - The number of errors.
 */
export const LayoutErrorBadge = ({ count }: LayoutErrorBadgeProps) => {
  const { t } = useManagerFormFieldsTranslation()

  return count ? (
    <Badge
      size="2xsmall"
      color="red"
      aria-label={t("layout.errorCount", { count })}
    >
      {count}
    </Badge>
  ) : null
}
