import { Form } from "@medusajs/dashboard/components"
import { Text } from "@medusajs/ui"
import type { ComponentType } from "react"
import { useManagerFormFieldsTranslation } from "../hooks/use-manager-form-fields-translation"
import {
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  useWatch,
} from "react-hook-form"
import {
  CheckboxField,
  ChipInputField,
  ComboboxField,
  CustomField,
  DateField,
  type ManagerFormInputProps,
  MediaField,
  NumberField,
  RichTextField,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
  UrlField,
} from "../fields"
import { LengthCounter } from "./length-counter"
import type { ManagerFormFieldConfig, ManagerFormFieldType } from "../types"

export type ManagerFormFieldProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the field sits under; the field's own name follows it. */
  name: string
  field: ManagerFormFieldConfig
}

/** The input of each field type, one file each in `fields/`. */
const FIELD_INPUTS: Record<
  ManagerFormFieldType,
  ComponentType<ManagerFormInputProps>
> = {
  text: TextField,
  textarea: TextareaField,
  richtext: RichTextField,
  url: UrlField,
  number: NumberField,
  select: SelectField,
  combobox: ComboboxField,
  custom: CustomField,
  "chip-input": ChipInputField,
  date: DateField,
  media: MediaField,
  checkbox: CheckboxField,
  switch: SwitchField,
}

/** The types whose control sits beside its label rather than under it. */
const TOGGLE_TYPES: ManagerFormFieldType[] = ["checkbox", "switch"]

/**
 * Renders one field of a form through the dashboard's `Form` parts, so it looks like any `Form.Field`
 * beside it: its label, "(Optional)" unless it is required and "(Required to publish)" when a publish
 * needs it, its description, its input and its error. A checkbox and a switch sit beside their label and
 * show neither, as they always hold a value.
 * The input comes from the field's type, each in its own file in `fields/`.
 *
 * Its value lives at `<name>.<field name>`. It sits inside the dashboard's `Form` or a route modal's
 * `Form`, which give the parts the form. The form's schema validates it; `required` only sets the label.
 * A media field also sits inside the form's `MediaFieldsProvider`, which says where its files come from.
 *
 * With `placeholderFrom`, the value of that sibling field is the placeholder while it is not empty; with
 * `recommendedLength`, a counter under the input shows the value's length against it. A `custom` input
 * draws its own input, so it takes neither.
 *
 * @param props - The form, the path the field sits under, and the field.
 */
export const ManagerFormField = <TValues extends FieldValues>({
  form,
  name,
  field: fieldConfig,
}: ManagerFormFieldProps<TValues>) => {
  const { t } = useManagerFormFieldsTranslation()
  const FieldInput = FIELD_INPUTS[fieldConfig.type]
  const ownsInput = fieldConfig.type !== "custom"
  const placeholderSource = useWatch({
    control: form.control,
    // The path is built from the field's name at runtime, so its type is only a form path.
    name: `${name}.${fieldConfig.placeholderFrom}` as FieldPath<TValues>,
    disabled: !ownsInput || !fieldConfig.placeholderFrom,
  })
  const config =
    typeof placeholderSource === "string" && placeholderSource
      ? { ...fieldConfig, placeholder: placeholderSource }
      : fieldConfig

  return (
    <Form.Field
      control={form.control}
      // The path is built from the field's name at runtime, so its type is only a form path.
      name={`${name}.${config.name}` as FieldPath<TValues>}
      render={({ field }) =>
        TOGGLE_TYPES.includes(config.type) ? (
          <Form.Item>
            <div className="flex items-start gap-x-3">
              <Form.Control>
                <FieldInput config={config} field={field} />
              </Form.Control>
              <div className="flex flex-col gap-y-1">
                <Form.Label tooltip={config.tooltip}>{config.label}</Form.Label>
                {config.description && (
                  <Form.Hint>{config.description}</Form.Hint>
                )}
              </div>
            </div>
            <Form.ErrorMessage />
          </Form.Item>
        ) : (
          <Form.Item>
            <Form.Label
              tooltip={config.tooltip}
              // The toolkit's own mark, from its translations, in the slot of the dashboard's
              // "(Optional)"; a field required at every save has none.
              icon={
                config.required !== "always" && (
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-muted"
                  >
                    {t(
                      config.required === "publish"
                        ? "requiredToPublish"
                        : "optional"
                    )}
                  </Text>
                )
              }
            >
              {config.label}
            </Form.Label>
            {config.description && <Form.Hint>{config.description}</Form.Hint>}
            <Form.Control>
              <FieldInput config={config} field={field} />
            </Form.Control>
            {ownsInput && config.recommendedLength && (
              <LengthCounter
                value={field.value}
                recommended={config.recommendedLength}
              />
            )}
            <Form.ErrorMessage />
          </Form.Item>
        )
      }
    />
  )
}
