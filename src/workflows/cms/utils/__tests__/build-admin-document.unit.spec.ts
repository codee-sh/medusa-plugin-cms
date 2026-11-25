import type { CmsDocument } from "../../steps/list-cms-documents"
import type { CmsVersionRecord } from "../../steps/list-cms-versions"
import { buildTestConfig } from "../../../../lib/__tests__/fixtures"
import { buildReadPlacement } from "../../../../lib/document/build-read-placement"
import { prepareRegistry } from "../../../../lib/registry/prepare-registry"
import {
  buildAdminDocumentRead,
  buildAdminListedDocument,
  listAdminReadDocuments,
  completeAdminDocumentRead,
} from "../build-admin-document"

/**
 * Builds a recipe's row.
 *
 * @param status - Its status.
 * @returns The row.
 */
const rowOf = (status: CmsDocument["status"]): CmsDocument => ({
  id: "trec_1",
  status,
  updated_at: "2026-11-09T10:00:00.000Z",
  title: "Soup",
})

/**
 * Builds a latest version.
 *
 * @param status - Its status.
 * @returns The version, with a snapshot holding another title.
 */
const versionOf = (status: CmsVersionRecord["status"]) =>
  ({
    id: "cmsver_4",
    version: 4,
    status,
    snapshot: { title: "Bean stew" },
  }) as unknown as CmsVersionRecord

describe("buildAdminDocumentRead", () => {
  it("keeps the row and the latest version apart", () => {
    const read = buildAdminDocumentRead(rowOf("published"), versionOf("draft"))

    expect(read).toEqual({
      document: { ...rowOf("published"), has_unpublished_changes: true },
      latest_version: {
        id: "cmsver_4",
        version: 4,
        status: "draft",
        snapshot: { title: "Bean stew" },
      },
    })
  })

  it("marks no unpublished changes on a draft, or under a published latest version", () => {
    expect(
      buildAdminDocumentRead(rowOf("draft"), versionOf("draft")).document
        .has_unpublished_changes
    ).toBe(false)
    expect(
      buildAdminDocumentRead(rowOf("published"), versionOf("published"))
        .document.has_unpublished_changes
    ).toBe(false)
  })

  it("answers no latest version for a document saved before versions", () => {
    expect(buildAdminDocumentRead(rowOf("draft")).latest_version).toBeNull()
  })

  it("leaves out the area rows", () => {
    const row: CmsDocument = {
      ...rowOf("draft"),
      areas: [{ id: "tsec_1", name: "sections", parent_id: null }],
    }

    expect(buildAdminDocumentRead(row).document).toEqual({
      ...rowOf("draft"),
      has_unpublished_changes: false,
    })
  })
})

describe("buildAdminListedDocument", () => {
  const versions = [
    { document_id: "trec_1", version: 5, status: "draft" },
    { document_id: "trec_1", version: 4, status: "published" },
  ] as unknown as CmsVersionRecord[]

  it("gives a published document the version the store serves, and its waiting draft", () => {
    expect(
      buildAdminListedDocument(rowOf("published"), [versions[0]], [versions[1]])
    ).toMatchObject({ published_version: 4, has_unpublished_changes: true })
  })

  it("gives a draft no published version, an unpublished one included", () => {
    expect(
      buildAdminListedDocument(rowOf("draft"), [versions[0]], [versions[1]])
    ).toMatchObject({ published_version: null, has_unpublished_changes: false })
  })
})

describe("completeAdminDocumentRead", () => {
  const registry = prepareRegistry(buildTestConfig())
  const media = {
    placement: buildReadPlacement(registry, registry.collections.recipe),
    records: {
      id: ["old.jpg", "new.jpg"].map((id) => ({
        id,
        url: `http://localhost/static/${id}`,
      })),
      url: [],
    },
  }
  const read = buildAdminDocumentRead(
    { ...rowOf("published"), cover: "old.jpg" },
    {
      id: "cmsver_1",
      collection: "recipe",
      document_id: "trec_1",
      version: 2,
      status: "draft",
      latest: true,
      change_type: "save",
      restored_from: null,
      changed_fields: ["cover"],
      created_by: "user_1",
      created_at: "2026-11-09T10:00:00.000Z",
      snapshot: { title: "Soup", cover: "new.jpg" },
    } as CmsVersionRecord
  )

  it("lists the row and the snapshot as the documents to read media for", () => {
    expect(listAdminReadDocuments(read)).toEqual([
      read.document,
      read.latest_version!.snapshot,
    ])
  })

  it("leaves out each block's rank and area id at any depth", () => {
    const completed = completeAdminDocumentRead(
      buildAdminDocumentRead({
        ...rowOf("draft"),
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            rank: 0,
            area_id: "tsec_1",
            tips: [
              {
                id: "ttip_1",
                block_type: "tip",
                text: "Sharp knife",
                rank: 0,
                area_id: "tsec_2",
              },
            ],
          },
        ],
      }),
      media
    )

    expect(completed.document.sections).toEqual([
      {
        id: "tstep_1",
        block_type: "step",
        tips: [{ id: "ttip_1", block_type: "tip", text: "Sharp knife" }],
      },
    ])
  })

  it("puts the records in place of the values in the row and in the snapshot", () => {
    const placed = completeAdminDocumentRead(read, media)

    expect(placed.document.cover).toEqual({
      id: "old.jpg",
      url: "http://localhost/static/old.jpg",
    })
    expect(placed.latest_version!.snapshot!.cover).toEqual({
      id: "new.jpg",
      url: "http://localhost/static/new.jpg",
    })
    expect(placed.latest_version!.version).toBe(2)
  })
})

describe("completeAdminDocumentRead, on rich text", () => {
  const config = buildTestConfig()
  config.collections[0].fields!.cover = { type: "richtext", label: "Body" }
  config.blocks!.find(({ slug }) => slug === "callout")!.fields!.body = {
    type: "richtext",
    label: "Body",
  }
  const registry = prepareRegistry(config)
  const media = {
    placement: buildReadPlacement(registry, registry.collections.recipe),
    records: { id: [], url: [] },
  }
  const document = {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text: "Hot" }] },
      ],
    },
  }

  /**
   * Reads the text of each paragraph of a parsed document.
   *
   * @param value - The parsed value.
   * @returns Per paragraph, the texts of its nodes.
   */
  const readParagraphs = (value: unknown) =>
    (
      value as { root: { children: { children: { text: string }[] }[] } }
    ).root.children.map(({ children }) => children.map(({ text }) => text))

  it("parses the row's rich text at any depth, and reads plain text as paragraphs", () => {
    const completed = completeAdminDocumentRead(
      buildAdminDocumentRead({
        ...rowOf("draft"),
        cover: JSON.stringify(document),
        sections: [
          {
            id: "tstep_1",
            block_type: "step",
            rank: 0,
            area_id: "tsec_1",
            tips: [],
          },
          {
            id: "tcall_1",
            block_type: "callout",
            body: "Hot\nPan",
            rank: 1,
            area_id: "tsec_1",
          },
        ],
      }),
      media
    )

    expect(completed.document.cover).toEqual(document)
    expect(
      readParagraphs(
        (completed.document.sections as Record<string, unknown>[])[1].body
      )
    ).toEqual([["Hot"], ["Pan"]])
  })

  it("keeps a snapshot's document, and reads an empty value as null", () => {
    const completed = completeAdminDocumentRead(
      buildAdminDocumentRead({ ...rowOf("draft"), cover: null }, {
        ...versionOf("draft"),
        snapshot: { title: "Soup", cover: document },
      } as CmsVersionRecord),
      media
    )

    expect(completed.document.cover).toBeNull()
    expect(completed.latest_version!.snapshot!.cover).toBe(document)
  })
})
