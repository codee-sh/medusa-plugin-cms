/** What a media field's column holds for a record: its id or its URL. */
export type CmsMediaStore = "id" | "url"

/**
 * A media record as a provider answers it. `id` and `url` are always there; the rest when the
 * provider knows it, and a provider may add keys of its own, which the store API returns too.
 */
export type CmsMedia = {
  id: string
  url: string
  filename?: string
  mime_type?: string
  /** The file's size in bytes. */
  size?: number
  thumbnail_url?: string
  [key: string]: unknown
}

/** A file the Admin uploads, as the upload route read it. */
export type CmsMediaUpload = {
  filename: string
  mimeType: string
  content: Buffer
}

/** A search of a provider's records. */
export type CmsMediaListQuery = {
  q?: string
  /** The MIME types to keep, exact or `type/*`; any type when left out. */
  mime_type?: string[]
  limit: number
  offset: number
}

/** One page of a search, with the number of records it matches. */
export type CmsMediaList = {
  media: CmsMedia[]
  count: number
}

/** The options of `FileMediaProvider`. */
export type FileMediaProviderOptions = {
  /** The largest upload, in bytes; 10 MB when left out. */
  maxFileSize?: number
  /** The MIME types an upload may have, exact or `type/*`; any type when left out. */
  mimeTypes?: string[]
}
