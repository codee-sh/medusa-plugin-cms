import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import type { EditorState } from "lexical"
import { useState } from "react"
import { isRichTextDocument } from "../../../../../shared/rich-text/is-rich-text-document"
import { isRichTextEmpty } from "../../../../../shared/rich-text/is-rich-text-empty"
import { DEFAULT_RICH_TEXT_FEATURES } from "../../../../../shared/rich-text/features/default-rich-text-features"
import type { RichTextDocument } from "../../../../../shared/rich-text/types"
import type { ManagerFormInputProps } from "../types"
import { buildFieldEditorExtension } from "./editor/extensions/build-field-editor-extension"
import { Toolbar } from "./editor/toolbar/toolbar"
import { TOOLBAR_CONTROLS } from "./editor/toolbar/toolbar-controls"

/**
 * A Lexical editor bound to a form's value, a serialized document: the toolbar of the field's features,
 * its text, and undo and redo. It reads the value once, when it mounts, and writes each change back as
 * the document's JSON; a selection that moves changes nothing. The attributes `Form.Control` hands it go
 * to the editable area, so the label, the hint and the error point at it.
 *
 * Built from Lexical's extensions under `LexicalExtensionComposer`, which renders no editable area of
 * its own. The entry of the Admin into Lexical, loaded through `RichTextField`; only it imports the
 * `editor/` folder.
 *
 * @param props - The field, its binding to the form, and what `Form.Control` hands it.
 */
const RichTextEditor = ({
  config,
  field,
  ...control
}: ManagerFormInputProps) => {
  const settings = config.richText ?? { features: DEFAULT_RICH_TEXT_FEATURES }
  // Built once per mounted field: a new extension would build a new editor and drop what was typed.
  const [extension] = useState(() =>
    buildFieldEditorExtension({
      name: field.name,
      initialState: isRichTextDocument(field.value)
        ? JSON.stringify(field.value)
        : undefined,
      disabled: config.disabled,
      settings,
    })
  )

  /**
   * Writes the editor's document to the form, or `null` once it holds no text, as the field stores it.
   *
   * @param editorState - The editor's state after a change.
   */
  const onChange = (editorState: EditorState) => {
    const document = editorState.toJSON() as RichTextDocument

    field.onChange(isRichTextEmpty(document) ? null : document)
  }

  return (
    <LexicalExtensionComposer extension={extension} contentEditable={null}>
      <div className="bg-ui-bg-field shadow-borders-base focus-within:shadow-borders-interactive-with-active rounded-md">
        <Toolbar
          settings={settings}
          controls={TOOLBAR_CONTROLS}
          disabled={config.disabled}
        />
        <ContentEditable
          {...control}
          onBlur={field.onBlur}
          className="txt-small text-ui-fg-base min-h-[96px] px-3 py-2 outline-none"
        />
        <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      </div>
    </LexicalExtensionComposer>
  )
}

export default RichTextEditor
