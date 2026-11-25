import type { CmsMediaStore } from "./types"

/** Every kind of value a media field may store, in the order a read asks the provider for them. */
export const MEDIA_STORES: readonly CmsMediaStore[] = ["id", "url"]
