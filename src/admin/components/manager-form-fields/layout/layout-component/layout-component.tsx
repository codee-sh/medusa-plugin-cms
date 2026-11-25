import { Input, Label, Text } from "@medusajs/ui"
import { Suspense } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { useManagerFormFieldsTranslation } from "../../hooks/use-manager-form-fields-translation"
import { ExtensionErrorBoundary } from "../../extension-error-boundary"
import { formatStoredValue } from "../../utils/format-stored-value"
import { getLazyComponent } from "../../utils/get-lazy-component"
import type { CustomFieldComponent, CustomFieldLoader } from "../../types"
import {
  buildComponentProps,
  type ComponentFieldBinding,
} from "../../utils/build-component-props"
import { BoundEntries } from "./bound-entries"
import { LayoutGroup } from "../layout-group"
import { LayoutItems } from "../layout-items"
import type { LayoutComponentEntry } from "../types"

type LayoutComponentProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the items sit under; each item's own name follows it. */
  name: string
  /** A header over the component, drawn as a group's; none when left out. */
  label?: string
  description?: string
  /** The items the component edits, in the layout's order. */
  entries: LayoutComponentEntry[]
  /** The component, or with none of it nor a loader, the items' values shown disabled. */
  // A component typed for its own keys fits no narrower type, as its props are read where it is called.
  component?: CustomFieldComponent<any>
  /** The loader of the component, imported when the node is first shown. */
  loadComponent?: CustomFieldLoader
  /** The component's name, shown when none is given and logged when it throws. */
  componentSource: string
}

type UnavailableEntriesProps = {
  bound: ComponentFieldBinding[]
  /** Why the component cannot draw its items. */
  message: string
}

/**
 * The items of a component that cannot draw them: each one's stored value disabled under its label, and
 * the reason once. The form keeps the values, so a save sends them unchanged.
 *
 * @param props - The bound entries and the reason.
 */
const UnavailableEntries = ({ bound, message }: UnavailableEntriesProps) => (
  <LayoutItems>
    {bound.map(({ key, config, field, control }) => (
      <div key={key} className="flex flex-col gap-y-2">
        <Label size="small" weight="plus" htmlFor={control.id}>
          {config.label}
        </Label>
        <Input
          id={control.id}
          ref={field.ref}
          name={field.name}
          value={formatStoredValue(field.value)}
          disabled
          readOnly
        />
      </div>
    ))}
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {message}
    </Text>
  </LayoutItems>
)

/**
 * A component node of several items: binds each item to the form, hands the component their values,
 * handlers, configs, errors and input props under their keys, and lets it draw every input, label and
 * error. Under the node's label when it has one, as a group. While a loader imports the component, and
 * with none, or one that throws or fails to load, each item's stored value shows disabled with the
 * reason.
 *
 * @param props - The form, the path, the header, the entries, and the component or its loader.
 */
export const LayoutComponent = <TValues extends FieldValues>({
  form,
  name,
  label,
  description,
  entries,
  component,
  loadComponent,
  componentSource,
}: LayoutComponentProps<TValues>) => {
  const { t } = useManagerFormFieldsTranslation()
  const NodeComponent =
    component ?? (loadComponent && getLazyComponent(loadComponent))

  const content = (
    <BoundEntries
      form={form}
      name={name}
      entries={entries}
      bound={[]}
      render={(bound) =>
        NodeComponent ? (
          <ExtensionErrorBoundary
            key={componentSource}
            source={componentSource}
            fallback={
              <UnavailableEntries bound={bound} message={t("custom.failed")} />
            }
          >
            <Suspense
              fallback={
                <UnavailableEntries
                  bound={bound}
                  message={t("custom.loading")}
                />
              }
            >
              <NodeComponent {...buildComponentProps(bound)} />
            </Suspense>
          </ExtensionErrorBoundary>
        ) : (
          <UnavailableEntries
            bound={bound}
            message={t("custom.unavailable", {
              name: componentSource,
            })}
          />
        )
      }
    />
  )

  return label ? (
    <LayoutGroup label={label} description={description}>
      {content}
    </LayoutGroup>
  ) : (
    content
  )
}
