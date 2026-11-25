import { buildReadDocument } from "../../../lib/document/build-read-document"
import { mapDocumentBlocks } from "../../../lib/document/map-document-blocks"
import type { MediaRead, ReadPlacement } from "../../../lib/document/types"
import type { CmsDocument } from "../steps/list-cms-documents"
import type { CmsVersionRecord } from "../steps/list-cms-versions"

/** A document's row as the Admin reads it, with whether a draft waits to be published. */
export type AdminDocument = CmsDocument & {
  /** A published document whose latest version is a draft not yet published. */
  has_unpublished_changes: boolean
}

/** A document as the Admin's table lists it: its row, its flag, and its newest published version. */
export type AdminListedDocument = AdminDocument & {
  /**
   * The number of the published version the store serves; `null` for a draft, an unpublished document
   * included, and for one published before versions.
   */
  published_version: number | null
}

/** The version the Admin edits, which a save or publish sends back as `base_version`. */
export type AdminLatestVersion = Pick<
  CmsVersionRecord,
  | "id"
  | "version"
  | "status"
  | "change_type"
  | "created_by"
  | "created_at"
  | "snapshot"
>

/** What the Admin reads of one document: its row and its latest version, kept apart. */
export type AdminDocumentRead = {
  document: AdminDocument
  latest_version: AdminLatestVersion | null
}

/**
 * Tells whether a document's latest version is a draft its published row does not show yet.
 *
 * @param row - The document's row.
 * @param latest - Its latest version, if it has one.
 * @returns Whether the document is published with changes.
 */
export const hasUnpublishedChanges = (
  row: CmsDocument,
  latest?: Pick<CmsVersionRecord, "status"> | null
): boolean => row.status === "published" && latest?.status === "draft"

/**
 * Describes a document for the Admin's table: its row, whether a draft waits to be published, and the
 * number of the published version the store serves.
 *
 * Only a published document has a live version, so a draft - an unpublished one included - has none.
 *
 * @param document - The document's row.
 * @param latestVersions - The latest versions of the page's documents.
 * @param publishedVersions - The published versions of the page's documents, newest first, so the
 * first one found for a document is the one its row holds.
 * @returns The document as the table lists it.
 */
export const buildAdminListedDocument = (
  document: CmsDocument,
  latestVersions: CmsVersionRecord[],
  publishedVersions: CmsVersionRecord[]
): AdminListedDocument => {
  const latest = latestVersions.find(
    ({ document_id }) => document_id === document.id
  )
  const published = publishedVersions.find(
    ({ document_id }) => document_id === document.id
  )

  return {
    ...document,
    has_unpublished_changes: hasUnpublishedChanges(document, latest),
    published_version:
      document.status === "published" ? (published?.version ?? null) : null,
  }
}

/**
 * Leaves out of a document its area rows under `areas`, which only a save needs.
 *
 * @param row - The document as read.
 * @returns The document without them.
 */
const omitAreaRows = ({
  areas: _areas,
  ...document
}: CmsDocument): CmsDocument => document

/**
 * Leaves out of each block of a document, at any depth, what only a save needs: its `rank` and
 * `area_id`, as the Admin reads a block's position from its place in its area.
 *
 * @param document - The document, with its areas under their names.
 * @param placement - Where the document holds its blocks.
 * @returns The copy.
 */
const omitBlockPlaces = (
  document: Record<string, unknown>,
  placement: ReadPlacement
): Record<string, unknown> =>
  mapDocumentBlocks(
    placement,
    document,
    ({ rank: _rank, area_id: _areaId, ...block }) => block
  )

/**
 * Puts a document's row and its latest version side by side for the Admin. The row is what the store
 * serves; the version is what the editor edits, so the form takes its fields from the snapshot.
 *
 * @param row - The document's row, with its areas when the read holds them.
 * @param latest - Its latest version, with its snapshot, if it has one.
 * @returns The row with its flag and without its area rows, and the latest version, `null` for a document
 * without versions.
 */
export const buildAdminDocumentRead = (
  row: CmsDocument,
  latest?: CmsVersionRecord | null
): AdminDocumentRead => ({
  document: {
    ...omitAreaRows(row),
    has_unpublished_changes: hasUnpublishedChanges(row, latest),
  },
  latest_version: latest
    ? {
        id: latest.id,
        version: latest.version,
        status: latest.status,
        change_type: latest.change_type,
        created_by: latest.created_by,
        created_at: latest.created_at,
        snapshot: latest.snapshot,
      }
    : null,
})

/**
 * Finishes what the Admin reads, once the media are read: the row without each block's `rank` and
 * `area_id`, at any depth, and, in the row and in the latest version's snapshot, which the form edits,
 * the media records in place of their values and each `richtext` value as its document. The media read
 * carries where the document holds its blocks and those fields, which the read before it did not know.
 *
 * @param read - The document's row and latest version.
 * @param media - Where the documents hold media, rich text and blocks, and the records
 * `list-cms-document-media` found.
 * @returns The read the Admin is answered.
 */
export const completeAdminDocumentRead = (
  read: AdminDocumentRead,
  media: MediaRead
): AdminDocumentRead => ({
  document: buildReadDocument(
    omitBlockPlaces(read.document, media.placement),
    media
  ) as AdminDocument,
  latest_version: read.latest_version && {
    ...read.latest_version,
    snapshot:
      read.latest_version.snapshot &&
      buildReadDocument(read.latest_version.snapshot, media),
  },
})

/**
 * Lists the documents of a read whose media fields the Admin is shown: the row and the latest
 * version's snapshot.
 *
 * @param read - The document's row and latest version.
 * @returns The documents to read media for.
 */
export const listAdminReadDocuments = (
  read: AdminDocumentRead
): Record<string, unknown>[] =>
  read.latest_version?.snapshot
    ? [read.document, read.latest_version.snapshot]
    : [read.document]
