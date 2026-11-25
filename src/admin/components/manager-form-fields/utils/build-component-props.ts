import { toComboboxOptions } from "../fields/combobox-field/utils/to-combobox-options"
import type { FieldBinding, FormControlAttributes } from "../fields/types"
import type {
  ComponentFieldConfig,
  CustomFieldProps,
  ManagerFormFieldConfig,
} from "../types"

/** A field a component edits, bound to the form: its key, its config, its binding, its error and its input's attributes. */
export type ComponentFieldBinding = {
  key: string
  config: ManagerFormFieldConfig
  field: FieldBinding
  error?: string
  /** What ties the field's input to its label, hint and error. */
  control: FormControlAttributes
}

/**
 * Describes a field for the component that edits it: its label, when it must be filled, its listed
 * options, and how many values it holds.
 *
 * @param config - The field's config.
 * @returns What the component reads of the field.
 */
const toComponentField = (
  config: ManagerFormFieldConfig
): ComponentFieldConfig => ({
  label: config.label,
  required: config.required,
  options: config.options && toComboboxOptions(config.options),
  multiple: config.multiple,
  max: config.maxItems,
})

/**
 * Builds a component's props from the fields it edits, each under its key: one field drawn inside its
 * label and error, or the several fields of a layout node.
 *
 * @param bindings - The fields, bound to the form.
 * @returns The props.
 */
export const buildComponentProps = (
  bindings: ComponentFieldBinding[]
): CustomFieldProps => ({
  values: Object.fromEntries(
    bindings.map(({ key, field }) => [key, field.value])
  ),
  onChange: (key, value) =>
    bindings.find((binding) => binding.key === key)?.field.onChange(value),
  onBlur: (key) =>
    bindings.find((binding) => binding.key === key)?.field.onBlur(),
  fields: Object.fromEntries(
    bindings.map(({ key, config }) => [key, toComponentField(config)])
  ),
  errors: Object.fromEntries(bindings.map(({ key, error }) => [key, error])),
  inputProps: Object.fromEntries(
    bindings.map(({ key, field, control }) => [
      key,
      { ...control, name: field.name, ref: field.ref },
    ])
  ),
  disabled: bindings.some(({ config }) => Boolean(config.disabled)),
})
