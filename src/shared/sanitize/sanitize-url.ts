import { validateUrl } from "./validate-url"
import { DEFAULT_LINK_POLICY, type LinkPolicy } from "./link-policy"

/**
 * Makes a stored link safe to write into an `href`: the link as it is when the policy allows it, `#`
 * otherwise. For a renderer, so a link saved before its policy narrowed, or written around the plugin,
 * leads nowhere instead of running code.
 *
 * @param url - The link.
 * @param policy - The links to allow; the default policy when left out.
 * @returns The link, or `#`.
 */
export const sanitizeUrl = (
  url: string,
  policy: LinkPolicy = DEFAULT_LINK_POLICY
): string => (validateUrl(url, policy) === true ? url : "#")
