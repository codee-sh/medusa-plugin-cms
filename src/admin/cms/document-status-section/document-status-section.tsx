import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { AdminDocument } from "../../../workflows/cms/utils/build-admin-document"
import { useDocumentStatus } from "../../hooks/api/documents/documents"

type DocumentStatusSectionProps = {
  /** The collection's slug. */
  collection: string
  /** The document's row, with whether a draft waits to be published. */
  document: AdminDocument
  /** The number of the version the form shows, sent with a publish; `null` without versions. */
  baseVersion: number | null
  /** Whether the form holds changes not saved yet, which a publish would leave out. */
  hasUnsavedChanges: boolean
  /** Called with the message of a publish the server refused, to show its lines on the fields. */
  onPublishRefused: (message: string) => void
}

/**
 * The status section of a document's page: the status badge - draft, published, or published with
 * changes - and in one row **Publish** for a draft, **Publish changes** for a published document with a
 * newer draft, and **Unpublish** for a published one, each behind a confirmation. A line under them
 * says what a publish takes, that the document is live with nothing to publish, or, while the form
 * holds unsaved changes, to save them with the header's button before they can be published; it is
 * always there, so the section keeps its height as the form and the status change.
 *
 * A publish takes the latest saved version, so it waits while the form holds unsaved changes, and it
 * sends the version's number, so a colleague's newer draft is not published unseen.
 *
 * @param props - The collection, the document, whether the form holds unsaved changes, and the
 * callback for a refused publish.
 */
export const DocumentStatusSection = ({
  collection,
  document,
  baseVersion,
  hasUnsavedChanges,
  onPublishRefused,
}: DocumentStatusSectionProps) => {
  const { t } = useCmsTranslation()
  const prompt = usePrompt()
  const publish = useDocumentStatus(collection, document.id, "publish")
  const unpublish = useDocumentStatus(collection, document.id, "unpublish")
  const published = document.status === "published"
  // A draft publishes as a whole; a published document only when a newer draft waits.
  const canPublish = !published || document.has_unpublished_changes

  /**
   * Publishes the stored document once the editor confirms.
   */
  const onPublish = async () => {
    const confirmed = await prompt({
      title: t("documents.publishing.publishTitle"),
      description: t("documents.publishing.publishDescription"),
      confirmText: t("documents.publishing.publish"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    await publish.mutateAsync(
      { base_version: baseVersion },
      {
        onSuccess: () => {
          toast.success(t("documents.publishing.published"))
        },
        onError: (error) => onPublishRefused(error.message),
      }
    )
  }

  /**
   * Turns the document back into a draft once the editor confirms.
   */
  const onUnpublish = async () => {
    const confirmed = await prompt({
      title: t("documents.publishing.unpublishTitle"),
      description: t("documents.publishing.unpublishDescription"),
      confirmText: t("documents.publishing.unpublish"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    await unpublish.mutateAsync(undefined, {
      onSuccess: () => {
        toast.success(t("documents.publishing.unpublished"))
      },
      onError: (error) => {
        toast.error(t("documents.publishing.unpublishFailed"), {
          description: error.message,
        })
      },
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <Heading level="h2">{t("documents.publishing.title")}</Heading>
        {!published ? (
          <StatusBadge color="grey">{t("documents.status.draft")}</StatusBadge>
        ) : document.has_unpublished_changes ? (
          <StatusBadge color="orange">
            {t("documents.status.publishedWithChanges")}
          </StatusBadge>
        ) : (
          <StatusBadge color="green">
            {t("documents.status.published")}
          </StatusBadge>
        )}
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {canPublish && (
            <Button
              size="small"
              type="button"
              isLoading={publish.isPending}
              disabled={hasUnsavedChanges || publish.isPending}
              onClick={onPublish}
            >
              {published
                ? t("documents.publishing.publishChanges")
                : t("documents.publishing.publish")}
            </Button>
          )}
          {published && (
            <Button
              size="small"
              variant="secondary"
              type="button"
              isLoading={unpublish.isPending}
              onClick={onUnpublish}
            >
              {t("documents.publishing.unpublish")}
            </Button>
          )}
        </div>
        {/* Always there, so the section keeps its height as the form and the status change. */}
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {hasUnsavedChanges
            ? published
              ? t("documents.publishing.saveDraftToPublish")
              : t("documents.publishing.saveToPublish")
            : canPublish
              ? t("documents.publishing.publishesSaved")
              : t("documents.publishing.live")}
        </Text>
      </div>
    </Container>
  )
}
