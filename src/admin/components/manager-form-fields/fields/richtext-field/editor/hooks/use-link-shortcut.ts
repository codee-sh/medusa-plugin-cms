import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { COMMAND_PRIORITY_NORMAL, KEY_DOWN_COMMAND } from "lexical"
import { useEffect, useRef } from "react"

/**
 * Calls a handler on Cmd+K, or Ctrl+K, while the editor has the focus. The listener is registered once
 * and calls the latest handler, so the handler may read the component's current state.
 *
 * @param onShortcut - What the shortcut does; it answers whether it acted, and only then is the key's
 * default stopped.
 */
export const useLinkShortcut = (onShortcut: () => boolean): void => {
  const [editor] = useLexicalComposerContext()
  const handler = useRef(onShortcut)

  handler.current = onShortcut

  useEffect(
    () =>
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          const isShortcut =
            event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)

          if (!isShortcut || !handler.current()) {
            return false
          }

          event.preventDefault()

          return true
        },
        COMMAND_PRIORITY_NORMAL
      ),
    [editor]
  )
}
