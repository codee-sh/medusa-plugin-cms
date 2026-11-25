import { clx, Text } from "@medusajs/ui"
import {
  type FieldValues,
  get,
  type UseFormReturn,
  useFormState,
} from "react-hook-form"

type OwnErrorProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path whose own error is shown. */
  path: string
  className?: string
}

/**
 * Shows the error a form path holds itself, or the one a list keeps at its root, and nothing for the
 * errors of the fields under it. It subscribes to that path alone, so its parent does not re-render on
 * each error.
 *
 * @param props - The form, the path and the error's classes.
 */
export const OwnError = <TValues extends FieldValues>({
  form,
  path,
  className,
}: OwnErrorProps<TValues>) => {
  const { errors } = useFormState({
    control: form.control,
    name: path as never,
  })
  const error = get(errors, path) as
    { message?: string; root?: { message?: string } } | undefined
  const message = error?.message ?? error?.root?.message

  return message ? (
    <Text
      size="small"
      leading="compact"
      className={clx("text-ui-fg-error", className)}
    >
      {message}
    </Text>
  ) : null
}
