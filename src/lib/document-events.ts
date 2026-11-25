/** The events the CMS emits, one per write, after its last write step. */
export const DocumentEvents = {
  DOCUMENT_CREATED: "cms.document.created",
  DOCUMENT_UPDATED: "cms.document.updated",
  DOCUMENT_DELETED: "cms.document.deleted",
} as const

/**
 * What a write that updated a document did: `publish` and `unpublish` change what the store serves,
 * `save`, `restore` and `discard` do not.
 */
export type DocumentUpdateAction =
  "save" | "publish" | "unpublish" | "restore" | "discard"

/** The data of `cms.document.created`: the new document and its status. */
export type DocumentCreatedEventData = {
  collection: string
  id: string
  status: "draft" | "published"
}

/** The data of `cms.document.updated`: what the write did, and the document's status after it. */
export type DocumentUpdatedEventData = {
  collection: string
  id: string
  action: DocumentUpdateAction
  status: "draft" | "published"
}

/** The data of `cms.document.deleted`. */
export type DocumentDeletedEventData = {
  collection: string
  id: string
}
