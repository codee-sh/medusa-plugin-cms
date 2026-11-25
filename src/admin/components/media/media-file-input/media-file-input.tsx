import { forwardRef } from "react"

type MediaFileInputProps = {
  /** The MIME types the browser's file dialog offers. */
  accept: string[]
  /** Called with the chosen file, if any. */
  onFile: (file: File | undefined) => void
}

/**
 * A hidden file input that a button opens through its ref. It is cleared after each choice, so the
 * same file can be chosen again.
 *
 * @param props - The accepted types and the handler for the chosen file.
 */
export const MediaFileInput = forwardRef<HTMLInputElement, MediaFileInputProps>(
  ({ accept, onFile }, ref) => (
    <input
      hidden
      ref={ref}
      type="file"
      accept={accept.join(",")}
      onChange={(event) => {
        onFile(event.target.files?.[0])
        event.target.value = ""
      }}
    />
  )
)

MediaFileInput.displayName = "MediaFileInput"
