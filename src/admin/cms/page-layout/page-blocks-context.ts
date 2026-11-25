import { createContext } from "react"
import type { PageBlocks } from "./types"

/**
 * Hands a page's blocks to the CMS's layout. `LayoutComposer` renders the layout inside the page, so
 * the page provides its blocks around it and gives `LayoutComposer` empty sections.
 */
export const PageBlocksContext = createContext<PageBlocks>({})
