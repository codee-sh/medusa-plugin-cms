import { Thumbnail } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import type { MediaRecord } from "../types"
import { isImageMedia } from "../utils/is-image-media"
import { mediaName } from "../utils/media-name"

type MediaThumbnailProps = {
  media: MediaRecord
}

/**
 * Previews a media record at table size: an image through the dashboard's `Thumbnail`, from its
 * `thumbnail_url` or else its URL, any other file as a document icon in a tile of the same size.
 *
 * @param props - The record to preview.
 */
export const MediaThumbnail = ({ media }: MediaThumbnailProps) => {
  if (isImageMedia(media)) {
    return (
      <Thumbnail
        src={media.thumbnail_url ?? media.url}
        alt={mediaName(media)}
      />
    )
  }

  return (
    <div className="bg-ui-bg-component border-ui-border-base flex h-8 w-6 items-center justify-center rounded border">
      <DocumentText
        className="text-ui-fg-subtle"
        aria-label={mediaName(media)}
      />
    </div>
  )
}
