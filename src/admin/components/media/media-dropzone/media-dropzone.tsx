import { ArrowDownTray } from "@medusajs/icons"
import { clx, Text } from "@medusajs/ui"
import { type DragEvent, useRef, useState } from "react"
import { MediaFileInput } from "../media-file-input"

type MediaDropzoneProps = {
  /** The MIME types the browser's file dialog offers. */
  accept: string[]
  label: string
  hint?: string
  disabled?: boolean
  /** Called with the first file dropped or browsed; the caller checks it. */
  onFile: (file: File | undefined) => void
}

/**
 * A drop zone for one file, styled after the dashboard's own `FileUpload`: drag a file onto it or
 * click to browse. It hands the file on unchecked; the caller checks its type and size.
 *
 * @param props - The accepted types, the copy, the state, and the file handler.
 */
export const MediaDropzone = ({
  accept,
  label,
  hint,
  disabled,
  onFile,
}: MediaDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  /**
   * Takes a dropped file, unless the zone is disabled.
   *
   * @param event - The drop event.
   */
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    if (!disabled) {
      onFile(event.dataTransfer?.files?.[0])
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setIsDragOver(false)
          }
        }}
        onDrop={handleDrop}
        className={clx(
          "bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8",
          "hover:border-ui-border-interactive focus:border-ui-border-interactive",
          "focus:shadow-borders-focus outline-none focus:border-solid",
          "disabled:cursor-not-allowed",
          { "!border-ui-border-interactive": isDragOver }
        )}
      >
        <div className="text-ui-fg-subtle group-disabled:text-ui-fg-disabled flex items-center gap-x-2">
          <ArrowDownTray />
          <Text>{label}</Text>
        </div>
        {hint && (
          <Text
            size="small"
            leading="compact"
            className="text-ui-fg-muted group-disabled:text-ui-fg-disabled"
          >
            {hint}
          </Text>
        )}
      </button>
      <MediaFileInput ref={inputRef} accept={accept} onFile={onFile} />
    </div>
  )
}
