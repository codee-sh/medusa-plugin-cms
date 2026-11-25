import type { FieldErrors } from "react-hook-form"
import { collectLayoutNames } from "../collect-layout-names"
import { countLayoutErrors } from "../count-layout-errors"

/**
 * Types plain test objects as the form's errors, which react-hook-form builds at runtime.
 *
 * @param errors - The errors, as react-hook-form shapes them.
 * @returns The same object.
 */
const asErrors = (errors: object) => errors as FieldErrors

describe("countLayoutErrors", () => {
  it("counts one error per failing field under the path", () => {
    const errors = {
      document: {
        title: { type: "required", message: "Required" },
        slug: {
          type: "server",
          message: "Taken",
          ref: { focus: () => undefined },
        },
        intro: { type: "too_big", message: "Too long" },
      },
    }

    expect(
      countLayoutErrors(asErrors(errors), "document", [
        "title",
        "slug",
        "cover",
      ])
    ).toBe(2)
  })

  it("counts each failing field of a list's rows and the list's own error at its root", () => {
    const sections = Object.assign(
      [
        { heading: { type: "required", message: "Required" } },
        undefined,
        {
          heading: { type: "required", message: "Required" },
          body: { type: "too_big", message: "Too long" },
        },
      ],
      { root: { type: "too_small", message: "Add a block" } }
    )

    expect(
      countLayoutErrors(asErrors({ document: { sections } }), "document", [
        "sections",
      ])
    ).toBe(4)
  })

  it("counts the errors of fields under a block's path", () => {
    const errors = {
      document: {
        sections: [{ cta_href: { type: "server", message: "Not a link" } }],
      },
    }

    expect(
      countLayoutErrors(asErrors(errors), "document.sections.0", [
        "cta_label",
        "cta_href",
      ])
    ).toBe(1)
  })

  it("counts nothing without errors", () => {
    expect(countLayoutErrors(asErrors({}), "document", ["title"])).toBe(0)
  })

  it("counts the errors of a component node's fields by their names, not the component's keys", () => {
    const errors = {
      document: {
        cta_href: { type: "custom", message: "Start the link with / or http" },
      },
    }
    const names = collectLayoutNames([
      {
        type: "component",
        component: "link",
        fields: { href: "cta_href", external: "cta_external" },
      },
    ])

    expect(countLayoutErrors(asErrors(errors), "document", names)).toBe(1)
  })
})
