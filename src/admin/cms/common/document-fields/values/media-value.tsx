import { MediaThumbnail } from "../../../../components/media/media-thumbnail"
import type { MediaRecord } from "../../../../components/media/types"
import { EMPTY_FIELD_VALUE } from "../../utils/format-field-value"
import type { DocumentValueProps } from "./types"

/**
 * The read-only view of a `media` field: a thumbnail per record the read holds. A value that is not a
 * record - nothing stored yet - shows as empty.
 *
 * @param props - The field and its value.
 */
export const MediaValue = ({ value }: DocumentValueProps) => {
  const records = (Array.isArray(value) ? value : [value]).filter(
    (record): record is MediaRecord =>
      typeof record === "object" && record !== null
  )

  if (!records.length) {
    return <>{EMPTY_FIELD_VALUE}</>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {records.map((record) => (
        <MediaThumbnail key={record.id} media={record} />
      ))}
    </div>
  )
}
