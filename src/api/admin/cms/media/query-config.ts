// The Admin imports this file into its browser bundle, so it imports nothing.

/** Records per page of the Admin's media library, and of a request that sends no `limit`. */
export const CMS_MEDIA_PAGE_SIZE = 10

export const listCmsMediaQueryConfig = {
  isList: true,
  defaultLimit: CMS_MEDIA_PAGE_SIZE,
}
