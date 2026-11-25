import { DatePicker } from "@medusajs/ui"
import type { ManagerFormInputProps } from "../types"

/**
 * The input of a `date` field, bound to the form's value.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const DateField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <DatePicker
    {...control}
    ref={field.ref}
    value={(field.value as Date | null) ?? null}
    onChange={field.onChange}
    onBlur={field.onBlur}
    isDisabled={config.disabled}
  />
)
