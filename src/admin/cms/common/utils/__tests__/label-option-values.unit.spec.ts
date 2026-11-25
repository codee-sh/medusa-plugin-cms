import { EMPTY_FIELD_VALUE } from "../format-field-value"
import { labelOptionValues } from "../label-option-values"

const options = [
  { value: "left", label: "Image on the left" },
  { value: "right", label: "Image on the right" },
]

describe("labelOptionValues", () => {
  it("writes a stored value by its option's label", () => {
    expect(labelOptionValues("left", options)).toBe("Image on the left")
  })

  it("joins several values' labels with commas", () => {
    expect(labelOptionValues(["right", "left"], options)).toBe(
      "Image on the right, Image on the left"
    )
  })

  it("writes a value no option has as it is stored", () => {
    expect(labelOptionValues("center", options)).toBe("center")
  })

  it.each([null, "", []])("writes %p as a dash", (value) => {
    expect(labelOptionValues(value, options)).toBe(EMPTY_FIELD_VALUE)
  })
})
