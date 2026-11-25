import { memo } from "react"
import type { Field } from "../../../../lib/field/types"
import { ManagerFormField } from "../../../components/manager-form-fields"
import { buildFieldConfig } from "../utils/build-field-config"
import { useDocumentForm } from "../document-form-provider"
import { CheckedDocumentField } from "./checked-document-field"

export type DocumentFieldProps = {
  field: Field
}

/**
 * Renders one field of a document. A slug or a unique field goes through `CheckedDocumentField`, which
 * fills, checks and locks it; any other field goes straight to `ManagerFormField`, with no hooks of its
 * own. Memoized, so a render of the form leaves the field alone: each field follows its own value and
 * error through `Form.Field`, and what the form shares comes from `DocumentFormProvider`.
 *
 * @param props - The field.
 */
export const DocumentField = memo(({ field }: DocumentFieldProps) => {
  const { form, collection } = useDocumentForm()

  return field.kind === "slug" || collection.unique.includes(field.name) ? (
    <CheckedDocumentField field={field} />
  ) : (
    <ManagerFormField
      form={form}
      name="document"
      field={buildFieldConfig(field)}
    />
  )
})
