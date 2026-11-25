import { useContext } from "react"
import { PageBlocksContext } from "./page-blocks-context"
import type { PageBlocks } from "./types"

/**
 * Returns the blocks of the page the CMS's layout draws.
 *
 * @returns The page's blocks per column; none outside a CMS page.
 */
export const usePageBlocks = (): PageBlocks => useContext(PageBlocksContext)
