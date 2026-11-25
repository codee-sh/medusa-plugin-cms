import type { FieldValues, UseFormReturn } from "react-hook-form"
import { ManagerFormField } from "./manager-form-field"
import type { ManagerFormFieldConfig } from "./types"

export type ManagerFormFieldsProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the fields sit under; each field's own name follows it. */
  name: string
  fields: ManagerFormFieldConfig[]
}

/**
 * Renders a list of fields under one form path, each through `ManagerFormField`, in the list's order. A
 * form that mixes them with fields of its own renders `ManagerFormField` one by one instead.
 *
 * @param props - The form, the path the fields sit under, and the fields.
 */
export const ManagerFormFields = <TValues extends FieldValues>({
  form,
  name,
  fields,
}: ManagerFormFieldsProps<TValues>) => (
  <div className="flex flex-col gap-y-4">
    {fields.map((field) => (
      <ManagerFormField
        key={field.name}
        form={form}
        name={name}
        field={field}
      />
    ))}
  </div>
)
