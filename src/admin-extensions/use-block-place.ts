import { useContext } from "react"
import { getCmsBlockPlaceContext } from "./registry"
import type { CmsBlockPlace } from "./types"

/**
 * Reads the place of the block the component sits in, from the document down: one area and index per
 * level, as `[{ area: "sections", index: 2 }]`.
 *
 * @returns The place, or `undefined` for a component of the document's own fields.
 */
export const useBlockPlace = (): CmsBlockPlace[] | undefined =>
  useContext(getCmsBlockPlaceContext())
