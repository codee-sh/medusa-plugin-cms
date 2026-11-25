import type { UseFormReturn } from "react-hook-form"
import { parseDocumentErrors } from "../../../../lib/document/document-errors"
import type { DocumentFormValues } from "../types"

/**
 * Shows the errors of a save the server refused on the form's fields.
 *
 * @param form - The document form.
 * @param message - The error's message, one `<path>: <message>` per line.
 * @param fields - The names of the fields and areas the form shows; a block's path, as
 * `sections.2.heading`, lands under its area's name.
 * @returns The lines no field of the form shows, for a toast.
 */
export const setServerErrors = (
  form: UseFormReturn<DocumentFormValues>,
  message: string,
  fields: string[]
): string[] =>
  parseDocumentErrors(message).flatMap((error) => {
    if (!fields.includes(error.path.split(".")[0])) {
      return [error.path ? `${error.path}: ${error.message}` : error.message]
    }

    form.setError(`document.${error.path}`, {
      type: "server",
      message: error.message,
    })

    return []
  })
