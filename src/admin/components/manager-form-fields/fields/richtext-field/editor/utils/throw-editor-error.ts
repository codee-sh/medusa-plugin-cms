/**
 * Rethrows an error of the editor, so the field's error boundary shows it instead of an editor in an
 * unknown state. The editor's `onError`.
 *
 * @param error - The editor's error.
 * @throws The error, always.
 */
export const throwEditorError = (error: Error): never => {
  throw error
}
