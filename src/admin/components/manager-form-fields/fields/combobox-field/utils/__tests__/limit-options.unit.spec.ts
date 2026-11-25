import { type ComboboxOption, limitOptions } from "../limit-options"

const OPTIONS: ComboboxOption[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
]

describe("limitOptions", () => {
  it("disables nothing while fewer values than the most are chosen", () => {
    expect(limitOptions(OPTIONS, ["a"], 2)).toEqual(OPTIONS)
  })

  it("disables the options not chosen once the most are chosen", () => {
    expect(limitOptions(OPTIONS, ["a", "c"], 2)).toEqual([
      { value: "a", label: "A" },
      { value: "b", label: "B", disabled: true },
      { value: "c", label: "C" },
    ])
  })

  it("disables nothing without a limit", () => {
    expect(limitOptions(OPTIONS, ["a", "b", "c"], undefined)).toEqual(OPTIONS)
  })
})
