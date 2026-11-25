import type { MediaProviderClass } from "../config/types"
import type { CmsMediaStore } from "../media-provider/types"

/** The config's media provider, checked: what the CMS creates and tells the Admin. */
export type RegistryMedia = {
  resolve: MediaProviderClass
  options: Record<string, unknown>
  identifier: string
  /** What the provider's fields may store. */
  stores: CmsMediaStore[]
}

/** What the Admin is told about the media provider; `null` for a config without one. */
export type ClientMediaProvider = {
  searchable: boolean
  /** The largest upload, in bytes. */
  maxFileSize: number
} | null
