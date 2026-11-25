import { Input } from "@medusajs/ui"
import type { ManagerFormInputProps } from "../types"

/**
 * The input of a `text` field, bound to the form's value.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const TextField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <Input
    {...control}
    ref={field.ref}
    name={field.name}
    value={(field.value as string | null) ?? ""}
    onChange={field.onChange}
    onBlur={field.onBlur}
    placeholder={config.placeholder}
    disabled={config.disabled}
  />
)
