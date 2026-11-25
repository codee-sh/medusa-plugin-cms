import { defineConfig } from "eslint/config"
import medusa from "@medusajs/eslint-plugin"

const TOOLKIT_FILES = "src/admin/components/**/*.{ts,tsx}"
const RICH_TEXT_FIELD =
  "src/admin/components/manager-form-fields/fields/richtext-field"
// The editor and the folder of the parts it is built from, which only the editor imports.
const RICH_TEXT_EDITOR = [
  `${RICH_TEXT_FIELD}/richtext-editor.tsx`,
  `${RICH_TEXT_FIELD}/editor/**/*.{ts,tsx}`,
]

// The form toolkit is the base other plugins take, so it knows nothing of the CMS (main spec D31).
const TOOLKIT_BOUNDARY = {
  regex: "^\\.\\.?/.*\\b(lib|api|workflows|cms)/",
  message:
    "src/admin/components/ is the form toolkit: it imports nothing of the CMS (lib, api, workflows, the cms feature or hooks/api).",
}

const EDITOR_PARTS_MESSAGE =
  "The editor's parts load with richtext-editor.tsx alone; import RichTextField."

// Lexical loads in its own chunk when a rich text field first shows; one static import elsewhere would
// pull it into every Admin page.
const LEXICAL_BOUNDARY = [
  {
    regex: "^(lexical|@lexical/.*)$",
    message:
      "Lexical is imported by richtext-editor.tsx alone, which RichTextField loads lazily.",
  },
  {
    regex: "/richtext-editor$",
    message: "Import RichTextField, which loads the editor lazily.",
  },
  {
    regex: "/richtext-field/editor/",
    message: EDITOR_PARTS_MESSAGE,
  },
]

// Inside the rich text field, the editor's parts are `./editor/`; only richtext-editor.tsx imports them.
const LOCAL_EDITOR_BOUNDARY = {
  regex: "^\\./editor/",
  message: EDITOR_PARTS_MESSAGE,
}

const SHARED_FILES = "src/shared/**/*.ts"

// src/shared/ holds the helpers the plugin and the code outside it - a storefront - both use, so it
// imports nothing of Medusa or of the plugin's other folders (main spec D36).
const SHARED_BOUNDARY = [
  {
    regex: "^@medusajs/",
    message:
      "src/shared/ loads in a storefront too: it imports nothing of Medusa.",
  },
  {
    regex:
      "^(\\.\\./)+(lib|api|workflows|admin|admin-extensions|modules|types)/",
    message:
      "src/shared/ imports nothing of the plugin's other folders; they import from it.",
  },
]

/**
 * Builds the rule that refuses imports matching the patterns. ESLint keeps one setting per rule and
 * file, so each file gets every pattern that applies to it from one block.
 *
 * @param patterns - The patterns to refuse.
 * @returns The rule's setting.
 */
const restrictImports = (patterns: { regex: string; message: string }[]) => ({
  "no-restricted-imports": ["error", { patterns }] as const,
})

export default defineConfig([
  ...medusa.configs.recommended,
  {
    files: [TOOLKIT_FILES],
    ignores: RICH_TEXT_EDITOR,
    rules: restrictImports([TOOLKIT_BOUNDARY, ...LEXICAL_BOUNDARY]),
  },
  {
    files: RICH_TEXT_EDITOR,
    rules: restrictImports([TOOLKIT_BOUNDARY]),
  },
  {
    files: [`${RICH_TEXT_FIELD}/*.{ts,tsx}`],
    ignores: RICH_TEXT_EDITOR,
    rules: restrictImports([
      TOOLKIT_BOUNDARY,
      ...LEXICAL_BOUNDARY,
      LOCAL_EDITOR_BOUNDARY,
    ]),
  },
  {
    files: [SHARED_FILES],
    rules: {
      // A type from the plain `zod` package, which the build erases, keeps the framework out of a storefront.
      "@medusajs/zod-import-source": "off",
      ...restrictImports([...LEXICAL_BOUNDARY, ...SHARED_BOUNDARY]),
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [TOOLKIT_FILES, SHARED_FILES],
    rules: restrictImports(LEXICAL_BOUNDARY),
  },
])
