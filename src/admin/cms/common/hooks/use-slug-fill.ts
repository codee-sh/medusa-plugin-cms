import { type MutableRefObject, useEffect } from "react"
import { type UseFormReturn, useWatch } from "react-hook-form"
import type { DocumentFormValues } from "../types"
import type { Field } from "../../../../lib/field/types"
import { normalizeSlug } from "../../../../shared/slug/normalize-slug"

/** How long the editor pauses typing the source before the slug follows, in milliseconds. */
const FILL_DELAY = 400

type UseSlugFillInput = {
  form: UseFormReturn<DocumentFormValues>
  /** The field; only a slug built by `normalizeSlug` from a source is filled. */
  field: Field
  /** Per field, the value the form wrote itself last, shared with the check of taken values. */
  autoFilled: MutableRefObject<Record<string, string>>
}

/**
 * Fills a slug from its source once the editor pauses typing it, until the editor changes the slug. Does
 * nothing for any other field, so a field's component can call it whatever its kind.
 *
 * The slug counts as changed by the editor when it differs from the value the form wrote last; an
 * emptied slug follows the source again, and so a stored slug counts as the editor's. Only for a slug
 * built by `normalizeSlug`: the config's own `transform` runs on the server, which the browser cannot
 * reach.
 *
 * @param input - The form, the field, and the values the form wrote.
 */
export const useSlugFill = ({ form, field, autoFilled }: UseSlugFillInput) => {
  const from =
    field.kind === "slug" && field.transform === "default"
      ? field.from
      : undefined
  const source = useWatch({
    control: form.control,
    name: `document.${from ?? field.name}`,
    disabled: !from,
  })
  const sourceText = typeof source === "string" ? source : ""

  useEffect(() => {
    if (!from) {
      return
    }

    const timeout = setTimeout(() => {
      const target = `document.${field.name}` as const
      const current = form.getValues(target)

      if (
        typeof current === "string" &&
        current &&
        current !== (autoFilled.current[field.name] ?? "")
      ) {
        return
      }

      autoFilled.current[field.name] = normalizeSlug(sourceText)
      form.setValue(target, autoFilled.current[field.name], {
        shouldValidate: true,
      })
    }, FILL_DELAY)

    return () => clearTimeout(timeout)
  }, [form, field.name, from, sourceText, autoFilled])
}
