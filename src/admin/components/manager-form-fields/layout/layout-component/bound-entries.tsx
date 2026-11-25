import { type ReactNode, useId } from "react"
import {
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  useController,
} from "react-hook-form"
import type { ComponentFieldBinding } from "../../utils/build-component-props"
import type { LayoutComponentEntry } from "../types"

type BoundEntriesProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the entries sit under; each entry's own name follows it. */
  name: string
  entries: LayoutComponentEntry[]
  /** The entries bound so far, in order. */
  bound: ComponentFieldBinding[]
  /** Renders once every entry is bound. */
  render: (bound: ComponentFieldBinding[]) => ReactNode
}

/**
 * Binds the next entry to the form and hands the rest on, so each entry's `useController` runs in a
 * component of its own rather than in a loop; renders `render` once every entry is bound.
 *
 * @param props - The form, the path, the entries, those bound so far, and what to render at the end.
 */
export const BoundEntries = <TValues extends FieldValues>({
  form,
  name,
  entries,
  bound,
  render,
}: BoundEntriesProps<TValues>) =>
  bound.length === entries.length ? (
    <>{render(bound)}</>
  ) : (
    <BindNextEntry
      form={form}
      name={name}
      entries={entries}
      bound={bound}
      render={render}
    />
  )

/**
 * Binds one entry, the first not bound yet, with `useController`, then hands the rest on.
 *
 * @param props - The form, the path, the entries, those bound so far, and what to render at the end.
 */
const BindNextEntry = <TValues extends FieldValues>({
  form,
  name,
  entries,
  bound,
  render,
}: BoundEntriesProps<TValues>) => {
  const entry = entries[bound.length]
  const id = useId()
  const { field, fieldState } = useController({
    control: form.control,
    // The path is built from the entry's name at runtime, so its type is only a form path.
    name: `${name}.${entry.config.name}` as FieldPath<TValues>,
  })

  return (
    <BoundEntries
      form={form}
      name={name}
      entries={entries}
      bound={[
        ...bound,
        {
          ...entry,
          field,
          error: fieldState.error?.message,
          control: { id, "aria-invalid": fieldState.invalid },
        },
      ]}
      render={render}
    />
  )
}
