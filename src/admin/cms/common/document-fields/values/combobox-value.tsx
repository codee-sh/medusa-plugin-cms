import { getCmsOptionsHook } from "../../../../../admin-extensions/registry"
import { isOptionsHookSource } from "../../../../../lib/field/is-options-hook-source"
import { ExtensionErrorBoundary } from "../../../../components/manager-form-fields/extension-error-boundary"
import { labelOptionValues } from "../../utils/label-option-values"
import { HookOptionLabels } from "./hook-option-labels"
import type { DocumentValueProps } from "./types"

/**
 * The read-only view of a `combobox` or a `relationship` field, as its input finds its options: the
 * labels the host's hook gives, or the ones its config lists. With a hook no one registered, or one
 * that throws, the value shows as it is stored. The hook's view is keyed by its source, so the hook it calls never changes
 * between renders.
 *
 * @param props - The field, its value and the page's values a hook is asked with.
 */
export const ComboboxValue = ({
  field,
  value,
  pageValues,
}: DocumentValueProps) => {
  if (!isOptionsHookSource(field.options)) {
    return <>{labelOptionValues(value, field.options ?? [])}</>
  }

  const source = field.options.hook
  const useOptions = getCmsOptionsHook(source)
  const stored = labelOptionValues(value, [])

  if (!useOptions) {
    return <>{stored}</>
  }

  return (
    <ExtensionErrorBoundary key={source} source={source} fallback={stored}>
      <HookOptionLabels
        useOptions={useOptions}
        value={value}
        pageValues={pageValues}
      />
    </ExtensionErrorBoundary>
  )
}
