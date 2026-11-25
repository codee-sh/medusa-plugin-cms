import { useMemo } from "react"
import {
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  useFormState,
} from "react-hook-form"
import { countLayoutErrors } from "../utils/count-layout-errors"

/**
 * Counts the errors of the items a part of a form lays out, re-rendering only when the errors at their
 * paths change.
 *
 * @param form - The form.
 * @param name - The form path the items sit under.
 * @param names - The items' names.
 * @returns The number of error messages under the items.
 */
export const useLayoutErrorCount = <TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  name: string,
  names: string[]
): number => {
  const paths = useMemo(
    // The paths are built from the items' names at runtime, so their type is only a form path.
    () => names.map((itemName) => `${name}.${itemName}` as FieldPath<TValues>),
    [name, names]
  )
  const { errors } = useFormState({ control: form.control, name: paths })

  return countLayoutErrors(errors, name, names)
}
