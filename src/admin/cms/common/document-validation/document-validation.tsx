import { useEffect, useMemo, useRef, useState } from "react"
import { useWatch } from "react-hook-form"
import { useDocumentErrors } from "../../../hooks/api/documents/documents"
import { isPendingMediaValue } from "../../../components/media"
import { useDocumentForm } from "../document-form-provider"

/** How long the editor pauses before the document is checked, in milliseconds. */
const CHECK_DELAY = 400

/**
 * Leaves out the chosen files not uploaded yet: the server cannot find them, and the save uploads them
 * first.
 *
 * @param value - A field's value.
 * @returns The value without chosen files, `null` for a field holding only one.
 */
const withoutPendingMedia = (value: unknown): unknown => {
  if (isPendingMediaValue(value)) {
    return null
  }

  return Array.isArray(value)
    ? value.filter((item) => !isPendingMediaValue(item))
    : value
}

/**
 * Asks the server to check the document's own fields once the editor pauses, and shows its errors on
 * their fields.
 *
 * Renders nothing. It is a component rather than a hook so that its watch re-renders it alone: in the
 * form itself, every keystroke would re-render the whole form. Only a field the editor has filled shows a
 * server error: a missing value is the form's own check at save, and a taken unique value is the
 * taken-value check's, which offers a free one. The areas are neither sent nor watched: the form's schema
 * checks their blocks as the editor types, and the save checks them on the server, so the check stays the
 * size of the document's own fields and typing in a block does not start it.
 *
 * It sits inside the form's `DocumentFormProvider`, which hands it the form, the collection, the edited
 * document's id, and where the errors it shows are reported.
 */
export const DocumentValidation = () => {
  const { form, collection, documentId, onServerErrorsChange } =
    useDocumentForm()
  const names = useMemo(
    () => collection.fields.map(({ name }) => name),
    [collection.fields]
  )
  // A field the form does not hold, as the create modal leaves some out, is undefined and not sent.
  const values = useWatch({
    control: form.control,
    name: names.map((name) => `document.${name}` as const),
    exact: true,
  })
  const [checked, setChecked] = useState<Record<string, unknown>>()
  // The fields this component marked, so the next answer can clear the ones that pass now.
  const marked = useRef<string[]>([])

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setChecked(
          Object.fromEntries(
            names.map((name, index) => [
              name,
              withoutPendingMedia(values[index]),
            ])
          )
        ),
      CHECK_DELAY
    )

    return () => clearTimeout(timeout)
  }, [names, values])

  const { data } = useDocumentErrors(collection.slug, checked, documentId)

  useEffect(() => {
    if (!data || !checked) {
      return
    }

    const shown = data.errors.filter(({ path }) => {
      const value = checked[path]

      return (
        path &&
        !collection.unique.includes(path) &&
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
      )
    })

    for (const path of marked.current) {
      const name = `document.${path}` as const

      if (form.getFieldState(name).error?.type === "server") {
        form.clearErrors(name)
      }
    }

    for (const { path, message } of shown) {
      form.setError(`document.${path}`, { type: "server", message })
    }

    marked.current = shown.map(({ path }) => path)
    onServerErrorsChange(shown)
  }, [data, checked, collection.unique, form, onServerErrorsChange])

  return null
}
