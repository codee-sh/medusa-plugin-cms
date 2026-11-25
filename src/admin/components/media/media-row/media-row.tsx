import { ActionMenu } from "@medusajs/dashboard/components"
import { Text } from "@medusajs/ui"
import type { ComponentProps } from "react"
import type { MediaRecord } from "../types"
import { MediaThumbnail } from "../media-thumbnail"
import { mediaName } from "../utils/media-name"

type MediaRowProps = {
  media: MediaRecord
  /** The actions of the row's menu. */
  groups: ComponentProps<typeof ActionMenu>["groups"]
}

/**
 * One file a media field holds: its preview, its name, and a menu of what can be done with it.
 *
 * @param props - The record and the menu's actions.
 */
export const MediaRow = ({ media, groups }: MediaRowProps) => (
  <div className="bg-ui-bg-component border-ui-border-base flex items-center gap-x-3 rounded-lg border px-3 py-2">
    <MediaThumbnail media={media} />
    <Text
      size="small"
      leading="compact"
      weight="plus"
      className="min-w-0 flex-1 truncate"
    >
      {mediaName(media)}
    </Text>
    <ActionMenu groups={groups} />
  </div>
)
