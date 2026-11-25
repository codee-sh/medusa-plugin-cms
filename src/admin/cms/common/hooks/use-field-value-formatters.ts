import { useDate } from "@medusajs/dashboard/hooks"
import { useMemo } from "react"
import { useCmsTranslation } from "../../../hooks/use-cms-translation"
import type { FieldValueFormatters } from "../utils/format-field-value"

/**
 * Gives `formatFieldValue` the editor's language: a date in full, as the dashboard writes it, and a
 * boolean as yes or no.
 *
 * @returns The formatters, rebuilt when the language changes.
 */
export const useFieldValueFormatters = (): FieldValueFormatters => {
  const { t } = useCmsTranslation()
  const { getFullDate } = useDate()

  return useMemo(
    () => ({
      date: (value) => getFullDate({ date: value }),
      boolean: (value) =>
        value ? t("documents.values.yes") : t("documents.values.no"),
    }),
    [t, getFullDate]
  )
}
