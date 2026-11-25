import type { FieldConfig } from "../config/types"
import type { FieldKind } from "./types"

/** Per field type, the kind of field it makes and the column data types it may sit on. */
export const FIELD_TYPES: Record<
  FieldConfig["type"],
  { kind: FieldKind; dataTypes: string[] }
> = {
  text: { kind: "text", dataTypes: ["text"] },
  textarea: { kind: "text", dataTypes: ["text"] },
  slug: { kind: "slug", dataTypes: ["text"] },
  media: { kind: "media", dataTypes: ["text", "array"] },
  number: { kind: "number", dataTypes: ["number", "float", "bigNumber"] },
  boolean: { kind: "boolean", dataTypes: ["boolean"] },
  date: { kind: "date", dataTypes: ["dateTime"] },
  select: { kind: "select", dataTypes: ["text", "enum"] },
  combobox: { kind: "combobox", dataTypes: ["text", "enum", "array"] },
  text_list: { kind: "text_list", dataTypes: ["array"] },
  url: { kind: "url", dataTypes: ["text"] },
  richtext: { kind: "richtext", dataTypes: ["text"] },
  // A `belongsTo`'s foreign key, which the model's description gives as a text column.
  relationship: { kind: "relationship", dataTypes: ["text"] },
}
