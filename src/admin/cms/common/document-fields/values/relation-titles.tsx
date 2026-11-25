import { Text } from "@medusajs/ui"
import { Fragment } from "react"
import { useDocuments } from "../../../../hooks/api/documents/documents"
import { useCmsCollection } from "../../../../hooks/use-cms-collection"
import { useCmsTranslation } from "../../../../hooks/use-cms-translation"

type RelationTitlesProps = {
  /** The target collection's slug. */
  relationTo: string
  /** The stored ids to title. */
  ids: string[]
  /** The ids the target is read by: a table column's on its page, so its cells send one request. */
  readIds: string[]
}

/**
 * Writes a relationship's stored ids by their targets' titles, the field `useAsTitle` names on the
 * target collection, or the id without one. The targets are read through the Admin list's `id`, by
 * every id of `readIds` at once. An id no document has any more shows as itself, marked as not found;
 * the ids show as they are while the read loads.
 *
 * @param props - The target collection, the ids to title and the ids to read.
 */
export const RelationTitles = ({
  relationTo,
  ids,
  readIds,
}: RelationTitlesProps) => {
  const { t } = useCmsTranslation()
  const target = useCmsCollection(relationTo)
  const { data } = useDocuments(relationTo, {
    id: readIds,
    limit: readIds.length,
    offset: 0,
  })
  const titleField = target.data?.admin.useAsTitle

  return (
    <>
      {ids.map((id, index) => {
        const document = data?.documents.find(
          (candidate) => candidate.id === id
        )
        const title =
          titleField && typeof document?.[titleField] === "string"
            ? (document[titleField] as string)
            : id

        return (
          <Fragment key={id}>
            {index > 0 && ", "}
            {data && !document ? (
              <Text as="span" size="small" className="text-ui-fg-muted">
                {t("documents.values.missingRelation", { id })}
              </Text>
            ) : (
              title
            )}
          </Fragment>
        )
      })}
    </>
  )
}
