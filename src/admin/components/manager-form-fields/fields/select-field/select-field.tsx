import { Select } from "@medusajs/ui"
import { useManagerFormFieldsTranslation } from "../../hooks/use-manager-form-fields-translation"
import type { SelectGroupOption, SelectOption } from "../../types"
import type { ManagerFormInputProps } from "../types"

/**
 * Tells whether a select's options come in groups.
 *
 * @param options - The select's options.
 * @returns Whether they are groups of options.
 */
const isGroupedOptions = (
  options: SelectOption[] | SelectGroupOption[]
): options is SelectGroupOption[] =>
  options.length > 0 && "groupName" in options[0]

/**
 * Renders the select options of a field, in groups when its options have them.
 *
 * @param options - The field's options.
 * @returns The select's items.
 */
const renderSelectOptions = (options: SelectOption[] | SelectGroupOption[]) =>
  isGroupedOptions(options)
    ? options.map((group) => (
        <Select.Group key={group.groupName}>
          <Select.Label>{group.groupName}</Select.Label>
          {group.options.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.name}
            </Select.Item>
          ))}
        </Select.Group>
      ))
    : options.map((option) => (
        <Select.Item key={option.value} value={option.value}>
          {option.name}
        </Select.Item>
      ))

/**
 * The input of a `select` field, bound to the form's value. Without a placeholder of its own it shows
 * the dashboard's "Select".
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const SelectField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => {
  const { t } = useManagerFormFieldsTranslation()

  return (
    <Select
      value={(field.value as string | null) ?? ""}
      onValueChange={field.onChange}
      disabled={config.disabled}
    >
      <Select.Trigger {...control} ref={field.ref} onBlur={field.onBlur}>
        <Select.Value placeholder={config.placeholder ?? t("general.select")} />
      </Select.Trigger>
      <Select.Content className="z-50">
        {renderSelectOptions(config.options ?? [])}
      </Select.Content>
    </Select>
  )
}
