import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Drawer, Heading, Text, toast } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { ClientCollection } from "../../../lib/collection/types"
import type { AdminDocument } from "../../../workflows/cms/utils/build-admin-document"
import { MediaFieldsProvider } from "../../components/media"
import {
  documentsQueryKeys,
  useCreateDocument,
  useUpdateDocument,
} from "../../hooks/api/documents/documents"
import { DocumentFormLayout } from "../common/document-fields"
import { DocumentFormProvider } from "../common/document-form-provider"
import { DocumentValidation } from "../common/document-validation"
import { useDocumentFormChecks } from "../common/hooks/use-document-form-checks"
import { useDocumentFormMedia } from "../common/hooks/use-document-form-media"
import type { DocumentFormFrame, DocumentFormValues } from "../common/types"
import { setServerErrors } from "../common/utils/set-server-errors"
import { collectFormMedia } from "../document-edit-form/collect-form-media"
import {
  buildEditDefaults,
  buildEditSchema,
  buildUpdatePayload,
} from "../document-edit-form/config"
import type { SectionCard } from "../page-sections/utils/list-section-cards"

type DocumentDrawerFormProps = {
  collection: ClientCollection
  /** The sections the drawer edits, in order: one card of a singleton, or every section of a row. */
  sections: SectionCard[]
  /** The document, `null` before a singleton's first save. */
  document: AdminDocument | null
  /** Called once the document is saved; the shell closes the drawer. */
  onSaved: () => void
  /** What wraps the form in its drawer: the route's form on the plugin's pages. */
  Frame: DocumentFormFrame
}

/**
 * Edits sections of a document without drafts in a drawer and saves their fields alone, live at once:
 * the first save of a singleton creates the document with them, a later one updates it. Several
 * sections show under their headings, a single one under the drawer's own. The fields, the live
 * validation and the media work as in the document form; a save the server refuses shows each error on
 * its field, and the rest in a toast. A first save refused because the document exists - another editor
 * saved first - reads the page again, so the next save updates it. It reads no route: the shell around
 * it opens and closes the drawer.
 *
 * @param props - The collection, the sections, the document, what to do after a save, and the form's
 * frame.
 */
export const DocumentDrawerForm = ({
  collection,
  sections,
  document,
  onSaved,
  Frame,
}: DocumentDrawerFormProps) => {
  const { t } = useCmsTranslation()
  const queryClient = useQueryClient()
  const create = useCreateDocument(collection.slug)
  const update = useUpdateDocument(collection.slug, document?.id ?? "")
  const fields = useMemo(
    () => sections.flatMap((section) => section.fields),
    [sections]
  )

  const resolver = useMemo(
    () => zodResolver(buildEditSchema(collection, "shape")),
    [collection]
  )
  const initialMedia = useMemo(
    () => (document ? collectFormMedia(collection, document) : []),
    [collection, document]
  )
  const defaultValues = useMemo(
    () => buildEditDefaults(collection, fields, document ?? {}),
    [collection, fields, document]
  )
  const form = useForm<DocumentFormValues>({ resolver, defaultValues })
  const { mediaRecords, mediaSource, uploadPending, isUploading } =
    useDocumentFormMedia(form, initialMedia)
  const isSaving = create.isPending || update.isPending || isUploading
  const { autoFilled, onServerErrorsChange, onTakenChange, blockSave } =
    useDocumentFormChecks(form)

  /**
   * Shows a refused save's lines on the fields, and the rest in a toast.
   *
   * @param error - The request's error.
   */
  const onError = (error: Error) => {
    const general = setServerErrors(
      form,
      error.message,
      fields.map(({ name }) => name)
    )

    if (general.length) {
      toast.error(t("documents.edit.failed"), {
        description: general.join("\n"),
      })
    }
  }

  const onSubmit = form.handleSubmit(async ({ document: formValues }) => {
    // The live checks' errors stop the save; the resolver cleared them, so they are shown again.
    if (blockSave()) {
      return
    }

    // The chosen files are uploaded first, and the section sent with their stored values.
    const values = await uploadPending(formValues)

    if (!values) {
      return
    }

    /**
     * Confirms the save and hands over to the shell, which closes the drawer over the page.
     */
    const onSuccess = () => {
      toast.success(t("documents.edit.success"))
      onSaved()
    }

    if (document) {
      await update.mutateAsync(
        buildUpdatePayload(
          collection,
          values,
          form.getValues("document"),
          defaultValues.document,
          null
        ),
        { onSuccess, onError }
      )
      return
    }

    // An emptied field is sent as `null`; a new document leaves it out, so its column keeps its default.
    await create.mutateAsync(
      Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== null)
      ),
      {
        onSuccess,
        onError: (error) => {
          // Another editor may have saved first: the page reads the document, which the next save updates.
          queryClient.invalidateQueries({
            queryKey: documentsQueryKeys.lists(),
          })
          onError(error)
        },
      }
    )
  })

  return (
    <MediaFieldsProvider
      source={mediaSource}
      records={mediaRecords}
      stackedModals
    >
      <DocumentFormProvider
        form={form}
        collection={collection}
        documentId={document?.id}
        autoFilled={autoFilled}
        onTakenChange={onTakenChange}
        onServerErrorsChange={onServerErrorsChange}
      >
        <Frame form={form}>
          <form
            onSubmit={onSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
              <DocumentValidation />
              <Text size="small" className="text-ui-fg-subtle">
                {t("documents.edit.liveOnSaveNote")}
              </Text>
              {sections.map((section) => (
                <div key={section.key} className="flex flex-col gap-y-4">
                  {sections.length > 1 &&
                    (section.label || section.description) && (
                      <div className="flex flex-col gap-y-1">
                        {section.label && (
                          <Heading level="h3">{section.label}</Heading>
                        )}
                        {section.description && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {section.description}
                          </Text>
                        )}
                      </div>
                    )}
                  <DocumentFormLayout
                    fields={section.fields}
                    layout={section.layout}
                  />
                </div>
              ))}
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Drawer.Close asChild>
                  <Button size="small" variant="secondary" disabled={isSaving}>
                    {t("actions.cancel")}
                  </Button>
                </Drawer.Close>
                <Button size="small" type="submit" isLoading={isSaving}>
                  {t("actions.save")}
                </Button>
              </div>
            </Drawer.Footer>
          </form>
        </Frame>
      </DocumentFormProvider>
    </MediaFieldsProvider>
  )
}
