import { ActionMenu, SectionRow } from "@medusajs/dashboard/components"
import { PencilSquare } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import { DocumentFieldValue } from "../common/document-fields"
import type { SectionCard } from "../page-sections/utils/list-section-cards"

type SingletonSectionCardProps = {
  /** The slug of the singleton whose section the card is, which its drawer's address names. */
  singleton: string
  card: SectionCard
  /** The values shown: the document's, or each field's empty value before the first save. */
  values: Record<string, unknown>
}

/**
 * Shows one section of a singleton read-only: its label and description with **Edit**, which opens the
 * section's drawer, then a row per field with its value by its kind.
 *
 * @param props - The singleton, the card and the values it shows.
 */
export const SingletonSectionCard = ({
  singleton,
  card,
  values,
}: SingletonSectionCardProps) => {
  const { t } = useCmsTranslation()

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading level="h2">{card.label}</Heading>
          {card.description && (
            <Text size="small" className="text-ui-fg-subtle">
              {card.description}
            </Text>
          )}
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: t("actions.edit"),
                  to: `sections/${singleton}/${card.key}/edit`,
                },
              ],
            },
          ]}
        />
      </div>
      {card.fields.map((field) => (
        <SectionRow
          key={field.name}
          title={field.label}
          value={
            <DocumentFieldValue field={field} value={values[field.name]} />
          }
        />
      ))}
    </Container>
  )
}
