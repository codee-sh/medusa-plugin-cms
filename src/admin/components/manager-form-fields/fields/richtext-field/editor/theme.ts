import type { EditorThemeClasses } from "lexical"

/**
 * The classes Lexical gives what the editor renders, from Medusa's design system, so the text reads as
 * the rest of the form does in light and dark mode.
 */
export const EDITOR_THEME: EditorThemeClasses = {
  paragraph: "mb-2 last:mb-0",
  heading: {
    h1: "h1-core mb-2",
    h2: "h2-core mb-2",
    h3: "h3-core mb-2",
    h4: "txt-compact-large-plus mb-2",
    h5: "txt-compact-medium-plus mb-2",
    h6: "txt-compact-small-plus mb-2",
  },
  quote: "border-ui-border-strong text-ui-fg-subtle mb-2 border-l-2 pl-3",
  list: {
    ul: "mb-2 list-disc pl-5",
    ol: "mb-2 list-decimal pl-5",
    nested: { listitem: "list-none" },
  },
  link: "text-ui-fg-interactive underline",
  text: { bold: "font-semibold", italic: "italic" },
}
