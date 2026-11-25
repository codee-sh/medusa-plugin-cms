import { Input } from "@medusajs/ui"
import type { ManagerFormInputProps } from "../types"

/**
 * The input of a `number` field, bound to the form's value. An emptied input clears the value rather
 * than turning it into 0.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const NumberField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <Input
    {...control}
    ref={field.ref}
    name={field.name}
    type="number"
    value={(field.value as number | null) ?? ""}
    onChange={(event) =>
      field.onChange(
        event.target.value === "" ? null : Number(event.target.value)
      )
    }
    onBlur={field.onBlur}
    placeholder={config.placeholder}
    disabled={config.disabled}
    min={config.min}
    max={config.max}
    step={config.step}
  />
)
