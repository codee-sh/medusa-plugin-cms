/** What a media field's value names a record by: its id or its URL. */
export type MediaStore = "id" | "url"

/** A file as a media source answers it. */
export type MediaRecord = {
  id: string
  url: string
  filename?: string
  mime_type?: string
  /** The file's size in bytes. */
  size?: number
  thumbnail_url?: string
}

/** One page of a library search. */
export type MediaListQuery = {
  q?: string
  /** The MIME types to keep; any type when left out. */
  mime_type?: string[]
  limit: number
  offset: number
}

/** One page of a library search, with the number of records it matches. */
export type MediaListPage = {
  media: MediaRecord[]
  count: number
}

/** What a library page reads: its records, and whether it is loading or failed. */
export type MediaListResult = {
  data?: MediaListPage
  isPending: boolean
  error: unknown
}

/**
 * Where a form's media fields take their files from. The form builds it from its own backend and hands
 * it to `MediaFieldsProvider`.
 */
export type MediaSource = {
  /** The largest file the source takes, in bytes. */
  maxFileSize: number
  /** Whether the library can be searched; without it a field offers upload only. */
  searchable: boolean
  /** How many records a library page shows. */
  pageSize: number
  /** A hook that reads one page of the library. */
  useList: (query: MediaListQuery) => MediaListResult
}
