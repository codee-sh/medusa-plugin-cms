import { defineRouteConfig } from "@medusajs/admin-sdk"
import { RouteListTable } from "../../cms/route-list-table"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import { ContentBreadcrumb } from "../../cms/content-breadcrumb"

/**
 * The Content page: the list of the Admin's top-level routes.
 */
const ContentPage = () => {
  const { t } = useCmsTranslation()

  return <RouteListTable heading={t("label")} />
}

export const config = defineRouteConfig({
  label: "label",
  // A string literal: Medusa reads it from the file's source, so a constant here is not seen.
  translationNs: "medusa-plugin-cms",
})

export const handle = {
  /**
   * Names the Content page in the breadcrumbs.
   *
   * @returns The breadcrumb.
   */
  breadcrumb: () => <ContentBreadcrumb />,
}

export default ContentPage
