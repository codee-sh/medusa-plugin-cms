import { SectionRow } from "@medusajs/dashboard/components"
import { useDate, useUser } from "@medusajs/dashboard/hooks"
import { Container, Heading } from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { CmsDocument } from "../../../workflows/cms/steps/list-cms-documents"
import type { AdminLatestVersion } from "../../../workflows/cms/utils/build-admin-document"

type DocumentDetailsSectionProps = {
  /** The document's row. */
  document: CmsDocument
  /** Its latest version, whose save is the last change; `null` for a document without versions. */
  latestVersion: AdminLatestVersion | null
}

type AuthorshipValueProps = {
  /** When the change was made. */
  date: string | Date
  /** The admin user who made it. */
  userId: string
}

/**
 * Shows when a change was made and by whom; the user's name or email once read, and the date alone
 * until then.
 *
 * @param props - The date and the user's id.
 */
const AuthorshipValue = ({ date, userId }: AuthorshipValueProps) => {
  const { t } = useCmsTranslation()
  const { getFullDate } = useDate()
  const { user } = useUser(userId)
  const fullDate = getFullDate({ date, includeTime: true })
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email

  return name
    ? t("documents.details.dateBy", { date: fullDate, name })
    : fullDate
}

/**
 * The side section of a document's page: when the document was created and last changed, and by whom,
 * and when it was published. The last change is the latest version's save, a draft included, so a
 * draft saved on a published document shows here; a document without versions shows its row's.
 *
 * @param props - The document.
 */
export const DocumentDetailsSection = ({
  document,
  latestVersion,
}: DocumentDetailsSectionProps) => {
  const { getFullDate } = useDate()

  const { t } = useCmsTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("documents.details.title")}</Heading>
      </div>
      <SectionRow
        title={t("documents.details.created")}
        value={
          <AuthorshipValue
            date={document.created_at as string}
            userId={document.created_by as string}
          />
        }
      />
      <SectionRow
        title={t("documents.details.updated")}
        value={
          <AuthorshipValue
            date={latestVersion?.created_at ?? document.updated_at}
            userId={
              (latestVersion?.created_by ?? document.updated_by) as string
            }
          />
        }
      />
      {document.status === "published" && document.published_at ? (
        <SectionRow
          title={t("documents.details.published")}
          value={getFullDate({
            date: document.published_at as string,
            includeTime: true,
          })}
        />
      ) : null}
    </Container>
  )
}
