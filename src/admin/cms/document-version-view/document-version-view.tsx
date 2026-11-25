import { SectionRow } from "@medusajs/dashboard/components"
import { useDate } from "@medusajs/dashboard/hooks"
import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { ClientCollection } from "../../../lib/collection/types"
import { isStaleVersionMessage } from "../../../lib/document/stale-version"
import {
  useDocumentVersion,
  useDocumentVersionAction,
} from "../../hooks/api/documents/documents"
import type { SubmittedBlock } from "../../../lib/document/types"
import type { Field } from "../../../lib/field/types"
import { findSummaryField } from "../common/utils/find-summary-field"

type DocumentVersionViewProps = {
  collection: ClientCollection
  /** The document's id. */
  documentId: string
  /** The version to show. */
  versionId: string
  /** The number of the version the form edits, sent with a restore. */
  baseVersion: number | null
  /** Whether the form holds changes not saved yet, which a restore would replace. */
  hasUnsavedChanges: boolean
  /** Goes back to the form of the latest version. */
  onBack: () => void
  /** Called with the message of a restore from an outdated form. */
  onStale: (message: string) => void
}

/**
 * Shows one version of a document in the main column, read-only, field by field, with **Restore this
 * version** and **Back to latest**.
 *
 * A restore, behind a confirmation, saves the version's content as the newest draft; nothing goes live
 * until it is published. It waits while the form holds unsaved changes, and the latest version has
 * nothing to restore.
 *
 * @param props - The collection, the document and version ids, the form's version and state, and the
 * callbacks to go back and to report an outdated form.
 */
export const DocumentVersionView = ({
  collection,
  documentId,
  versionId,
  baseVersion,
  hasUnsavedChanges,
  onBack,
  onStale,
}: DocumentVersionViewProps) => {
  const { t } = useCmsTranslation()
  const prompt = usePrompt()
  const { getFullDate } = useDate()
  const { data } = useDocumentVersion(collection.slug, documentId, versionId)
  const restore = useDocumentVersionAction(
    collection.slug,
    documentId,
    `versions/${versionId}/restore`
  )
  const version = data?.version
  const snapshot = version?.snapshot ?? {}

  /**
   * Writes a stored value the way an editor reads it.
   *
   * @param field - The field the value belongs to.
   * @param value - The value as the snapshot stores it.
   * @returns The text to show; a dash for an empty value.
   */
  const formatValue = (field: Field, value: unknown): string => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && !value.length)
    ) {
      return "—"
    }

    if (Array.isArray(value)) {
      return value.join(", ")
    }

    if (typeof value === "boolean") {
      return value ? t("documents.values.yes") : t("documents.values.no")
    }

    if (field.kind === "date") {
      return getFullDate({ date: value as string, includeTime: true })
    }

    return String(value)
  }

  /**
   * Writes blocks the way an editor reads them: each block's type, with its first text value, then the
   * blocks of each area holding any, in brackets under the area's label.
   *
   * @param blocks - The blocks of an area as the snapshot stores them.
   * @returns The text, empty for no blocks.
   */
  const listBlocks = (blocks: unknown): string =>
    ((blocks ?? []) as SubmittedBlock[])
      .map((block) => {
        const type = collection.blocks.find(
          ({ slug }) => slug === block.block_type
        )
        const summaryField = type && findSummaryField(type)
        const summary = summaryField ? block[summaryField.name] : undefined
        const label = type?.labels.singular ?? block.block_type
        const held = (type?.areas ?? []).flatMap((area) => {
          const list = listBlocks(block[area.name])

          return list ? [`${area.label}: ${list}`] : []
        })

        return [
          typeof summary === "string" && summary
            ? `${label} (${summary})`
            : label,
          ...held.map((entry) => `[${entry}]`),
        ].join(" ")
      })
      .join(", ")

  /**
   * Writes an area's blocks the way an editor reads them, as `listBlocks` does.
   *
   * @param blocks - The area's blocks as the snapshot stores them.
   * @returns The text to show; a dash for an area without blocks.
   */
  const formatBlocks = (blocks: unknown): string => listBlocks(blocks) || "—"

  /**
   * Restores the version once the editor confirms, then goes back to the form.
   */
  const onRestore = async () => {
    const confirmed = await prompt({
      title: t("documents.history.restoreTitle", {
        version: version?.version,
      }),
      description: t("documents.history.restoreDescription"),
      confirmText: t("documents.history.restore"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    await restore.mutateAsync(
      { base_version: baseVersion },
      {
        onSuccess: () => {
          toast.success(
            t("documents.history.restoreSuccess", {
              version: version?.version,
            })
          )
          onBack()
        },
        onError: (error) => {
          if (isStaleVersionMessage(error.message)) {
            onStale(error.message)
            return
          }

          toast.error(t("documents.history.restoreFailed"), {
            description: error.message,
          })
        },
      }
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading>
            {t("documents.history.viewing", {
              version: version?.version ?? "",
            })}
          </Heading>
          {version && (
            <Text size="small" className="text-ui-fg-subtle">
              {getFullDate({ date: version.created_at, includeTime: true })}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-x-2">
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={onBack}
          >
            {t("documents.history.back")}
          </Button>
          <Button
            size="small"
            type="button"
            isLoading={restore.isPending}
            disabled={
              !version ||
              version.latest ||
              hasUnsavedChanges ||
              restore.isPending
            }
            onClick={onRestore}
          >
            {t("documents.history.restore")}
          </Button>
        </div>
      </div>
      {version?.latest && (
        <div className="px-6 py-3">
          <Text size="small" className="text-ui-fg-subtle">
            {t("documents.history.latestHint")}
          </Text>
        </div>
      )}
      {!version?.latest && hasUnsavedChanges && (
        <div className="px-6 py-3">
          <Text size="small" className="text-ui-fg-subtle">
            {t("documents.publishing.saveFirst")}
          </Text>
        </div>
      )}
      {collection.fields
        .filter(({ name }) => name in snapshot)
        .map((field) => (
          <SectionRow
            key={field.name}
            title={field.label}
            value={formatValue(field, snapshot[field.name])}
          />
        ))}
      {collection.areas
        .filter(({ name }) => name in snapshot)
        .map((area) => (
          <SectionRow
            key={area.name}
            title={area.label}
            value={formatBlocks(snapshot[area.name])}
          />
        ))}
    </Container>
  )
}
