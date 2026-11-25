import { Combobox } from "@medusajs/dashboard/components"
import { Text } from "@medusajs/ui"
import { useManagerFormFieldsTranslation } from "../../hooks/use-manager-form-fields-translation"
import type { ManagerFormFieldConfig, OptionsHook } from "../../types"
import { ExtensionErrorBoundary } from "../../extension-error-boundary"
import type { FieldBinding, ManagerFormInputProps } from "../types"
import { limitOptions } from "./utils/limit-options"
import { toComboboxOptions } from "./utils/to-combobox-options"
import { withStoredOptions } from "./utils/with-stored-options"

type HookComboboxProps = ManagerFormInputProps & {
  useOptions: OptionsHook
}

type UnavailableComboboxProps = ManagerFormInputProps & {
  /** Why the field has no options. */
  message: string
}

/** A combobox bound to the form: one value as a text, several as a list of texts. */
type ComboboxBinding = {
  /** The values held, as a list for both: what the options are limited by. */
  chosen: string[]
  /** What the hook gets: a text or `null` for one value, a list for several. */
  stored: string | string[] | null
  /** The `Combobox`'s own props for the value. */
  props: {
    value?: string | string[]
    onChange: (next?: string | string[]) => void
    displayMode?: "chips"
  }
}

/**
 * Binds a combobox to the form's value: a list of texts with `multiple`, written back as a list, and a
 * text otherwise, written back as a text or `null`.
 *
 * @param config - The field.
 * @param field - Its binding to the form.
 * @returns The value in each shape a combobox needs it.
 */
const bindCombobox = (
  config: ManagerFormFieldConfig,
  field: FieldBinding
): ComboboxBinding => {
  if (config.multiple) {
    const values = Array.isArray(field.value)
      ? field.value.filter((held): held is string => typeof held === "string")
      : []

    return {
      chosen: values,
      stored: values,
      props: {
        value: values,
        onChange: (next) => field.onChange(Array.isArray(next) ? next : []),
        displayMode: "chips",
      },
    }
  }

  const value =
    typeof field.value === "string" && field.value ? field.value : null

  return {
    chosen: value ? [value] : [],
    stored: value,
    props: {
      value: value ?? undefined,
      onChange: (next) =>
        field.onChange(typeof next === "string" && next ? next : null),
    },
  }
}

/**
 * Labels a held value by the value itself.
 *
 * @param value - The value.
 * @returns The value.
 */
const rawLabel = (value: string): string => value

/**
 * A combobox that cannot offer its options: disabled, showing the values it holds as they are stored,
 * with the reason under it. The form keeps the values, so a save sends them unchanged.
 *
 * @param props - The field, its binding to the form, what `Form.Control` hands it, and the reason.
 */
const UnavailableCombobox = ({
  config,
  field,
  message,
  ...control
}: UnavailableComboboxProps) => {
  const binding = bindCombobox(config, field)

  return (
    <div className="flex flex-col gap-y-2">
      <Combobox
        {...control}
        value={binding.props.value}
        displayMode={binding.props.displayMode}
        ref={field.ref}
        name={field.name}
        options={withStoredOptions([], binding.chosen, rawLabel)}
        disabled
      />
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {message}
      </Text>
    </div>
  )
}

/**
 * The combobox over the options its hook gives: search and more pages when the hook has them. A held
 * value the options lack shows as it is stored while nothing is typed, as the hook fetches its record
 * apart and does not say when; a hook that reports an error leaves the field unavailable.
 *
 * @param props - The field, its binding to the form, what `Form.Control` hands it, and the hook.
 */
const HookCombobox = ({
  config,
  field,
  useOptions,
  ...control
}: HookComboboxProps) => {
  const { t } = useManagerFormFieldsTranslation()
  const binding = bindCombobox(config, field)
  const {
    options,
    isError,
    searchValue,
    onSearchValueChange,
    fetchNextPage,
    isFetchingNextPage,
  } = useOptions({ value: binding.stored })

  if (isError) {
    return (
      <UnavailableCombobox
        {...control}
        config={config}
        field={field}
        message={t("combobox.loadFailed")}
      />
    )
  }

  const shown = searchValue
    ? options
    : withStoredOptions(options, binding.chosen, rawLabel)

  return (
    <Combobox
      {...control}
      {...binding.props}
      ref={field.ref}
      name={field.name}
      onBlur={field.onBlur}
      options={limitOptions(shown, binding.chosen, config.maxItems)}
      searchValue={searchValue}
      onSearchValueChange={onSearchValueChange}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={isFetchingNextPage}
      allowClear
      disabled={config.disabled}
    />
  )
}

/**
 * The input of a `combobox` field, bound to the form's value: one value, or several shown as chips with
 * `multiple`, no more than `maxItems`. Its options are the ones its config lists, which the combobox
 * searches itself, or the ones the hook its config gives. A held value the listed options lack shows as
 * an unknown value the editor can remove. With a source named and no hook for it, or a hook that fails
 * or throws, the field is disabled, shows what it holds and says why. The hook's combobox is keyed by
 * its source, so the hook it calls never changes between renders.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const ComboboxField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => {
  const { t } = useManagerFormFieldsTranslation()

  if (config.optionsHook) {
    return (
      <ExtensionErrorBoundary
        key={config.optionsSource}
        source={config.optionsSource}
        fallback={
          <UnavailableCombobox
            {...control}
            config={config}
            field={field}
            message={t("combobox.loadFailed")}
          />
        }
      >
        <HookCombobox
          {...control}
          config={config}
          field={field}
          useOptions={config.optionsHook}
        />
      </ExtensionErrorBoundary>
    )
  }

  if (config.optionsSource) {
    return (
      <UnavailableCombobox
        {...control}
        config={config}
        field={field}
        message={t("combobox.unavailable", {
          name: config.optionsSource,
        })}
      />
    )
  }

  const binding = bindCombobox(config, field)
  const listed = withStoredOptions(
    toComboboxOptions(config.options),
    binding.chosen,
    (value) => t("combobox.unknownValue", { value })
  )

  return (
    <Combobox
      {...control}
      {...binding.props}
      ref={field.ref}
      name={field.name}
      onBlur={field.onBlur}
      options={limitOptions(listed, binding.chosen, config.maxItems)}
      allowClear
      disabled={config.disabled}
    />
  )
}
