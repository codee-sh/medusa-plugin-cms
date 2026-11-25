import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useContext,
  useMemo,
} from "react"
import type { UseFormReturn } from "react-hook-form"
import { getCmsDocumentContext } from "../../../../admin-extensions/registry"
import type { CmsDocumentSource } from "../../../../admin-extensions/types"
import type { ClientCollection } from "../../../../lib/collection/types"
import type { DocumentError } from "../../../../lib/document/types"
import type { DocumentFormValues } from "../types"
import { buildDocumentValue } from "../utils/build-document-value"

/** What the fields of one document form share. */
type DocumentFormContextValue = {
  form: UseFormReturn<DocumentFormValues>
  collection: ClientCollection
  /**
   * The document being edited, whose own unique values are not taken. With it, a slug whose field has
   * `lockOnEdit` stays locked until the editor unlocks it.
   */
  documentId?: string
  /** Per field, the value the form wrote itself last, shared by the slug fill and the check. */
  autoFilled: MutableRefObject<Record<string, string>>
  /** Called with whether a unique field's current value is taken. */
  onTakenChange: (column: string, taken: boolean) => void
  /** Called with the server errors the live validation shows now. */
  onServerErrorsChange: (errors: DocumentError[]) => void
}

type DocumentFormProviderProps = DocumentFormContextValue & {
  children: ReactNode
}

const DocumentFormContext = createContext<DocumentFormContextValue | null>(null)

/**
 * Hands a document form's fields and its live validation the form, the collection, the edited document's
 * id, and what the live checks share. Every value is stable across the form's renders, so the fields reading it render only
 * when one of them changes. It also hands a host's components the document through the context
 * `useDocumentValue` reads, which every copy of `admin-extensions` shares.
 *
 * @param props - The form, the collection, the edited document's id, the values the form wrote, the
 * callbacks for taken values and server errors, and the form's content.
 */
export const DocumentFormProvider = ({
  form,
  collection,
  documentId,
  autoFilled,
  onTakenChange,
  onServerErrorsChange,
  children,
}: DocumentFormProviderProps) => {
  const value = useMemo(
    () => ({
      form,
      collection,
      documentId,
      autoFilled,
      onTakenChange,
      onServerErrorsChange,
    }),
    [
      form,
      collection,
      documentId,
      autoFilled,
      onTakenChange,
      onServerErrorsChange,
    ]
  )

  const documentSource = useMemo<CmsDocumentSource>(
    () => ({
      subscribe: (onChange) =>
        form.subscribe({
          formState: { values: true },
          callback: () => onChange(),
        }),
      getDocument: () =>
        buildDocumentValue(collection, form.getValues("document")),
    }),
    [form, collection]
  )
  const DocumentContext = getCmsDocumentContext()

  return (
    <DocumentFormContext.Provider value={value}>
      <DocumentContext.Provider value={documentSource}>
        {children}
      </DocumentContext.Provider>
    </DocumentFormContext.Provider>
  )
}

/**
 * Reads what the fields of the document form the component sits in share.
 *
 * @returns The form, the collection, the edited document's id, the values the form wrote, and the
 * callbacks for taken values and server errors.
 * @throws When the component sits outside a `DocumentFormProvider`.
 */
export const useDocumentForm = (): DocumentFormContextValue => {
  const context = useContext(DocumentFormContext)

  if (!context) {
    throw new Error("A document field must sit inside a DocumentFormProvider")
  }

  return context
}
