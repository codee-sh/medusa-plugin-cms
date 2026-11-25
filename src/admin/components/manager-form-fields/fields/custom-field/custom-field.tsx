import { Input, Text } from "@medusajs/ui"
import { Suspense } from "react"
import { get, useFormState } from "react-hook-form"
import { useManagerFormFieldsTranslation } from "../../hooks/use-manager-form-fields-translation"
import { ExtensionErrorBoundary } from "../../extension-error-boundary"
import { buildComponentProps } from "../../utils/build-component-props"
import type { ManagerFormInputProps } from "../types"
import { formatStoredValue } from "../../utils/format-stored-value"
import { getLazyComponent } from "../../utils/get-lazy-component"

type UnavailableCustomFieldProps = ManagerFormInputProps & {
  /** Why the field cannot draw its input. */
  message: string
}

/**
 * A custom field that cannot draw its input: disabled, showing the value it holds as text, with the
 * reason under it. The form keeps the value, so a save sends it unchanged.
 *
 * @param props - The field, its binding to the form, what `Form.Control` hands it, and the reason.
 */
const UnavailableCustomField = ({
  config,
  field,
  message,
  ...control
}: UnavailableCustomFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Input
      {...control}
      ref={field.ref}
      name={field.name}
      value={formatStoredValue(field.value)}
      disabled
      readOnly
    />
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {message}
    </Text>
  </div>
)

/**
 * The input of a `custom` field: the component its config gives, or the one its loader imports when the
 * field is first shown, handed - under its key, the field's name unless a layout node maps another - its
 * value, its handlers, its config, its error, and what ties its input to the label, the hint and the
 * error. While a loader imports it, and with no component, or one that
 * throws or fails to load, the field is disabled, shows what it holds and says why. The component is
 * keyed by its name, so a failure stays with the component that threw.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const CustomField = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => {
  const { t } = useManagerFormFieldsTranslation()
  // Watches this field's error only, so a change elsewhere in the form does not render the component.
  const { errors } = useFormState({ name: field.name })
  const FieldComponent =
    config.component ??
    (config.loadComponent && getLazyComponent(config.loadComponent))

  if (!FieldComponent) {
    return (
      <UnavailableCustomField
        {...control}
        config={config}
        field={field}
        message={t("custom.unavailable", {
          name: config.componentSource,
        })}
      />
    )
  }

  return (
    <ExtensionErrorBoundary
      key={config.componentSource}
      source={config.componentSource}
      fallback={
        <UnavailableCustomField
          {...control}
          config={config}
          field={field}
          message={t("custom.failed")}
        />
      }
    >
      <Suspense
        fallback={
          <UnavailableCustomField
            {...control}
            config={config}
            field={field}
            message={t("custom.loading")}
          />
        }
      >
        <FieldComponent
          {...buildComponentProps([
            {
              key: config.componentKey ?? config.name,
              config,
              field,
              error: get(errors, field.name)?.message,
              control,
            },
          ])}
        />
      </Suspense>
    </ExtensionErrorBoundary>
  )
}
