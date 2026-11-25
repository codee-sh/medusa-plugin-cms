import type { FieldValues, UseFormReturn } from "react-hook-form"
import {
  getCmsFieldComponent,
  getCmsFieldComponentLoader,
} from "../../../../admin-extensions/registry"
import type { Field } from "../../../../lib/field/types"
import {
  type KeyedItem,
  type LayoutComponentConfig,
  LayoutComponent,
  ManagerFormField,
} from "../../../components/manager-form-fields"
import { buildFieldConfig } from "../utils/build-field-config"

type ComponentNodeProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the node's fields sit under: the document's, or a block's. */
  name: string
  node: LayoutComponentConfig
  /** The fields the node edits, each under the key its component reads it under, in the node's order. */
  fields: KeyedItem<Field>[]
}

/**
 * Renders a component node of a document's or a block's layout with the component, or the loader, the
 * host registered under its name. A node of one field looks like the field: `ManagerFormField` draws its
 * label, description and error around the component. A node of several fields renders through
 * `LayoutComponent`, which lets the component draw every input, label and error.
 *
 * @param props - The form, the path, the node and its fields.
 */
export const ComponentNode = <TValues extends FieldValues>({
  form,
  name,
  node,
  fields,
}: ComponentNodeProps<TValues>) => {
  const component = {
    component: getCmsFieldComponent(node.component),
    loadComponent: getCmsFieldComponentLoader(node.component)?.load,
    componentSource: node.component,
  }

  if (fields.length === 1) {
    const [{ key, item }] = fields

    return (
      <ManagerFormField
        form={form}
        name={name}
        field={{
          ...buildFieldConfig(item),
          ...component,
          type: "custom",
          componentKey: key,
        }}
      />
    )
  }

  return (
    <LayoutComponent
      form={form}
      name={name}
      label={node.label}
      description={node.description}
      entries={fields.map(({ key, item }) => ({
        key,
        config: buildFieldConfig(item),
      }))}
      {...component}
    />
  )
}
