import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { ListCmsDocumentsInput } from "../../../../workflows/cms/steps/list-cms-documents"
import type { CmsVersionRecord } from "../../../../workflows/cms/steps/list-cms-versions"
import type {
  AdminDocumentRead,
  AdminListedDocument,
} from "../../../../workflows/cms/utils/build-admin-document"
import { sdk } from "../../../lib/client"
import { queryKeysFactory } from "../../../lib/query-key-factory"
import { collectionsQueryKeys } from "../collections/collections"
import type { DocumentError } from "../../../../lib/document/types"

export type AdminDocumentsQuery = Omit<ListCmsDocumentsInput, "collection"> & {
  /** The documents of these ids alone. */
  id?: string[]
}

export type AdminDocumentsResponse = {
  documents: AdminListedDocument[]
  count: number
  limit: number
  offset: number
}

/** A document's row and its latest version, apart. */
export type AdminDocumentResponse = AdminDocumentRead

export type AdminDocumentErrorsResponse = {
  errors: DocumentError[]
}

export type AdminDocumentVersionsResponse = {
  versions: CmsVersionRecord[]
  count: number
  limit: number
  offset: number
}

export const documentVersionsQueryKeys = queryKeysFactory<
  "cms_document_versions",
  { id: string; limit: number }
>("cms_document_versions")

export const documentErrorsQueryKeys = queryKeysFactory<
  "cms_document_errors",
  { collection: string; document: Record<string, unknown>; id?: string }
>("cms_document_errors")

export const documentsQueryKeys = queryKeysFactory<
  "cms_documents",
  AdminDocumentsQuery & { collection: string }
>("cms_documents")

/**
 * Builds the query of one page of a collection's documents, which `useDocuments` and a hook reading
 * several collections at once share, so they share its cache entry.
 *
 * @param collection - The collection's slug.
 * @param query - Search, status, order and the page.
 * @returns The query's options for `GET /admin/cms/collections/:collection/documents`.
 */
export const documentListQuery = (
  collection: string,
  query: AdminDocumentsQuery
) =>
  queryOptions({
    queryKey: documentsQueryKeys.list({ collection, ...query }),
    queryFn: () =>
      sdk.client.fetch<AdminDocumentsResponse>(
        `/admin/cms/collections/${collection}/documents`,
        { query }
      ),
  })

/**
 * Builds the query of one document of a collection, which `useDocument` and a hook reading several
 * documents at once share.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @returns The query's options for `GET /admin/cms/collections/:collection/documents/:id`.
 */
export const documentQuery = (collection: string, id: string) =>
  queryOptions({
    queryKey: documentsQueryKeys.detail(id),
    queryFn: () =>
      sdk.client.fetch<AdminDocumentResponse>(
        `/admin/cms/collections/${collection}/documents/${id}`
      ),
  })

/**
 * Reads one page of a collection's documents.
 *
 * @param collection - The collection's slug.
 * @param query - Search, status, order and the page.
 * @returns The query of `GET /admin/cms/collections/:collection/documents`, keeping the previous page
 * while the next one loads.
 */
export const useDocuments = (collection: string, query: AdminDocumentsQuery) =>
  useQuery({
    ...documentListQuery(collection, query),
    placeholderData: keepPreviousData,
  })

/**
 * Reads one document of a collection.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @param options - `enabled: false` waits, for a caller that does not know the id yet.
 * @returns The query of `GET /admin/cms/collections/:collection/documents/:id`.
 */
export const useDocument = (
  collection: string,
  id: string,
  options: { enabled?: boolean } = {}
) => useQuery({ ...documentQuery(collection, id), enabled: options.enabled })

/**
 * Creates a draft document of a collection.
 *
 * On success the document lists are read again, and so is the collection list, whose counts changed.
 *
 * @param collection - The collection's slug.
 * @returns The mutation of `POST /admin/cms/collections/:collection/documents`.
 */
export const useCreateDocument = (collection: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (document: Record<string, unknown>) =>
      sdk.client.fetch<AdminDocumentResponse>(
        `/admin/cms/collections/${collection}/documents`,
        { method: "POST", body: document }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: collectionsQueryKeys.lists(),
      })
    },
  })
}

/**
 * Saves changes to a document of a collection.
 *
 * On success the document and the document lists are read again.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @returns The mutation of `POST /admin/cms/collections/:collection/documents/:id`.
 */
export const useUpdateDocument = (collection: string, id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (document: Record<string, unknown>) =>
      sdk.client.fetch<AdminDocumentResponse>(
        `/admin/cms/collections/${collection}/documents/${id}`,
        { method: "POST", body: document }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentsQueryKeys.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: documentVersionsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({ queryKey: documentsQueryKeys.lists() })
    },
  })
}

/**
 * Publishes a document's latest version, or turns a published document back into a draft.
 *
 * On success the document and the document lists are read again.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @param action - `publish` or `unpublish`.
 * @returns The mutation of `POST /admin/cms/collections/:collection/documents/:id/<action>`.
 */
export const useDocumentStatus = (
  collection: string,
  id: string,
  action: "publish" | "unpublish"
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { base_version?: number | null } = {}) =>
      sdk.client.fetch<AdminDocumentResponse>(
        `/admin/cms/collections/${collection}/documents/${id}/${action}`,
        { method: "POST", body }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentsQueryKeys.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: documentVersionsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({ queryKey: documentsQueryKeys.lists() })
    },
  })
}

/**
 * Reads a document again, as after a colleague saved a newer version.
 *
 * @param id - The document's id.
 * @returns A function that marks the document's query stale, so the page reads it again.
 */
export const useRefreshDocument = (id: string) => {
  const queryClient = useQueryClient()

  return () =>
    queryClient.invalidateQueries({
      queryKey: documentsQueryKeys.detail(id),
    })
}

/**
 * Deletes a document of a collection, the one whose id the mutation is given, so one hook serves every
 * row of a table.
 *
 * On success the document lists are read again, and so is the collection list, whose counts changed.
 * The document's own query is left alone: its page leaves it, and a table never reads it.
 *
 * @param collection - The collection's slug.
 * @returns The mutation of `DELETE /admin/cms/collections/:collection/documents/:id`, run with the
 * document's id.
 */
export const useDeleteDocument = (collection: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch<{ id: string; object: string; deleted: boolean }>(
        `/admin/cms/collections/${collection}/documents/${id}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: collectionsQueryKeys.lists(),
      })
    },
  })
}

/**
 * Checks a document as a save would, without writing it, through the server's rules - the fields'
 * `validation` schemas among them.
 *
 * @param collection - The collection's slug.
 * @param document - The document's values; nothing is sent while it is `undefined`.
 * @param id - The document being edited, whose own unique values are not taken.
 * @returns The query of `POST /admin/cms/collections/:collection/validate`.
 */
export const useDocumentErrors = (
  collection: string,
  document: Record<string, unknown> | undefined,
  id?: string
) =>
  useQuery({
    queryKey: documentErrorsQueryKeys.list({
      collection,
      document: document ?? {},
      id,
    }),
    queryFn: () =>
      sdk.client.fetch<AdminDocumentErrorsResponse>(
        `/admin/cms/collections/${collection}/validate`,
        { method: "POST", body: document, query: { id } }
      ),
    enabled: document !== undefined,
    // Each check is for the values typed at that moment; an earlier one is not worth keeping.
    gcTime: 0,
  })

/**
 * Reads the newest versions of a document, without their snapshots.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @param limit - How many of the newest versions to read.
 * @returns The query of `GET /admin/cms/collections/:collection/documents/:id/versions`.
 */
export const useDocumentVersions = (
  collection: string,
  id: string,
  limit: number
) =>
  useQuery({
    queryKey: documentVersionsQueryKeys.list({ id, limit }),
    queryFn: () =>
      sdk.client.fetch<AdminDocumentVersionsResponse>(
        `/admin/cms/collections/${collection}/documents/${id}/versions`,
        { query: { limit } }
      ),
    placeholderData: keepPreviousData,
  })

/**
 * Reads one version of a document with its snapshot.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @param versionId - The version's id; nothing is read without one.
 * @returns The query of `GET /admin/cms/collections/:collection/documents/:id/versions/:version_id`.
 */
export const useDocumentVersion = (
  collection: string,
  id: string,
  versionId: string | undefined
) =>
  useQuery({
    queryKey: documentVersionsQueryKeys.detail(versionId ?? ""),
    queryFn: () =>
      sdk.client.fetch<{ version: CmsVersionRecord }>(
        `/admin/cms/collections/${collection}/documents/${id}/versions/${versionId}`
      ),
    enabled: Boolean(versionId),
  })

/**
 * Restores a version as the document's latest, or discards a published document's draft.
 *
 * On success the document, its history and the document lists are read again.
 *
 * @param collection - The collection's slug.
 * @param id - The document's id.
 * @param path - `versions/<version id>/restore` or `discard`.
 * @returns The mutation of `POST /admin/cms/collections/:collection/documents/:id/<path>`.
 */
export const useDocumentVersionAction = (
  collection: string,
  id: string,
  path: string
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { base_version: number | null }) =>
      sdk.client.fetch<AdminDocumentResponse>(
        `/admin/cms/collections/${collection}/documents/${id}/${path}`,
        { method: "POST", body }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentsQueryKeys.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: documentVersionsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({ queryKey: documentsQueryKeys.lists() })
    },
  })
}
