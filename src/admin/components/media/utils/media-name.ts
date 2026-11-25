/**
 * Tells the name a record is shown under: its file name, or without one the last segment of its URL.
 *
 * @param media - The record's file name and URL.
 * @returns The name.
 */
export const mediaName = (media: {
  filename?: string
  url: string
}): string => {
  if (media.filename) {
    return media.filename
  }

  const path = media.url.split("?")[0]

  return decodeURIComponent(path.split("/").pop() || media.url)
}
