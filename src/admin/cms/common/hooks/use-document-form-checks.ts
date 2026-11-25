import { useCallback, useRef } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useCmsTranslation } from "../../../hooks/use-cms-translation"
import type { DocumentFormValues } from "../types"
import type { DocumentError } from "../../../../lib/document/types"

/**
 * Keeps what a document form's live checks last reported - the server's errors on the fields and the
 * unique columns whose value another live document holds - and the values the form wrote itself, which
 * the slug fill and the taken-value check share. A save asks it first whether to stop.
 *
 * @param form - The document's form.
 * @returns The values the form wrote, the callbacks the checks report to, and `blockSave`.
 */
export const useDocumentFormChecks = (
  form: UseFormReturn<DocumentFormValues>
) => {
  const { t } = useCmsTranslation()
  // The unique columns whose current value another live document holds, as the checks last reported.
  const takenColumns = useRef(new Set<string>())
  // The server errors on the fields, as the last check reported.
  const serverErrors = useRef<DocumentError[]>([])
  // Per field, the value the form wrote itself last, so the editor's own typing can be told apart.
  const autoFilled = useRef<Record<string, string>>({})

  const onServerErrorsChange = useCallback((errors: DocumentError[]) => {
    serverErrors.current = errors
  }, [])

  const onTakenChange = useCallback((column: string, taken: boolean) => {
    if (taken) {
      takenColumns.current.add(column)
    } else {
      takenColumns.current.delete(column)
    }
  }, [])

  /**
   * Tells a save whether to stop, and if so shows why on the fields: the server's errors first, then the
   * taken values. The resolver clears errors set by hand, so they are set again here.
   *
   * @returns Whether the save stops.
   */
  const blockSave = (): boolean => {
    if (serverErrors.current.length) {
      for (const { path, message } of serverErrors.current) {
        form.setError(`document.${path}`, { type: "server", message })
      }
      return true
    }

    if (takenColumns.current.size) {
      for (const column of takenColumns.current) {
        form.setError(`document.${column}`, {
          type: "taken",
          message: t("documents.form.taken"),
        })
      }
      return true
    }

    return false
  }

  return { autoFilled, onServerErrorsChange, onTakenChange, blockSave }
}
