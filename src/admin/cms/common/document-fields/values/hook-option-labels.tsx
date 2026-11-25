import type { CmsOptionsHook } from "../../../../../admin-extensions/types"
import { labelOptionValues } from "../../utils/label-option-values"

type HookOptionLabelsProps = {
  /** The host's hook that gives the field its options. */
  useOptions: CmsOptionsHook
  /** The stored value: a text, or a list for a field of several values. */
  value: unknown
  /** The values the hook is asked with, a table column's on its page; the stored value when left out. */
  pageValues?: string[]
}

/**
 * Writes a combobox's stored value by the labels its host's hook gives, which it asks with the stored
 * value, as the field's input does to show it, or with the page's values in a table, so every cell of a
 * column asks alike; the value as it is stored while the hook loads or fails.
 *
 * @param props - The hook, the stored value and the page's values.
 */
export const HookOptionLabels = ({
  useOptions,
  value,
  pageValues,
}: HookOptionLabelsProps) => {
  const { options } = useOptions({
    // An empty text is no value, as the field's input tells the hook.
    value: pageValues
      ? pageValues
      : Array.isArray(value)
        ? (value as string[])
        : typeof value === "string" && value
          ? value
          : null,
  })

  return <>{labelOptionValues(value, options)}</>
}
