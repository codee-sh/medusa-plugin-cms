import { Checkbox } from "@medusajs/ui"
import type { ManagerFormInputProps } from "../types"

/**
 * The control of a `checkbox` field, bound to the form's value.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const CheckboxField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <Checkbox
    {...control}
    ref={field.ref}
    checked={Boolean(field.value)}
    onCheckedChange={(checked) => field.onChange(checked === true)}
    onBlur={field.onBlur}
    disabled={config.disabled}
  />
)
