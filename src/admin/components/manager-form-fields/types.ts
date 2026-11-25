import type { ReactNode, RefCallback } from "react"
import type { MediaStore } from "../media/types"
import type { RichTextSettings } from "../../../shared/rich-text/types"

export type ManagerFormFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "url"
  | "number"
  | "select"
  | "checkbox"
  | "chip-input"
  | "switch"
  | "date"
  | "media"
  | "combobox"
  | "custom"

/**
 * A React hook that gives a `combobox` its options and the state of fetching them. Its result fits the
 * dashboard's `Combobox`, and `useComboboxData` returns it as it is.
 */
export type OptionsHook = (input: { value: string | string[] | null }) => {
  options: { value: string; label: string }[]
  isPending: boolean
  isError: boolean
  /** With search: the text typed and its setter. */
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  /** With pages: loads the next page, called when the list is scrolled to its end. */
  fetchNextPage?: () => void
  isFetchingNextPage?: boolean
}

/** What a component reads of a field it edits. */
export type ComponentFieldConfig = {
  label: string
  /** When the field must be filled: at every save, or at a publish; left out for an optional field. */
  required?: "always" | "publish"
  options?: { value: string; label: string }[]
  multiple?: boolean
  max?: number
}

/** What a component gets: the values and configs of the fields it edits, each under its key, nothing else of the form. */
export type CustomFieldProps<TKey extends string = string> = {
  /** Each field's stored value, by its key. */
  values: Record<TKey, unknown>
  onChange: (key: TKey, value: unknown) => void
  onBlur: (key: TKey) => void
  /** Each field's config. */
  fields: Record<TKey, ComponentFieldConfig>
  /** Each field's error message. */
  errors: Record<TKey, string | undefined>
  /** Spread on each field's main input, so that the label, the hint and the error point at it. */
  inputProps: Record<
    TKey,
    {
      id?: string
      /** The field's name in the form. */
      name: string
      "aria-describedby"?: string
      "aria-invalid"?: boolean
      ref: RefCallback<HTMLElement>
    }
  >
  disabled: boolean
}

/** A component that edits a `custom` field, or the fields of a layout node, as the toolkit hands them. */
export type CustomFieldComponent<TKey extends string = string> = (
  props: CustomFieldProps<TKey>
) => ReactNode

/** Imports a `custom` field's component: a module with the component as its default export. */
export type CustomFieldLoader = () => Promise<{
  // A component typed for its own keys fits no narrower type, as its props are read where it is called.
  default: CustomFieldComponent<any>
}>

export type SelectOption = {
  value: string
  name: string
}

export type SelectGroupOption = {
  groupName: string
  options: SelectOption[]
}

/** One field `ManagerFormField` renders, under the form path its caller gives. */
export type ManagerFormFieldConfig = {
  type: ManagerFormFieldType
  /** The field's name under the caller's form path, unique in its list. */
  name: string
  label: string
  placeholder?: string
  /**
   * The name of another field under the same form path whose value is the placeholder while this one is
   * empty; `placeholder` when that value is empty too.
   */
  placeholderFrom?: string
  /** With `text` and `textarea`: shows a character counter that warns past this length. */
  recommendedLength?: number
  description?: string
  tooltip?: string
  /**
   * When the field must be filled, which its label shows: nothing for `always`, "(Required to publish)"
   * for `publish`, "(Optional)" when left out. The form's schema decides whether a value is required.
   */
  required?: "always" | "publish"
  disabled?: boolean
  /** With `select`, and with `combobox` when no source is named: the options, or groups of them. */
  options?: SelectOption[] | SelectGroupOption[]
  /** With `combobox`: the name of the source its options come from, shown when no hook is given. */
  optionsSource?: string
  /** With `combobox`: several values, as a list, shown as chips. */
  multiple?: boolean
  /** With `combobox` and `multiple`: the most values; no more are offered once it holds them. */
  maxItems?: number
  /** With `combobox`: the hook that gives its options; with a source named and no hook, it is disabled. */
  optionsHook?: OptionsHook
  /** With `custom`: the component that draws the input; with neither it nor a loader, the field is disabled. */
  // A component typed for its own keys fits no narrower type, as its props are read where it is called.
  component?: CustomFieldComponent<any>
  /** With `custom`: the loader of the component, imported when the field is first shown. */
  loadComponent?: CustomFieldLoader
  /** With `custom`: the key the component reads the field under; the field's name when left out. */
  componentKey?: string
  /** With `custom`: the name of the component, shown when none is given and logged when it throws. */
  componentSource?: string
  /** With `number`. */
  min?: number
  max?: number
  step?: number
  /** With `media`: what the value names a record by, the MIME types, and how many files it holds. */
  media?: {
    store: MediaStore
    accept?: string[]
    multiple?: boolean
    /** With `multiple`, the most files the field holds. */
    max?: number
  }
  /** With `richtext`: the features its toolbar offers, each with its options. */
  richText?: RichTextSettings
}
