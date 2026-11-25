import { zodResolver } from "@hookform/resolvers/zod"
import { Form, LayoutComposer } from "@medusajs/dashboard/components"
import { Container, toast } from "@medusajs/ui"
import { type ReactNode, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import type { CmsDocumentWidgetData } from "../../../admin-extensions/types"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { ClientCollection } from "../../../lib/collection/types"
import { isStaleVersionMessage } from "../../../lib/document/stale-version"
import type {
  AdminDocument,
  AdminLatestVersion,
} from "../../../workflows/cms/utils/build-admin-document"
import { MediaFieldsProvider } from "../../components/media"
import {
  useRefreshDocument,
  useUpdateDocument,
} from "../../hooks/api/documents/documents"
import { DocumentHistorySection } from "../document-history-section"
import { DocumentStatusSection } from "../document-status-section"
import { DocumentVersionView } from "../document-version-view"
import { AreaBlocks } from "../common/area-blocks"
import { DocumentValidation } from "../common/document-validation"
import { DocumentFormLayout } from "../common/document-fields"
import { DocumentFormProvider } from "../common/document-form-provider"
import { PageBlocksContext } from "../page-layout/page-blocks-context"
import { collectFormMedia } from "./collect-form-media"
import {
  type DocumentFieldSection,
  sectionDocumentFields,
} from "../common/utils/section-document-fields"
import { setServerErrors } from "../common/utils/set-server-errors"
import type { DocumentFormValues } from "../common/types"
import { useDocumentFormMedia } from "../common/hooks/use-document-form-media"
import { useDocumentFormChecks } from "../common/hooks/use-document-form-checks"
import {
  buildEditDefaults,
  buildEditSchema,
  buildUpdatePayload,
} from "./config"
import { DocumentEditHeader } from "./document-edit-header"
import { DocumentSectionCard } from "./document-section-card"
import { StaleVersionAlert } from "./stale-version-alert"

type DocumentEditFormProps = {
  collection: ClientCollection
  /** The document's row, as the store reads it. */
  document: AdminDocument
  /** Its latest version, which the form edits; `null` for a document without versions. */
  latestVersion: AdminLatestVersion | null
  /** The sections the page adds to the side column, after the side sections of the config. */
  aside: ReactNode
}

/**
 * Edits a document's own fields on its page and saves them, laid out in the page's two columns.
 *
 * A header of its own holds the title and **Save**; under it each of the collection's sections, which
 * hold every field and area, is a card of its own, in the main column or on the side, with the areas it
 * names after its fields. One form spans the sections.
 *
 * Sends every field it shows, an emptied one as `null`, and each area whose blocks the editor changed;
 * an area left as it opened is not sent, so the server keeps it as stored. The slug, the taken-value check and the live
 * validation work as in the create modal, with the document's id sent along so its own values are not
 * taken; a stored slug counts as the editor's, so it follows its source only once emptied. A save the
 * server refuses shows each error on its field, and the rest in a toast. **Save** waits for a change. A
 * slug is locked until the editor unlocks it, unless its field turns the lock off.
 *
 * The form edits the latest version: its fields come from the version's snapshot, or from the row for a
 * document without versions, and a save sends the version's number back as `base_version`. A published
 * document's save is a draft until **Publish changes** in the status section; a save or publish from an
 * outdated form shows the server's message with **Reload**, keeping what the editor typed until then.
 *
 * The page is drawn in the CMS's layout: these sections stand where the config puts them, and a host's
 * widgets in `cms.document.details` and `.side` follow them in each column, outside the `<form>`, which
 * Customize Layout arranges alone.
 *
 * The history in the side column lists the versions; picking one shows it read-only in place of the
 * form, which stays mounted with what the editor typed, until **Back to latest** or a restore.
 *
 * @param props - The collection, the document's row and latest version, and the page's other side
 * sections.
 */
export const DocumentEditForm = ({
  collection,
  document,
  latestVersion,
  aside,
}: DocumentEditFormProps) => {
  const { t } = useCmsTranslation()
  const { mutateAsync, isPending } = useUpdateDocument(
    collection.slug,
    document.id
  )
  const fields = collection.fields
  const { main: mainSections, side: sideSections } = useMemo(
    () => sectionDocumentFields(collection, fields, collection.areas),
    [collection, fields]
  )
  // What a server error's path can land on: the fields the form shows and the areas.
  const formNames = useMemo(
    () => [
      ...fields.map(({ name }) => name),
      ...collection.areas.map(({ name }) => name),
    ],
    [collection, fields]
  )

  const baseVersion = latestVersion?.version ?? null
  const refresh = useRefreshDocument(document.id)
  // The server's message for a save or publish from an outdated form, until the editor reloads.
  const [staleMessage, setStaleMessage] = useState<string>()
  // The version picked in the history, shown read-only in place of the form until the editor goes back.
  const [viewedVersionId, setViewedVersionId] = useState<string>()
  // The form stays mounted while a version is shown, so what the editor typed is kept.
  const formSections = viewedVersionId ? "hidden" : "contents"
  // The form edits the latest version; a document without versions is its row.
  const content = useMemo(
    () => ({ ...document, ...(latestVersion?.snapshot ?? {}) }),
    [document, latestVersion]
  )
  // The fields a publish needs are checked at publish, so a save checks the shape alone.
  const resolver = useMemo(
    () => zodResolver(buildEditSchema(collection, "shape")),
    [collection]
  )
  // The records the read holds in place of media values, which the pickers show.
  const initialMedia = useMemo(
    () => collectFormMedia(collection, content),
    [collection, content]
  )
  const defaultValues = useMemo(
    () => buildEditDefaults(collection, fields, content),
    [collection, fields, content]
  )
  const form = useForm<DocumentFormValues>({ resolver, defaultValues })
  const { mediaRecords, mediaSource, uploadPending, isUploading } =
    useDocumentFormMedia(form, initialMedia)
  const isSaving = isPending || isUploading
  const { autoFilled, onServerErrorsChange, onTakenChange, blockSave } =
    useDocumentFormChecks(form)

  const onSubmit = form.handleSubmit(async ({ document: formValues }) => {
    // The live checks' errors stop the save; the resolver cleared them, so they are shown again.
    if (blockSave()) {
      return
    }

    // The chosen files are uploaded first, and the document sent with their stored values.
    const values = await uploadPending(formValues)

    if (!values) {
      return
    }

    await mutateAsync(
      buildUpdatePayload(
        collection,
        values,
        form.getValues("document"),
        defaultValues.document,
        baseVersion
      ),
      {
        onSuccess: () => {
          toast.success(t("documents.edit.success"))
          // The page opens the saved version anew once it is read again; until then nothing is unsaved.
          form.reset(undefined, { keepValues: true })
        },
        onError: (error) => {
          if (isStaleVersionMessage(error.message)) {
            setStaleMessage(error.message)
            return
          }

          const general = setServerErrors(form, error.message, formNames)

          if (general.length) {
            toast.error(t("documents.edit.failed"), {
              description: general.join("\n"),
            })
          }
        },
      }
    )
  })

  /**
   * Shows a refused publish's lines on the fields, and the rest in a toast.
   *
   * @param message - The error's message, one `<path>: <message>` per line.
   */
  const onPublishRefused = (message: string) => {
    if (isStaleVersionMessage(message)) {
      setStaleMessage(message)
      return
    }

    const general = setServerErrors(form, message, formNames)

    toast.error(t("documents.publishing.publishFailed"), {
      description: general.length ? general.join("\n") : undefined,
    })
  }

  /**
   * Renders one section of the config as a card of its own: its fields in its layout, then its areas.
   *
   * @param section - The section, its layout and its areas.
   * @returns The card.
   */
  const renderSection = (section: DocumentFieldSection) => (
    <DocumentSectionCard
      key={section.key}
      label={section.label}
      description={section.description}
    >
      <DocumentFormLayout fields={fields} layout={section.layout} />
      {section.areas.map((area) => (
        <AreaBlocks
          key={area.name}
          area={area}
          name={`document.${area.name}`}
          showLabel
        />
      ))}
    </DocumentSectionCard>
  )

  return (
    <MediaFieldsProvider
      source={mediaSource}
      records={mediaRecords}
      stackedModals={false}
    >
      <DocumentFormProvider
        form={form}
        collection={collection}
        documentId={document.id}
        autoFilled={autoFilled}
        onTakenChange={onTakenChange}
        onServerErrorsChange={onServerErrorsChange}
      >
        <Form {...form}>
          <DocumentValidation />
          <PageBlocksContext.Provider
            value={{
              main: (
                <>
                  {staleMessage && (
                    <StaleVersionAlert
                      message={staleMessage}
                      onReload={refresh}
                    />
                  )}
                  {viewedVersionId && (
                    <DocumentVersionView
                      collection={collection}
                      documentId={document.id}
                      versionId={viewedVersionId}
                      baseVersion={baseVersion}
                      hasUnsavedChanges={form.formState.isDirty}
                      onBack={() => setViewedVersionId(undefined)}
                      onStale={setStaleMessage}
                    />
                  )}
                  <div className={formSections}>
                    <Container className="p-0">
                      <form onSubmit={onSubmit}>
                        <DocumentEditHeader
                          collection={collection}
                          document={document}
                          content={content}
                          baseVersion={baseVersion}
                          isSaving={isSaving}
                          isDirty={form.formState.isDirty}
                          onStale={setStaleMessage}
                        />
                      </form>
                    </Container>
                    {mainSections.map(renderSection)}
                  </div>
                </>
              ),
              side: (
                <>
                  {/* Without drafts every save is live: no status to publish, no history to show. */}
                  {collection.drafts && (
                    <DocumentStatusSection
                      collection={collection.slug}
                      document={document}
                      baseVersion={baseVersion}
                      hasUnsavedChanges={form.formState.isDirty}
                      onPublishRefused={onPublishRefused}
                    />
                  )}
                  <div className={formSections}>
                    {sideSections.map(renderSection)}
                  </div>
                  {collection.drafts && (
                    <DocumentHistorySection
                      collection={collection}
                      documentId={document.id}
                      selectedVersionId={viewedVersionId}
                      onSelect={(version) => setViewedVersionId(version.id)}
                    />
                  )}
                  {aside}
                </>
              ),
            }}
          >
            <LayoutComposer
              widgetsZonePrefix="cms.document.details"
              preferredLayoutId="cms:two-column"
              hasOutlet={false}
              data={{ collection, document } satisfies CmsDocumentWidgetData}
              sections={{ main: null, side: null }}
            />
          </PageBlocksContext.Provider>
        </Form>
      </DocumentFormProvider>
    </MediaFieldsProvider>
  )
}
