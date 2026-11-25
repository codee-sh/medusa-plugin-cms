import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  CmsMedia,
  CmsMediaList,
  CmsMediaListQuery,
} from "../../../../lib/media-provider/types"
import { sdk } from "../../../lib/client"
import { queryKeysFactory } from "../../../lib/query-key-factory"

export type AdminMediaListResponse = CmsMediaList & {
  limit: number
  offset: number
}

export type AdminMediaUploadResponse = {
  media: CmsMedia
}

export const mediaQueryKeys = queryKeysFactory("cms_media")

/**
 * Searches the media provider's records, for the library. Only a provider with `list` can answer, so
 * the library is offered only for one that can be searched.
 *
 * @param query - The search, MIME types and page.
 * @returns The query of `GET /admin/cms/media`.
 */
export const useMediaList = (query: CmsMediaListQuery) =>
  useQuery({
    queryKey: mediaQueryKeys.list(query),
    queryFn: () =>
      sdk.client.fetch<AdminMediaListResponse>("/admin/cms/media", { query }),
    placeholderData: keepPreviousData,
  })

/**
 * Uploads one file through the media provider. The file is stored at once; a document holds it only
 * once saved.
 *
 * @returns The mutation of `POST /admin/cms/media`, taking the file.
 */
export const useUploadMedia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData()
      body.append("file", file)

      return sdk.client.fetch<AdminMediaUploadResponse>("/admin/cms/media", {
        method: "POST",
        body,
        // Let the browser set the multipart boundary.
        headers: { "content-type": null },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaQueryKeys.lists() })
    },
  })
}
