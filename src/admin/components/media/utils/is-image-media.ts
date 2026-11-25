/** File names a browser shows as an image, for a record without a MIME type. */
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i

/**
 * Tells whether a record is an image, by its MIME type or, without one, by its URL.
 *
 * @param media - The record's MIME type and URL.
 * @returns Whether a browser can show it as an image.
 */
export const isImageMedia = (media: {
  mime_type?: string
  url: string
}): boolean =>
  media.mime_type
    ? media.mime_type.startsWith("image/")
    : IMAGE_EXTENSION.test(media.url)
