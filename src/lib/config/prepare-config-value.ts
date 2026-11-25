import { buildConfigError } from "./build-config-error"
import type { ConfigValue } from "./types"

/**
 * Prepares a config value that may be a function: the value as it is, or what the function returns for
 * the params, called once. It checks nothing of the result; the `prepare*` of the key's kind does.
 *
 * @param value - The value, or the function.
 * @param params - What the function gets.
 * @param where - The function's place, for the error message: `collection "page": the "features" function`.
 * @returns The value, or what the function returns.
 * @throws When the function throws, naming its place.
 */
export const prepareConfigValue = <TValue, TParams, TResult>(
  value: ConfigValue<TValue, TParams, TResult>,
  params: TParams,
  where: string
): TValue | TResult => {
  if (typeof value !== "function") {
    return value
  }

  try {
    // A ConfigValue never carries a value that is a function, so a function is the one to call.
    return (value as (params: TParams) => TResult)(params)
  } catch (error) {
    throw buildConfigError(
      `${where} threw: ${(error as Error)?.message ?? String(error)}`
    )
  }
}
