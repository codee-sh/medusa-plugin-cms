// The Admin imports this file into its browser bundle, so it imports nothing.

/** Documents per page of the Admin list, when the request sends no `limit`. */
export const CMS_DOCUMENTS_PAGE_SIZE = 20

export const listCmsDocumentsQueryConfig = {
  isList: true,
  defaultLimit: CMS_DOCUMENTS_PAGE_SIZE,
}
