import { hasControlCharacters } from "./has-control-characters"
import type { LinkPolicy } from "./link-policy"

/** The schemes whose links name a host after `//`. */
const HOST_SCHEMES = ["http", "https"]

/** A link's scheme: its start up to the first `:` that comes before any `/`, `?` or `#`. */
const SCHEME = /^([a-z][a-z0-9+.-]*):/i

/** A host after `//`, up to the path, the query or the fragment. */
const HOST = /^\/\/[^/?#]+/

/**
 * Writes the forms of link a policy allows, for the message of a refused one.
 *
 * @param policy - The policy.
 * @returns The message.
 */
const describePolicy = ({ protocols, relative }: LinkPolicy): string => {
  const forms = [
    ...protocols.map((protocol) =>
      HOST_SCHEMES.includes(protocol) ? `${protocol}://` : `${protocol}:`
    ),
    ...(relative ? ["/"] : []),
  ]
  const listed =
    forms.length > 1
      ? `${forms.slice(0, -1).join(", ")} or ${forms[forms.length - 1]}`
      : forms[0]

  return `Use a link starting with ${listed}`
}

/**
 * Checks a link against a policy, as it is: nothing is trimmed or decoded. A relative link starts with
 * `/`, `#` or `?`, never `//`; an absolute one has a scheme the policy lists, compared case-insensitively,
 * and something after it - for `http` and `https`, a host after `//`. A link with a space, a backslash or
 * a control character is refused.
 *
 * @param url - The link.
 * @param policy - The links its field takes.
 * @returns `true` for a link the policy allows, otherwise the message naming the forms it allows.
 */
export const validateUrl = (url: string, policy: LinkPolicy): true | string => {
  const refused = describePolicy(policy)

  // A browser reads `\` as `/`, so `/\evil.example` would leave the site as `//evil.example` does.
  if (
    !url ||
    /[\s\\]/.test(url) ||
    hasControlCharacters(url, { multiline: false })
  ) {
    return refused
  }

  if (/^[/#?]/.test(url)) {
    return policy.relative && !url.startsWith("//") ? true : refused
  }

  const scheme = SCHEME.exec(url)?.[1].toLowerCase()

  if (!scheme || !policy.protocols.includes(scheme)) {
    return refused
  }

  const rest = url.slice(scheme.length + 1)

  if (HOST_SCHEMES.includes(scheme)) {
    return HOST.test(rest) ? true : refused
  }

  return rest ? true : refused
}
