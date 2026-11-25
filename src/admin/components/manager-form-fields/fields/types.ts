import type { ControllerRenderProps } from "react-hook-form"
import type { ManagerFormFieldConfig } from "../types"

/** What an input needs of the form's field: its value, its handlers and its ref. */
export type FieldBinding = Pick<
  ControllerRenderProps,
  "name" | "onChange" | "onBlur" | "ref"
> & {
  value: unknown
}

/** What `Form.Control` hands its input, so the label, the hint and the error point at it. */
export type FormControlAttributes = {
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

export type ManagerFormInputProps = FormControlAttributes & {
  config: ManagerFormFieldConfig
  field: FieldBinding
}
