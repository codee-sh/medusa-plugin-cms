import { Switch } from "@medusajs/ui"
import type { ManagerFormInputProps } from "../types"

/**
 * The control of a `switch` field, bound to the form's value.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const SwitchField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <Switch
    {...control}
    ref={field.ref}
    checked={Boolean(field.value)}
    onCheckedChange={field.onChange}
    onBlur={field.onBlur}
    disabled={config.disabled}
  />
)
