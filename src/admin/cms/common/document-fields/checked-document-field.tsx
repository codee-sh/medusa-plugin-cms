import { Button, Text } from "@medusajs/ui"
import { useState } from "react"
import { useCmsTranslation } from "../../../hooks/use-cms-translation"
import { ManagerFormField } from "../../../components/manager-form-fields"
import { useSlugFill } from "../hooks/use-slug-fill"
import { useTakenValueCheck } from "../hooks/use-taken-value-check"
import { buildFieldConfig } from "../utils/build-field-config"
import { useDocumentForm } from "../document-form-provider"
import type { DocumentFieldProps } from "./document-field"

/**
 * Renders a slug or a unique field of a document through `ManagerFormField`, with what belongs to it
 * under it: a slug filled from its source, a unique value checked against the live documents with a free
 * one offered, and on the document page the slug lock.
 *
 * A locked slug is disabled, with a note on what a change does and **Unlock**, which makes it editable
 * until the page is left.
 *
 * @param props - The field.
 */
export const CheckedDocumentField = ({ field }: DocumentFieldProps) => {
  const { form, collection, documentId, autoFilled, onTakenChange } =
    useDocumentForm()
  const { t } = useCmsTranslation()
  const [unlocked, setUnlocked] = useState(false)
  const locked =
    documentId !== undefined &&
    field.kind === "slug" &&
    field.lockOnEdit === true &&
    !unlocked

  useSlugFill({ form, field, autoFilled })
  const { offer, acceptOffer } = useTakenValueCheck({
    form,
    collection,
    field,
    documentId,
    autoFilled,
    onTakenChange,
  })

  return (
    <div className="flex flex-col gap-y-2">
      <ManagerFormField
        form={form}
        name="document"
        field={{ ...buildFieldConfig(field), disabled: locked }}
      />
      {locked && (
        <div className="flex items-center justify-between gap-x-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("documents.form.slugLocked", { label: field.label })}
          </Text>
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => setUnlocked(true)}
          >
            {t("documents.form.unlock")}
          </Button>
        </div>
      )}
      {offer && (
        <div>
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={acceptOffer}
          >
            {t("documents.form.useSuggestion", { value: offer })}
          </Button>
        </div>
      )}
    </div>
  )
}
