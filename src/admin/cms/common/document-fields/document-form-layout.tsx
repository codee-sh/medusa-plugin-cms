import type { Field } from "../../../../lib/field/types"
import { ComponentNode } from "../component-node"
import {
  FormLayout,
  type LayoutItemConfig,
} from "../../../components/manager-form-fields"
import { useDocumentForm } from "../document-form-provider"
import { DocumentField } from "./document-field"

type DocumentFormLayoutProps = {
  /** The fields the layout names, or the fields to render one under another when there is none. */
  fields: Field[]
  /** How a section lays its fields out; the fields one under another when left out. */
  layout?: LayoutItemConfig[]
}

/**
 * Renders a section of a document's fields in its layout, or one under another in their order, each
 * through `DocumentField`. It sits inside the form's `DocumentFormProvider`.
 *
 * @param props - The fields and their layout.
 */
export const DocumentFormLayout = ({
  fields,
  layout = fields.map(({ name }) => name),
}: DocumentFormLayoutProps) => {
  const { form } = useDocumentForm()

  return (
    <FormLayout
      form={form}
      name="document"
      layout={layout}
      items={fields}
      renderItem={(field) => <DocumentField field={field} />}
      renderComponent={(node, nodeFields) => (
        <ComponentNode
          form={form}
          name="document"
          node={node}
          fields={nodeFields}
        />
      )}
    />
  )
}
