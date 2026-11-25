import { Button, Heading, Text } from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { ClientCollection } from "../../../lib/collection/types"
import type { AdminDocument } from "../../../workflows/cms/utils/build-admin-document"
import { DocumentActionMenu } from "../document-action-menu"

type DocumentEditHeaderProps = {
  collection: ClientCollection
  /** The document's row, as the store reads it. */
  document: AdminDocument
  /** What the form edits: the latest version's content, or the row for a document without versions. */
  content: Record<string, unknown>
  /** The number of the version the form edits; `null` for a document without versions. */
  baseVersion: number | null
  /** Whether a save, its uploads included, is running. */
  isSaving: boolean
  /** Whether the editor changed anything since the form opened or was saved. */
  isDirty: boolean
  /** Called with the message of an action from an outdated form. */
  onStale: (message: string) => void
}

/**
 * The header of a document's form: the document's title, or the collection's name while it has none, a
 * note that a published document's save is a draft, **Save** or **Save draft**, which waits for a change,
 * and the action menu. Without drafts every save is live, so the note says so and the button is **Save**.
 *
 * @param props - The collection, the document's row and the content the form edits, the version it
 * edits, whether a save runs and anything changed, and the callback for an outdated form.
 */
export const DocumentEditHeader = ({
  collection,
  document,
  content,
  baseVersion,
  isSaving,
  isDirty,
  onStale,
}: DocumentEditHeaderProps) => {
  const { t } = useCmsTranslation()
  const published = document.status === "published"
  const savesDraft = collection.drafts && published
  const title = collection.admin.useAsTitle
    ? content[collection.admin.useAsTitle]
    : undefined

  return (
    <div className="flex items-center justify-between gap-x-4 px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <Heading>
          {typeof title === "string" && title
            ? title
            : collection.labels.singular}
        </Heading>
        {(savesDraft || !collection.drafts) && (
          <Text size="small" className="text-ui-fg-subtle">
            {savesDraft
              ? t("documents.edit.liveNote")
              : t("documents.edit.liveOnSaveNote")}
          </Text>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        <Button
          size="small"
          type="submit"
          isLoading={isSaving}
          disabled={!isDirty || isSaving}
        >
          {savesDraft ? t("documents.edit.saveDraft") : t("actions.save")}
        </Button>
        <DocumentActionMenu
          collection={collection}
          document={document}
          baseVersion={baseVersion}
          onStale={onStale}
        />
      </div>
    </div>
  )
}
