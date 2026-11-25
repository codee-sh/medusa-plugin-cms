/** Which links a field takes: the schemes before `:`, and whether a link may be relative to the site. */
export type LinkPolicy = {
  /** The schemes, lowercase and without `:`, such as `https` or `mailto`. */
  protocols: string[]
  /** Whether a link may start with `/`, `#` or `?`. */
  relative: boolean
}

/** The policy of a field and a config that set none. */
export const DEFAULT_LINK_POLICY: LinkPolicy = {
  protocols: ["http", "https", "mailto", "tel"],
  relative: true,
}

/** A scheme's name as RFC 3986 writes it. */
const SCHEME_NAME = /^[a-z][a-z0-9+.-]*$/

/** Schemes that run code or embed content where a link is followed, so no policy may allow them. */
const UNSAFE_SCHEMES = ["javascript", "data", "vbscript"]

/**
 * Finds why a link policy cannot be used: a protocol that is not a lowercase scheme name, one that runs
 * code or embeds content, or no link allowed at all.
 *
 * @param policy - The policy.
 * @returns The reason, or nothing for a policy that fits.
 */
export const validateLinkPolicy = (policy: LinkPolicy): string | undefined => {
  for (const protocol of policy.protocols) {
    if (!SCHEME_NAME.test(protocol)) {
      return `"${protocol}" is not a lowercase scheme name, such as "https"`
    }

    if (UNSAFE_SCHEMES.includes(protocol)) {
      return `"${protocol}" can run code or embed content, so no link may use it`
    }
  }

  if (!policy.protocols.length && !policy.relative) {
    return "allows no link: list a protocol or set relative to true"
  }

  return undefined
}
