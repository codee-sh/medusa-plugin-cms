import { StackedFocusModal } from "@medusajs/dashboard/components"
import { Button, FocusModal, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import type { MediaRecord } from "../types"
import { MediaSelectTable } from "../media-select-table"
import { StackedModalShell } from "../../stacked-modal-shell"

type MediaLibraryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Opens the modal stacked on a route modal; leave it out anywhere else. */
  stackedModalId?: string
  /** The MIME types the library lists, the field's `accept`. */
  accept: string[]
  /** Called with the chosen record when the editor confirms; the modal then closes. */
  onSelect: (media: MediaRecord) => void
}

type MediaLibraryModalContentProps = Pick<
  MediaLibraryModalProps,
  "accept" | "onSelect"
> & {
  /** The parts of whichever modal holds the content. */
  parts: typeof FocusModal | typeof StackedFocusModal
}

/**
 * The modal's layout: heading, the selectable table, and Cancel / "Use file". Holds only the ticked
 * record, which it confirms.
 *
 * @param props - The MIME types, the confirm handler, and the modal parts to lay out with.
 */
const MediaLibraryModalContent = ({
  accept,
  onSelect,
  parts: Parts,
}: MediaLibraryModalContentProps) => {
  const { t } = useManagerFormFieldsTranslation()
  const [selected, setSelected] = useState<MediaRecord | null>(null)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Parts.Header />
      <Parts.Body className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-y-1 px-6 py-4">
          <Parts.Title asChild>
            <Heading>{t("media.modal.title")}</Heading>
          </Parts.Title>
          <Parts.Description asChild>
            <Text size="small" className="text-ui-fg-subtle">
              {t("media.modal.description")}
            </Text>
          </Parts.Description>
        </div>
        <MediaSelectTable accept={accept} onSelectionChange={setSelected} />
      </Parts.Body>
      <Parts.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <Parts.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </Parts.Close>
          <Button
            size="small"
            disabled={!selected}
            onClick={() => selected && onSelect(selected)}
          >
            {t("media.modal.confirm")}
          </Button>
        </div>
      </Parts.Footer>
    </div>
  )
}

/**
 * Lets an editor pick one record from the media source's library, with local state so the page URL
 * is never touched.
 *
 * Inside a `RouteFocusModal` or `RouteDrawer` pass a `stackedModalId` and it opens stacked on top;
 * anywhere else - the document page - it opens as a plain focus modal. Its content unmounts when it
 * closes, so every opening starts with nothing ticked.
 *
 * @param props - The open state, the stacking id, the MIME types and the confirm handler.
 */
export const MediaLibraryModal = ({
  open,
  onOpenChange,
  stackedModalId,
  accept,
  onSelect,
}: MediaLibraryModalProps) => {
  /**
   * Hands the chosen record back and closes the modal.
   *
   * @param media - The confirmed record.
   */
  const handleSelect = (media: MediaRecord) => {
    onSelect(media)
    onOpenChange(false)
  }

  /**
   * Renders the content with the parts of the modal that holds it.
   *
   * @param parts - The modal's parts.
   * @returns The content.
   */
  const content = (parts: typeof FocusModal | typeof StackedFocusModal) => (
    <MediaLibraryModalContent
      accept={accept}
      onSelect={handleSelect}
      parts={parts}
    />
  )

  if (stackedModalId) {
    return (
      <StackedModalShell
        id={stackedModalId}
        open={open}
        onOpenChange={onOpenChange}
      >
        {content(StackedFocusModal)}
      </StackedModalShell>
    )
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content aria-describedby={undefined}>
        {open && content(FocusModal)}
      </FocusModal.Content>
    </FocusModal>
  )
}
