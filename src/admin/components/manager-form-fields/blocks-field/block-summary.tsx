import { Text } from "@medusajs/ui"
import {
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  useWatch,
} from "react-hook-form"

type BlockSummaryProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path of the field whose value names the item. */
  path: string
}

/**
 * Shows the value that names an item in its card's header, watching that one field only.
 *
 * @param props - The form and the field's path.
 */
export const BlockSummary = <TValues extends FieldValues>({
  form,
  path,
}: BlockSummaryProps<TValues>) => {
  const summary = useWatch({
    control: form.control,
    name: path as FieldPath<TValues>,
  })

  return typeof summary === "string" && summary ? (
    <Text size="small" leading="compact" className="text-ui-fg-subtle truncate">
      {summary}
    </Text>
  ) : null
}
