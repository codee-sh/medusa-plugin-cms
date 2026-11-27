import { Text } from "@medusajs/ui"
import { lazy, Suspense } from "react"
import { useManagerFormFieldsTranslation } from "../../hooks/use-manager-form-fields-translation"
import type { ManagerFormInputProps } from "../types"
import { EDITOR_MIN_HEIGHT } from "./editor-min-height"

// The only way into Lexical: the editor and Lexical load as their own chunk when a field first shows.
const RichTextEditor = lazy(() => import("./richtext-editor"))

/**
 * Stands in for the editor while its chunk loads, in the editor's shape.
 */
const EditorPlaceholder = () => {
  const { t } = useManagerFormFieldsTranslation()

  return (
    <div
      className="bg-ui-bg-field shadow-borders-base flex items-start rounded-md px-3 py-2"
      style={{ minHeight: EDITOR_MIN_HEIGHT }}
    >
      <Text size="small" leading="compact" className="text-ui-fg-muted">
        {t("richText.loading")}
      </Text>
    </div>
  )
}

/**
 * The input of a `richtext` field: a Lexical editor bound to the form's value, a serialized document.
 * The editor and Lexical are imported when the field is first shown, so a form without one never loads
 * them.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
export const RichTextField = (props: ManagerFormInputProps) => (
  <Suspense fallback={<EditorPlaceholder />}>
    <RichTextEditor {...props} />
  </Suspense>
)
