import type {
  ManagerFormFieldConfig,
  ManagerFormFieldType,
} from "../../../components/manager-form-fields"
import { getCmsOptionsHook } from "../../../../admin-extensions/registry"
import { isOptionsHookSource } from "../../../../lib/field/is-options-hook-source"
import type { Field, FieldKind } from "../../../../lib/field/types"

/** The `ManagerFormField` type of each kind. */
const FIELD_TYPES: Record<FieldKind, ManagerFormFieldType> = {
  text: "text",
  slug: "text",
  number: "number",
  boolean: "switch",
  date: "date",
  select: "select",
  combobox: "combobox",
  text_list: "chip-input",
  media: "media",
  url: "url",
  richtext: "richtext",
  relationship: "text",
}

/**
 * Describes a field for `ManagerFormField`. A combobox whose options a hook gives carries the hook the
 * host registered under its name, or none when nothing is registered; a relationship with a hook is
 * such a combobox, and one without is a text input of the id. A component node describes each of its
 * fields with it.
 *
 * @param field - The field, as the collection or block type lists it.
 * @returns The field's description.
 */
export const buildFieldConfig = (field: Field): ManagerFormFieldConfig => {
  const { options } = field
  const hookSource = isOptionsHookSource(options) ? options : undefined
  const listedOptions = isOptionsHookSource(options) ? undefined : options
  const common = {
    name: field.name,
    label: field.label,
    description: field.description,
    required: field.required,
    options: listedOptions?.map(({ value, label }) => ({ value, name: label })),
    ...(field.kind === "combobox" &&
      field.multiple && { multiple: true, maxItems: field.max }),
  }

  return {
    ...common,
    type:
      field.input === "textarea"
        ? "textarea"
        : hookSource
          ? "combobox"
          : FIELD_TYPES[field.kind],
    placeholderFrom: field.placeholderFrom,
    recommendedLength: field.recommendedLength,
    ...(hookSource && {
      optionsSource: hookSource.hook,
      optionsHook: getCmsOptionsHook(hookSource.hook),
    }),
    media:
      field.kind === "media"
        ? {
            store: field.stores!,
            accept: field.mimeTypes,
            multiple: field.multiple,
            max: field.max,
          }
        : undefined,
    richText:
      field.kind === "richtext" ? { features: field.features! } : undefined,
  }
}
