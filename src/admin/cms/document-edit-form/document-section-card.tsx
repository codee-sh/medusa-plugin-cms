import { Container, Heading, Text } from "@medusajs/ui"
import type { ReactNode } from "react"

type DocumentSectionCardProps = {
  /** The section's heading; none for a section without a label. */
  label?: string
  description?: string
  /** The section's fields and areas. */
  children: ReactNode
}

/**
 * Shows a section of the document page as a card of its own: its label and description, when it has
 * either, then what it holds.
 *
 * @param props - The label, the description and the section's content.
 */
export const DocumentSectionCard = ({
  label,
  description,
  children,
}: DocumentSectionCardProps) => (
  <Container className="divide-y p-0">
    {(label || description) && (
      <div className="flex flex-col gap-y-1 px-6 py-4">
        {label && <Heading level="h2">{label}</Heading>}
        {description && (
          <Text size="small" className="text-ui-fg-subtle">
            {description}
          </Text>
        )}
      </div>
    )}
    <div className="flex flex-col gap-y-4 px-6 py-4">{children}</div>
  </Container>
)
