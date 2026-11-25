import { $isLinkNode } from "@lexical/link"
import { $isListNode } from "@lexical/list"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text"
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  type EditorState,
  type LexicalNode,
} from "lexical"
import { useEffect, useState } from "react"
import type { CurrentBlockType, SelectionState } from "../types"

const NO_SELECTION: SelectionState = {
  bold: false,
  italic: false,
  block: null,
  listType: null,
  link: null,
  isCollapsed: true,
}

/**
 * Names the block a node sits in, as the block type control and the list control know it.
 *
 * @param node - The selection's anchor node.
 * @returns The block's type.
 */
const $readBlockType = (node: LexicalNode): CurrentBlockType => {
  const block = $isRootNode(node) ? null : node.getTopLevelElement()

  if ($isHeadingNode(block)) {
    return block.getTag()
  }

  if ($isQuoteNode(block)) {
    return "quote"
  }

  return $isListNode(block) ? "list" : "paragraph"
}

/**
 * Reads what the toolbar shows of an editor state's selection.
 *
 * @param editorState - The editor's state.
 * @returns The selection's formats, block, list and link.
 */
const readSelectionState = (editorState: EditorState): SelectionState =>
  editorState.read(() => {
    const selection = $getSelection()

    if (!$isRangeSelection(selection)) {
      return NO_SELECTION
    }

    const anchor = selection.anchor.getNode()
    const lineage = [anchor, ...anchor.getParents()]
    const list = lineage.find($isListNode)
    const link = lineage.find($isLinkNode)
    const listType = list?.getListType()

    return {
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      block: $readBlockType(anchor),
      listType:
        listType === "bullet" || listType === "number" ? listType : null,
      link: link ? { url: link.getURL(), target: link.getTarget() } : null,
      isCollapsed: selection.isCollapsed(),
    }
  })

/**
 * Tells whether two reads of the selection hold the same. Both are built by `readSelectionState`, with
 * their keys in one order, so their JSON compares them.
 *
 * @param previous - The state the toolbar shows.
 * @param next - The state read after an update.
 * @returns Whether nothing the toolbar shows changed.
 */
const isSameSelectionState = (
  previous: SelectionState,
  next: SelectionState
): boolean => JSON.stringify(previous) === JSON.stringify(next)

/**
 * Follows the editor's selection for the toolbar: its formats, the block and the list it sits in, and
 * its link, read again after each update. Typing that changes none of them keeps the same state, so the
 * toolbar does not render again.
 *
 * @returns The selection's state.
 */
export const useSelectionState = (): SelectionState => {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState(() =>
    readSelectionState(editor.getEditorState())
  )

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) =>
        setState((previous) => {
          const next = readSelectionState(editorState)

          return isSameSelectionState(previous, next) ? previous : next
        })
      ),
    [editor]
  )

  return state
}
