import type { ComponentType } from "react"
import type { FieldKind } from "../../../../lib/field/types"
import { ComboboxValue } from "./values/combobox-value"
import { MediaValue } from "./values/media-value"
import { RelationshipValue } from "./values/relationship-value"
import { SelectValue } from "./values/select-value"
import { TextValue } from "./values/text-value"
import type { DocumentValueProps } from "./values/types"

/** The read-only view of each field kind, one file each in `values/`, as the form keeps its inputs. */
const DOCUMENT_FIELD_VALUES: Record<
  FieldKind,
  ComponentType<DocumentValueProps>
> = {
  text: TextValue,
  number: TextValue,
  boolean: TextValue,
  date: TextValue,
  text_list: TextValue,
  slug: TextValue,
  url: TextValue,
  richtext: TextValue,
  select: SelectValue,
  combobox: ComboboxValue,
  relationship: RelationshipValue,
  media: MediaValue,
}

/**
 * Shows a document's field value read-only, through the view of its kind.
 *
 * @param props - The field, its value, and the page's values a view that reads labels asks with.
 */
export const DocumentFieldValue = ({
  field,
  value,
  pageValues,
}: DocumentValueProps) => {
  const Value = DOCUMENT_FIELD_VALUES[field.kind]

  return <Value field={field} value={value} pageValues={pageValues} />
}
