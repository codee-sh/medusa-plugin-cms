import { clx, Text } from "@medusajs/ui"

type LengthCounterProps = {
  /** The field's value; anything but text counts as empty. */
  value: unknown
  /** The length past which the counter warns. */
  recommended: number
}

/**
 * Shows how many characters a text field holds against its recommended length, in the warning colour
 * past it. It only informs: the form's schema decides what a save accepts.
 *
 * @param props - The field's value and its recommended length.
 */
export const LengthCounter = ({ value, recommended }: LengthCounterProps) => {
  const length = typeof value === "string" ? value.length : 0

  return (
    <Text
      size="xsmall"
      leading="compact"
      className={clx(
        "self-end",
        length > recommended ? "text-ui-tag-orange-text" : "text-ui-fg-subtle"
      )}
    >
      {length} / {recommended}
    </Text>
  )
}
