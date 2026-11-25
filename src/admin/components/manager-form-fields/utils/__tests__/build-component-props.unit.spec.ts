import type { FieldBinding } from "../../fields/types"
import {
  buildComponentProps,
  type ComponentFieldBinding,
} from "../build-component-props"

/**
 * Binds a field of the given name to mock handlers.
 *
 * @param name - The field's path in the form.
 * @param value - Its stored value.
 * @returns The binding.
 */
const bindField = (name: string, value: unknown): FieldBinding => ({
  name,
  value,
  onChange: jest.fn(),
  onBlur: jest.fn(),
  ref: jest.fn(),
})

/**
 * Builds the binding of a field a component reads under a key.
 *
 * @param key - The key the component reads it under.
 * @param overrides - What the test sets.
 * @returns The binding.
 */
const bindingOf = (
  key: string,
  overrides: Partial<ComponentFieldBinding> = {}
): ComponentFieldBinding => ({
  key,
  config: { name: key, label: key, type: "custom" },
  field: bindField(`document.${key}`, null),
  control: {},
  ...overrides,
})

describe("buildComponentProps", () => {
  it("hands each field's value, config, error and input props under its key", () => {
    const href = bindingOf("href", {
      config: {
        name: "cta_href",
        label: "Link",
        type: "custom",
        required: "publish",
        options: [{ value: "/offer", name: "Offer" }],
        multiple: true,
        maxItems: 3,
      },
      field: bindField("document.cta_href", "/offer"),
      error: "Start the link with /",
      control: { id: "href-input", "aria-invalid": true },
    })

    const props = buildComponentProps([href])

    expect(props.values).toEqual({ href: "/offer" })
    expect(props.fields.href).toEqual({
      label: "Link",
      required: "publish",
      options: [{ value: "/offer", label: "Offer" }],
      multiple: true,
      max: 3,
    })
    expect(props.errors).toEqual({ href: "Start the link with /" })
    expect(props.inputProps.href).toEqual({
      id: "href-input",
      "aria-invalid": true,
      name: "document.cta_href",
      ref: href.field.ref,
    })
  })

  it("writes and blurs the field of the key it is given", () => {
    const href = bindingOf("href")
    const external = bindingOf("external")
    const props = buildComponentProps([href, external])

    props.onChange("external", true)
    props.onBlur("href")

    expect(external.field.onChange).toHaveBeenCalledWith(true)
    expect(href.field.onChange).not.toHaveBeenCalled()
    expect(href.field.onBlur).toHaveBeenCalled()
  })

  it("is disabled when any of its fields is", () => {
    const props = buildComponentProps([
      bindingOf("href"),
      bindingOf("external", {
        config: {
          name: "external",
          label: "External",
          type: "custom",
          disabled: true,
        },
      }),
    ])

    expect(props.disabled).toBe(true)
  })
})
