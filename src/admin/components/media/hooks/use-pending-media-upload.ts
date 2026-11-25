import type {
  FieldPath,
  FieldValues,
  PathValue,
  UseFormReturn,
} from "react-hook-form"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import type { MediaRecordStore } from "./use-media-record-store"
import type { MediaRecord } from "../types"
import { uploadPendingMedia } from "../utils/upload-pending-media"

type UsePendingMediaUploadInput<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  /** The form path the uploaded values sit under, such as `document`. */
  name: string
  /** The form's media store, which holds the chosen files. */
  records: MediaRecordStore
  /** Uploads one file to the form's media source and answers its record. */
  upload: (file: File) => Promise<MediaRecord>
}

/**
 * Uploads a form's chosen files when it is saved, before the form sends its values. Each uploaded file's
 * stored value goes into the form, so a save that fails afterwards does not upload it again; a file
 * that fails marks its field and stops the save. The form calls it in its own submit.
 *
 * @param input - The form, the path its values sit under, its media store, and the upload.
 * @returns The upload, answering the values to send or `undefined` when a file failed.
 */
export const usePendingMediaUpload = <TValues extends FieldValues>({
  form,
  name,
  records,
  upload,
}: UsePendingMediaUploadInput<TValues>) => {
  const { t } = useManagerFormFieldsTranslation()

  /**
   * Uploads the file a value holds, keeps its record for the pickers, and answers what its field stores.
   *
   * @param value - The value the field holds for the chosen file.
   * @returns The record's `id` or `url`, as the field stores.
   */
  const uploadValue = async (value: string): Promise<string> => {
    const { file, store } = records.getPending(value)!
    const media = await upload(file)

    records.add(media)
    records.dropPending(value)

    return media[store]
  }

  /**
   * Uploads the chosen files among the values under the form path.
   *
   * @param values - The values, as the form holds them.
   * @returns The values to send, or `undefined` when a file failed.
   */
  const uploadPending = async (
    values: Record<string, unknown>
  ): Promise<Record<string, unknown> | undefined> => {
    const result = await uploadPendingMedia(values, uploadValue)

    for (const { path, value } of result.uploaded) {
      form.setValue(
        `${name}.${path}` as FieldPath<TValues>,
        value as PathValue<TValues, FieldPath<TValues>>,
        { shouldDirty: true }
      )
    }

    for (const path of result.failed) {
      form.setError(`${name}.${path}` as FieldPath<TValues>, {
        type: "upload",
        message: t("media.picker.uploadFailed"),
      })
    }

    return result.failed.length ? undefined : result.values
  }

  return { uploadPending }
}
