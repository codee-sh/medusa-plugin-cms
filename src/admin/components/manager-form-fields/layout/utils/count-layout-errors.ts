import { type FieldErrors, get } from "react-hook-form"

/**
 * Counts the error messages in an error of react-hook-form: one for a field, and for a list each failing
 * field of its rows plus the list's own error, which sits at the list or its `root`.
 *
 * @param error - The error at a path, if any.
 * @returns The number of messages under it.
 */
const countMessages = (error: unknown): number => {
  if (!error || typeof error !== "object") {
    return 0
  }

  if (typeof (error as { message?: unknown }).message === "string") {
    return 1
  }

  return Object.entries(error).reduce(
    // `ref` holds the field's element, which is no error.
    (count, [key, value]) =>
      key === "ref" ? count : count + countMessages(value),
    0
  )
}

/**
 * Counts the errors of the items a part of a form lays out, such as a tab or a collapsible.
 *
 * @param errors - The form's errors.
 * @param name - The form path the items sit under.
 * @param names - The items' names.
 * @returns The number of error messages under the items.
 */
export const countLayoutErrors = (
  errors: FieldErrors,
  name: string,
  names: string[]
): number =>
  names.reduce(
    (count, itemName) =>
      count + countMessages(get(errors, `${name}.${itemName}`)),
    0
  )
