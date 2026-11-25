import { SLUG_FORMAT, normalizeSlug } from "../normalize-slug"

describe("normalizeSlug", () => {
  it.each([
    ["Tomato soup", "tomato-soup"],
    ["Żurek z jajkiem", "zurek-z-jajkiem"],
    ["Łódź, Kraków & Gdańsk", "lodz-krakow-gdansk"],
    ["Straße", "strasse"],
    ["  Crème brûlée!  ", "creme-brulee"],
    ["Step_2 -- done", "step-2-done"],
  ])("turns %s into %s", (text, slug) => {
    expect(normalizeSlug(text)).toBe(slug)
  })

  it.each(["Tomato soup", "Łódź, Kraków & Gdańsk", "  Æble -- ø  "])(
    "builds a slug of %s that passes the slug format",
    (text) => {
      expect(normalizeSlug(text)).toMatch(SLUG_FORMAT)
    }
  )

  it("returns an empty text when nothing can be kept", () => {
    expect(normalizeSlug("日本語 !!!")).toBe("")
  })
})
