import {
  type LinkPolicy,
  validateLinkPolicy,
} from "../../shared/sanitize/link-policy"
import { buildConfigError } from "../config/build-config-error"

/**
 * Checks a resolved link policy: `protocols` a list of safe scheme names, `relative` true or false,
 * and some link allowed.
 *
 * @param policy - The policy, each key resolved over the fallback's.
 * @param path - Where the `linkPolicy` sits, for error messages.
 * @throws At the first problem.
 */
const validateResolvedLinkPolicy = (policy: LinkPolicy, path: string): void => {
  if (
    !Array.isArray(policy.protocols) ||
    typeof policy.relative !== "boolean"
  ) {
    throw buildConfigError(
      `${path}: linkPolicy takes "protocols" as a list and "relative" as true or false`
    )
  }

  const problem = validateLinkPolicy(policy)

  if (problem) {
    throw buildConfigError(`${path}: linkPolicy ${problem}`)
  }
}

/**
 * Resolves a config's `linkPolicy`: each key it sets over the fallback's, the rest the fallback's.
 *
 * @param linkPolicy - The `linkPolicy` of the config or of a field; nothing to take the fallback whole.
 * @param fallback - The policy it falls back to.
 * @param path - Where the `linkPolicy` sits, for error messages.
 * @returns The policy.
 * @throws When the policy lists something that is not a safe scheme name, or allows no link.
 */
export const prepareLinkPolicy = (
  linkPolicy: Partial<LinkPolicy> | undefined,
  fallback: LinkPolicy,
  path: string
): LinkPolicy => {
  const policy = {
    protocols: linkPolicy?.protocols ?? fallback.protocols,
    relative: linkPolicy?.relative ?? fallback.relative,
  }

  validateResolvedLinkPolicy(policy, path)

  return policy
}
