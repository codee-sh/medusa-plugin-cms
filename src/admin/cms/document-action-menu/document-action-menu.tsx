import { ActionMenu } from "@medusajs/dashboard/components"
import { ArrowUturnLeft, Trash } from "@medusajs/icons"
import { toast, usePrompt } from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import { useNavigate } from "react-router-dom"
import { isStaleVersionMessage } from "../../../lib/document/stale-version"
import type { ClientCollection } from "../../../lib/collection/types"
import type { AdminDocument } from "../../../workflows/cms/utils/build-admin-document"
import { buildCmsPath } from "../common/utils/build-cms-path"
import {
  useDocumentVersionAction,
  useDeleteDocument,
} from "../../hooks/api/documents/documents"

type DocumentActionMenuProps = {
  /** The collection, whose route's page a delete returns to. */
  collection: Pick<ClientCollection, "slug" | "admin">
  /** The document's row, with whether a draft waits to be published. */
  document: AdminDocument
  /** The number of the version the form edits, sent with a discard. */
  baseVersion: number | null
  /** Called with the message of a discard from an outdated form. */
  onStale: (message: string) => void
}

/**
 * The action menu of a document's page: **Discard changes** while a published document holds a draft,
 * which returns it to its published content and keeps the draft in the history, and **Delete**, each
 * behind a confirmation. A deleted document's page goes back to the table.
 *
 * @param props - The collection, the document, the form's version, and the callback for an outdated
 * form.
 */
export const DocumentActionMenu = ({
  collection,
  document,
  baseVersion,
  onStale,
}: DocumentActionMenuProps) => {
  const { t } = useCmsTranslation()
  const prompt = usePrompt()
  const navigate = useNavigate()
  const { mutateAsync } = useDeleteDocument(collection.slug)
  const discard = useDocumentVersionAction(
    collection.slug,
    document.id,
    "discard"
  )

  /**
   * Discards the draft once the editor confirms.
   */
  const onDiscard = async () => {
    const confirmed = await prompt({
      title: t("documents.discard.title"),
      description: t("documents.discard.description"),
      confirmText: t("documents.discard.action"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    await discard.mutateAsync(
      { base_version: baseVersion },
      {
        onSuccess: () => {
          toast.success(t("documents.discard.success"))
        },
        onError: (error) => {
          if (isStaleVersionMessage(error.message)) {
            onStale(error.message)
            return
          }

          toast.error(t("documents.discard.failed"), {
            description: error.message,
          })
        },
      }
    )
  }

  /**
   * Deletes the document once the editor confirms.
   */
  const onDelete = async () => {
    const confirmed = await prompt({
      title: t("documents.delete.title"),
      description:
        document.status === "published"
          ? t("documents.delete.publishedDescription")
          : t("documents.delete.description"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    await mutateAsync(document.id, {
      onSuccess: () => {
        toast.success(t("documents.delete.success"))
        navigate(buildCmsPath(collection.admin.route), { replace: true })
      },
      onError: (error) => {
        toast.error(t("documents.delete.failed"), {
          description: error.message,
        })
      },
    })
  }

  return (
    <ActionMenu
      groups={[
        ...(document.has_unpublished_changes
          ? [
              {
                actions: [
                  {
                    icon: <ArrowUturnLeft />,
                    label: t("documents.discard.action"),
                    onClick: onDiscard,
                  },
                ],
              },
            ]
          : []),
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: onDelete,
            },
          ],
        },
      ]}
    />
  )
}
