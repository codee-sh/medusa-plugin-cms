import { useContext, useRef, useSyncExternalStore } from "react"
import { isSameValue } from "./is-same-value"
import { getCmsDocumentContext } from "./registry"
import type { CmsDocumentValue } from "./types"

/**
 * Reads what `select` picks from the document of the CMS form the component sits in, and renders the
 * component again only when that pick changes, compared by content: a keystroke in another field renders
 * nothing. It reads and never writes; a component writes its own fields only.
 *
 * @param select - Picks a value from the document, its fields and its areas' blocks.
 * @returns The pick.
 * @throws When the component sits outside a CMS document form.
 *
 * @example
 * const title = useDocumentValue((document) => document.fields.title)
 */
export const useDocumentValue = <T>(
  select: (document: CmsDocumentValue) => T
): T => {
  const source = useContext(getCmsDocumentContext())
  const last = useRef<{ value: T }>()

  if (!source) {
    // A browser hook answers no HTTP request, and MedusaError would pull the framework into the Admin.
    // eslint-disable-next-line @medusajs/use-medusa-error-not-generic-error
    throw new Error("useDocumentValue runs inside a CMS document form only")
  }

  /**
   * Picks the value now, handing back the last pick while the content is the same, as
   * `useSyncExternalStore` asks of a snapshot.
   *
   * @returns The pick.
   */
  const getSnapshot = (): T => {
    const next = select(source.getDocument())

    if (last.current && isSameValue(last.current.value, next)) {
      return last.current.value
    }

    last.current = { value: next }

    return next
  }

  return useSyncExternalStore(source.subscribe, getSnapshot, getSnapshot)
}
