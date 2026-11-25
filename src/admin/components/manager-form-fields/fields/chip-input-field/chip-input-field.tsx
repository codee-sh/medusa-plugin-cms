import { ChipInput } from "../../inputs/chip-input"
import type { ManagerFormInputProps } from "../types"

/**
 * The input of a `chip-input` field, a list of texts, bound to the form's value.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const ChipInputField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <ChipInput
    {...control}
    ref={field.ref}
    name={field.name}
    value={(field.value as string[] | null) ?? []}
    onChange={field.onChange}
    onBlur={field.onBlur}
    placeholder={config.placeholder}
    disabled={config.disabled}
    allowDuplicates={false}
    showRemove
    variant="base"
  />
)
