import { MedusaError } from "@medusajs/framework/utils"

/**
 * Builds the error a config that does not fit its models throws, at the first problem found.
 *
 * @param problem - The problem, with where the config sits: `collection "page": ...`.
 * @returns The error.
 */
export const buildConfigError = (problem: string): MedusaError =>
  new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `The CMS config is invalid: ${problem}`
  )
