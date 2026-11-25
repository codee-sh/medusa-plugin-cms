import { toast, usePrompt } from "@medusajs/ui"
import { useDeleteDocument } from "../../../hooks/api/documents/documents"
import { useCmsTranslation } from "../../../hooks/use-cms-translation"

/**
 * Deletes a row of a drawer-edited collection's table once the editor confirms. Such a collection has
 * no drafts, so every row is live and the prompt says it leaves the storefront.
 *
 * @param collection - The collection's slug.
 * @returns A function that asks, then deletes the document with the given id.
 */
export const useDeleteTableDocument = (collection: string) => {
  const { t } = useCmsTranslation()
  const prompt = usePrompt()
  const { mutateAsync } = useDeleteDocument(collection)

  return async (id: string) => {
    const confirmed = await prompt({
      title: t("documents.delete.title"),
      description: t("documents.delete.publishedDescription"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    await mutateAsync(id, {
      onSuccess: () => {
        toast.success(t("documents.delete.success"))
      },
      onError: (error) => {
        toast.error(t("documents.delete.failed"), {
          description: error.message,
        })
      },
    })
  }
}
