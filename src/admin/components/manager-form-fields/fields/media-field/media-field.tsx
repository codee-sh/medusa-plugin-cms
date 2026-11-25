import { MediaInput } from "../../../media/media-input"
import type { ManagerFormInputProps } from "../types"

/**
 * The input of a `media` field, bound to the form's value: one file or, with `multiple`, a list. It
 * takes where its files come from from the form's `MediaFieldsProvider`.
 *
 * @param props - The field and its binding to the form.
 */
export const MediaField = ({ config, field }: ManagerFormInputProps) => (
  <MediaInput
    name={field.name}
    value={field.value}
    onChange={field.onChange}
    store={config.media?.store ?? "id"}
    accept={config.media?.accept ?? []}
    multiple={config.media?.multiple}
    max={config.media?.max}
    disabled={config.disabled}
  />
)
