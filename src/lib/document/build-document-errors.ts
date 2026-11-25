import type { DocumentError } from "./types"

/** An issue of a failed parse, as Zod reports it, in the part this file reads. */
type SchemaIssue = {
  code: string
  path: PropertyKey[]
  message: string
  keys?: string[]
}

/**
 * Turns the issues of a document schema into errors at dot paths.
 *
 * @param issues - The issues of a failed parse.
 * @returns One error per issue, and one per unknown key.
 */
export const buildDocumentErrors = (
  issues: readonly SchemaIssue[]
): DocumentError[] =>
  issues.flatMap((issue) => {
    const path = issue.path.map(String).join(".")

    if (issue.code === "unrecognized_keys" && issue.keys) {
      return issue.keys.map((key) => ({
        path: path ? `${path}.${key}` : key,
        message: "Unknown field",
      }))
    }

    return [{ path, message: issue.message }]
  })
