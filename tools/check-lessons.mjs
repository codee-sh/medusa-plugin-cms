#!/usr/bin/env node
/**
 * Validates the lesson catalog against the records it indexes.
 *
 * A lesson is only findable when three things agree: the record's front matter, the
 * catalog row that links it, and the vocabularies in `.ai/agentic.config.json`. Each can
 * drift on its own - a renamed title orphans a row, an invented topic quietly stops
 * grouping, a module tag outlives the spec folder it named. This check fails on all three.
 *
 * Pure filesystem reads: no build, no network, no dependencies. Safe to run from a hook.
 *
 * Usage: node check-lessons.mjs [--root <dir>] [--json]
 *   --root <dir>  repository root to check (default: the current working directory)
 *   --json        print the findings as JSON instead of text
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { basename, join, resolve } from "node:path"

const DEFAULTS = {
  path: ".ai/lessons",
  index: ".ai/lessons.md",
  modulesFrom: ".ai/specs",
  areas: [],
  topics: [],
}

const args = process.argv.slice(2)

/**
 * Value of a `--name value` flag, or undefined when the flag is absent or has no value.
 *
 * @param name - flag name including the leading dashes
 * @returns the value following the flag, or undefined
 */
function flagValue(name) {
  const index = args.indexOf(name)
  if (index === -1 || index === args.length - 1) return undefined
  return args[index + 1]
}

/**
 * Reads the `lessons` block from the agent config, falling back to defaults.
 *
 * @param root - absolute path of the repository root
 * @returns the lessons configuration, with every field populated
 */
function loadConfig(root) {
  const path = join(root, ".ai/agentic.config.json")
  if (!existsSync(path)) return { ...DEFAULTS }
  const parsed = JSON.parse(readFileSync(path, "utf8"))
  return { ...DEFAULTS, ...(parsed.lessons ?? {}) }
}

/**
 * Parses a record's JSON front matter.
 *
 * @param text - full file contents
 * @returns the parsed object, or an error string when it cannot be read
 */
function frontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (match === null) return { error: "no `---` front matter block" }
  try {
    return { value: JSON.parse(match[1]) }
  } catch (cause) {
    return { error: `front matter is not valid JSON (${cause.message})` }
  }
}

/**
 * Module ids available in this repository: the folder names under `modulesFrom`.
 *
 * @param root - absolute path of the repository root
 * @param modulesFrom - repo-relative directory holding one folder per module
 * @returns the set of valid module ids, empty when the directory does not exist
 */
function moduleVocabulary(root, modulesFrom) {
  const dir = join(root, modulesFrom)
  if (!existsSync(dir)) return new Set()
  return new Set(
    readdirSync(dir).filter((entry) => statSync(join(dir, entry)).isDirectory())
  )
}

/**
 * Link targets and titles referenced by the catalog, keyed by record filename.
 *
 * @param indexText - full contents of the catalog file
 * @returns a map of record filename to the title the row links it under
 */
function indexRows(indexText) {
  const rows = new Map()
  const pattern = /^- \[(.+?)\]\(([^)]+\.md)\)/gm
  for (const match of indexText.matchAll(pattern)) {
    rows.set(basename(match[2]), match[1])
  }
  return rows
}

/**
 * Runs every check and returns one message per problem found.
 *
 * @param root - absolute path of the repository root
 * @returns human-readable problem descriptions, empty when the catalog is consistent
 */
function check(root) {
  const config = loadConfig(root)
  const problems = []

  const recordsDir = join(root, config.path)
  if (!existsSync(recordsDir)) return [`${config.path} does not exist`]

  const indexPath = join(root, config.index)
  if (!existsSync(indexPath)) return [`${config.index} does not exist`]

  const rows = indexRows(readFileSync(indexPath, "utf8"))
  const modules = moduleVocabulary(root, config.modulesFrom)
  const areas = new Set(config.areas)
  const topics = new Set(config.topics)
  const files = readdirSync(recordsDir).filter((name) => name.endsWith(".md"))

  for (const file of files) {
    const { value, error } = frontMatter(readFileSync(join(recordsDir, file), "utf8"))
    if (error !== undefined) {
      problems.push(`${file}: ${error}`)
      continue
    }

    for (const key of ["title", "modules", "areas", "topics"]) {
      if (value[key] === undefined) problems.push(`${file}: front matter is missing \`${key}\``)
    }
    if (typeof value.title !== "string" || value.title.length === 0) {
      problems.push(`${file}: \`title\` must be a non-empty string`)
    }

    for (const module of value.modules ?? []) {
      if (!modules.has(module)) {
        problems.push(`${file}: module \`${module}\` has no folder in ${config.modulesFrom}`)
      }
    }
    for (const area of value.areas ?? []) {
      if (areas.size > 0 && !areas.has(area)) {
        problems.push(`${file}: area \`${area}\` is not in lessons.areas`)
      }
    }
    for (const topic of value.topics ?? []) {
      if (topics.size > 0 && !topics.has(topic)) {
        problems.push(`${file}: topic \`${topic}\` is not in lessons.topics`)
      }
    }
    if ((value.areas ?? []).length === 0) problems.push(`${file}: needs at least one area`)

    const rowTitle = rows.get(file)
    if (rowTitle === undefined) {
      problems.push(`${file}: no row in ${config.index}`)
    } else if (rowTitle !== value.title) {
      problems.push(`${file}: index row says "${rowTitle}", record says "${value.title}"`)
    }
  }

  const present = new Set(files)
  for (const file of rows.keys()) {
    if (!present.has(file)) problems.push(`${config.index}: row links ${file}, which does not exist`)
  }

  return problems
}

const root = resolve(flagValue("--root") ?? process.cwd())
const problems = check(root)

if (args.includes("--json")) {
  console.log(JSON.stringify({ ok: problems.length === 0, problems }, null, 2))
} else if (problems.length === 0) {
  console.log("LESSONS_OK")
} else {
  for (const problem of problems) console.error(`FAIL  ${problem}`)
}

process.exit(problems.length === 0 ? 0 : 1)
