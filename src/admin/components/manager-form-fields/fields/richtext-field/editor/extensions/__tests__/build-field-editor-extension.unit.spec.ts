import { buildEditorFromExtensions } from "@lexical/extension"
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list"
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  type ElementNode,
  type LexicalEditor,
  type TextFormatType,
} from "lexical"
import { DEFAULT_LINK_POLICY } from "../../../../../../../../shared/sanitize/link-policy"
import type {
  ResolvedRichTextFeature,
  RichTextFeatureKey,
} from "../../../../../../../../shared/rich-text/types"
import { buildFieldEditorExtension } from "../build-field-editor-extension"

/**
 * Resolves a feature of a key as the registry would by default: headings `h2`, the default links.
 *
 * @param key - The feature's key.
 * @returns The feature.
 */
const resolvedOf = (key: RichTextFeatureKey): ResolvedRichTextFeature => {
  switch (key) {
    case "heading":
      return { key, props: { enabledHeadingSizes: ["h2"] } }
    case "link":
      return { key, props: { linkPolicy: DEFAULT_LINK_POLICY } }
    default:
      return { key, props: {} }
  }
}

/**
 * Builds the editor of a field with the given features, holding one paragraph of text, all of it
 * selected.
 *
 * @param keys - The keys of the field's features.
 * @param format - The formats the text starts with.
 * @returns The editor.
 */
const buildFieldEditor = (
  keys: RichTextFeatureKey[],
  format: TextFormatType[] = []
): LexicalEditor => {
  const editor = buildEditorFromExtensions(
    buildFieldEditorExtension({
      name: "body",
      settings: { features: keys.map(resolvedOf) },
    })
  )

  editor.update(
    () => {
      const text = $createTextNode("Hot")

      format.forEach((applied) => text.toggleFormat(applied))
      $getRoot().clear().append($createParagraphNode().append(text))
      // A browser gives the selection the selected text's formats; a headless editor does not.
      text.select(0, 3).format = text.getFormat()
    },
    { discrete: true }
  )

  return editor
}

/**
 * Reads the first text node's formats.
 *
 * @param editor - The editor.
 * @returns Whether it is bold, italic and underlined.
 */
const readFormats = (editor: LexicalEditor) =>
  editor.getEditorState().read(() => {
    const text = $getRoot().getAllTextNodes()[0]

    return {
      bold: text.hasFormat("bold"),
      italic: text.hasFormat("italic"),
      underline: text.hasFormat("underline"),
    }
  })

/**
 * Reads the document's first block.
 *
 * @returns The block.
 * @throws When the document holds no element at its start.
 */
const $readFirstBlock = (): ElementNode => {
  const block = $getRoot().getFirstChild()

  if (!$isElementNode(block)) {
    throw new Error("The document starts with no block")
  }

  return block
}

/**
 * Dispatches a command and waits for its update to commit.
 *
 * @param editor - The editor.
 * @param run - What dispatches the command.
 */
const dispatch = (editor: LexicalEditor, run: () => void) =>
  editor.update(run, { discrete: true })

describe("buildFieldEditorExtension", () => {
  it("applies the formats of the field's features and stops the others, a shortcut's included", () => {
    const editor = buildFieldEditor(["bold"])

    dispatch(editor, () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
    })

    expect(readFormats(editor)).toEqual({
      bold: true,
      italic: false,
      underline: false,
    })
  })

  it("lets a format the field lacks be removed from a stored text", () => {
    const editor = buildFieldEditor(["bold"], ["italic"])

    dispatch(editor, () => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
    })

    expect(readFormats(editor).italic).toBe(false)
  })

  it("stops a list in a field without lists, and an alignment in any field", () => {
    const editor = buildFieldEditor(["bold"])

    dispatch(editor, () => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")
    })

    expect(
      editor.getEditorState().read(() => {
        const block = $readFirstBlock()

        return [block.getType(), block.getFormatType()]
      })
    ).toEqual(["paragraph", ""])
  })

  it("makes a bulleted list in a field with the unordered list feature", () => {
    const editor = buildFieldEditor(["unorderedList"])

    dispatch(editor, () => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    })

    expect(
      editor.getEditorState().read(() => $getRoot().getFirstChild()!.getType())
    ).toBe("list")
  })

  it("stops a numbered list in a field with the unordered list feature only", () => {
    const editor = buildFieldEditor(["unorderedList"])

    dispatch(editor, () => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    })

    expect(
      editor.getEditorState().read(() => $getRoot().getFirstChild()!.getType())
    ).toBe("paragraph")
  })

  it.each([
    [
      "a link the field's policy refuses",
      ["link"],
      "javascript:alert(1)",
      false,
    ],
    ["a link in a field without links", ["bold"], "https://example.com", false],
    ["a link the field takes", ["link"], "https://example.com", true],
  ] as const)("makes %s only when it may", (_name, features, url, made) => {
    const editor = buildFieldEditor([...features])

    dispatch(editor, () => {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    })

    expect(
      editor
        .getEditorState()
        .read(() => $isLinkNode($readFirstBlock().getChildren()[0]))
    ).toBe(made)
  })
})
