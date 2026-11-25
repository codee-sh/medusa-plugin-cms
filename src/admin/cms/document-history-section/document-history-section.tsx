import { useDate, useUser } from "@medusajs/dashboard/hooks"
import { Badge, Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { useState } from "react"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { ClientCollection } from "../../../lib/collection/types"
import type { CmsVersionRecord } from "../../../workflows/cms/steps/list-cms-versions"
import { useDocumentVersions } from "../../hooks/api/documents/documents"

/** How many versions the section shows at first, and adds with each **Show more**. */
const PAGE_SIZE = 10

type DocumentHistorySectionProps = {
  collection: ClientCollection
  /** The document's id. */
  documentId: string
  /** The version shown in the main column, if one is picked. */
  selectedVersionId?: string
  /** Called with the version the editor picks. */
  onSelect: (version: CmsVersionRecord) => void
}

type HistoryItemProps = {
  collection: ClientCollection
  version: CmsVersionRecord
  selected: boolean
  onSelect: (version: CmsVersionRecord) => void
}

/**
 * One version in the history: its number, what made it, the fields it changed, who made it and when.
 *
 * @param props - The collection, the version, whether it is picked, and the callback to pick it.
 */
const HistoryItem = ({
  collection,
  version,
  selected,
  onSelect,
}: HistoryItemProps) => {
  const { t } = useCmsTranslation()
  const { getFullDate } = useDate()
  const { user } = useUser(version.created_by ?? "", undefined, {
    enabled: Boolean(version.created_by),
  })
  const author =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    version.created_by
  const change =
    version.change_type === "restore"
      ? t("documents.history.restored", { version: version.restored_from })
      : t(`documents.history.${version.change_type}`)
  const fields = version.changed_fields
    .map(
      (name) =>
        collection.fields.find((field) => field.name === name)?.label ?? name
    )
    .join(", ")

  return (
    <button
      type="button"
      onClick={() => onSelect(version)}
      className={clx(
        "flex w-full flex-col gap-y-1 px-6 py-3 text-left outline-none transition-colors hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover",
        selected && "bg-ui-bg-highlight"
      )}
    >
      <div className="flex items-center justify-between gap-x-2">
        <Text size="small" leading="compact" weight="plus">
          {t("documents.history.label", {
            version: version.version,
            change,
          })}
        </Text>
        {version.latest && (
          <Badge size="2xsmall" color="blue">
            {t("documents.history.current")}
          </Badge>
        )}
      </div>
      {fields && (
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {fields}
        </Text>
      )}
      <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
        {[author, getFullDate({ date: version.created_at, includeTime: true })]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </button>
  )
}

/**
 * The history of a document in the side column: its versions newest first, the one being edited
 * marked "Current". Picking one shows its content in the main column.
 *
 * @param props - The collection, the document's id, the picked version, and the callback to pick one.
 */
export const DocumentHistorySection = ({
  collection,
  documentId,
  selectedVersionId,
  onSelect,
}: DocumentHistorySectionProps) => {
  const { t } = useCmsTranslation()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const { data, isLoading } = useDocumentVersions(
    collection.slug,
    documentId,
    limit
  )
  const versions = data?.versions ?? []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("documents.history.title")}</Heading>
      </div>
      {!isLoading && !versions.length && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("documents.history.empty")}
          </Text>
        </div>
      )}
      {versions.map((version) => (
        <HistoryItem
          key={version.id}
          collection={collection}
          version={version}
          selected={version.id === selectedVersionId}
          onSelect={onSelect}
        />
      ))}
      {data && data.count > versions.length && (
        <div className="px-6 py-3">
          <Button
            size="small"
            variant="transparent"
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
          >
            {t("documents.history.showMore")}
          </Button>
        </div>
      )}
    </Container>
  )
}
