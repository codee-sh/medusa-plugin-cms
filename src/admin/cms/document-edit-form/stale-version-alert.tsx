import { Alert, Button, Text } from "@medusajs/ui"
import { useCmsTranslation } from "../../hooks/use-cms-translation"

type StaleVersionAlertProps = {
  /** The server's message for a save or publish from an outdated form. */
  message: string
  /** Reads the document again. */
  onReload: () => void
}

/**
 * Warns that the form edits an outdated version, with **Reload**, which reads the document again.
 *
 * @param props - The server's message and what reloads the document.
 */
export const StaleVersionAlert = ({
  message,
  onReload,
}: StaleVersionAlertProps) => {
  const { t } = useCmsTranslation()

  return (
    <Alert variant="warning">
      <div className="flex items-center justify-between gap-x-4">
        <Text size="small">{message}</Text>
        <Button
          size="small"
          variant="secondary"
          type="button"
          onClick={onReload}
        >
          {t("documents.edit.reload")}
        </Button>
      </div>
    </Alert>
  )
}
