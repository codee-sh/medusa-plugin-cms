import { type MutableRefObject, useEffect, useState } from "react"
import { type UseFormReturn, useWatch } from "react-hook-form"
import { useCmsTranslation } from "../../../hooks/use-cms-translation"
import type { DocumentFormValues } from "../types"
import type { ClientCollection } from "../../../../lib/collection/types"
import type { Field } from "../../../../lib/field/types"
import { useTakenValue } from "../../../hooks/api/taken-values/taken-values"

/** How long the editor pauses before a value is checked, in milliseconds. */
const CHECK_DELAY = 400

type UseTakenValueCheckInput = {
  form: UseFormReturn<DocumentFormValues>
  /** The collection, whose `unique` columns are checked. */
  collection: ClientCollection
  /** The field; only a unique one is checked. */
  field: Field
  /** The document being edited, whose own value is not taken. */
  documentId?: string
  /** Per field, the value the form wrote itself last, shared with the slug fill. */
  autoFilled: MutableRefObject<Record<string, string>>
  /** Called with whether the current value is taken. */
  onTakenChange: (column: string, taken: boolean) => void
}

/**
 * Watches a unique field and acts when another live document holds its value. Does nothing for a field
 * that is not unique, so a field's component can call it whatever its kind.
 *
 * A value the form filled in itself is replaced by the server's suggestion, its first free `-<n>`
 * form, so the editor sees the value the document will get. A value the editor typed is marked with an
 * error, and the suggestion is offered. The server refuses a taken value with a 422 too, so this is a
 * hint ahead of the save, not the check itself.
 *
 * @param input - The form, the collection, the field, the edited document's id, the values the form
 * wrote, and the callback for the result.
 * @returns The free value offered to an editor who typed a taken one, and what puts it in the field.
 */
export const useTakenValueCheck = ({
  form,
  collection,
  field,
  documentId,
  autoFilled,
  onTakenChange,
}: UseTakenValueCheckInput) => {
  const { t } = useCmsTranslation()
  const column = field.name
  const unique = collection.unique.includes(column)
  const name = `document.${column}` as const
  const value = useWatch({ control: form.control, name, disabled: !unique })
  const [checkedValue, setCheckedValue] = useState("")
  // The free form offered to an editor who typed a taken value.
  const [offer, setOffer] = useState<string>()

  useEffect(() => {
    if (!unique) {
      return
    }

    const timeout = setTimeout(
      () => setCheckedValue(typeof value === "string" ? value : ""),
      CHECK_DELAY
    )

    return () => clearTimeout(timeout)
  }, [unique, value])

  // Nothing is read while the checked value is empty, as it stays for a field that is not unique.
  const { data } = useTakenValue({
    collection: collection.slug,
    column,
    value: checkedValue,
    id: documentId,
  })
  const taken = Boolean(checkedValue) && checkedValue === value && data?.taken
  const suggestion = taken ? data?.suggestion : undefined

  useEffect(() => {
    if (!unique) {
      return
    }

    const typedByEditor = value !== autoFilled.current[column]

    if (taken && suggestion && !typedByEditor) {
      autoFilled.current[column] = suggestion
      form.setValue(name, suggestion, { shouldValidate: true })
      return
    }

    onTakenChange(column, Boolean(taken))
    setOffer(taken ? suggestion : undefined)

    if (taken) {
      form.setError(name, {
        type: "taken",
        message: t("documents.form.taken"),
      })
    } else if (form.getFieldState(name).error?.type === "taken") {
      form.clearErrors(name)
    }
  }, [
    unique,
    taken,
    suggestion,
    value,
    column,
    name,
    form,
    autoFilled,
    onTakenChange,
    t,
  ])

  /**
   * Puts the offered free value in the field.
   */
  const acceptOffer = () => {
    if (offer) {
      form.setValue(name, offer, { shouldDirty: true, shouldValidate: true })
    }
  }

  return { offer, acceptOffer }
}
