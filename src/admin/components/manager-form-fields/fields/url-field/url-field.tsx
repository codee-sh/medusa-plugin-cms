import { Input } from "@medusajs/ui"
import type { ManagerFormInputProps } from "../types"

/**
 * The input of a `url` field, bound to the form's value: a text input with the URL keyboard. The browser
 * checks nothing, so a relative link reaches the form's schema, which checks it against the field's link policy.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const UrlField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => (
  <Input
    {...control}
    ref={field.ref}
    type="text"
    inputMode="url"
    autoComplete="off"
    spellCheck={false}
    name={field.name}
    value={(field.value as string | null) ?? ""}
    onChange={field.onChange}
    onBlur={field.onBlur}
    placeholder={config.placeholder}
    disabled={config.disabled}
  />
)
