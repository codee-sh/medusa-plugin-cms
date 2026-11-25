import { createContext, type ReactNode, useContext, useMemo } from "react"
import type { MediaRecordStore } from "../hooks/use-media-record-store"
import type { MediaSource } from "../types"

/** What the media fields of one form share. */
type MediaFieldsContextValue = {
  /** Where the files come from; `undefined` while the form has not learnt it. */
  source?: MediaSource
  /** The form's records and chosen files. */
  records: MediaRecordStore
  /** Whether the library opens stacked on the route modal the form sits in. */
  stackedModals: boolean
}

type MediaFieldsProviderProps = MediaFieldsContextValue & {
  children: ReactNode
}

const MediaFieldsContext = createContext<MediaFieldsContextValue | null>(null)

/**
 * Hands a form's media fields where their files come from, the form's record store, and whether the
 * library stacks on a route modal.
 *
 * @param props - The source, the store, whether the library stacks, and the form.
 */
export const MediaFieldsProvider = ({
  source,
  records,
  stackedModals,
  children,
}: MediaFieldsProviderProps) => {
  const value = useMemo(
    () => ({ source, records, stackedModals }),
    [source, records, stackedModals]
  )

  return (
    <MediaFieldsContext.Provider value={value}>
      {children}
    </MediaFieldsContext.Provider>
  )
}

/**
 * Reads what the media fields of the form the component sits in share.
 *
 * @returns The source, the record store and whether the library stacks.
 * @throws When the component sits outside a `MediaFieldsProvider`.
 */
export const useMediaFields = (): MediaFieldsContextValue => {
  const context = useContext(MediaFieldsContext)

  if (!context) {
    throw new Error("A media field must sit inside a MediaFieldsProvider")
  }

  return context
}

/**
 * Reads the media source of the form the component sits in, for a part of a field that only renders
 * once the source is known, such as the library.
 *
 * @returns The source.
 * @throws When the form has no source.
 */
export const useMediaSource = (): MediaSource => {
  const { source } = useMediaFields()

  if (!source) {
    throw new Error("The media library needs the form's media source")
  }

  return source
}
