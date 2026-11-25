import { useCmsTranslation } from "../../hooks/use-cms-translation"

/**
 * Names the Content page in the breadcrumbs, in the Admin's language.
 */
export const ContentBreadcrumb = () => {
  const { t } = useCmsTranslation()

  return <>{t("label")}</>
}
