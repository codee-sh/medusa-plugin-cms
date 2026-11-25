import { listRevivedRows } from "../list-revived-rows"

const LIVE = [
  { key: "TestRecipe", ids: ["trec_1"] },
  { key: "TestSection", ids: ["tsec_1"] },
  { key: "TestStep", ids: ["tstep_1"] },
  { key: "TestCallout", ids: [] },
]

describe("listRevivedRows", () => {
  it("finds the restored rows that were not live, per model", () => {
    const revived = listRevivedRows(
      {
        test_recipe_id: ["trec_1"],
        test_section_id: ["tsec_1"],
        test_step_id: ["tstep_1", "tstep_old"],
        test_callout_id: ["tcall_old"],
      },
      LIVE
    )

    expect(revived).toEqual([
      { key: "TestStep", ids: ["tstep_old"] },
      { key: "TestCallout", ids: ["tcall_old"] },
    ])
  })

  it("leaves out the rows of a model the live rows do not list", () => {
    expect(listRevivedRows({ test_tip_id: ["ttip_1"] }, LIVE)).toEqual([])
  })

  it("finds nothing when the restore brought back only live rows", () => {
    expect(listRevivedRows({ test_recipe_id: ["trec_1"] }, LIVE)).toEqual([])
  })
})
