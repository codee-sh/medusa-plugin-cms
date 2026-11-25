import { zodResolver } from "@hookform/resolvers/zod"
import { Button, FocusModal, Heading, Text, toast } from "@medusajs/ui"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { ClientCollection } from "../../../lib/collection/types"
import type { AdminDocument } from "../../../workflows/cms/utils/build-admin-document"
import { MediaFieldsProvider } from "../../components/media"
import { useCreateDocument } from "../../hooks/api/documents/documents"
import { DocumentValidation } from "../common/document-validation"
import { DocumentFormLayout } from "../common/document-fields"
import { DocumentFormProvider } from "../common/document-form-provider"
import { sectionDocumentFields } from "../common/utils/section-document-fields"
import { setServerErrors } from "../common/utils/set-server-errors"
import type { DocumentFormFrame, DocumentFormValues } from "../common/types"
import { useDocumentFormMedia } from "../common/hooks/use-document-form-media"
import { useDocumentFormChecks } from "../common/hooks/use-document-form-checks"
import {
  buildCreateDefaults,
  buildCreateSchema,
  getCreateFields,
} from "./config"

type DocumentCreateFormProps = {
  collection: ClientCollection
  /** Called with the new document once it is saved; the shell closes the modal and goes on. */
  onSaved: (document: AdminDocument) => void
  /** What wraps the form in its modal: the route's form on the plugin's pages. */
  Frame: DocumentFormFrame
}

/**
 * Creates a draft document of a collection from the fields it needs, in a focus modal, and hands the new
 * document to `onSaved`. It reads no route: the shell around it opens and closes the modal.
 *
 * Validates with the collection's `shape` schema, as the server does. A slug fills from its source once
 * the editor pauses typing it, until the editor changes the slug, and is sent as shown. Each unique field
 * is checked against the live documents once the editor pauses: a taken value the form filled in moves
 * to its first free `-<n>` form, and one the editor typed blocks the save, with that form offered. A
 * save the server refuses shows each error on its field, and the rest in a toast. The collection's
 * sections show in order, the side ones last, each under its heading when it has one.
 *
 * @param props - The collection the document belongs to, what to do with the new document, and the
 * form's frame.
 */
export const DocumentCreateForm = ({
  collection,
  onSaved,
  Frame,
}: DocumentCreateFormProps) => {
  const { t } = useCmsTranslation()
  const { mutateAsync, isPending } = useCreateDocument(collection.slug)
  const fields = useMemo(() => getCreateFields(collection), [collection])
  const { main, side } = useMemo(
    () => sectionDocumentFields(collection, fields),
    [collection, fields]
  )

  const resolver = useMemo(
    () => zodResolver(buildCreateSchema(collection)),
    [collection]
  )
  const defaultValues = useMemo(() => buildCreateDefaults(fields), [fields])
  const form = useForm<DocumentFormValues>({
    resolver,
    defaultValues,
  })
  const { mediaRecords, mediaSource, uploadPending, isUploading } =
    useDocumentFormMedia(form, [])
  const isSaving = isPending || isUploading
  const { autoFilled, onServerErrorsChange, onTakenChange, blockSave } =
    useDocumentFormChecks(form)

  const onSubmit = form.handleSubmit(async ({ document }) => {
    // The live checks' errors stop the save; the resolver cleared them, so they are shown again.
    if (blockSave()) {
      return
    }

    // The chosen files are uploaded first, and the document sent with their stored values.
    const values = await uploadPending(document)

    if (!values) {
      return
    }

    await mutateAsync(values as typeof document, {
      onSuccess: ({ document: created }) => {
        toast.success(
          t("documents.create.success", {
            label: collection.labels.singular,
          })
        )
        onSaved(created)
      },
      onError: (error) => {
        const general = setServerErrors(
          form,
          error.message,
          fields.map(({ name }) => name)
        )

        if (general.length) {
          toast.error(t("documents.create.failed"), {
            description: general.join("\n"),
          })
        }
      },
    })
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
        autoFilled={autoFilled}
        onTakenChange={onTakenChange}
        onServerErrorsChange={onServerErrorsChange}
      >
        <Frame form={form}>
          <form
            onSubmit={onSubmit}
            className="flex h-full flex-col overflow-hidden"
          >
            <FocusModal.Header />
            <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-6 px-2 py-16">
                <div className="flex flex-col gap-y-1">
                  <FocusModal.Title asChild>
                    <Heading>
                      {t("documents.create.title", {
                        label: collection.labels.singular,
                      })}
                    </Heading>
                  </FocusModal.Title>
                  <FocusModal.Description asChild>
                    <Text size="small" className="text-ui-fg-subtle">
                      {t("documents.create.description")}
                    </Text>
                  </FocusModal.Description>
                </div>
                <DocumentValidation />
                {[...main, ...side].map((section) => (
                  <div key={section.key} className="flex flex-col gap-y-4">
                    {(section.label || section.description) && (
                      <div className="flex flex-col gap-y-1">
                        {section.label && (
                          <Heading level="h2">{section.label}</Heading>
                        )}
                        {section.description && (
                          <Text size="small" className="text-ui-fg-subtle">
                            {section.description}
                          </Text>
                        )}
                      </div>
                    )}
                    <DocumentFormLayout
                      fields={fields}
                      layout={section.layout}
                    />
                  </div>
                ))}
              </div>
            </FocusModal.Body>
            <FocusModal.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <FocusModal.Close asChild>
                  <Button size="small" variant="secondary" disabled={isSaving}>
                    {t("actions.cancel")}
                  </Button>
                </FocusModal.Close>
                <Button size="small" type="submit" isLoading={isSaving}>
                  {t("actions.create")}
                </Button>
              </div>
            </FocusModal.Footer>
          </form>
        </Frame>
      </DocumentFormProvider>
    </MediaFieldsProvider>
  )
}
