import { useMemo } from "react"
import type { UseFormReturn } from "react-hook-form"
import { CMS_MEDIA_PAGE_SIZE } from "../../../../api/admin/cms/media/query-config"
import {
  type MediaRecord,
  type MediaSource,
  useMediaRecordStore,
  usePendingMediaUpload,
} from "../../../components/media"
import { useMediaProvider } from "../../../hooks/api/collections/collections"
import { useMediaList, useUploadMedia } from "../../../hooks/api/media/media"
import type { DocumentFormValues } from "../types"

/**
 * Sets up a document form's media: the records its pickers show, where its files come from, and the
 * upload of the files the editor chose, which a save runs before it sends the document.
 *
 * The source comes from the CMS's media provider: its upload limit and search from the collection list,
 * and its library through `GET /admin/cms/media`. It is `undefined` while the collection list loads and
 * without a provider.
 *
 * @param form - The document's form.
 * @param initialMedia - The records the read holds in place of the form's media values; read once.
 * @returns The record store and the media source, for the form's `MediaFieldsProvider`, the upload of
 * the chosen files, and whether one runs.
 */
export const useDocumentFormMedia = (
  form: UseFormReturn<DocumentFormValues>,
  initialMedia: MediaRecord[]
) => {
  const mediaRecords = useMediaRecordStore(initialMedia)
  const { data: mediaProvider } = useMediaProvider()
  const mediaSource = useMemo(
    (): MediaSource | undefined =>
      mediaProvider
        ? {
            maxFileSize: mediaProvider.maxFileSize,
            searchable: mediaProvider.searchable,
            pageSize: CMS_MEDIA_PAGE_SIZE,
            useList: useMediaList,
          }
        : undefined,
    [mediaProvider]
  )
  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia()
  const { uploadPending } = usePendingMediaUpload({
    form,
    name: "document",
    records: mediaRecords,
    upload: async (file) => (await uploadMedia(file)).media,
  })

  return { mediaRecords, mediaSource, uploadPending, isUploading }
}
