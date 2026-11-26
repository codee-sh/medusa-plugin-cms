import { HistoryExtension } from "@lexical/history"
import { AutoLinkNode, LinkExtension } from "@lexical/link"
import { ListExtension } from "@lexical/list"
import { RichTextExtension } from "@lexical/rich-text"
import { configExtension, defineExtension } from "lexical"
import { validateUrl } from "../../../../../../../shared/sanitize/validate-url"
import { findRichTextFeature } from "../../../../../../../shared/rich-text/find-rich-text-feature"
import type { RichTextSettings } from "../../../../../../../shared/rich-text/types"
import { EDITOR_THEME } from "../theme"
import { throwEditorError } from "../utils/throw-editor-error"
import { FeatureGuardExtension } from "./feature-guard-extension"

/** The most undo steps a field keeps, each a whole editor state. */
const HISTORY_MAX_DEPTH = 100

/**
 * The nodes no extension below brings, registered whatever the field allows, so a stored document always
 * loads: `RichTextExtension` brings headings and quotes, `ListExtension` lists, `LinkExtension` links.
 */
const NODES = [AutoLinkNode]

/** What a field's editor is built from. */
export type FieldEditorInput = {
  /** The field's name, the editor's namespace. */
  name: string
  /** The field's stored document as JSON, or nothing for an empty field. */
  initialState?: string
  disabled?: boolean
  settings: RichTextSettings
}

/**
 * Builds the root extension of a field's editor: rich text, a history of at most 100 steps, the list and
 * link extensions - present whatever the field allows, so a stored list or link can be removed - and
 * the guard, which lets through only what the field's features add. A link is made only when the field
 * has the link feature and its URL passes that feature's link policy.
 *
 * @param input - The field's name, its stored document, whether it is disabled, and its settings.
 * @returns The extension, to build one editor from.
 */
export const buildFieldEditorExtension = ({
  name,
  initialState,
  disabled,
  settings,
}: FieldEditorInput) => {
  const linkFeature = findRichTextFeature(settings.features, "link")

  return defineExtension({
    name: "@mostrajs/cms/field-editor",
    namespace: name,
    nodes: NODES,
    theme: EDITOR_THEME,
    editable: !disabled,
    $initialEditorState: initialState,
    onError: throwEditorError,
    dependencies: [
      RichTextExtension,
      configExtension(HistoryExtension, { maxDepth: HISTORY_MAX_DEPTH }),
      ListExtension,
      configExtension(LinkExtension, {
        validateUrl: (url: string) =>
          linkFeature !== undefined &&
          validateUrl(url, linkFeature.props.linkPolicy) === true,
      }),
      configExtension(FeatureGuardExtension, { features: settings.features }),
    ],
  })
}
