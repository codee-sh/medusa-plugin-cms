import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { findDocumentErrors } from "../../../lib/document/find-document-errors"
import { formatDocumentErrors } from "../../../lib/document/document-errors"
import { findMissingMedia } from "../../../lib/document/find-missing-media"
import { findMissingRelations } from "../../../lib/document/find-missing-relations"
import { parseRichTextFields } from "../../../lib/document/parse-rich-text-fields"
import type { MediaRead } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { CmsRelatedDocuments } from "./list-cms-related-documents"
import type { CmsTakenValues } from "./list-cms-taken-values"
import { buildDocumentShape } from "../../../lib/document/build-document-shape"
import { listDocumentBlocks } from "../../../lib/document/list-document-blocks"
import type {
  DocumentSchemaMode,
  DocumentError,
  DocumentShape,
  SubmittedBlock,
} from "../../../lib/document/types"

export type ValidateCmsDocumentInput = {
  /** The collection's slug. */
  collection: string
  /** The document's values, after the slugs are filled in. */
  document: Record<string, unknown>
  /**
   * Each area the body holds, under its name, when they are kept apart from `document`, which may hold
   * them itself; an area left out is not checked.
   */
  areas?: Record<string, SubmittedBlock[]>
  taken: CmsTakenValues
  /** The document as stored, when an existing one is edited; the values are checked over it. */
  stored?: Record<string, unknown>
  /**
   * `publish` for a publish, which requires the fields a publish needs; left out, `publish` for a
   * published document or any document of a collection without drafts, and `shape` otherwise, so a
   * live document keeps what a publish required.
   */
  mode?: DocumentSchemaMode
  /** Return the problems instead of throwing, for a workflow that only reports them. */
  report?: boolean
  /**
   * The media records the submitted values name, as `list-cms-document-media` read them; a submitted value
   * without a record is refused. Left out, media values are not checked.
   */
  media?: MediaRead
  /**
   * The live documents the submitted relationship fields name, as `list-cms-related-documents` read
   * them; an id that names none is refused. Left out, relationship values are not checked.
   */
  related?: CmsRelatedDocuments
}

export type ValidateCmsDocumentOutput = {
  /** Every problem found; empty when the document can be written. */
  errors: DocumentError[]
}

/**
 * Finds each block, at any depth, of a type its area does not allow whose id is not a
 * stored block of that type in that same area of the same document or block: only a stored
 * block may stay where its type is no longer allowed.
 *
 * @param shape - Where the document holds its blocks.
 * @param document - The document as checked, with the areas it holds under their names.
 * @param stored - The document as stored, with its areas under their names, or nothing for a new one.
 * @returns One error per such block, at the block's path.
 */
const findStaleBlockErrors = (
  shape: DocumentShape,
  document: Record<string, unknown>,
  stored: Record<string, unknown> | undefined
): DocumentError[] => {
  const storedBlocks = stored ? listDocumentBlocks(shape, stored) : []

  return listDocumentBlocks(shape, document).flatMap(
    ({ block, path, area, parent }) => {
      const kept = storedBlocks.some(
        (storedBlock) =>
          block.id !== undefined &&
          storedBlock.block.id === block.id &&
          storedBlock.block.block_type === block.block_type &&
          storedBlock.area.name === area.name &&
          (storedBlock.parent?.id ?? null) === (parent?.id ?? null)
      )

      return area.blocks.includes(block.block_type as string) || kept
        ? []
        : [{ path, message: "This block type is not allowed here" }]
    }
  )
}

/**
 * Finds each block, at any depth, whose id a block earlier in the document already has. A write would
 * turn the two into one row, and a block sent inside its own area into a cycle no read reaches, so
 * the body must hold each id once. A new block, sent without an id, is never a repeat.
 *
 * @param shape - Where the document holds its blocks.
 * @param document - The document as checked, with the areas it holds under their names.
 * @returns One error per repeat, at the repeating block's path.
 */
const findRepeatedBlockErrors = (
  shape: DocumentShape,
  document: Record<string, unknown>
): DocumentError[] => {
  const seen = new Set<unknown>()

  return listDocumentBlocks(shape, document).flatMap(({ block, path }) => {
    if (block.id === undefined) {
      return []
    }

    if (seen.has(block.id)) {
      return [{ path, message: "This block is sent more than once" }]
    }

    seen.add(block.id)
    return []
  })
}

/**
 * Checks a document before it is written.
 *
 * Runs the `shape` schema again, the fields' `serverValidation` schemas included, so a filled-in slug is
 * checked too and a caller of the workflow that skips the route's middleware is still refused. Then
 * finds each unique column's value that a live document already holds.
 *
 * On an edit the body may leave fields out, so the document is checked as it will be after the write:
 * the stored values of its editable fields, a rich text parsed into its document, with the submitted ones
 * over them. A published document is
 * checked with the `publish` schema, and so is a publish and any write in a collection without drafts. The areas the body holds are checked with the
 * registry's blocks, and a block of a type its area does not allow passes only as a stored block of that
 * area. A block id the body holds more than once, at any depth, is refused at each repeat.
 *
 * A media value the body sends is refused when the provider found no record for it, and a
 * relationship's id when it names no live document of its target; one the body leaves out is not
 * checked.
 *
 * In `report` mode it returns every problem; otherwise it returns no errors or throws. The report has no
 * stored document to tell a stored block by, so it leaves the stored-block check to the save.
 *
 * @throws `INVALID_DATA` with a line per problem of the shape, or `DUPLICATE_ERROR` with a line per
 * taken value, unless in `report` mode.
 */
export const validateCmsDocumentStep = createStep(
  "validate-cms-document",
  async (input: ValidateCmsDocumentInput, { container }) => {
    const registry = getRegistry(container)
    const { collection } = getCollection(container, input.collection)
    const { stored } = input
    const areas = input.areas ?? {}
    const document = stored
      ? {
          // A stored rich text is the column's JSON, checked as the document a body sends.
          ...parseRichTextFields(
            Object.fromEntries(
              collection.fields
                .filter(({ name }) => name in stored)
                .map(({ name }) => [name, stored[name]])
            ),
            collection.fields.filter(({ kind }) => kind === "richtext")
          ),
          ...input.document,
        }
      : input.document
    const checked = { ...document, ...areas }
    // Without drafts every write is live, a create included, so it is checked as a publish.
    const mode =
      input.mode ??
      (!collection.drafts || stored?.status === "published"
        ? "publish"
        : "shape")
    const shapeErrors = findDocumentErrors(registry, collection, checked, {
      mode,
    })
    const duplicates = collection.unique
      .filter((column) => {
        const value = document[column]

        return typeof value === "string" && input.taken[column]?.includes(value)
      })
      .map((column) => ({
        path: column,
        message: `"${document[column]}" is used by another document`,
      }))

    const mediaErrors = input.media
      ? findMissingMedia({ ...input.document, ...areas }, input.media)
      : []
    const relationErrors = input.related
      ? findMissingRelations(collection.fields, input.document, input.related)
      : []
    // Only a body that fits its shape holds areas as lists of blocks.
    const shape = shapeErrors.length
      ? undefined
      : buildDocumentShape(registry, collection)
    const repeatedErrors = shape ? findRepeatedBlockErrors(shape, checked) : []

    if (input.report) {
      return new StepResponse<ValidateCmsDocumentOutput>({
        errors: [
          ...shapeErrors,
          ...repeatedErrors,
          ...mediaErrors,
          ...relationErrors,
          ...duplicates,
        ],
      })
    }

    const staleErrors = shape
      ? findStaleBlockErrors(shape, checked, stored)
      : []
    const invalid = [
      ...shapeErrors,
      ...repeatedErrors,
      ...staleErrors,
      ...mediaErrors,
      ...relationErrors,
    ]

    if (invalid.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        formatDocumentErrors(invalid)
      )
    }

    if (duplicates.length) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        formatDocumentErrors(duplicates)
      )
    }

    return new StepResponse<ValidateCmsDocumentOutput>({ errors: [] })
  }
)
