import type { FieldOption, OptionsHookSource } from "../config/types"

/**
 * Tells whether a select's options come from a hook of the host's Admin rather than from a list.
 *
 * @param options - The select's options, as its config or its projection gives them.
 * @returns Whether they name a hook.
 */
export const isOptionsHookSource = (
  options: FieldOption<unknown>[] | OptionsHookSource | undefined
): options is OptionsHookSource =>
  options !== undefined && !Array.isArray(options)
