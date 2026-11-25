import type { Field } from "../../../../../lib/field/types"
import { buildFieldFilters } from "../build-field-filters"

/** The labels of a boolean's options. */
const LABELS = { yes: "Yes", no: "No" }

/** A collection's fields: a select of three options, a boolean and a text. */
const FIELDS: Field[] = [
  {
    name: "segment_id",
    kind: "select",
    label: "Market",
    searchable: false,
    options: [
      { value: "pl", label: "Poland" },
      { value: "cz", label: "Czechia" },
      { value: "de", label: "Germany" },
    ],
  },
  { name: "vegan", kind: "boolean", label: "Vegan", searchable: false },
  { name: "title", kind: "text", label: "Title", searchable: true },
]

describe("buildFieldFilters", () => {
  it("builds a select's options to tick and a boolean's yes or no, in the table's order", () => {
    expect(buildFieldFilters(FIELDS, ["vegan", "segment_id"], LABELS)).toEqual([
      {
        id: "vegan",
        type: "radio",
        label: "Vegan",
        options: [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
      {
        id: "segment_id",
        type: "multiselect",
        label: "Market",
        options: [
          { value: "pl", label: "Poland" },
          { value: "cz", label: "Czechia" },
          { value: "de", label: "Germany" },
        ],
      },
    ])
  })

  it("builds no filter for a name the fields do not have", () => {
    expect(buildFieldFilters(FIELDS, ["nope"], LABELS)).toEqual([])
  })
})
