import type { ComboboxOption } from "../limit-options"
import { withStoredOptions } from "../with-stored-options"

const OPTIONS: ComboboxOption[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
]

/**
 * Labels a value no option has, as a test can recognise it.
 *
 * @param value - The value.
 * @returns Its label.
 */
const labelOf = (value: string) => `Unknown value: ${value}`

describe("withStoredOptions", () => {
  it("puts a held value no option has first, with its built label", () => {
    expect(withStoredOptions(OPTIONS, ["x"], labelOf)).toEqual([
      { value: "x", label: "Unknown value: x" },
      ...OPTIONS,
    ])
  })

  it("adds only the held values that are missing, in their order", () => {
    expect(
      withStoredOptions(OPTIONS, ["y", "a", "x"], labelOf).map(
        ({ value }) => value
      )
    ).toEqual(["y", "x", "a", "b"])
  })

  it("returns the same options when every held value has one", () => {
    expect(withStoredOptions(OPTIONS, ["a", "b"], labelOf)).toBe(OPTIONS)
  })

  it("returns the same options when nothing is held", () => {
    expect(withStoredOptions(OPTIONS, [], labelOf)).toBe(OPTIONS)
  })
})
